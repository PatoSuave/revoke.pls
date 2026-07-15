import { decodeFunctionData, parseAbi, toFunctionSelector } from "viem";
import type { Abi } from "viem";

import type {
  TokenContractCriticalCheck,
  TokenContractEvidenceFact,
  TokenContractFinding,
  TokenContractFindingPresentation,
  TokenContractPresentationQuestion,
  TokenContractPresentationStatus,
  TokenContractReportModule,
  TokenContractReportPresentation,
  TokenContractReportResponse,
  TokenContractSimulationAttempt,
  TokenContractSimulationPresentation,
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

const SEVERITY_LABEL = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unresolved",
} as const;

const parseRuntimeAbi = parseAbi as (signatures: readonly string[]) => Abi;

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

export function buildTokenContractReportPresentation(
  report: TokenContractReportResponse,
  completeness: "partial" | "final" = report.status === "complete" ? "final" : "partial",
): TokenContractReportPresentation {
  const corpus = searchableReportText(report);
  const authorization = buildAuthorization(report, corpus);
  const simulations = report.simulation.attempts.map(presentSimulation);
  const findings = buildPresentationFindings(report, simulations);
  const questions = buildPresentationQuestions(report, authorization.model, findings, simulations, corpus);
  const coverage = buildPresentationCoverage(questions);
  const observedUse = observedUseState(report, findings);
  const highestConfirmed = findings
    .filter((finding) => finding.status === "confirmed-capability")
    .sort((left, right) => FINDING_SEVERITY_RANK[right.severity] - FINDING_SEVERITY_RANK[left.severity])[0];
  const mintConfirmed = findings.find(
    (finding) => finding.id === "presentation.supply.mint-capability" && finding.status === "confirmed-capability",
  );
  const headline = mintConfirmed
    ? `${findingSeverityLabel(mintConfirmed.severity)}-severity mint capability confirmed`
    : highestConfirmed
      ? `${findingSeverityLabel(highestConfirmed.severity)}-severity contract capability confirmed`
      : coverage.weightedPercent < 100
        ? "Contract risk remains unresolved"
        : "No material capability was confirmed in the collected evidence";
  const historySummary = summarizeHistory(report);
  const supply = buildSupplyPresentation(report);
  const trading = buildTradingPresentation(report, simulations);

  return {
    schemaVersion: 1,
    derivedFromEngineSchemaVersion: 2,
    completeness,
    decision: {
      headline,
      summary: highestConfirmed?.plainSummary ??
        "No complete safety conclusion is possible from the currently collected evidence.",
      severity: report.verdict.severity,
      confidence: report.verdict.confidence,
      confidenceLabel: report.verdict.confidenceLabel,
      observedUse,
      provisionalRiskScore: report.audit.riskScore,
      riskScoreExplanation:
        "A provisional prioritization heuristic. It is not a probability of fraud, loss, or future behavior.",
    },
    findings,
    authorization,
    supply,
    trading,
    questions,
    coverage,
    simulations,
    historySummary,
    methodology: [
      "Confirmed capability describes code or captured-state evidence; it does not prove the capability was used.",
      "Observed behavior requires valid transaction, event, or simulation evidence and is reported separately.",
      "Coverage measures answered questions, not safety. Not-applicable questions are excluded from the denominator.",
      "AI text is optional explanatory copy and never changes deterministic findings or scores.",
    ],
  };
}

export function getTokenContractReportPresentation(
  report: TokenContractReportResponse,
): TokenContractReportPresentation {
  return report.presentation ?? buildTokenContractReportPresentation(report);
}

