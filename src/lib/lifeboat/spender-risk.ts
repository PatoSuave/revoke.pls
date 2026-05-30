import { getAddress, isAddress, type Address } from "viem";

import type { SpenderEntry } from "@/lib/registry";

export type SpenderRiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type SpenderRiskScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "partial"
  | "unsupported"
  | "bad-request"
  | "upstream-failure";

export type SpenderVerifiedSourceStatus =
  | "verified"
  | "unverified"
  | "unknown";

export type SpenderRegistryContext = {
  label: string;
  protocol: string;
  category: string;
  isTrusted: boolean;
  url?: string;
  notes?: string;
  source?: string;
  verificationMethod?: string;
  lastReviewed?: string;
  contractStatus?: "current" | "legacy";
};

export interface SpenderContractSignal {
  address: Address;
  hasBytecode: boolean | null;
  verifiedSource: SpenderVerifiedSourceStatus;
  contractName: string | null;
  isProxy: boolean | null;
  implementationAddress: Address | null;
  registryContext: SpenderRegistryContext | null;
  explorerUrl: string | null;
  warnings: string[];
}

export interface SpenderRiskEvidence {
  address: Address;
  title: string;
  description: string;
  riskLevel: Exclude<
    SpenderRiskLevel,
    "not_checked" | "insufficient_data" | "upstream_unavailable" | "unsupported"
  >;
  explorerUrl: string | null;
}

export interface SpenderRiskAnalysis {
  riskLevel: SpenderRiskLevel;
  evidence: SpenderRiskEvidence[];
  spenders: SpenderContractSignal[];
  summary: {
    checkedSpenderCount: number;
    contractSpenderCount: number;
    eoaSpenderCount: number;
    verifiedSourceCount: number;
    unverifiedSourceCount: number;
    proxyLikeCount: number;
    registryMatchCount: number;
    legacyRegistryMatchCount: number;
  };
  warnings: string[];
}

export interface LifeboatSpenderRiskApiResponse {
  ok: boolean;
  status: SpenderRiskScanStatus;
  chainId: number;
  chainName: string;
  riskLevel: SpenderRiskLevel;
  evidence: SpenderRiskEvidence[];
  spenders: SpenderContractSignal[];
  summary: SpenderRiskAnalysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}

export interface AnalyzeSpenderRiskOptions {
  spenders: readonly SpenderContractSignal[];
  evidenceLimit?: number;
}

const DEFAULT_EVIDENCE_LIMIT = 12;

export function analyzeSpenderRisk({
  spenders,
  evidenceLimit = DEFAULT_EVIDENCE_LIMIT,
}: AnalyzeSpenderRiskOptions): SpenderRiskAnalysis {
  const ordered = dedupeSpenders(spenders).sort((a, b) =>
    a.address.localeCompare(b.address),
  );
  const evidence: SpenderRiskEvidence[] = [];

  for (const spender of ordered) {
    const items = evidenceForSpender(spender);
    for (const item of items) {
      if (evidence.length < evidenceLimit) evidence.push(item);
    }
  }

  const summary = {
    checkedSpenderCount: ordered.length,
    contractSpenderCount: ordered.filter((item) => item.hasBytecode === true)
      .length,
    eoaSpenderCount: ordered.filter((item) => item.hasBytecode === false).length,
    verifiedSourceCount: ordered.filter(
      (item) => item.verifiedSource === "verified",
    ).length,
    unverifiedSourceCount: ordered.filter(
      (item) => item.verifiedSource === "unverified",
    ).length,
    proxyLikeCount: ordered.filter((item) => item.isProxy === true).length,
    registryMatchCount: ordered.filter((item) => item.registryContext).length,
    legacyRegistryMatchCount: ordered.filter(
      (item) => item.registryContext?.contractStatus === "legacy",
    ).length,
  };

  return {
    riskLevel: riskLevelFromEvidence({ evidence, summary }),
    evidence,
    spenders: ordered,
    summary,
    warnings: [
      "Spender contract context is a read-only heuristic. Unknown, unverified, or proxy-like spenders are review signals, not proof of malicious activity.",
      "A known registry match does not guarantee safety, and no warning here does not prove a wallet is safe.",
    ],
  };
}

export function normalizeSpenderRiskAddress(
  value: string | null,
): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function emptySpenderRiskSummary(): SpenderRiskAnalysis["summary"] {
  return {
    checkedSpenderCount: 0,
    contractSpenderCount: 0,
    eoaSpenderCount: 0,
    verifiedSourceCount: 0,
    unverifiedSourceCount: 0,
    proxyLikeCount: 0,
    registryMatchCount: 0,
    legacyRegistryMatchCount: 0,
  };
}

