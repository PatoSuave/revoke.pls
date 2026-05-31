import { describe, expect, it } from "vitest";

import { analyzePermit2Exposure } from "@/lib/lifeboat/permit2-exposure";
import type { Approval } from "@/lib/approvals";

const BASE_APPROVAL: Approval = {
  key: "369-permit2-token-spender",
  approvalKind: "permit2",
  chainId: 369,
  tokenAddress: "0x1111111111111111111111111111111111111111",
  tokenSymbol: "TEST",
  tokenName: "Test Token",
  tokenDecimals: 18,
  tokenCategory: "unknown",
  spenderAddress: "0x2222222222222222222222222222222222222222",
  spenderLabel: "Unknown spender",
  protocol: "Unknown",
  spenderCategory: "unknown",
  trusted: false,
  approvalContractAddress: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  permit2Expiration: 1_800_000_000,
  permit2Nonce: 7,
  rawAllowance: 1_000_000_000_000_000_000n,
  formattedAllowance: "1 TEST",
  unlimited: false,
};

describe("analyzePermit2Exposure", () => {
  it("flags a live-read Permit2 allowance as active exposure", () => {
    const analysis = analyzePermit2Exposure({
      approvals: [BASE_APPROVAL],
      approvalStatus: "complete",
      nowUnix: 1_700_000_000,
    });

    expect(analysis.riskLevel).toBe("possible");
    expect(analysis.summary.activePermit2Count).toBe(1);
    expect(analysis.summary.unlimitedPermit2Count).toBe(0);
    expect(analysis.evidence[0]).toMatchObject({
      tokenSymbol: "TEST",
      spenderLabel: "Unknown spender",
      formattedAllowance: "1 TEST",
      unlimited: false,
      nonce: 7,
    });
    expect(analysis.evidence[0]?.expiration.status).toBe("active");
  });

  it("raises the level for unlimited or multiple Permit2 allowances", () => {
    const analysis = analyzePermit2Exposure({
      approvals: [
        { ...BASE_APPROVAL, unlimited: true },
        {
          ...BASE_APPROVAL,
          key: "369-permit2-token-spender-2",
          spenderAddress: "0x3333333333333333333333333333333333333333",
          unlimited: false,
        },
      ],
      approvalStatus: "complete",
      nowUnix: 1_700_000_000,
    });

    expect(analysis.riskLevel).toBe("elevated");
    expect(analysis.summary.activePermit2Count).toBe(2);
    expect(analysis.summary.unlimitedPermit2Count).toBe(1);
  });

  it("does not show a false all-clear when the approval scan is incomplete", () => {
    const analysis = analyzePermit2Exposure({
      approvals: [],
      approvalStatus: "partial",
      nowUnix: 1_700_000_000,
    });

    expect(analysis.riskLevel).toBe("insufficient_data");
    expect(analysis.summary.activePermit2Count).toBe(0);
  });

  it("reports no active rows only after a complete scan", () => {
    const analysis = analyzePermit2Exposure({
      approvals: [],
      approvalStatus: "complete",
      nowUnix: 1_700_000_000,
    });

    expect(analysis.riskLevel).toBe("none_detected");
  });

  it("does not introduce execution or secret-handling language", () => {
    const copy = analyzePermit2Exposure({
      approvals: [BASE_APPROVAL],
      approvalStatus: "complete",
      nowUnix: 1_700_000_000,
    }).warnings.join(" ").toLowerCase();

    expect(copy).toContain("read-only");
    expect(copy).not.toContain("private key");
    expect(copy).not.toContain("seed phrase");
    expect(copy).not.toContain("server-side signing");
    expect(copy).not.toContain("automatic transfer");
  });
});