function buildAuthorization(
  report: TokenContractReportResponse,
  corpus: string,
): TokenContractReportPresentation["authorization"] {
  const roleNames = Array.from(new Set(corpus.match(/\b(?:DEFAULT_ADMIN|[A-Z][A-Z0-9_]*)_ROLE\b/g) ?? []));
  const hasAccessControl =
    roleNames.length > 0 ||
    /\b(?:hasRole|getRoleAdmin|grantRole|revokeRole|renounceRole|AccessControl)\b/i.test(corpus);
  const model = report.controls.authorization?.model ?? (report.contract?.source.isProxy
    ? "proxy-admin"
    : hasAccessControl
      ? "access-control"
      : report.controls.ownerMethod || report.controls.ownershipStatus === "found"
        ? "ownable"
        : report.controls.effectiveControllerAddresses.length > 0
          ? "custom-controller"
          : "unresolved");
  const label = {
    "access-control": "Role-based AccessControl",
    ownable: "Ownable controller",
    "proxy-admin": "Proxy and implementation administration",
    "custom-controller": "Custom controller",
    unresolved: "Authorization model unresolved",
  }[model];
  const roles = report.controls.authorization?.roles.length
    ? report.controls.authorization.roles.map((role) => ({
        name: role.name,
        admin: role.adminRoleId,
        currentHolders: role.currentHolders,
        holderResolution: role.holderResolution,
      }))
    : roleNames.map((name) => ({
        name,
        admin: name === "DEFAULT_ADMIN_ROLE" ? "DEFAULT_ADMIN_ROLE" : null,
        currentHolders: [],
        holderResolution: "unresolved" as const,
      }));
  return {
    model,
    label,
    roles,
    explanation:
      model === "access-control"
        ? report.controls.authorization?.roles.length
          ? "Role IDs and role-admin relationships were read at the captured block. Current holders still require complete role-event reconstruction and captured-block hasRole confirmation."
          : "Role-based controls were detected. Role names and guards can be confirmed from verified evidence, but current holders require complete role-event reconstruction and captured-block hasRole checks."
        : model === "ownable"
          ? "A standard owner getter was detected. Independent controllers and proxy administration are still evaluated separately."
          : model === "proxy-admin"
            ? "A proxy architecture was detected. Proxy and implementation authority must both be considered."
            : model === "custom-controller"
              ? "Controller evidence exists outside a standard owner getter."
              : "The collected evidence does not resolve a single authorization architecture.",
  };
}

