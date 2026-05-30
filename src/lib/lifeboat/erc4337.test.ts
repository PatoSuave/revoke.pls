import { describe, expect, it } from "vitest";

import {
  analyzeErc4337Activity,
  erc4337RiskLabel,
  type Erc4337UserOperationEvent,
} from "@/lib/lifeboat/erc4337";

const OWNER = "0x1111111111111111111111111111111111111111";
const ENTRY_POINT = "0x0000000071727de22E5E9d8BAf0edAc6f37da032";
const PAYMASTER = "0x2222222222222222222222222222222222222222";

function userOp(
  overrides: Partial<Erc4337UserOperationEvent> = {},
): Erc4337UserOperationEvent {
  return {
    entryPointVersion: "v0.7",
    entryPointAddress: ENTRY_POINT,
    userOpHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    sender: OWNER,
    paymaster: null,
    nonce: "7",
    success: true,
    actualGasCostWei: "100000",
    actualGasUsed: "50000",
    blockNumber: 123,
    transactionHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    explorerUrl: "https://etherscan.io/tx/0xbb",
    ...overrides,
  };
}

describe("Wallet Lifeboat ERC-4337 diagnostic", () => {
  it("treats no recent UserOps and no code as no recent activity", () => {
    const result = analyzeErc4337Activity({
      events: [],
      checkedEntryPointCount: 3,
      checkedBlockRange: 50_000,
      hasAccountCode: false,
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(result.evidence).toEqual([]);
    expect(erc4337RiskLabel(result.riskLevel)).toBe("No recent UserOps found");
  });

  it("treats account code without recent UserOps as review context", () => {
    const result = analyzeErc4337Activity({
      events: [],
      checkedEntryPointCount: 3,
      checkedBlockRange: 50_000,
      hasAccountCode: true,
    });

    expect(result.riskLevel).toBe("possible");
    expect(result.summary.hasAccountCode).toBe(true);
  });

  it("surfaces successful UserOperations as informational evidence", () => {
    const result = analyzeErc4337Activity({
      events: [userOp()],
      checkedEntryPointCount: 3,
      checkedBlockRange: 50_000,
      hasAccountCode: true,
    });

    expect(result.riskLevel).toBe("informational");
    expect(result.summary.userOperationCount).toBe(1);
    expect(result.evidence[0]).toMatchObject({
      title: "UserOperation observed",
      riskLevel: "informational",
    });
  });

  it("raises review level for paymaster and failed UserOperations", () => {
    const paymasterResult = analyzeErc4337Activity({
      events: [userOp({ paymaster: PAYMASTER })],
      checkedEntryPointCount: 3,
      checkedBlockRange: 50_000,
      hasAccountCode: true,
    });
    const failedResult = analyzeErc4337Activity({
      events: [userOp({ success: false })],
      checkedEntryPointCount: 3,
      checkedBlockRange: 50_000,
      hasAccountCode: true,
    });

    expect(paymasterResult.riskLevel).toBe("possible");
    expect(paymasterResult.summary.uniquePaymasterCount).toBe(1);
    expect(failedResult.riskLevel).toBe("elevated");
    expect(failedResult.evidence[0].title).toBe("Failed UserOperation");
    expect(failedResult.warnings.join(" ")).toContain("read-only diagnostic");
  });
});
