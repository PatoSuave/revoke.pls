import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import type { Approval } from "./approvals";
import {
  classifyApprovalRisk,
  filterAndSortScoredApprovals,
  scoreApprovals,
} from "./risk";

const TOKEN = "0x1111111111111111111111111111111111111111" as Address;
const SPENDER = "0x2222222222222222222222222222222222222222" as Address;

function approval(overrides: Partial<Approval> = {}): Approval {
  return {
    key: "approval",
    approvalKind: "erc20",
    chainId: 56,
    tokenAddress: TOKEN,
    tokenSymbol: "TOK",
    tokenName: "Token",
    tokenDecimals: 18,
    tokenCategory: "unknown",
    spenderAddress: SPENDER,
    spenderLabel: "Unknown spender",
    protocol: "Unknown",
    spenderCategory: "unknown",
    trusted: false,
    rawAllowance: 1n,
    formattedAllowance: "1 TOK",
    unlimited: false,
    ...overrides,
  };
}

describe("approval risk classification", () => {
  it("keeps the original known/unlimited risk buckets", () => {
    expect(classifyApprovalRisk({ trusted: true, unlimited: false })).toMatchObject({
      level: "low",
      drivers: ["Known spender", "Limited approval"],
    });
    expect(classifyApprovalRisk({ trusted: true, unlimited: true })).toMatchObject({
      level: "medium",
      drivers: ["Known spender", "Unlimited approval"],
    });
    expect(classifyApprovalRisk({ trusted: false, unlimited: false })).toMatchObject({
      level: "medium",
      drivers: ["Unknown spender", "Limited approval"],
    });
    expect(classifyApprovalRisk({ trusted: false, unlimited: true })).toMatchObject({
      level: "high",
      drivers: ["Unknown spender", "Unlimited approval"],
    });
  });

  it("adds Permit2 and hybrid signals without weakening unknown unlimited risk", () => {
    const risk = classifyApprovalRisk({
      trusted: false,
      unlimited: true,
      approvalKind: "permit2",
      tokenCategory: "hybrid",
    });

    expect(risk.level).toBe("high");
    expect(risk.reason).toContain("Permit2 delegated allowance");
    expect(risk.reason).toContain("Hybrid token detected");
    expect(risk.drivers).toEqual([
      "Unknown spender",
      "Unlimited approval",
      "Permit2 delegated allowance",
      "Hybrid token contract",
    ]);
  });

  it("filters and searches Permit2 and hybrid rows", () => {
    const scored = scoreApprovals([
      approval({ key: "standard", tokenSymbol: "STD" }),
      approval({
        key: "permit2",
        approvalKind: "permit2",
        tokenSymbol: "P2",
      }),
      approval({
        key: "hybrid",
        tokenCategory: "hybrid",
        tokenSymbol: "HYB",
      }),
    ]);

    expect(
      filterAndSortScoredApprovals(scored, {
        query: "",
        sort: "token",
        filter: "permit2",
      }).map((entry) => entry.key),
    ).toEqual(["permit2"]);
    expect(
      filterAndSortScoredApprovals(scored, {
        query: "",
        sort: "token",
        filter: "hybrid",
      }).map((entry) => entry.key),
    ).toEqual(["hybrid"]);
    expect(
      filterAndSortScoredApprovals(scored, {
        query: "delegated",
        sort: "token",
        filter: "all",
      }).map((entry) => entry.key),
    ).toEqual(["permit2"]);
  });
});