function buildPresentationFindings(
  report: TokenContractReportResponse,
  simulations: TokenContractSimulationPresentation[],
): TokenContractFindingPresentation[] {
  const ranked = rankFindings(report.findings);
  const mintFindings = ranked.filter(isMintFinding);
  const output: TokenContractFindingPresentation[] = [];
  if (mintFindings.length > 0) {
    const confirmed = mintFindings.some((finding) => finding.state === "confirmed");
    const severity = mintFindings.reduce<TokenContractFinding["severity"]>(
      (current, finding) =>
        FINDING_SEVERITY_RANK[finding.severity] > FINDING_SEVERITY_RANK[current]
          ? finding.severity
          : current,
      "info",
    );
    const evidence = normalizeMintEvidence(mintFindings);
    const roleGuard = searchableFindingText(mintFindings).match(/\b[A-Z][A-Z0-9_]*_ROLE\b/)?.[0];
    const capped = /MAX_SUPPLY|cap\s*\(/i.test(searchableFindingText(mintFindings));
    output.push({
      id: "presentation.supply.mint-capability",
      engineFindingIds: mintFindings.map((finding) => finding.id),
      status: confirmed ? "confirmed-capability" : "unresolved",
      severity,
      confidence: Math.max(...mintFindings.map((finding) => finding.confidence)),
      title: confirmed ? "Additional token minting capability" : "Possible token minting capability",
      plainSummary: confirmed
        ? `Verified evidence exposes a minting path${roleGuard ? ` restricted by ${roleGuard}` : " with an authorization guard"}${capped ? " and a maximum-supply cap" : ""}. This confirms capability, not observed use.`
        : "Mint-related evidence was found, but the callable path and authorization remain unresolved.",
      advancedSummary: mintFindings.map((finding) => finding.summary).join(" "),
      observedUse: observedMintUse(report),
      evidence,
    });
    const burnEvidence = mintFindings.flatMap((finding) =>
      finding.evidence.filter((evidence) =>
        /\bburn|_totalSupply\s*-=|decreas(?:e|es|ed|ing)\s+(?:the\s+)?(?:total\s+)?supply/i.test(
          evidence.summary,
        ),
      ),
    );
    if (/\bburn\s*\(|_totalSupply\s*-=|burns?\s+(?:the\s+)?caller/i.test(searchableFindingText(mintFindings))) {
      output.push({
        id: "presentation.supply.self-burn",
        engineFindingIds: mintFindings.map((finding) => finding.id),
        status: "protective-evidence",
        severity: "info",
        confidence: Math.max(...mintFindings.map((finding) => finding.confidence)),
        title: "Caller self-burn decreases supply",
        plainSummary:
          "The displayed burn path removes the caller's own tokens and decreases total supply. It is not evidence of inflation or a fake-burn mint path.",
        advancedSummary:
          "Supply-decrease evidence is intentionally separated from the mint-capability finding.",
        observedUse: "not-collected",
        evidence: burnEvidence.map((evidence) => evidenceFact(evidence, "primary")),
      });
    }
  }

  const invalidSimulationIds = new Set(
    simulations.filter((simulation) => simulation.validity === "invalid").map((simulation) => simulation.id),
  );
  for (const finding of ranked.filter((candidate) => !mintFindings.includes(candidate))) {
    const simulationInvalid =
      finding.category === "access-control" &&
      finding.evidence.some((evidence) =>
        Array.from(invalidSimulationIds).some((id) => evidence.summary.includes(id)),
      );
    output.push({
      id: `presentation.${finding.id}`,
      engineFindingIds: [finding.id],
      status: simulationInvalid ? "invalid-test" : presentationStatusForFinding(finding),
      severity: finding.severity,
      confidence: finding.confidence,
      title: finding.title,
      plainSummary: simulationInvalid
        ? "The recorded simulation input was invalid, so its outcome cannot support this conclusion."
        : finding.summary,
      advancedSummary: `${finding.practicalEffect} ${finding.recommendation}`.trim(),
      observedUse:
        finding.category === "trading" || finding.evidence.some((evidence) => evidence.type === "history")
          ? finding.state === "confirmed" ? "observed" : "unresolved"
          : "not-collected",
      evidence: finding.evidence.map((evidence, index) => evidenceFact(evidence, index === 0 ? "primary" : "supporting")),
    });
  }
  return output;
}

function normalizeMintEvidence(findings: TokenContractFinding[]): TokenContractEvidenceFact[] {
  const facts: TokenContractEvidenceFact[] = [];
  const seen = new Set<string>();
  for (const finding of findings) {
    for (const evidence of finding.evidence) {
      if (/(_totalSupply\s*-=|decreas(?:e|es|ed|ing)\s+(?:the\s+)?(?:total\s+)?supply|burns?\s+(?:the\s+)?caller)/i.test(evidence.summary)) {
        continue;
      }
      const key = `${evidence.file ?? ""}:${evidence.startLine ?? ""}:${evidence.summary}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const primary = /\bmint\s*\(|onlyRole|MAX_SUPPLY/i.test(evidence.summary) && !/_totalSupply\s*\+=/i.test(evidence.summary);
      facts.push(evidenceFact(evidence, primary ? "primary" : "supporting"));
    }
  }
  const relationship = facts.flatMap((fact) => {
    const nodes: NonNullable<TokenContractEvidenceFact["codePath"]> = [];
    if (/\bmint\s*\(/i.test(fact.claim)) {
      nodes.push(codePathNode(fact, "entry-point", "External mint entry point"));
    }
    if (/onlyRole|MAX_SUPPLY|\brequire\b/i.test(fact.claim)) {
      nodes.push(codePathNode(fact, "guard", "Authorization or supply-cap guard"));
    }
    if (/_totalSupply\s*\+=|increase(?:s|d)?\s+(?:the\s+)?(?:total\s+)?supply/i.test(fact.claim)) {
      nodes.push(codePathNode(fact, "state-write", "Internal total-supply increase"));
    }
    return nodes;
  });
  const uniqueRelationship = relationship.filter(
    (node, index, nodes) =>
      nodes.findIndex(
        (candidate) =>
          candidate.kind === node.kind &&
          candidate.file === node.file &&
          candidate.startLine === node.startLine,
      ) === index,
  );
  const primary = facts.find((fact) => fact.role === "primary") ?? facts[0];
  if (primary && uniqueRelationship.length > 1) {
    primary.codePath = uniqueRelationship;
  }
  return facts;
}

function codePathNode(
  fact: TokenContractEvidenceFact,
  kind: NonNullable<TokenContractEvidenceFact["codePath"]>[number]["kind"],
  label: string,
): NonNullable<TokenContractEvidenceFact["codePath"]>[number] {
  return {
    kind,
    label,
    ...(fact.file ? { file: fact.file } : {}),
    ...(fact.startLine === undefined ? {} : { startLine: fact.startLine }),
    ...(fact.endLine === undefined ? {} : { endLine: fact.endLine }),
  };
}

function evidenceFact(
  evidence: TokenContractFinding["evidence"][number],
  role: "primary" | "supporting",
): TokenContractEvidenceFact {
  return {
    id: evidence.id,
    claim: evidence.summary,
    role,
    type: evidence.type,
    ...(evidence.file ? { file: evidence.file } : {}),
    ...(evidence.startLine === undefined ? {} : { startLine: evidence.startLine }),
    ...(evidence.endLine === undefined ? {} : { endLine: evidence.endLine }),
    ...(evidence.file
      ? {
          codePath: [{
            kind: role === "primary" ? "entry-point" : "state-write",
            label: evidence.summary,
            file: evidence.file,
            startLine: evidence.startLine,
            endLine: evidence.endLine,
          }],
        }
      : {}),
  };
}

function buildPresentationQuestions(
  report: TokenContractReportResponse,
  model: TokenContractReportPresentation["authorization"]["model"],
  findings: TokenContractFindingPresentation[],
  simulations: TokenContractSimulationPresentation[],
  corpus: string,
): TokenContractPresentationQuestion[] {
  const mint = findings.find((finding) => finding.id === "presentation.supply.mint-capability");
  if (model === "access-control") {
    const roles = Array.from(new Set(corpus.match(/\b(?:DEFAULT_ADMIN|[A-Z][A-Z0-9_]*)_ROLE\b/g) ?? []));
    const minterRole = roles.find((role) => /MINTER/i.test(role)) ?? "the minting role";
    const questions: TokenContractPresentationQuestion[] = [
      question("mint-exists", "Does a mint function exist?", mint?.plainSummary ?? "No mint path was resolved.", mint ? mint.status : "unresolved", mint ? "resolved" : "unresolved"),
      question(
        "mint-restricted",
        "Is minting restricted?",
        mint && /onlyRole|restricted by/i.test(mint.advancedSummary + mint.plainSummary)
          ? `Verified evidence restricts minting through ${minterRole}.`
          : "The mint authorization guard is unresolved.",
        mint && /onlyRole|restricted by/i.test(mint.advancedSummary + mint.plainSummary) ? "protective-evidence" : "unresolved",
        mint && /onlyRole|restricted by/i.test(mint.advancedSummary + mint.plainSummary) ? "resolved" : "partial",
      ),
      question("role-holders", `Who currently holds ${minterRole}?`, "Current holders are unresolved because complete role-event history and captured-block hasRole confirmation were not collected.", "unresolved", "not-tested"),
      question(
        "role-admin",
        `Can the role admin grant or revoke ${minterRole}?`,
        /getRoleAdmin|grantRole|revokeRole|AccessControl/i.test(corpus)
          ? "The AccessControl surface supports role administration; the current admin holder remains unresolved."
          : "Role administration was not resolved.",
        /getRoleAdmin|grantRole|revokeRole|AccessControl/i.test(corpus) ? "confirmed-capability" : "unresolved",
        /getRoleAdmin|grantRole|revokeRole|AccessControl/i.test(corpus) ? "resolved" : "partial",
      ),
      question(
        "mint-cap",
        "How many additional tokens can be minted?",
        report.token.maxSupply !== undefined && report.token.maxSupply !== null
          ? `Captured maximum supply is ${report.token.maxSupply}; remaining mintable supply is ${report.token.remainingMintableSupply ?? "unresolved"} raw units.`
          : /MAX_SUPPLY|cap\s*\(/i.test(corpus)
          ? "A maximum-supply control was detected, but a captured-block numeric cap read is not present in this report."
          : "No numeric maximum-supply value was resolved.",
        report.token.maxSupply ? "protective-evidence" : "unresolved",
        report.token.maxSupply ? "resolved" : /MAX_SUPPLY|cap\s*\(/i.test(corpus) ? "partial" : "not-tested",
      ),
      question("other-controller", "Is there another controller outside AccessControl?", report.controls.effectiveControllerAddresses.length > 0 ? "Additional effective controller addresses were reported and require review." : "No independent controller was confirmed, but incomplete evidence cannot rule one out.", report.controls.effectiveControllerAddresses.length > 0 ? "confirmed-capability" : "unresolved", report.controls.effectiveControllerAddresses.length > 0 ? "resolved" : "partial"),
    ];
    const invalid = simulations.find((simulation) => simulation.validity === "invalid");
    if (invalid) {
      questions.push(question("simulation-validity", "Was the mint simulation valid?", invalid.conclusion, "invalid-test", "invalid"));
    }
    return questions;
  }
  return report.audit.criticalChecks.map((check, index) => {
    const answer = criticalCheckAnswer(check);
    return question(
      `engine-${index + 1}`,
      check.question,
      check.evidence,
      check.status === "confirmed"
        ? check.disposition === "protective" ? "protective-evidence" : "confirmed-capability"
        : check.status === "not_detected" ? "protective-evidence"
          : check.status === "not_collected" ? "not-tested" : "unresolved",
      answer.isOpen ? (check.status === "needs_review" ? "partial" : check.status === "not_collected" ? "not-tested" : "unresolved") : "resolved",
    );
  });
}

function question(
  id: string,
  prompt: string,
  answer: string,
  status: TokenContractPresentationStatus,
  coverageState: TokenContractPresentationQuestion["coverageState"],
): TokenContractPresentationQuestion {
  return { id, question: prompt, answer, status, coverageState };
}

function buildPresentationCoverage(
  questions: TokenContractPresentationQuestion[],
): TokenContractReportPresentation["coverage"] {
  const count = (state: TokenContractPresentationQuestion["coverageState"]) =>
    questions.filter((question) => question.coverageState === state).length;
  const resolved = count("resolved");
  const partial = count("partial");
  const unresolved = count("unresolved");
  const notTested = count("not-tested");
  const invalid = count("invalid");
  const notApplicable = count("not-applicable");
  const applicableTotal = questions.length - notApplicable;
  const weightedPercent = applicableTotal > 0
    ? Math.round(((resolved + partial * 0.5) / applicableTotal) * 100)
    : 0;
  return {
    resolved,
    partial,
    unresolved,
    notTested,
    invalid,
    notApplicable,
    applicableTotal,
    weightedPercent,
    explanation: `${resolved} resolved, ${partial} partial, ${unresolved} unresolved, ${notTested} not tested, and ${invalid} invalid; ${notApplicable} not-applicable question${notApplicable === 1 ? " was" : "s were"} excluded from the denominator.`,
  };
}

function presentSimulation(attempt: TokenContractSimulationAttempt): TokenContractSimulationPresentation {
  const computed = validateCalldata(attempt);
  const validity =
    computed.validity === "invalid" || attempt.calldataValidity === "invalid"
      ? "invalid"
      : computed.validity;
  const calldataByteLength = attempt.rawCalldata && /^0x[0-9a-f]*$/i.test(attempt.rawCalldata)
    ? (attempt.rawCalldata.length - 2) / 2
    : null;
  const conclusion = validity === "invalid"
    ? `Invalid test: ${computed.validity === "invalid" ? computed.detail : attempt.calldataValidationDetail ?? computed.detail} The ${attempt.status} outcome is not evidence that authorization succeeded or failed.`
    : validity === "unverifiable"
      ? `Test validity is unresolved because raw calldata was not retained. Outcome: ${attempt.status}.`
      : `Valid read-only call returned ${attempt.status}. ${attempt.detail}`;
  return {
    id: attempt.id,
    label: attempt.label,
    status: validity === "invalid" ? "invalid-test" : validity === "unverifiable" ? "unresolved" : "observed-behavior",
    validity,
    outcome: attempt.status,
    conclusion,
    rawCalldata: attempt.rawCalldata ?? null,
    calldataByteLength,
    decodedArguments: attempt.decodedArguments ?? [],
    returnData: attempt.returnData ?? null,
  };
}

function validateCalldata(attempt: TokenContractSimulationAttempt): {
  validity: "valid" | "invalid" | "unverifiable";
  detail: string;
} {
  const calldata = attempt.rawCalldata;
  if (!calldata) return { validity: "unverifiable", detail: "Raw calldata was not retained." };
  if (!/^0x(?:[0-9a-fA-F]{2})+$/.test(calldata)) {
    return { validity: "invalid", detail: "Calldata is not complete even-length hexadecimal bytes." };
  }
  let abi: Abi;
  try {
    abi = parseRuntimeAbi([`function ${attempt.functionSignature}`]);
  } catch {
    return {
      validity: "unverifiable",
      detail: "The retained function signature could not be parsed for ABI validation.",
    };
  }
  const parameterCount = abi[0]?.type === "function" ? abi[0].inputs.length : 0;
  const byteLength = (calldata.length - 2) / 2;
  const minimumLength = 4 + parameterCount * 32;
  if (byteLength < minimumLength) {
    return { validity: "invalid", detail: `Recorded calldata is ${byteLength} bytes; ${attempt.functionSignature} requires at least ${minimumLength} bytes.` };
  }
  if (calldata.slice(0, 10).toLowerCase() !== toFunctionSelector(attempt.functionSignature).toLowerCase()) {
    return {
      validity: "invalid",
      detail: `Calldata selector does not match ${attempt.functionSignature}.`,
    };
  }
  try {
    decodeFunctionData({ abi, data: calldata });
  } catch {
    return {
      validity: "invalid",
      detail: `Calldata could not be decoded as ${attempt.functionSignature}.`,
    };
  }
  return { validity: "valid", detail: "Calldata selector and ABI arguments decoded successfully." };
}

function buildSupplyPresentation(
  report: TokenContractReportResponse,
): TokenContractReportPresentation["supply"] {
  const current = report.token.totalSupply;
  const initial = report.supplyHistory.initialMintAmount;
  const historyComplete = report.history.coverage.complete && !report.history.coverage.truncated;
  const equal = current !== null && initial !== null && current === initial;
  return {
    current,
    initial,
    cap: report.token.maxSupply ?? null,
    remainingMintable: report.token.remainingMintableSupply ?? null,
    historyState: historyComplete ? "observed-behavior" : "unresolved",
    summary: equal
      ? `Current supply equals the captured initial-mint amount. ${historyComplete ? "Complete collected history did not show a net change." : "Complete interim mint and burn history was not collected, so equality does not prove no activity occurred."}`
      : current && initial
        ? "Current supply differs from the captured initial-mint amount; the event history should be reviewed for mint and burn activity."
        : "Current-versus-initial supply could not be fully compared.",
  };
}

function buildTradingPresentation(
  report: TokenContractReportResponse,
  simulations: TokenContractSimulationPresentation[],
): TokenContractReportPresentation["trading"] {
  const hasPairs = report.liquidity.pairs.length > 0;
  const validBuy = simulations.some((simulation) => simulation.validity === "valid" && report.simulation.attempts.find((attempt) => attempt.id === simulation.id)?.kind === "router-buy");
  const validSell = simulations.some((simulation) => simulation.validity === "valid" && report.simulation.attempts.find((attempt) => attempt.id === simulation.id)?.kind === "router-sell");
  return {
    pairDiscovery: report.modules.liquidity.status === "unavailable" || report.modules.liquidity.status === "skipped" ? "not-tested" : hasPairs ? "observed-behavior" : "informational",
    liquidityInspection: hasPairs && report.liquidity.pairEvidence.length > 0 ? "observed-behavior" : "not-tested",
    buySimulation: validBuy ? "observed-behavior" : "not-tested",
    sellSimulation: validSell ? "observed-behavior" : "not-tested",
    summary: hasPairs
      ? "At least one pair was discovered. Pair state and router simulations are reported as separate evidence stages."
      : "Pair lookup returned no validated pair. Liquidity, buyability, and sellability remain untested; lookup completion is not a safety result.",
  };
}

function summarizeHistory(report: TokenContractReportResponse): string {
  const calls = report.history.decodedCalls;
  const approvals = calls.filter((call) => /approve/i.test(call.signature ?? "")).length;
  const transfers = calls.filter((call) => /transfer/i.test(call.signature ?? "")).length;
  const categories = [
    approvals > 0 ? `${approvals} approval call${approvals === 1 ? "" : "s"}` : null,
    transfers > 0 ? `${transfers} transfer call${transfers === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(" and ");
  const base = `${report.history.inspectedTransactions} bounded transaction${report.history.inspectedTransactions === 1 ? " was" : "s were"} inspected${categories ? `, including ${categories}` : ""}.`;
  return report.history.coverage.complete && !report.history.coverage.truncated
    ? `${base} The recorded range is marked complete.`
    : `${base} This is a bounded sample, not complete contract history.`;
}

function observedUseState(
  report: TokenContractReportResponse,
  findings: TokenContractFindingPresentation[],
): TokenContractReportPresentation["decision"]["observedUse"] {
  if (findings.some((finding) => finding.status === "observed-behavior" && finding.observedUse === "observed")) return "observed";
  if (report.modules.history.status === "complete" && report.history.coverage.complete && !report.history.coverage.truncated) return "not-observed";
  return report.modules.history.status === "unavailable" || report.modules.history.status === "skipped" ? "not-collected" : "unresolved";
}

function observedMintUse(report: TokenContractReportResponse): TokenContractReportPresentation["decision"]["observedUse"] {
  const mintCall = report.history.decodedCalls.some((call) => /\bmint\s*\(/i.test(call.signature ?? ""));
  if (mintCall) return "observed";
  if (report.history.coverage.complete && !report.history.coverage.truncated) return "not-observed";
  return "unresolved";
}

function presentationStatusForFinding(finding: TokenContractFinding): TokenContractPresentationStatus {
  if (finding.state === "confirmed") {
    if (finding.severity === "info") return "informational";
    if (finding.evidence.some((evidence) => evidence.type === "history" || evidence.type === "simulation")) return "observed-behavior";
    return "confirmed-capability";
  }
  if (finding.state === "not-detected") return "protective-evidence";
  return "unresolved";
}

function isMintFinding(finding: TokenContractFinding): boolean {
  const text = `${finding.id} ${finding.title} ${finding.summary}`;
  return finding.category === "supply" && /\bmint|supply\.mutable|supply\.name-clue|_totalSupply\s*\+=/i.test(text);
}

function searchableFindingText(findings: TokenContractFinding[]): string {
  return findings.flatMap((finding) => [finding.id, finding.title, finding.summary, finding.practicalEffect, ...finding.evidence.map((evidence) => evidence.summary)]).join("\n");
}

function searchableReportText(report: TokenContractReportResponse): string {
  return [
    ...report.signals.flatMap((signal) => [signal.id, signal.label, signal.evidence]),
    ...report.findings.flatMap((finding) => [finding.id, finding.title, finding.summary, finding.practicalEffect, ...finding.evidence.map((evidence) => evidence.summary)]),
    ...report.selectors.flatMap((selector) => [selector.signature ?? "", selector.label]),
    ...Object.values(report.contract?.source.controlSurface ?? {}).flat(),
    ...Object.values(report.contract?.source.implementation?.controlSurface ?? {}).flat(),
  ].join("\n");
}

export function buildReportDigest(
  report: TokenContractReportResponse,
): TokenContractReportDigest {
  const rankedFindings = rankFindings(report.findings);
  const confirmedConcerns = rankedFindings.filter(
    (finding) => finding.state === "confirmed" && finding.severity !== "info",
  );
  const reviewFindings = rankedFindings.filter(
    (finding) => finding.state === "review-clue" || finding.state === "unresolved",
  );
  const unresolvedChecks = report.audit.criticalChecks.filter(
    (check) => criticalCheckAnswer(check).isOpen,
  );
  const deterministicModules = Object.values(report.modules).filter((module) => module.id !== "ai");
  const incompleteModules = deterministicModules.filter((module) => module.status !== "complete");
  const openQuestionCount = Math.max(reviewFindings.length, unresolvedChecks.length, report.audit.reviewChecks + report.audit.notEvaluatedChecks);
  const openEvidenceItemCount = openQuestionCount + incompleteModules.length;
  const collectionIssueCount = report.warnings.length + report.errors.length + report.missingConfig.length;
  const evidenceIncomplete = report.audit.coveragePercent < 100 || report.audit.reviewChecks > 0 || report.audit.notEvaluatedChecks > 0 || incompleteModules.length > 0 || report.errors.length > 0 || report.missingConfig.length > 0;
  const confirmedConcernCount = confirmedConcerns.length;
  return {
    confirmedConcerns,
    reviewFindings,
    unresolvedChecks,
    incompleteModules,
    priorityFindings: confirmedConcerns.slice(0, 3),
    priorityChecks: rankCriticalChecks(report.audit.criticalChecks).slice(0, 6),
    nextChecks: uniqueStrings([...confirmedConcerns, ...reviewFindings].map((finding) => finding.recommendation.trim()).filter(Boolean)).slice(0, 3),
    confirmedConcernCount,
    openEvidenceItemCount,
    deterministicModuleCount: deterministicModules.length,
    completedDeterministicModuleCount: deterministicModules.filter((module) => module.status === "complete").length,
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
      : "Required evidence reported complete, but this remains a point-in-time read-only report - not proof of safety or future behavior.",
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

function findingSeverityLabel(
  severity: TokenContractFinding["severity"],
): string {
  return severity === "info" ? "Informational" : SEVERITY_LABEL[severity];
}

function pluralize(value: string, count: number): string {
  return count === 1 ? value : value + "s";
}
