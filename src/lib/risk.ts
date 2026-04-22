import type { Approval } from "@/lib/approvals";
import type { NftApprovalKind } from "@/lib/discovery";

/**
 * Three-bucket approval risk classification. This is a deliberate, explicit,
 * deterministic taxonomy — no scores, no heuristics, no external reputation.
 * It is based entirely on information already in this repository:
 *
 *   - whether the allowance is effectively unlimited
 *   - whether the spender is in the curated registry
 *   - whether that registry entry is marked `isTrusted`
 *
 * The output is never an absolute safety claim. It is a prioritization aid
 * that helps a user decide what to look at first.
 */
export type RiskLevel = "low" | "medium" | "high";

export interface RiskAssessment {
  level: RiskLevel;
  /** Short, neutral sentence explaining the classification. */
  reason: string;
}

export interface ScoredApproval extends Approval {
  risk: RiskAssessment;
}

/**
 * Classification rules (kept small on purpose):
 *   trusted   + finite    → low    (known spender, bounded exposure)
 *   trusted   + unlimited → medium (known spender, unbounded exposure)
 *   untrusted + finite    → medium (unknown spender, bounded exposure)
 *   untrusted + unlimited → high   (unknown spender, unbounded exposure)
 */
export function classifyApprovalRisk(input: {
  trusted: boolean;
  unlimited: boolean;
}): RiskAssessment {
  if (input.trusted) {
    if (input.unlimited) {
      return {
        level: "medium",
        reason:
          "Trusted spender, but the allowance is unlimited. Consider reducing it unless actively used.",
      };
    }
    return {
      level: "low",
      reason: "Trusted spender with a bounded allowance.",
    };
  }

  if (input.unlimited) {
    return {
      level: "high",
      reason:
        "Unknown spender with an unlimited allowance. Verify the address before leaving it in place.",
    };
  }

  return {
    level: "medium",
    reason: "Unknown spender with a bounded allowance. Verify before trusting.",
  };
}

/**
 * Three-bucket NFT risk classification, parallel in shape to the ERC-20 one.
 *
 *   approvalForAll + unknown operator  → high   (collection-wide, unverified)
 *   approvalForAll + trusted operator  → medium (collection-wide, verified)
 *   tokenApproval + unknown operator   → medium (single NFT, unverified)
 *   tokenApproval + trusted operator   → low    (single NFT, verified)
 */
export function classifyNftRisk(input: {
  kind: NftApprovalKind;
  trusted: boolean;
}): RiskAssessment {
  if (input.kind === "approvalForAll") {
    if (input.trusted) {
      return {
        level: "medium",
        reason:
          "Trusted operator with collection-wide approval. Review periodically if the position is no longer active.",
      };
    }
    return {
      level: "high",
      reason:
        "Unknown operator with collection-wide approval. Every NFT in this collection is exposed — verify the operator before leaving it in place.",
    };
  }
  if (input.trusted) {
    return {
      level: "low",
      reason: "Trusted operator approved for a single NFT.",
    };
  }
  return {
    level: "medium",
    reason:
      "Unknown operator approved for a single NFT. Verify the operator before trusting.",
  };
}

export function scoreApprovals(
  approvals: readonly Approval[],
): ScoredApproval[] {
  return approvals.map((approval) => ({
    ...approval,
    risk: classifyApprovalRisk({
      trusted: approval.trusted,
      unlimited: approval.unlimited,
    }),
  }));
}

function riskRank(level: RiskLevel): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

export type ApprovalSort = "risk" | "token" | "spender";
export type ApprovalFilter = "all" | "high" | "unlimited" | "trusted";

export interface ApprovalFilterControls {
  query: string;
  sort: ApprovalSort;
  filter: ApprovalFilter;
}

function matchesFilter(
  approval: ScoredApproval,
  filter: ApprovalFilter,
): boolean {
  switch (filter) {
    case "high":
      return approval.risk.level === "high";
    case "unlimited":
      return approval.unlimited;
    case "trusted":
      return approval.trusted;
    case "all":
    default:
      return true;
  }
}

function matchesQuery(approval: ScoredApproval, needle: string): boolean {
  if (!needle) return true;
  const haystack = [
    approval.tokenSymbol,
    approval.tokenName ?? "",
    approval.spenderLabel,
    approval.protocol,
    approval.tokenAddress,
    approval.spenderAddress,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

/**
 * Pure filter + sort pipeline for the scanner table. Applies the active
 * category filter, then the text query, then the sort.
 *
 * "risk" sort order: high-risk first → unlimited before finite within the
 * same risk tier → spender alpha → token alpha.
 */
export function filterAndSortScoredApprovals(
  scored: readonly ScoredApproval[],
  { query, sort, filter }: ApprovalFilterControls,
): ScoredApproval[] {
  const needle = query.trim().toLowerCase();
  const filtered = scored.filter(
    (a) => matchesFilter(a, filter) && matchesQuery(a, needle),
  );

  filtered.sort((a, b) => {
    if (sort === "risk") {
      const rankDiff = riskRank(b.risk.level) - riskRank(a.risk.level);
      if (rankDiff !== 0) return rankDiff;
      if (a.unlimited !== b.unlimited) return a.unlimited ? -1 : 1;
      const labelCmp = a.spenderLabel.localeCompare(b.spenderLabel);
      if (labelCmp !== 0) return labelCmp;
      return a.tokenSymbol.localeCompare(b.tokenSymbol);
    }
    if (sort === "token") {
      const tokenCmp = a.tokenSymbol.localeCompare(b.tokenSymbol);
      if (tokenCmp !== 0) return tokenCmp;
      return a.spenderLabel.localeCompare(b.spenderLabel);
    }
    const spenderCmp = a.spenderLabel.localeCompare(b.spenderLabel);
    if (spenderCmp !== 0) return spenderCmp;
    return a.tokenSymbol.localeCompare(b.tokenSymbol);
  });

  return filtered;
}
