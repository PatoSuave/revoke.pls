import { describe, expect, it } from "vitest";

import {
  EIP7702_DELEGATION_CODE_BYTES,
  analyzeEip7702Delegation,
  eip7702RiskLabel,
  parseEip7702DelegationCode,
} from "@/lib/lifeboat/eip7702";

const OWNER = "0x1111111111111111111111111111111111111111";
const DELEGATE = "0x2222222222222222222222222222222222222222";

describe("EIP-7702 delegation diagnostic", () => {
  it("treats empty account code as no delegation detected", () => {
    const result = analyzeEip7702Delegation({
      owner: OWNER,
      code: "0x",
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(result.summary.hasCode).toBe(false);
    expect(result.summary.hasDelegation).toBe(false);
    expect(result.evidence).toEqual([]);
  });

  it("parses the 0xef0100 delegation designator", () => {
    const code = `0xef0100${DELEGATE.slice(2)}`;
    const parsed = parseEip7702DelegationCode(code);
    const result = analyzeEip7702Delegation({
      owner: OWNER,
      code,
      delegationExplorerUrl: (address) => `https://example.com/address/${address}`,
    });

    expect(parsed).toEqual({
      classification: "eip7702_delegation",
      delegationAddress: DELEGATE,
    });
    expect(result.riskLevel).toBe("elevated");
    expect(result.summary.codeLengthBytes).toBe(EIP7702_DELEGATION_CODE_BYTES);
    expect(result.summary.delegationAddress).toBe(DELEGATE);
    expect(result.evidence[0]).toMatchObject({
      classification: "eip7702_delegation",
      delegationAddress: DELEGATE,
      delegationExplorerUrl: `https://example.com/address/${DELEGATE}`,
    });
    expect(eip7702RiskLabel(result.riskLevel)).toBe(
      "Active EIP-7702 delegation",
    );
  });

  it("flags malformed delegation-prefixed code without overclaiming", () => {
    const result = analyzeEip7702Delegation({
      owner: OWNER,
      code: "0xef0100abcd",
    });

    expect(result.riskLevel).toBe("possible");
    expect(result.summary.classification).toBe("invalid_delegation");
    expect(result.evidence[0]?.description.toLowerCase()).toContain(
      "does not match",
    );
  });

  it("treats other account code as informational context", () => {
    const result = analyzeEip7702Delegation({
      owner: OWNER,
      code: "0x6001600101",
    });

    expect(result.riskLevel).toBe("informational");
    expect(result.summary.classification).toBe("other_code");
    expect(result.evidence[0]?.description).toContain("not the standard");
  });

  it("keeps warnings read-only and avoids recovery claims", () => {
    const warnings = analyzeEip7702Delegation({
      owner: OWNER,
      code: `0xef0100${DELEGATE.slice(2)}`,
    })
      .warnings.join(" ")
      .toLowerCase();

    expect(warnings).toContain("read-only");
    expect(warnings).not.toContain("guaranteed recovery");
    expect(warnings).not.toContain("automatic clearing");
    expect(warnings).not.toContain("request signatures");
  });
});
