import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { LifeboatModuleStatus } from "@/lib/lifeboat/types";
import type { NftApproval } from "@/lib/nft-approvals";

export type VisibleAssetsRiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type VisibleAssetExposureKind =
  | "unlimited-token-allowance"
  | "finite-token-allowance"
  | "permit2-token-allowance"
  | "collection-wide-nft-approval"
  | "single-nft-approval";

export type VisibleAssetType = "token" | "nft";

export interface VisibleAssetExposure {
  assetType: VisibleAssetType;
  exposureKind: VisibleAssetExposureKind;
  chainId: number;
  assetAddress: Address;
  assetLabel: string;
  assetSymbol: string | null;
  spenderAddress: Address;
  spenderLabel: string;
  amount: string | null;
  tokenId: string | null;
  trustedSpender: boolean;
  riskLevel: "informational" | "possible" | "elevated";
}

export interface VisibleAssetsAnalysis {
  riskLevel: VisibleAssetsRiskLevel;
  evidence: VisibleAssetExposure[];
  summary: {
    tokenApprovalCount: number;
    unlimitedTokenApprovalCount: number;
    permit2ApprovalCount: number;
    nftApprovalCount: number;
    collectionWideNftApprovalCount: number;
    singleNftApprovalCount: number;
    uniqueAssetCount: number;
    uniqueSpenderCount: number;
  };
  warnings: string[];
}

export interface AnalyzeVisibleAssetsAtRiskOptions {
  approvals: readonly Approval[];
  nftApprovals: readonly NftApproval[];
  approvalsStatus: LifeboatModuleStatus;
  nftApprovalsStatus: LifeboatModuleStatus;
  evidenceLimit?: number;
}

const DEFAULT_EVIDENCE_LIMIT = 16;

export function analyzeVisibleAssetsAtRisk({
  approvals,
  nftApprovals,
  approvalsStatus,
  nftApprovalsStatus,
  evidenceLimit = DEFAULT_EVIDENCE_LIMIT,
}: AnalyzeVisibleAssetsAtRiskOptions): VisibleAssetsAnalysis {
  const tokenEvidence = approvals.map(tokenApprovalToExposure);
  const nftEvidence = nftApprovals.map(nftApprovalToExposure);
  const allEvidence = [...tokenEvidence, ...nftEvidence].sort(
    compareVisibleAssetExposure,
  );
  const evidence = allEvidence.slice(0, evidenceLimit);
  const uniqueAssets = new Set(
    allEvidence.map(
      (item) => `${item.chainId}:${item.assetAddress.toLowerCase()}`,
    ),
  );
  const uniqueSpenders = new Set(
    allEvidence.map(
      (item) => `${item.chainId}:${item.spenderAddress.toLowerCase()}`,
    ),
  );
  const summary = {
    tokenApprovalCount: approvals.length,
    unlimitedTokenApprovalCount: approvals.filter((approval) => approval.unlimited)
      .length,
    permit2ApprovalCount: approvals.filter(
      (approval) => approval.approvalKind === "permit2",
    ).length,
    nftApprovalCount: nftApprovals.length,
    collectionWideNftApprovalCount: nftApprovals.filter(
      (approval) => approval.kind === "approvalForAll",
    ).length,
    singleNftApprovalCount: nftApprovals.filter(
      (approval) => approval.kind === "tokenApproval",
    ).length,
    uniqueAssetCount: uniqueAssets.size,
    uniqueSpenderCount: uniqueSpenders.size,
  };

  return {
    riskLevel: visibleAssetsRiskLevel({
      approvalsStatus,
      nftApprovalsStatus,
      summary,
    }),
    evidence,
    summary,
    warnings: [
      "Visible assets at risk are derived from active approval rows already found by the read-only scanner. This is not a full wallet balance or asset inventory.",
      "No exposed asset row here does not prove the wallet has no assets, hidden approvals, unsupported-chain exposure, staked positions, claimable value, or off-chain authorization risk.",
    ],
  };
}

