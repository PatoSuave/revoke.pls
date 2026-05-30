import { describe, expect, it } from "vitest";

import {
  analyzeErc6909Events,
  erc6909RiskLabel,
  type Erc6909PermissionEvent,
} from "@/lib/lifeboat/erc6909";

const OWNER = "0x1111111111111111111111111111111111111111";
const SPENDER = "0x2222222222222222222222222222222222222222";
const CONTRACT = "0x3333333333333333333333333333333333333333";
const TX =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

function approval(
  overrides: Partial<Erc6909PermissionEvent> = {},
): Erc6909PermissionEvent {
  return {
    kind: "approval",
    contractAddress: CONTRACT,
    owner: OWNER,
    spender: SPENDER,
    tokenId: "7",
    amount: "100",
    unlimited: false,
    blockNumber: 123,
    transactionHash: TX,
    explorerUrl: "https://etherscan.io/tx/0xaa",
    contractExplorerUrl: "https://etherscan.io/address/0x33",
    ...overrides,
  } as Erc6909PermissionEvent;
}

function operator(
  overrides: Partial<Erc6909PermissionEvent> = {},
): Erc6909PermissionEvent {
  return {
    kind: "operator",
    contractAddress: CONTRACT,
    owner: OWNER,
    spender: SPENDER,
    approved: true,
    blockNumber: 124,
    transactionHash: TX,
    explorerUrl: "https://etherscan.io/tx/0xaa",
    contractExplorerUrl: "https://etherscan.io/address/0x33",
    ...overrides,
  } as Erc6909PermissionEvent;
}

describe("Wallet Lifeboat ERC-6909 diagnostic", () => {
  it("treats no recent events as no recent ERC-6909 events", () => {
    const result = analyzeErc6909Events({
      events: [],
      checkedBlockRange: 10_000,
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(result.summary.permissionEventCount).toBe(0);
    expect(erc6909RiskLabel(result.riskLevel)).toBe(
      "No recent ERC-6909 events",
    );
  });

  it("surfaces per-token allowances as possible exposure", () => {
    const result = analyzeErc6909Events({
      events: [approval()],
      checkedBlockRange: 10_000,
    });

    expect(result.riskLevel).toBe("possible");
    expect(result.summary.approvalEventCount).toBe(1);
    expect(result.summary.nonzeroApprovalEventCount).toBe(1);
    expect(result.evidence[0]).toMatchObject({
      title: "Per-token allowance recorded",
      riskLevel: "possible",
    });
  });

  it("raises elevated context for infinite allowances and active operators", () => {
    const infinite = analyzeErc6909Events({
      events: [approval({ amount: MAX_UINT256, unlimited: true })],
      checkedBlockRange: 10_000,
    });
    const activeOperator = analyzeErc6909Events({
      events: [operator()],
      checkedBlockRange: 10_000,
    });

    expect(infinite.riskLevel).toBe("elevated");
    expect(infinite.summary.unlimitedApprovalEventCount).toBe(1);
    expect(activeOperator.riskLevel).toBe("elevated");
    expect(activeOperator.summary.activeOperatorEventCount).toBe(1);
    expect(activeOperator.evidence[0].title).toBe("Operator permission enabled");
  });

  it("keeps zero allowances and disabled operators informational", () => {
    const result = analyzeErc6909Events({
      events: [
        approval({ amount: "0", unlimited: false }),
        operator({ approved: false }),
      ],
      checkedBlockRange: 10_000,
    });

    expect(result.riskLevel).toBe("informational");
    expect(result.summary.uniqueContractCount).toBe(1);
    expect(result.warnings.join(" ")).toContain("read-only diagnostic");
  });
});
