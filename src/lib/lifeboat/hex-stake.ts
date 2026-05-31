import { formatUnits, getAddress, isAddress, type Address } from "viem";

export const HEX_TOKEN_ADDRESS =
  "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" as const;
export const HEX_DECIMALS = 8;
export const HEX_GRACE_DAYS = 14;

export type HexStakeRiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type HexStakeScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "partial"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export type HexStakeStatus =
  | "active"
  | "mature"
  | "late"
  | "good_accounting_candidate"
  | "ended_or_accounted";

export interface HexStakeRow {
  stakeId: string;
  stakedHearts: string;
  stakedHex: string;
  stakeShares: string;
  lockedDay: number;
  stakedDays: number;
  endDay: number;
  unlockedDay: number;
  isAutoStake: boolean;
  servedDays: number;
  daysRemaining: number;
  daysLate: number;
  status: HexStakeStatus;
}

export interface HexStakeEvidence {
  stakeId: string;
  status: HexStakeStatus;
  title: string;
  description: string;
  riskLevel: "informational" | "possible" | "elevated";
  stakedHex: string;
  lockedDay: number;
  stakedDays: number;
  endDay: number;
  daysRemaining: number;
  daysLate: number;
  explorerUrl: string | null;
}

export interface HexStakeAnalysis {
  riskLevel: HexStakeRiskLevel;
  stakes: HexStakeRow[];
  evidence: HexStakeEvidence[];
  summary: {
    currentDay: number;
    checkedStakeCount: number;
    totalOpenStakeCount: number;
    activeStakeCount: number;
    matureStakeCount: number;
    lateStakeCount: number;
    goodAccountingCandidateCount: number;
    endedOrAccountedVisibleCount: number;
    truncated: boolean;
    maxStakeRows: number;
  };
  warnings: string[];
}

export interface LifeboatHexStakeApiResponse {
  ok: boolean;
  status: HexStakeScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: HexStakeRiskLevel;
  stakes: HexStakeRow[];
  evidence: HexStakeEvidence[];
  summary: HexStakeAnalysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
  supported: boolean;
  supportNotes: string[];
}

export interface HexStakeContractRow {
  stakeId: bigint;
  stakedHearts: bigint;
  stakeShares: bigint;
  lockedDay: number;
  stakedDays: number;
  unlockedDay: number;
  isAutoStake: boolean;
}

export interface AnalyzeHexStakesOptions {
  currentDay: number;
  totalOpenStakeCount: number;
  rows: readonly HexStakeContractRow[];
  maxStakeRows: number;
  explorerUrl?: string | null;
}

export function analyzeHexStakes({
  currentDay,
  totalOpenStakeCount,
  rows,
  maxStakeRows,
  explorerUrl = null,
}: AnalyzeHexStakesOptions): HexStakeAnalysis {
  const stakes = rows.map((row) => normalizeHexStakeRow(row, currentDay));
  const evidence = stakes.flatMap((stake) => evidenceForHexStake(stake, explorerUrl));
  const summary = summarizeHexStakes({
    currentDay,
    totalOpenStakeCount,
    stakes,
    maxStakeRows,
  });

  return {
    riskLevel: hexStakeRiskLevel(summary),
    stakes,
    evidence,
    summary,
    warnings: [
      "This read-only diagnostic checks visible open HEX stake rows. It does not run or prepare End Stake, Emergency End Stake, or Good Accounting.",
      "Ended or historical HEX stakes require event indexing and are not fully inventoried in this first pass.",
      "Mature or late stake context is informational. It is not payout advice and does not guarantee recoverable value.",
    ],
  };
}

export function normalizeHexStakeOwner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function emptyHexStakeSummary(): HexStakeAnalysis["summary"] {
  return {
    currentDay: 0,
    checkedStakeCount: 0,
    totalOpenStakeCount: 0,
    activeStakeCount: 0,
    matureStakeCount: 0,
    lateStakeCount: 0,
    goodAccountingCandidateCount: 0,
    endedOrAccountedVisibleCount: 0,
    truncated: false,
    maxStakeRows: 0,
  };
}

