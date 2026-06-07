import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import { getApprovalAgeBucket } from "@/lib/approval-age/format";
import type { ApprovalAgeInfo } from "@/lib/approval-age/types";
import { summarizeApprovalAges } from "@/lib/approval-age/summary";
import type { NftApproval } from "@/lib/nft-approvals";

const TOKEN = "0x1111111111111111111111111111111111111111" as Address;
const SPENDER = "0x2222222222222222222222222222222222222222" as Address;
const OTHER = "0x3333333333333333333333333333333333333333" as Address;
const COLLECTION = "0x4444444444444444444444444444444444444444" as Address;

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
    operatorAddress: OTHER,
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
      bucket: getApprovalAgeBucket(ageDays),
      label: `Approved ${ageDays} days ago`,
      source: "approval_event",
    },
  ];
}

describe("approval age summary", () => {
  it("counts oldest age, long-lived approvals, unlimited rows, NFT operators, and unknown spenders", () => {
    const approvals = [
      approval({ key: "erc20-a", unlimited: true }),
      approval({ key: "erc20-b", trusted: true, spenderLabel: "Known spender" }),
    ];
    const nftApprovals = [
      nftApproval({ key: "nft-a" }),
      nftApproval({ key: "nft-b", kind: "tokenApproval", tokenId: 7n }),
    ];
    const summary = summarizeApprovalAges({
      approvals,
      nftApprovals,
      ageInfoByKey: new Map<string, ApprovalAgeInfo>([
        age("erc20-a", 0),
        age("erc20-b", 400),
        age("nft-a", 1200),
      ]),
    });

    expect(summary).toMatchObject({
      totalRows: 4,
      rowsWithAge: 3,
      rowsWithoutAge: 1,
      oldestApprovalAgeDays: 1200,
      oldestApprovalLabel: "Approved 1200 days ago",
      approvalsToday: 1,
      approvalsThirtyDaysPlus: 2,
      approvalsOneYearPlus: 2,
      ancientApprovals: 1,
      unlimitedApprovals: 1,
      nftOperatorApprovals: 1,
      unknownSpenders: 3,
    });
  });
});
