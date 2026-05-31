import { formatUnits, getAddress, isAddress, type Address } from "viem";

export type SweeperRiskLevel =
  | "not_checked"
  | "none_detected"
  | "possible"
  | "strong"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type SweeperScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export interface SweeperHistoryTransaction {
  hash: string;
  from: Address;
  to: Address | null;
  valueWei: bigint;
  timestamp: number;
}

export interface SweeperEvidence {
  inboundTxHash: string;
  outboundTxHash: string;
  inboundAt: string;
  outboundAt: string;
  secondsBetween: number;
  amountNative: string;
  possibleSweeperAddress: Address;
}

export interface SweeperAnalysis {
  riskLevel: SweeperRiskLevel;
  evidence: SweeperEvidence[];
  summary: {
    checkedTransactionCount: number;
    inboundNativeTransferCount: number;
    outboundNativeTransferCount: number;
    quickDrainCount: number;
    repeatedDrainRecipientCount: number;
    windowSeconds: number;
  };
  warnings: string[];
}

export interface LifeboatSweeperApiResponse {
  ok: boolean;
  status: SweeperScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: SweeperRiskLevel;
  evidence: SweeperEvidence[];
  summary: SweeperAnalysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}

export interface AnalyzeSweeperPatternOptions {
  owner: Address;
  chainNativeSymbol: string;
  transactions: readonly SweeperHistoryTransaction[];
  windowSeconds?: number;
  evidenceLimit?: number;
}

const DEFAULT_WINDOW_SECONDS = 180;
const DEFAULT_EVIDENCE_LIMIT = 5;

export function analyzeSweeperPattern({
  owner,
  chainNativeSymbol,
  transactions,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
  evidenceLimit = DEFAULT_EVIDENCE_LIMIT,
}: AnalyzeSweeperPatternOptions): SweeperAnalysis {
  const normalizedOwner = owner.toLowerCase();
  const ordered = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
  const inbound = ordered.filter(
    (tx) =>
      tx.to?.toLowerCase() === normalizedOwner &&
      tx.from.toLowerCase() !== normalizedOwner &&
      tx.valueWei > 0n,
  );
  const outbound = ordered.filter(
    (tx) =>
      tx.from.toLowerCase() === normalizedOwner &&
      tx.to?.toLowerCase() !== normalizedOwner &&
      tx.valueWei > 0n,
  );
  const usedOutbound = new Set<string>();
  const evidence: SweeperEvidence[] = [];

  for (const incoming of inbound) {
    const match = outbound.find(
      (candidate) =>
        !usedOutbound.has(candidate.hash) &&
        candidate.timestamp >= incoming.timestamp &&
        candidate.timestamp - incoming.timestamp <= windowSeconds,
    );
    if (!match?.to) continue;
    usedOutbound.add(match.hash);
    if (evidence.length < evidenceLimit) {
      evidence.push({
        inboundTxHash: incoming.hash,
        outboundTxHash: match.hash,
        inboundAt: new Date(incoming.timestamp * 1000).toISOString(),
        outboundAt: new Date(match.timestamp * 1000).toISOString(),
        secondsBetween: match.timestamp - incoming.timestamp,
        amountNative: `${trimFormattedNative(incoming.valueWei)} ${chainNativeSymbol}`,
        possibleSweeperAddress: match.to,
      });
    }
  }

  const repeatedDrainRecipientCount = countRepeatedRecipients(evidence);
  const quickDrainCount = usedOutbound.size;
  const riskLevel = sweeperRiskLevel({
    checkedTransactionCount: ordered.length,
    inboundCount: inbound.length,
    quickDrainCount,
    repeatedDrainRecipientCount,
  });

  return {
    riskLevel,
    evidence,
    summary: {
      checkedTransactionCount: ordered.length,
      inboundNativeTransferCount: inbound.length,
      outboundNativeTransferCount: outbound.length,
      quickDrainCount,
      repeatedDrainRecipientCount,
      windowSeconds,
    },
    warnings: [
      "This read-only heuristic does not confirm an attacker and does not rule out sweepers that use private relays, token transfers, internal calls, or unindexed activity.",
    ],
  };
}

export function normalizeSweeperOwner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function emptySweeperSummary(
  windowSeconds = DEFAULT_WINDOW_SECONDS,
): SweeperAnalysis["summary"] {
  return {
    checkedTransactionCount: 0,
    inboundNativeTransferCount: 0,
    outboundNativeTransferCount: 0,
    quickDrainCount: 0,
    repeatedDrainRecipientCount: 0,
    windowSeconds,
  };
}

export function sweeperRiskLabel(riskLevel: SweeperRiskLevel): string {
  switch (riskLevel) {
    case "strong":
      return "Strong pattern";
    case "possible":
      return "Possible pattern";
    case "none_detected":
      return "No quick drain found";
    case "insufficient_data":
      return "Insufficient data";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function sweeperRiskLevel({
  checkedTransactionCount,
  inboundCount,
  quickDrainCount,
  repeatedDrainRecipientCount,
}: {
  checkedTransactionCount: number;
  inboundCount: number;
  quickDrainCount: number;
  repeatedDrainRecipientCount: number;
}): SweeperRiskLevel {
  if (checkedTransactionCount < 2 || inboundCount === 0) {
    return "insufficient_data";
  }
  if (quickDrainCount >= 2 || repeatedDrainRecipientCount > 0) {
    return "strong";
  }
  if (quickDrainCount === 1) {
    return "possible";
  }
  return "none_detected";
}

function countRepeatedRecipients(evidence: readonly SweeperEvidence[]): number {
  const counts = new Map<string, number>();
  for (const item of evidence) {
    const key = item.possibleSweeperAddress.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

function trimFormattedNative(valueWei: bigint): string {
  const formatted = formatUnits(valueWei, 18);
  return formatted.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}
