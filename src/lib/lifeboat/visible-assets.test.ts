import { describe, expect, it } from "vitest";

import type { Approval } from "@/lib/approvals";
import {
  analyzeVisibleAssetsAtRisk,
  visibleAssetsRiskLabel,
} from "@/lib/lifeboat/visible-assets";
import type { NftApproval } from "@/lib/nft-approvals";

const TOKEN_APPROVAL: Approval = {
  key: "token:pls",
  chainId: 369,
  tokenAddress: "0x1111111111111111111111111111111111111111",
  tokenSymbol: "PLS",
  tokenName: "Pulse Token",
  tokenDecimals: 18,
  tokenCategory: "ecosystem",
  spenderAddress: "0x2222222222222222222222222222222222222222",
  spenderLabel: "Unknown spender",
  protocol: "Unknown",
  spenderCategory: "unknown",
  trusted: false,
  rawAllowance: 1000n,
  formattedAllowance: "1,000 PLS",
  unlimited: true,
};

const NFT_APPROVAL: NftApproval = {
  key: "nft:collection",
  chainId: 369,
  kind: "approvalForAll",
  standard: "erc721",
  collectionAddress: "0x3333333333333333333333333333333333333333",
  collectionName: "Pulse NFTs",
  operatorAddress: "0x4444444444444444444444444444444444444444",
  operatorLabel: "NFT operator",
  protocol: "Unknown",
  trusted: false,
  risk: {
    level: "high",
    reason: "Collection-wide approval",
  },
};

describe("Wallet Lifeboat visible assets at risk", () => {
  it("summarizes active token and NFT approvals without fetching balances", () => {
    const result = analyzeVisibleAssetsAtRisk({
      approvals: [TOKEN_APPROVAL],
      nftApprovals: [NFT_APPROVAL],
      approvalsStatus: "complete",
      nftApprovalsStatus: "complete",
    });

    expect(result.riskLevel).toBe("elevated");
    expect(visibleAssetsRiskLabel(result.riskLevel)).toBe(
      "High exposure summary",
    );
    expect(result.summary).toMatchObject({
      tokenApprovalCount: 1,
      unlimitedTokenApprovalCount: 1,
      nftApprovalCount: 1,
      collectionWideNftApprovalCount: 1,
      uniqueAssetCount: 2,
      uniqueSpenderCount: 2,
    });
    expect(result.evidence.map((item) => item.exposureKind)).toEqual([
      "unlimited-token-allowance",
      "collection-wide-nft-approval",
    ]);
    expect(result.warnings.join(" ")).toContain("not a full wallet balance");
  });

  it("treats limited token approvals as possible exposure context", () => {
    const result = analyzeVisibleAssetsAtRisk({
      approvals: [
        {
          ...TOKEN_APPROVAL,
          unlimited: false,
          formattedAllowance: "25 PLS",
        },
      ],
      nftApprovals: [],
      approvalsStatus: "complete",
      nftApprovalsStatus: "complete",
    });

    expect(result.riskLevel).toBe("possible");
    expect(result.evidence[0]).toMatchObject({
      exposureKind: "finite-token-allowance",
      riskLevel: "possible",
      amount: "25 PLS",
    });
  });

  it("labels Permit2 approvals separately from normal token approvals", () => {
    const result = analyzeVisibleAssetsAtRisk({
      approvals: [
        {
          ...TOKEN_APPROVAL,
          approvalKind: "permit2",
          unlimited: false,
          formattedAllowance: "50 PLS",
        },
      ],
      nftApprovals: [],
      approvalsStatus: "complete",
      nftApprovalsStatus: "complete",
    });

    expect(result.riskLevel).toBe("elevated");
    expect(result.summary.permit2ApprovalCount).toBe(1);
    expect(result.evidence[0]?.exposureKind).toBe("permit2-token-allowance");
  });

  it("keeps empty completed scans as no exposed assets found", () => {
    const result = analyzeVisibleAssetsAtRisk({
      approvals: [],
      nftApprovals: [],
      approvalsStatus: "complete",
      nftApprovalsStatus: "complete",
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(result.evidence).toHaveLength(0);
  });

  it("does not show an all-clear when source scans are partial", () => {
    const result = analyzeVisibleAssetsAtRisk({
      approvals: [],
      nftApprovals: [],
      approvalsStatus: "partial",
      nftApprovalsStatus: "complete",
    });

    expect(result.riskLevel).toBe("insufficient_data");
    expect(visibleAssetsRiskLabel(result.riskLevel)).toBe(
      "Incomplete asset context",
    );
  });

  it("stays not checked until approval scans start", () => {
    const result = analyzeVisibleAssetsAtRisk({
      approvals: [],
      nftApprovals: [],
      approvalsStatus: "not_scanned",
      nftApprovalsStatus: "not_scanned",
    });

    expect(result.riskLevel).toBe("not_checked");
  });
});
