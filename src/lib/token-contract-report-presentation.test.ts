import { describe, expect, it } from "vitest";

import {
  buildReportDigest,
  criticalCheckAnswer,
  rankFindings,
} from "@/lib/token-contract-report-presentation";
import {
  createEmptyTokenContractReportResponse,
  type TokenContractCriticalCheck,
  type TokenContractFinding,
} from "@/lib/token-contract-report";

describe("token contract report presentation", () => {
  it("uses cautious answer labels without turning missing evidence into a safety claim", () => {
    const checks: TokenContractCriticalCheck[] = [
      check("Can the owner mint?", "confirmed", "concern"),
      check("Is source verified?", "confirmed", "protective"),
      check("Can transfer fees change?", "needs_review", "unresolved"),
      check("Was liquidity custody checked?", "not_collected", "unresolved"),
      check("Was a risky bytecode template found?", "not_detected", "unresolved"),
      check("Is the proxy upgradeable?", "unknown", "unresolved"),
    ];

    expect(checks.map(criticalCheckAnswer)).toEqual([
      { label: "Concern confirmed", tone: "danger", isOpen: false },
      {
        label: "Protective evidence confirmed",
        tone: "good",
        isOpen: false,
      },
      { label: "Needs review", tone: "caution", isOpen: true },
      { label: "Not checked", tone: "neutral", isOpen: true },
      {
        label: "Not detected in collected evidence",
        tone: "neutral",
        isOpen: false,
      },
      { label: "Unknown", tone: "caution", isOpen: true },
    ]);

    const absenceLabel = criticalCheckAnswer(checks[4]).label.toLocaleLowerCase();
    expect(absenceLabel).not.toContain("safe");
    expect(absenceLabel).not.toContain("all clear");
  });

  it("ranks user-impacting findings by severity, state, and confidence", () => {
    const findings = [
      finding("medium-confirmed", "medium", "confirmed", 99),
      finding("critical-review", "critical", "review-clue", 50),
      finding("critical-confirmed-low", "critical", "confirmed", 80),
      finding("critical-confirmed-high", "critical", "confirmed", 95),
    ];

    expect(rankFindings(findings).map((item) => item.id)).toEqual([
      "critical-confirmed-high",
      "critical-confirmed-low",
      "critical-review",
      "medium-confirmed",
    ]);
  });

  it("builds a concise digest while retaining explicit incomplete-evidence language", () => {
    const report = createEmptyTokenContractReportResponse({
      status: "partial",
      errors: ["History provider timed out."],
    });
    report.audit.coveragePercent = 67;
    report.audit.reviewChecks = 1;
    report.audit.notEvaluatedChecks = 1;
    report.audit.criticalChecks = [
      check("Can supply increase?", "confirmed", "concern"),
      check("Can normal holders sell?", "needs_review", "unresolved"),
    ];
    report.findings = [
      finding("supply", "critical", "confirmed", 92, "Check the active controller."),
      finding("sell-path", "medium", "review-clue", 70, "Repeat a forked sell test."),
    ];
    Object.values(report.modules).forEach((module) => {
      if (module.id !== "ai") module.status = "complete";
    });
    report.modules.history.status = "partial";

    const digest = buildReportDigest(report);

    expect(digest.directOutcome).toBe("1 confirmed concern found");
    expect(digest.confirmedConcernCount).toBe(1);
    expect(digest.openEvidenceItemCount).toBe(3);
    expect(digest.evidenceIncomplete).toBe(true);
    expect(digest.completenessNote).toContain("must not be treated as proof");
    expect(digest.nextChecks).toEqual([
      "Check the active controller.",
      "Repeat a forked sell test.",
    ]);
  });

  it("never calls a finding-free incomplete report all clear", () => {
    const report = createEmptyTokenContractReportResponse({
      status: "partial",
      errors: [],
    });
    report.audit.coveragePercent = 40;
    report.audit.criticalChecks = [
      check("Can the owner change fees?", "not_collected", "unresolved"),
    ];
    report.modules.source.status = "unavailable";

    const digest = buildReportDigest(report);
    const combined = `${digest.directOutcome} ${digest.completenessNote}`.toLocaleLowerCase();

    expect(digest.directOutcome).toContain("still need review");
    expect(combined).not.toContain("all clear");
    expect(combined).not.toContain("safe token");
  });
});

function check(
  question: string,
  status: TokenContractCriticalCheck["status"],
  disposition: NonNullable<TokenContractCriticalCheck["disposition"]>,
): TokenContractCriticalCheck {
  return {
    question,
    status,
    disposition,
    evidence: "Bounded deterministic evidence.",
  };
}

function finding(
  id: string,
  severity: TokenContractFinding["severity"],
  state: TokenContractFinding["state"],
  confidence: number,
  recommendation = "Review the cited evidence.",
): TokenContractFinding {
  return {
    id,
    category: "supply",
    title: id,
    severity,
    state,
    confidence,
    summary: "A bounded scanner observation.",
    practicalEffect: "The behavior may affect holders.",
    recommendation,
    evidence: [],
  };
}
