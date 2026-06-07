import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import {
  buildApprovalWrappedSummary,
  formatApprovalWrappedCopy,
  wrappedCopyHasBlockedContent,
} from "@/lib/approval-age/wrapped";
import type { ApprovalAgeInfo } from "@/lib/approval-age/types";
import type { NftApproval } from "@/lib/nft-approvals";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as Address;
const TOKEN = "0x1111111111111111111111111111111111111111" as Address;
const SPENDER = "0x2222222222222222222222222222222222222222" as Address;
const COLLECTION = "0x3333333333333333333333333333333333333333" as Address;

function approval(input: Partial<Approval> & { key: string }): Approval {
  return {
    approvalKind: "erc20",
    chainId: 369,
    tokenAddress: TOKEN,
    tokenSymbol: "TOK",
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
    ...input,
  };
}

function nftApproval(input: Partial<NftApproval> & { key: string }): NftApproval {
  return {
    chainId: 369,
    kind: "approvalForAll",
    standard: "erc721",
    collectionAddress: COLLECTION,
    operatorAddress: SPENDER,
    operatorLabel: "Unknown operator",
    protocol: "Unknown",
    trusted: false,
    risk: {
      level: "high",
      reason: "Unknown operator approved across the collection.",
      drivers: ["Unknown operator", "Collection-wide approval"],
    },
    ...input,
  };
}

function age(key: string, ageDays: number): [string, ApprovalAgeInfo] {
  return [
    key,
    {
      chainId: 369,
      ageDays,
      bucket: ageDays >= 1095 ? "ancient" : "one_year_plus",
      label: `Approved ${ageDays} days ago`,
      source: "approval_event",
    },
  ];
}

describe("Approval Wrapped", () => {
  it("builds recap counts from current scan rows", () => {
    const summary = buildApprovalWrappedSummary({
      owner: OWNER,
      approvals: [
        approval({ key: "erc20-a", unlimited: true }),
        approval({ key: "erc20-b", chainId: 56, trusted: true }),
      ],
      nftApprovals: [
        nftApproval({ key: "nft-a" }),
        nftApproval({ key: "nft-b", kind: "tokenApproval", tokenId: 7n }),
      ],
      ageInfoByKey: new Map<string, ApprovalAgeInfo>([
        age("erc20-a", 400),
        age("erc20-b", 1200),
        age("nft-a", 30),
      ]),
      chainNameById: new Map([
        [369, "PulseChain"],
        [56, "BNB Smart Chain"],
      ]),
      chainsScanned: [369, 56],
      generatedAt: "2026-06-07T00:00:00.000Z",
    });

    expect(summary).toMatchObject({
      approvalsReviewed: 4,
      oldestApprovalAgeDays: 1200,
      oldestApprovalLabel: "Approved 1200 days ago",
      oldestApprovalChainName: "BNB Smart Chain",
      unlimitedApprovals: 1,
      nftOperatorApprovals: 1,
      unknownSpenders: 3,
      oneYearPlusApprovals: 2,
      ancientApprovals: 1,
      mostApprovedChain: {
        chainId: 369,
        chainName: "PulseChain",
        count: 3,
      },
    });
  });

  it("formats copy with scan-first language and without full wallet address", () => {
    const summary = buildApprovalWrappedSummary({
      owner: OWNER,
      approvals: [approval({ key: "erc20-a", unlimited: true })],
      nftApprovals: [],
      ageInfoByKey: new Map<string, ApprovalAgeInfo>([age("erc20-a", 1460)]),
      chainNameById: new Map([[369, "PulseChain"]]),
      chainsScanned: [369],
      roastLine:
        "1 unlimited approval saw a spending cap and chose main character energy.",
      generatedAt: "2026-06-07T00:00:00.000Z",
    });

    const copy = formatApprovalWrappedCopy(summary);

    expect(copy).toContain("pulserevoke.com");
    expect(copy).toContain("Scan first. Revoke only when ready.");
    expect(copy).not.toContain(OWNER);
    expect(copy).not.toMatch(/\brevoked\b/i);
    expect(wrappedCopyHasBlockedContent(copy)).toBe(false);
  });

  it("detects blocked copy content", () => {
    expect(wrappedCopyHasBlockedContent("Wallet balance: $12")).toBe(true);
    expect(wrappedCopyHasBlockedContent("Revoked approvals: 4")).toBe(true);
    expect(wrappedCopyHasBlockedContent("This wallet is safe")).toBe(true);
  });
});