export function hexStakeRiskLabel(riskLevel: HexStakeRiskLevel): string {
  switch (riskLevel) {
    case "elevated":
      return "Late stake review";
    case "possible":
      return "Mature stake context";
    case "informational":
      return "Open stake context";
    case "none_detected":
      return "No open stakes found";
    case "insufficient_data":
      return "Incomplete HEX stake check";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function normalizeHexStakeRow(
  row: HexStakeContractRow,
  currentDay: number,
): HexStakeRow {
  const endDay = row.lockedDay + row.stakedDays;
  const servedDays = Math.max(0, Math.min(currentDay - row.lockedDay, row.stakedDays));
  const daysRemaining = Math.max(0, endDay - currentDay);
  const daysLate = Math.max(0, currentDay - endDay);
  const status = classifyHexStake({
    currentDay,
    endDay,
    unlockedDay: row.unlockedDay,
    daysLate,
  });

  return {
    stakeId: row.stakeId.toString(),
    stakedHearts: row.stakedHearts.toString(),
    stakedHex: formatHexAmount(row.stakedHearts),
    stakeShares: row.stakeShares.toString(),
    lockedDay: row.lockedDay,
    stakedDays: row.stakedDays,
    endDay,
    unlockedDay: row.unlockedDay,
    isAutoStake: row.isAutoStake,
    servedDays,
    daysRemaining,
    daysLate,
    status,
  };
}

function classifyHexStake({
  currentDay,
  endDay,
  unlockedDay,
  daysLate,
}: {
  currentDay: number;
  endDay: number;
  unlockedDay: number;
  daysLate: number;
}): HexStakeStatus {
  if (unlockedDay > 0) return "ended_or_accounted";
  if (currentDay < endDay) return "active";
  if (daysLate > HEX_GRACE_DAYS) return "good_accounting_candidate";
  if (daysLate > 0) return "late";
  return "mature";
}

function evidenceForHexStake(
  stake: HexStakeRow,
  explorerUrl: string | null,
): HexStakeEvidence[] {
  if (stake.status === "active") {
    return [
      {
        stakeId: stake.stakeId,
        status: stake.status,
        title: "Active HEX stake",
        description:
          "This visible open stake has not reached its served end day yet. Lifeboat does not prepare Emergency End Stake.",
        riskLevel: "informational",
        stakedHex: stake.stakedHex,
        lockedDay: stake.lockedDay,
        stakedDays: stake.stakedDays,
        endDay: stake.endDay,
        daysRemaining: stake.daysRemaining,
        daysLate: stake.daysLate,
        explorerUrl,
      },
    ];
  }
  if (stake.status === "ended_or_accounted") {
    return [
      {
        stakeId: stake.stakeId,
        status: stake.status,
        title: "Stake row reports unlocked day",
        description:
          "The visible stake row reports an unlocked day. Historical stake state is informational and should be verified on-chain.",
        riskLevel: "informational",
        stakedHex: stake.stakedHex,
        lockedDay: stake.lockedDay,
        stakedDays: stake.stakedDays,
        endDay: stake.endDay,
        daysRemaining: stake.daysRemaining,
        daysLate: stake.daysLate,
        explorerUrl,
      },
    ];
  }

  const goodAccountingCandidate = stake.status === "good_accounting_candidate";
  return [
    {
      stakeId: stake.stakeId,
      status: stake.status,
      title: goodAccountingCandidate
        ? "Late mature stake context"
        : stake.status === "late"
          ? "Mature stake past end day"
          : "Mature stake at end day",
      description: goodAccountingCandidate
        ? "This visible open stake is past the normal grace window. A clean-wallet Good Accounting review may be relevant later, but this Lifeboat pass does not execute or prepare that transaction."
        : "This visible open stake appears mature or recently past its end day. Lifeboat does not run or prepare End Stake.",
      riskLevel: goodAccountingCandidate ? "elevated" : "possible",
      stakedHex: stake.stakedHex,
      lockedDay: stake.lockedDay,
      stakedDays: stake.stakedDays,
      endDay: stake.endDay,
      daysRemaining: stake.daysRemaining,
      daysLate: stake.daysLate,
      explorerUrl,
    },
  ];
}

function summarizeHexStakes({
  currentDay,
  totalOpenStakeCount,
  stakes,
  maxStakeRows,
}: {
  currentDay: number;
  totalOpenStakeCount: number;
  stakes: readonly HexStakeRow[];
  maxStakeRows: number;
}): HexStakeAnalysis["summary"] {
  return {
    currentDay,
    checkedStakeCount: stakes.length,
    totalOpenStakeCount,
    activeStakeCount: stakes.filter((stake) => stake.status === "active").length,
    matureStakeCount: stakes.filter((stake) => stake.status === "mature").length,
    lateStakeCount: stakes.filter((stake) => stake.status === "late").length,
    goodAccountingCandidateCount: stakes.filter(
      (stake) => stake.status === "good_accounting_candidate",
    ).length,
    endedOrAccountedVisibleCount: stakes.filter(
      (stake) => stake.status === "ended_or_accounted",
    ).length,
    truncated: totalOpenStakeCount > stakes.length,
    maxStakeRows,
  };
}

function hexStakeRiskLevel(
  summary: HexStakeAnalysis["summary"],
): HexStakeRiskLevel {
  if (summary.truncated) return "insufficient_data";
  if (summary.goodAccountingCandidateCount > 0) return "elevated";
  if (summary.lateStakeCount > 0 || summary.matureStakeCount > 0) {
    return "possible";
  }
  if (summary.checkedStakeCount > 0) return "informational";
  return "none_detected";
}

function formatHexAmount(value: bigint): string {
  const formatted = formatUnits(value, HEX_DECIMALS)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
  return `${formatted} HEX`;
}
