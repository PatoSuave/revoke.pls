import type { Approval } from "@/lib/approvals";

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
  /** Concrete signals that contributed to the prioritization. */
  drivers?: readonly string[];
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
  approvalKind?: Approval["approvalKind"];
  tokenCategory?: Approval["tokenCategory"];
}): RiskAssessment {
  const permit2 = input.approvalKind === "permit2";
  const hybrid = input.tokenCategory === "hybrid";
  const drivers = [
    input.trusted ? "Known spender" : "Unknown spender",
    input.unlimited ? "Unlimited approval" : "Limited approval",
    permit2 ? "Permit2 delegated allowance" : null,
    hybrid ? "Hybrid token contract" : null,
  ].filter((driver): driver is string => Boolean(driver));
  const withContext = (reason: string): RiskAssessment => ({
    level: input.trusted
      ? input.unlimited
        ? "medium"
        : "low"
      : input.unlimited
        ? "high"
        : "medium",
    reason: [
      reason,
      hybrid
        ? "Hybrid token detected; review token and NFT-style approval surfaces together."
        : null,
    ]
      .filter(Boolean)
      .join(" "),
    drivers,
  });

  if (input.trusted) {
    if (input.unlimited) {
      return withContext(
        permit2
          ? "Identified spender, but the Permit2 delegated allowance is unlimited. Review whether this approval is still needed."
          : "Identified spender, but the allowance is unlimited. Review whether this approval is still needed.",
      );
    }
    return withContext(
      permit2
        ? "Identified spender with a bounded Permit2 delegated allowance."
        : "Identified spender with a bounded allowance.",
    );
  }

  if (input.unlimited) {
    return withContext(
      permit2
        ? "Unknown spender with an unlimited Permit2 delegated allowance. Verify the spender before leaving delegated token access in place."
        : "Unknown spender with an unlimited allowance. Verify the address before leaving it in place.",
    );
  }

  return withContext(
    permit2
      ? "Unknown spender with a bounded Permit2 delegated allowance. Verify before trusting."
      : "Unknown spender with a bounded allowance. Verify before trusting.",
  );
}

export function scoreApprovals(
  approvals: readonly Approval[],
): ScoredApproval[] {
  return approvals.map((approval) => ({
    ...approval,
    risk: classifyApprovalRisk({
      trusted: approval.trusted,
      unlimited: approval.unlimited,
      approvalKind: approval.approvalKind,
      tokenCategory: approval.tokenCategory,
    }),
  }));
}

function riskRank(level: RiskLevel): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

export type ApprovalSort = "risk" | "token" | "spender";
export type ApprovalFilter =
  | "all"
  | "high"
  | "unlimited"
  | "trusted"
  | "permit2"
  | "hybrid";

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
    case "permit2":
      return approval.approvalKind === "permit2";
    case "hybrid":
      return approval.tokenCategory === "hybrid";
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
    approval.approvalKind ?? "",
    approval.tokenCategory,
    approval.tokenAddress,
    approval.spenderAddress,
    ...(approval.risk.drivers ?? []),
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
