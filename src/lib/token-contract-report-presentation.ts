import type {
  TokenContractCriticalCheck,
  TokenContractFinding,
  TokenContractReportModule,
  TokenContractReportResponse,
} from "@/lib/token-contract-report";

export type TokenContractAnswerTone =
  | "danger"
  | "good"
  | "caution"
  | "neutral";

export interface TokenContractCriticalCheckAnswer {
  label: string;
  tone: TokenContractAnswerTone;
  isOpen: boolean;
}

export interface TokenContractReportDigest {
  confirmedConcerns: TokenContractFinding[];
  reviewFindings: TokenContractFinding[];
  unresolvedChecks: TokenContractCriticalCheck[];
  incompleteModules: TokenContractReportModule[];
  priorityFindings: TokenContractFinding[];
  priorityChecks: TokenContractCriticalCheck[];
  nextChecks: string[];
  confirmedConcernCount: number;
  openEvidenceItemCount: number;
  deterministicModuleCount: number;
  completedDeterministicModuleCount: number;
  collectionIssueCount: number;
  evidenceIncomplete: boolean;
  directOutcome: string;
  completenessNote: string;
}

const FINDING_SEVERITY_RANK: Record<TokenContractFinding["severity"], number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const FINDING_STATE_RANK: Record<TokenContractFinding["state"], number> = {
  confirmed: 4,
  "review-clue": 3,
  unresolved: 2,
  "not-detected": 1,
};

const CHECK_PRIORITY: Record<TokenContractCriticalCheck["status"], number> = {
  confirmed: 5,
  needs_review: 4,
  not_collected: 3,
  unknown: 2,
  not_detected: 1,
};

export function criticalCheckAnswer(
  check: TokenContractCriticalCheck,
): TokenContractCriticalCheckAnswer {
  if (check.status === "confirmed") {
    if (check.disposition === "concern") {
      return { label: "Concern confirmed", tone: "danger", isOpen: false };
    }
    if (check.disposition === "protective") {
      return {
        label: "Protective evidence confirmed",
        tone: "good",
        isOpen: false,
      };
    }
    return { label: "Evidence confirmed", tone: "neutral", isOpen: false };
  }
  if (check.status === "needs_review") {
    return { label: "Needs review", tone: "caution", isOpen: true };
  }
  if (check.status === "not_collected") {
    return { label: "Not checked", tone: "neutral", isOpen: true };
  }
  if (check.status === "not_detected") {
    return {
      label: "Not detected in collected evidence",
      tone: "neutral",
      isOpen: false,
    };
  }
  return { label: "Unknown", tone: "caution", isOpen: true };
}

export function rankFindings(
  findings: TokenContractFinding[],
): TokenContractFinding[] {
  return [...findings].sort((left, right) => {
    const severityDifference =
      FINDING_SEVERITY_RANK[right.severity] -
      FINDING_SEVERITY_RANK[left.severity];
    if (severityDifference !== 0) return severityDifference;

    const stateDifference =
      FINDING_STATE_RANK[right.state] - FINDING_STATE_RANK[left.state];
    if (stateDifference !== 0) return stateDifference;

    const confidenceDifference = right.confidence - left.confidence;
    if (confidenceDifference !== 0) return confidenceDifference;

    return left.title.localeCompare(right.title);
  });
}

export function rankCriticalChecks(
  checks: TokenContractCriticalCheck[],
): TokenContractCriticalCheck[] {
  return [...checks].sort((left, right) => {
    const leftConcernBoost =
      left.status === "confirmed" && left.disposition === "concern" ? 2 : 0;
    const rightConcernBoost =
      right.status === "confirmed" && right.disposition === "concern" ? 2 : 0;
    const priorityDifference =
      CHECK_PRIORITY[right.status] +
      rightConcernBoost -
      (CHECK_PRIORITY[left.status] + leftConcernBoost);
    if (priorityDifference !== 0) return priorityDifference;
    return left.question.localeCompare(right.question);
  });
}

export function buildReportDigest(
  report: TokenContractReportResponse,
): TokenContractReportDigest {
  const rankedFindings = rankFindings(report.findings);
  const confirmedConcerns = rankedFindings.filter(
    (finding) =>
      finding.state === "confirmed" && finding.severity !== "info",
  );
  const reviewFindings = rankedFindings.filter(
    (finding) =>
      finding.state === "review-clue" || finding.state === "unresolved",
  );
  const unresolvedChecks = report.audit.criticalChecks.filter(
    (check) => criticalCheckAnswer(check).isOpen,
  );
  const deterministicModules = Object.values(report.modules).filter(
    (module) => module.id !== "ai",
  );
  const incompleteModules = deterministicModules.filter(
    (module) => module.status !== "complete",
  );
  const openQuestionCount = Math.max(
    reviewFindings.length,
    unresolvedChecks.length,
    report.audit.reviewChecks + report.audit.notEvaluatedChecks,
  );
  const openEvidenceItemCount = openQuestionCount + incompleteModules.length;
  const collectionIssueCount =
    report.warnings.length +
    report.errors.length +
    report.missingConfig.length;
  const evidenceIncomplete =
    report.audit.coveragePercent < 100 ||
    report.audit.reviewChecks > 0 ||
    report.audit.notEvaluatedChecks > 0 ||
    incompleteModules.length > 0 ||
    report.errors.length > 0 ||
    report.missingConfig.length > 0;
  const confirmedConcernCount = confirmedConcerns.length;

  return {
    confirmedConcerns,
    reviewFindings,
    unresolvedChecks,
    incompleteModules,
    priorityFindings: confirmedConcerns.slice(0, 3),
    priorityChecks: rankCriticalChecks(report.audit.criticalChecks).slice(0, 6),
    nextChecks: uniqueStrings(
      [...confirmedConcerns, ...reviewFindings]
        .map((finding) => finding.recommendation.trim())
        .filter(Boolean),
    ).slice(0, 3),
    confirmedConcernCount,
    openEvidenceItemCount,
    deterministicModuleCount: deterministicModules.length,
    completedDeterministicModuleCount: deterministicModules.filter(
      (module) => module.status === "complete",
    ).length,
    collectionIssueCount,
    evidenceIncomplete,
    directOutcome:
      confirmedConcernCount > 0
        ? `${confirmedConcernCount} confirmed ${pluralize("concern", confirmedConcernCount)} found`
        : openEvidenceItemCount > 0
          ? `No confirmed concerns found; ${openEvidenceItemCount} ${pluralize("area", openEvidenceItemCount)} still need review`
          : "No confirmed concerns found in the collected evidence",
    completenessNote: evidenceIncomplete
      ? "Evidence is incomplete. Missing or unresolved checks must not be treated as proof that the contract is safe."
      : "All required evidence modules reported complete, but this remains a point-in-time read-only report - not proof of safety or future behavior.",
  };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pluralize(value: string, count: number): string {
  return count === 1 ? value : value + "s";
}
