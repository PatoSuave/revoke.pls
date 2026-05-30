import type { Address } from "viem";

import type {
  HexStakeRow,
  LifeboatHexStakeApiResponse,
} from "@/lib/lifeboat/hex-stake";

export type GoodAccountingAssistRiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export interface GoodAccountingCandidate {
  stakeId: string;
  stakedHex: string;
  lockedDay: number;
  stakedDays: number;
  endDay: number;
  daysLate: number;
  owner: Address | null;
  reason: string;
  cleanWalletNote: string;
}

export interface GoodAccountingAssistEvidence {
  stakeId: string;
  title: string;
  description: string;
  riskLevel: "possible" | "elevated";
  stakedHex: string;
  endDay: number;
  daysLate: number;
}

export interface GoodAccountingAssistAnalysis {
  riskLevel: GoodAccountingAssistRiskLevel;
  candidates: GoodAccountingCandidate[];
  evidence: GoodAccountingAssistEvidence[];
  summary: {
    candidateCount: number;
    checkedStakeCount: number;
    sourceStatus: LifeboatHexStakeApiResponse["status"];
    sourceComplete: boolean;
    sourceSupported: boolean;
  };
  warnings: string[];
}

export function analyzeGoodAccountingAssist(
  hexStake: LifeboatHexStakeApiResponse,
): GoodAccountingAssistAnalysis {
  const sourceStatus = hexStake.status;
  const candidates = buildCandidates(hexStake.stakes, hexStake.owner);
  const sourceComplete = sourceStatus === "complete";
  const sourceSupported = hexStake.supported && sourceStatus !== "unsupported";

  return {
    riskLevel: goodAccountingRiskLevel({ hexStake, candidates }),
    candidates,
    evidence: candidates.map(candidateToEvidence),
    summary: {
      candidateCount: candidates.length,
      checkedStakeCount: hexStake.summary.checkedStakeCount,
      sourceStatus,
      sourceComplete,
      sourceSupported,
    },
    warnings: [
      "Good Accounting Assist is informational only. It does not prepare, sign, submit, relay, or simulate a Good Accounting transaction.",
      "If Good Accounting is relevant, review it from a clean wallet and a trusted HEX contract interface. Do not connect or fund a wallet whose secret may be compromised.",
      "Candidate detection depends on the read-only HEX stake diagnostic. Missing or incomplete stake reads are not an all-clear state.",
    ],
  };
}

export function emptyGoodAccountingAssistSummary(): GoodAccountingAssistAnalysis["summary"] {
  return {
    candidateCount: 0,
    checkedStakeCount: 0,
    sourceStatus: "idle",
    sourceComplete: false,
    sourceSupported: false,
  };
}

export function goodAccountingAssistRiskLabel(
  riskLevel: GoodAccountingAssistRiskLevel,
): string {
  switch (riskLevel) {
    case "elevated":
      return "Good Accounting candidates";
    case "possible":
      return "Review mature stakes";
    case "informational":
      return "No candidates in checked rows";
    case "none_detected":
      return "No candidates found";
    case "insufficient_data":
      return "Incomplete assist";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function buildCandidates(
  stakes: readonly HexStakeRow[],
  owner: Address | null,
): GoodAccountingCandidate[] {
  return stakes
    .filter((stake) => stake.status === "good_accounting_candidate")
    .map((stake) => ({
      stakeId: stake.stakeId,
      stakedHex: stake.stakedHex,
      lockedDay: stake.lockedDay,
      stakedDays: stake.stakedDays,
      endDay: stake.endDay,
      daysLate: stake.daysLate,
      owner,
      reason:
        "The visible open stake is past the normal grace window in the read-only HEX stake diagnostic.",
      cleanWalletNote:
        "A clean wallet may be able to review Good Accounting manually; Lifeboat does not create or submit that transaction.",
    }));
}

function candidateToEvidence(
  candidate: GoodAccountingCandidate,
): GoodAccountingAssistEvidence {
  return {
    stakeId: candidate.stakeId,
    title: "Possible Good Accounting candidate",
    description:
      "This visible open stake is late enough for Good Accounting review from a clean wallet. Lifeboat does not execute or prepare Good Accounting.",
    riskLevel: "elevated",
    stakedHex: candidate.stakedHex,
    endDay: candidate.endDay,
    daysLate: candidate.daysLate,
  };
}

function goodAccountingRiskLevel({
  hexStake,
  candidates,
}: {
  hexStake: LifeboatHexStakeApiResponse;
  candidates: readonly GoodAccountingCandidate[];
}): GoodAccountingAssistRiskLevel {
  if (hexStake.status === "idle" || hexStake.status === "scanning") {
    return "not_checked";
  }
  if (hexStake.status === "unsupported") return "unsupported";
  if (
    hexStake.status === "config-missing" ||
    hexStake.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  if (hexStake.status === "partial") return "insufficient_data";
  if (candidates.length > 0) return "elevated";
  return hexStake.summary.checkedStakeCount > 0 ? "informational" : "none_detected";
}