export function visibleAssetsRiskLabel(
  riskLevel: VisibleAssetsRiskLevel,
): string {
  switch (riskLevel) {
    case "elevated":
      return "High exposure summary";
    case "possible":
      return "Assets exposed by approvals";
    case "informational":
      return "Visible exposure context";
    case "none_detected":
      return "No exposed assets found";
    case "insufficient_data":
      return "Incomplete asset context";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function tokenApprovalToExposure(approval: Approval): VisibleAssetExposure {
  const exposureKind =
    approval.approvalKind === "permit2"
      ? "permit2-token-allowance"
      : approval.unlimited
        ? "unlimited-token-allowance"
        : "finite-token-allowance";
  return {
    assetType: "token",
    exposureKind,
    chainId: approval.chainId,
    assetAddress: approval.tokenAddress,
    assetLabel: approval.tokenName ?? approval.tokenSymbol,
    assetSymbol: approval.tokenSymbol,
    spenderAddress: approval.spenderAddress,
    spenderLabel: approval.spenderLabel,
    amount: approval.unlimited ? `unlimited ${approval.tokenSymbol}` : approval.formattedAllowance,
    tokenId: null,
    trustedSpender: approval.trusted,
    riskLevel:
      approval.unlimited || approval.approvalKind === "permit2"
        ? "elevated"
        : "possible",
  };
}

function nftApprovalToExposure(approval: NftApproval): VisibleAssetExposure {
  const collectionWide = approval.kind === "approvalForAll";
  return {
    assetType: "nft",
    exposureKind: collectionWide
      ? "collection-wide-nft-approval"
      : "single-nft-approval",
    chainId: approval.chainId,
    assetAddress: approval.collectionAddress,
    assetLabel: approval.collectionName ?? "NFT collection",
    assetSymbol: approval.standard.toUpperCase(),
    spenderAddress: approval.operatorAddress,
    spenderLabel: approval.operatorLabel,
    amount: collectionWide ? "collection-wide approval" : "single-token approval",
    tokenId: approval.tokenId?.toString() ?? null,
    trustedSpender: approval.trusted,
    riskLevel: collectionWide ? "elevated" : "possible",
  };
}

function visibleAssetsRiskLevel({
  approvalsStatus,
  nftApprovalsStatus,
  summary,
}: {
  approvalsStatus: LifeboatModuleStatus;
  nftApprovalsStatus: LifeboatModuleStatus;
  summary: VisibleAssetsAnalysis["summary"];
}): VisibleAssetsRiskLevel {
  const statuses = [approvalsStatus, nftApprovalsStatus];
  const exposureCount = summary.tokenApprovalCount + summary.nftApprovalCount;
  if (statuses.every((status) => status === "not_scanned")) return "not_checked";
  if (statuses.some((status) => status === "scanning")) return "not_checked";
  if (statuses.every((status) => status === "unsupported")) return "unsupported";
  if (statuses.every((status) => status === "upstream_unavailable")) {
    return "upstream_unavailable";
  }
  if (exposureCount > 0) {
    if (
      summary.unlimitedTokenApprovalCount > 0 ||
      summary.collectionWideNftApprovalCount > 0 ||
      summary.permit2ApprovalCount > 0 ||
      exposureCount >= 5
    ) {
      return "elevated";
    }
    return "possible";
  }
  if (
    statuses.some(
      (status) => status === "partial" || status === "upstream_unavailable",
    )
  ) {
    return "insufficient_data";
  }
  return "none_detected";
}

function compareVisibleAssetExposure(
  left: VisibleAssetExposure,
  right: VisibleAssetExposure,
): number {
  const risk = riskRank(right.riskLevel) - riskRank(left.riskLevel);
  if (risk !== 0) return risk;
  if (left.assetType !== right.assetType) {
    return left.assetType === "token" ? -1 : 1;
  }
  return (
    left.assetLabel.localeCompare(right.assetLabel) ||
    left.spenderLabel.localeCompare(right.spenderLabel) ||
    left.assetAddress.localeCompare(right.assetAddress)
  );
}

function riskRank(
  riskLevel: VisibleAssetExposure["riskLevel"],
): number {
  if (riskLevel === "elevated") return 3;
  if (riskLevel === "possible") return 2;
  return 1;
}