export function spenderRiskLabel(riskLevel: SpenderRiskLevel): string {
  switch (riskLevel) {
    case "elevated":
      return "Elevated spender review";
    case "possible":
      return "Spender review signal";
    case "informational":
      return "Spender context found";
    case "none_detected":
      return "No spender warning found";
    case "insufficient_data":
      return "Insufficient spender data";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

export function registryContextFromEntry(
  entry: SpenderEntry | undefined,
): SpenderRegistryContext | null {
  if (!entry) return null;
  return {
    label: entry.label,
    protocol: entry.protocol,
    category: entry.category,
    isTrusted: entry.isTrusted,
    ...(entry.url ? { url: entry.url } : {}),
    ...(entry.notes ? { notes: entry.notes } : {}),
    ...(entry.source ? { source: entry.source } : {}),
    ...(entry.verificationMethod
      ? { verificationMethod: entry.verificationMethod }
      : {}),
    ...(entry.lastReviewed ? { lastReviewed: entry.lastReviewed } : {}),
    ...(entry.protocolMetadata?.contractStatus
      ? { contractStatus: entry.protocolMetadata.contractStatus }
      : {}),
  };
}

function evidenceForSpender(
  spender: SpenderContractSignal,
): SpenderRiskEvidence[] {
  const evidence: SpenderRiskEvidence[] = [];
  const label = spender.registryContext?.label ?? "Approval spender";

  if (spender.hasBytecode === false) {
    evidence.push({
      address: spender.address,
      title: "No contract bytecode found",
      description:
        "This spender currently looks like an externally owned account on the selected chain. That can be legitimate, but active approvals to EOAs deserve extra review.",
      riskLevel: "possible",
      explorerUrl: spender.explorerUrl,
    });
  }

  if (spender.verifiedSource === "unverified") {
    evidence.push({
      address: spender.address,
      title: "Verified source unavailable",
      description:
        "The explorer did not report verified source code for this spender contract. Unknown source does not prove danger, but it limits review.",
      riskLevel: "possible",
      explorerUrl: spender.explorerUrl,
    });
  }

  if (spender.isProxy === true) {
    evidence.push({
      address: spender.address,
      title: "Proxy-like spender contract",
      description:
        "The explorer reports this spender as proxy-like. Proxy contracts can be normal, but review the implementation and protocol context before trusting active approvals.",
      riskLevel: "possible",
      explorerUrl: spender.explorerUrl,
    });
  }

  if (spender.registryContext?.contractStatus === "legacy") {
    evidence.push({
      address: spender.address,
      title: "Legacy registry match",
      description: `${label} appears in the reviewed registry as a legacy spender. Review whether this approval is still needed.`,
      riskLevel: "possible",
      explorerUrl: spender.explorerUrl,
    });
  } else if (spender.registryContext) {
    evidence.push({
      address: spender.address,
      title: "Reviewed registry context",
      description: `${label} is present in the reviewed spender registry. This is context only and is not a guarantee of safety.`,
      riskLevel: "informational",
      explorerUrl: spender.explorerUrl,
    });
  }

  return evidence;
}

function riskLevelFromEvidence({
  evidence,
  summary,
}: {
  evidence: readonly SpenderRiskEvidence[];
  summary: SpenderRiskAnalysis["summary"];
}): SpenderRiskLevel {
  if (summary.checkedSpenderCount === 0) return "insufficient_data";
  const possibleCount = evidence.filter(
    (item) => item.riskLevel === "possible" || item.riskLevel === "elevated",
  ).length;
  if (
    summary.eoaSpenderCount >= 2 ||
    summary.legacyRegistryMatchCount >= 2 ||
    (summary.proxyLikeCount > 0 && summary.unverifiedSourceCount > 0)
  ) {
    return "elevated";
  }
  if (possibleCount > 0) return "possible";
  if (evidence.some((item) => item.riskLevel === "informational")) {
    return "informational";
  }
  return "none_detected";
}

function dedupeSpenders(
  spenders: readonly SpenderContractSignal[],
): SpenderContractSignal[] {
  const byAddress = new Map<string, SpenderContractSignal>();
  for (const spender of spenders) {
    byAddress.set(spender.address.toLowerCase(), spender);
  }
  return [...byAddress.values()];
}
