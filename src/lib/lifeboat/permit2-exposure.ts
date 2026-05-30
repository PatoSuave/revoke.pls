import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";

export type Permit2ExposureRiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export interface Permit2ExposureEvidence {
  tokenAddress: Address;
  tokenSymbol: string;
  tokenName?: string;
  spenderAddress: Address;
  spenderLabel: string;
  approvalContractAddress: Address | null;
  formattedAllowance: string;
  unlimited: boolean;
  expiration: {
    timestamp: number | null;
    iso: string | null;
    status: "active" | "expired" | "unknown";
  };
  nonce: number | null;
}

export interface Permit2ExposureAnalysis {
  riskLevel: Permit2ExposureRiskLevel;
  evidence: Permit2ExposureEvidence[];
  summary: {
    activePermit2Count: number;
    unlimitedPermit2Count: number;
    expiringPermit2Count: number;
    unknownExpirationCount: number;
  };
  warnings: string[];
}

export interface AnalyzePermit2ExposureOptions {
  approvals: readonly Approval[];
  approvalStatus: Permit2ExposureModuleStatus;
  nowUnix?: number;
  evidenceLimit?: number;
}

type Permit2ExposureModuleStatus =
  | "not_scanned"
  | "scanning"
  | "complete"
  | "partial"
  | "planned"
  | "unsupported"
  | "upstream_unavailable";

const DEFAULT_EVIDENCE_LIMIT = 12;

export function analyzePermit2Exposure({
  approvals,
  approvalStatus,
  nowUnix = Math.floor(Date.now() / 1000),
  evidenceLimit = DEFAULT_EVIDENCE_LIMIT,
}: AnalyzePermit2ExposureOptions): Permit2ExposureAnalysis {
  const permit2Approvals = approvals
    .filter((approval) => approval.approvalKind === "permit2")
    .sort(comparePermit2Approvals);
  const allEvidence = permit2Approvals.map((approval) =>
    evidenceFromApproval(approval, nowUnix),
  );
  const evidence = allEvidence.slice(0, evidenceLimit);
  const summary = {
    activePermit2Count: permit2Approvals.length,
    unlimitedPermit2Count: permit2Approvals.filter((approval) => approval.unlimited)
      .length,
    expiringPermit2Count: allEvidence.filter(
      (item) => item.expiration.status === "active",
    ).length,
    unknownExpirationCount: allEvidence.filter(
      (item) => item.expiration.status === "unknown",
    ).length,
  };

  return {
    riskLevel: permit2RiskLevel({
      approvalStatus,
      activePermit2Count: summary.activePermit2Count,
      unlimitedPermit2Count: summary.unlimitedPermit2Count,
    }),
    evidence,
    summary,
    warnings: [
      "Permit2 exposure is derived from live-read Permit2 rows in the existing approval scan. It is read-only and does not request signatures or submit revoke transactions.",
      "A missing Permit2 row does not prove there are no off-chain signatures, expired permissions, unsupported-chain permissions, or unindexed authorizations.",
    ],
  };
}

export function permit2ExposureRiskLabel(
  riskLevel: Permit2ExposureRiskLevel,
): string {
  switch (riskLevel) {
    case "elevated":
      return "Elevated Permit2 exposure";
    case "possible":
      return "Active Permit2 exposure";
    case "informational":
      return "Permit2 context found";
    case "none_detected":
      return "No active Permit2 rows found";
    case "insufficient_data":
      return "Incomplete Permit2 check";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function permit2RiskLevel({
  approvalStatus,
  activePermit2Count,
  unlimitedPermit2Count,
}: {
  approvalStatus: Permit2ExposureModuleStatus;
  activePermit2Count: number;
  unlimitedPermit2Count: number;
}): Permit2ExposureRiskLevel {
  if (approvalStatus === "not_scanned" || approvalStatus === "scanning") {
    return "not_checked";
  }
  if (approvalStatus === "unsupported") return "unsupported";
  if (approvalStatus === "upstream_unavailable") return "upstream_unavailable";
  if (activePermit2Count > 0) {
    return unlimitedPermit2Count > 0 || activePermit2Count >= 2
      ? "elevated"
      : "possible";
  }
  if (approvalStatus === "partial") return "insufficient_data";
  return "none_detected";
}

function evidenceFromApproval(
  approval: Approval,
  nowUnix: number,
): Permit2ExposureEvidence {
  const expirationTimestamp = approval.permit2Expiration ?? null;
  const expirationStatus =
    expirationTimestamp === null
      ? "unknown"
      : expirationTimestamp > nowUnix
        ? "active"
        : "expired";

  return {
    tokenAddress: approval.tokenAddress,
    tokenSymbol: approval.tokenSymbol,
    ...(approval.tokenName ? { tokenName: approval.tokenName } : {}),
    spenderAddress: approval.spenderAddress,
    spenderLabel: approval.spenderLabel,
    approvalContractAddress: approval.approvalContractAddress ?? null,
    formattedAllowance: approval.formattedAllowance,
    unlimited: approval.unlimited,
    expiration: {
      timestamp: expirationTimestamp,
      iso:
        expirationTimestamp === null
          ? null
          : new Date(expirationTimestamp * 1000).toISOString(),
      status: expirationStatus,
    },
    nonce: approval.permit2Nonce ?? null,
  };
}

function comparePermit2Approvals(a: Approval, b: Approval): number {
  if (a.unlimited !== b.unlimited) return a.unlimited ? -1 : 1;
  const aExpiration = a.permit2Expiration ?? Number.MAX_SAFE_INTEGER;
  const bExpiration = b.permit2Expiration ?? Number.MAX_SAFE_INTEGER;
  if (aExpiration !== bExpiration) return aExpiration - bExpiration;
  return `${a.tokenSymbol}-${a.spenderAddress}`.localeCompare(
    `${b.tokenSymbol}-${b.spenderAddress}`,
  );
}
