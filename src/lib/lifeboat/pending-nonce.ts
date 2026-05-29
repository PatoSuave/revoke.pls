import { getAddress, isAddress, type Address } from "viem";

export type PendingNonceRiskLevel =
  | "not_checked"
  | "none_detected"
  | "possible"
  | "elevated"
  | "upstream_unavailable"
  | "unsupported";

export type PendingNonceScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export interface PendingNonceEvidence {
  latestNonce: string;
  pendingNonce: string;
  pendingTransactionCount: number;
  checkedAt: string;
}

export interface PendingNonceAnalysis {
  riskLevel: PendingNonceRiskLevel;
  evidence: PendingNonceEvidence[];
  summary: {
    latestNonce: string | null;
    pendingNonce: string | null;
    pendingTransactionCount: number;
    checkedAt: string | null;
  };
  warnings: string[];
}

export interface LifeboatPendingNonceApiResponse {
  ok: boolean;
  status: PendingNonceScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: PendingNonceRiskLevel;
  evidence: PendingNonceEvidence[];
  summary: PendingNonceAnalysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}

export interface AnalyzePendingNonceOptions {
  latestNonce: bigint;
  pendingNonce: bigint;
  checkedAt?: string;
}

export function analyzePendingNonce({
  latestNonce,
  pendingNonce,
  checkedAt = new Date().toISOString(),
}: AnalyzePendingNonceOptions): PendingNonceAnalysis {
  const pendingDelta = pendingNonce - latestNonce;
  const pendingTransactionCount =
    pendingDelta > 0n ? clampBigintToNumber(pendingDelta) : 0;
  const riskLevel = pendingNonceRiskLevel(pendingTransactionCount);
  const evidence =
    pendingTransactionCount > 0
      ? [
          {
            latestNonce: latestNonce.toString(),
            pendingNonce: pendingNonce.toString(),
            pendingTransactionCount,
            checkedAt,
          },
        ]
      : [];

  return {
    riskLevel,
    evidence,
    summary: {
      latestNonce: latestNonce.toString(),
      pendingNonce: pendingNonce.toString(),
      pendingTransactionCount,
      checkedAt,
    },
    warnings: [
      "This read-only nonce check can only compare latest and pending nonce values from the configured RPC. It cannot see every private, dropped, replaced, or unindexed transaction.",
    ],
  };
}

export function normalizePendingNonceOwner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function emptyPendingNonceSummary(): PendingNonceAnalysis["summary"] {
  return {
    latestNonce: null,
    pendingNonce: null,
    pendingTransactionCount: 0,
    checkedAt: null,
  };
}

export function pendingNonceRiskLabel(
  riskLevel: PendingNonceRiskLevel,
): string {
  switch (riskLevel) {
    case "elevated":
      return "Multiple pending nonces";
    case "possible":
      return "Pending nonce gap";
    case "none_detected":
      return "No pending nonce gap";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function pendingNonceRiskLevel(
  pendingTransactionCount: number,
): PendingNonceRiskLevel {
  if (pendingTransactionCount >= 2) return "elevated";
  if (pendingTransactionCount === 1) return "possible";
  return "none_detected";
}

function clampBigintToNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER;
  return Number(value);
}
