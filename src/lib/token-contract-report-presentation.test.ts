import { describe, expect, it } from "vitest";

import {
  buildTokenContractReportPresentation,
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

  it("normalizes the CTM fixture without turning missing or invalid evidence into safety claims", () => {
    const report = createEmptyTokenContractReportResponse({
      status: "complete",
      errors: [],
    });
    report.ok = true;
    report.verdict = {
      severity: "high",
      label: "high observed risk",
      confidence: 78,
      confidenceLabel: "moderate",
      summary: "Legacy engine wording.",
      basis: "deterministic",
    };
    report.audit.riskScore = 72;
    report.token.totalSupply = "296296296";
    report.supplyHistory.initialMintAmount = "296296296";
    report.history.inspectedTransactions = 50;
    report.history.coverage = {
      complete: false,
      truncated: true,
      coveredRanges: [],
      gaps: ["Complete history was not collected."],
    };
    report.modules.history.status = "partial";
    report.modules.liquidity.status = "complete";
    report.findings = [
      {
        ...finding("solidity.supply.mutable", "high", "confirmed", 82),
        title: "Mutable supply accounting",
        summary: "Internal supply accounting can change total supply.",
        evidence: [
          {
            id: "increase",
            type: "source",
            summary: "_totalSupply += value",
            file: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
            startLine: 179,
            endLine: 179,
          },
          {
            id: "decrease",
            type: "source",
            summary: "_totalSupply -= value",
            file: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
            startLine: 194,
            endLine: 194,
          },
        ],
      },
      {
        ...finding("solidity.supply.name-clue", "medium", "review-clue", 75),
        title: "Mint and burn entry points",
        summary:
          "mint(address,uint256) uses onlyRole(MINTER_ROLE) and MAX_SUPPLY; burn(uint256) burns the caller and decreases supply.",
        evidence: [
          {
            id: "ctm-mint",
            type: "source",
            summary:
              "mint(address,uint256) onlyRole(MINTER_ROLE) requires totalSupply + amount <= MAX_SUPPLY",
            file: "src/ctm.sol",
            startLine: 18,
            endLine: 21,
          },
          {
            id: "ctm-burn",
            type: "source",
            summary: "burn(uint256) burns the caller's tokens and decreases supply",
            file: "src/ctm.sol",
            startLine: 23,
            endLine: 25,
          },
        ],
      },
      {
        ...finding("solidity.access.roles", "info", "confirmed", 90),
        category: "access-control",
        summary:
          "AccessControl exposes DEFAULT_ADMIN_ROLE, MINTER_ROLE, getRoleAdmin, grantRole, revokeRole, and hasRole.",
      },
    ];
    report.simulation.attempts = [
      {
        id: "ctm-mint-ordinary",
        label: "mint from ordinary account",
        from: null,
        to: "0xc8Fb80fCc03f699C70ff0CC08C09106288888888",
        functionSignature: "mint(address,uint256)",
        status: "reverted",
        blockNumber: 1,
        detail: "Recorded call reverted.",
        calldataValidity: "valid",
        rawCalldata:
          "0x40c10f19000000000000000000000000000000000004444c5dc75cb358380d",
      },
    ];

    const presentation = buildTokenContractReportPresentation(report, "final");
    const mint = presentation.findings.find(
      (item) => item.id === "presentation.supply.mint-capability",
    );
    const burn = presentation.findings.find(
      (item) => item.id === "presentation.supply.self-burn",
    );

    expect(presentation.decision.headline).toBe(
      "High-severity mint capability confirmed",
    );
    expect(presentation.authorization.model).toBe("access-control");
    expect(presentation.questions.map((item) => item.question).join(" ")).not.toMatch(
      /owner/i,
    );
    expect(presentation.questions.find((item) => item.id === "role-holders")).toMatchObject({
      status: "unresolved",
      coverageState: "not-tested",
    });
    expect(mint?.plainSummary).toContain("MINTER_ROLE");
    expect(mint?.plainSummary).toContain("maximum-supply cap");
    expect(mint?.evidence.map((item) => item.claim).join(" ")).not.toContain("-=");
    expect(
      mint?.evidence.find((item) => item.role === "primary")?.codePath?.map(
        (node) => node.kind,
      ),
    ).toEqual(
      expect.arrayContaining(["entry-point", "guard", "state-write"]),
    );
    expect(burn?.status).toBe("protective-evidence");
    expect(presentation.supply.summary).toContain("does not prove no activity");
    expect(presentation.trading.summary).toContain("sellability remain untested");
    expect(presentation.trading.summary).not.toContain("liquidity complete");
    expect(presentation.simulations[0]).toMatchObject({
      validity: "invalid",
      status: "invalid-test",
      outcome: "reverted",
    });
    expect(presentation.simulations[0].conclusion).toContain(
      "not evidence that authorization succeeded or failed",
    );
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
