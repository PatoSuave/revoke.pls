import { getAddress, isAddress, type Address } from "viem";

export type KnownRiskRegistryRiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated";

export type KnownRiskRegistryStatus = "idle" | "complete";

export type KnownRiskRegistryConfidence = "low" | "medium" | "high";

export type KnownRiskRegistryCategory =
  | "reported-risk-recipient"
  | "reported-risk-spender"
  | "reported-risk-contract"
  | "compromise-infrastructure"
  | "phishing-infrastructure"
  | "other";

export type KnownRiskRegistrySubjectRole =
  | "approval-spender"
  | "approval-token"
  | "nft-operator"
  | "nft-collection"
  | "timeline-spender"
  | "timeline-recipient"
  | "timeline-contract"
  | "address-poisoning-lookalike"
  | "address-poisoning-reference"
  | "spender-risk-spender"
  | "eip7702-delegate"
  | "safe-owner"
  | "safe-module"
  | "erc4337-paymaster"
  | "erc4337-entry-point"
  | "erc6909-contract"
  | "erc6909-spender"
  | "dust-token"
  | "dust-nft-collection";

export interface KnownRiskRegistrySource {
  title: string;
  url: string;
  publishedAt?: string;
  retrievedAt?: string;
}

export interface KnownRiskRegistryEntry {
  id: string;
  address: Address;
  chainId: number | "any";
  label: string;
  category: KnownRiskRegistryCategory;
  confidence: KnownRiskRegistryConfidence;
  summary: string;
  reviewedAt: string;
  reviewedBy: string;
  sources: KnownRiskRegistrySource[];
  expiresAt?: string;
}

export interface KnownRiskRegistrySubject {
  address: Address;
  role: KnownRiskRegistrySubjectRole;
  label: string;
  sourceModule: string;
}

export interface KnownRiskRegistryEvidence {
  entryId: string;
  address: Address;
  chainId: number | "any";
  subjectRole: KnownRiskRegistrySubjectRole;
  subjectLabel: string;
  sourceModule: string;
  label: string;
  category: KnownRiskRegistryCategory;
  confidence: KnownRiskRegistryConfidence;
  reviewedAt: string;
  summary: string;
  sources: KnownRiskRegistrySource[];
  expired: boolean;
  riskLevel: Exclude<KnownRiskRegistryRiskLevel, "not_checked" | "none_detected">;
}

export interface KnownRiskRegistryAnalysis {
  status: KnownRiskRegistryStatus;
  riskLevel: KnownRiskRegistryRiskLevel;
  evidence: KnownRiskRegistryEvidence[];
  subjects: KnownRiskRegistrySubject[];
  summary: {
    checkedSubjectCount: number;
    uniqueAddressCount: number;
    matchCount: number;
    highConfidenceMatchCount: number;
    reviewedSourceCount: number;
  };
  warnings: string[];
}

export interface AnalyzeKnownRiskRegistryOptions {
  chainId: number;
  subjects: readonly KnownRiskRegistrySubject[];
  enabled?: boolean;
  registry?: readonly KnownRiskRegistryEntry[];
  checkedAt?: string;
}

export interface KnownRiskRegistryValidationResult {
  ok: boolean;
  errors: string[];
}

// Entries must be reviewed before they are added here. This first production
// pass intentionally ships the schema and UI with no weak or unsourced labels.
export const KNOWN_RISK_REGISTRY: KnownRiskRegistryEntry[] = [];

const DEFAMATORY_TERMS = [
  "attacker",
  "criminal",
  "hacker",
  "scammer",
  "stolen",
  "thief",
];

const REGISTRY_WARNING =
  "Known-risk registry context is a reviewed-source signal only. No match is not proof that a wallet, spender, recipient, or contract is safe.";

const MATCH_WARNING =
  "Registry matches are context rather than proof of control, intent, or recoverability. Verify source links, dates, and chain scope before acting.";

export function analyzeKnownRiskRegistry({
  chainId,
  subjects,
  enabled = true,
  registry = KNOWN_RISK_REGISTRY,
  checkedAt = new Date().toISOString(),
}: AnalyzeKnownRiskRegistryOptions): KnownRiskRegistryAnalysis {
  if (!enabled) return emptyKnownRiskRegistryAnalysis("idle");

  const normalizedSubjects = dedupeSubjects(subjects);
  const evidence: KnownRiskRegistryEvidence[] = [];

  for (const subject of normalizedSubjects) {
    const matches = findKnownRiskRegistryEntries({
      address: subject.address,
      chainId,
      registry,
    });

    for (const entry of matches) {
      evidence.push({
        entryId: entry.id,
        address: entry.address,
        chainId: entry.chainId,
        subjectRole: subject.role,
        subjectLabel: subject.label,
        sourceModule: subject.sourceModule,
        label: entry.label,
        category: entry.category,
        confidence: entry.confidence,
        reviewedAt: entry.reviewedAt,
        summary: entry.summary,
        sources: entry.sources,
        expired: isExpired(entry.expiresAt, checkedAt),
        riskLevel: evidenceRiskLevel(entry),
      });
    }
  }

  const uniqueAddresses = new Set(
    normalizedSubjects.map((subject) => subject.address.toLowerCase()),
  );
  const highConfidenceMatchCount = evidence.filter(
    (item) => item.confidence === "high" && !item.expired,
  ).length;
  const reviewedSources = new Set(
    evidence.flatMap((item) => item.sources.map((source) => source.url)),
  );

  return {
    status: "complete",
    riskLevel: riskLevelFromEvidence(evidence),
    evidence,
    subjects: normalizedSubjects,
    summary: {
      checkedSubjectCount: normalizedSubjects.length,
      uniqueAddressCount: uniqueAddresses.size,
      matchCount: evidence.length,
      highConfidenceMatchCount,
      reviewedSourceCount: reviewedSources.size,
    },
    warnings: evidence.length > 0 ? [REGISTRY_WARNING, MATCH_WARNING] : [REGISTRY_WARNING],
  };
}

export function emptyKnownRiskRegistryAnalysis(
  status: KnownRiskRegistryStatus = "idle",
): KnownRiskRegistryAnalysis {
  return {
    status,
    riskLevel: status === "idle" ? "not_checked" : "none_detected",
    evidence: [],
    subjects: [],
    summary: {
      checkedSubjectCount: 0,
      uniqueAddressCount: 0,
      matchCount: 0,
      highConfidenceMatchCount: 0,
      reviewedSourceCount: 0,
    },
    warnings: status === "idle" ? [] : [REGISTRY_WARNING],
  };
}

export function findKnownRiskRegistryEntries({
  address,
  chainId,
  registry = KNOWN_RISK_REGISTRY,
}: {
  address: Address;
  chainId: number;
  registry?: readonly KnownRiskRegistryEntry[];
}): KnownRiskRegistryEntry[] {
  const normalizedAddress = address.toLowerCase();
  return registry.filter(
    (entry) =>
      entry.address.toLowerCase() === normalizedAddress &&
      (entry.chainId === "any" || entry.chainId === chainId),
  );
}

export function validateKnownRiskRegistryEntries(
  entries: readonly KnownRiskRegistryEntry[],
): KnownRiskRegistryValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();

  entries.forEach((entry, index) => {
    const prefix = `entry ${index + 1}${entry.id ? ` (${entry.id})` : ""}`;
    if (!entry.id.trim()) errors.push(`${prefix}: id is required.`);
    if (ids.has(entry.id)) errors.push(`${prefix}: duplicate id.`);
    ids.add(entry.id);

    if (!isAddress(entry.address)) {
      errors.push(`${prefix}: address must be a valid EVM address.`);
    }
    if (
      entry.chainId !== "any" &&
      (!Number.isInteger(entry.chainId) || entry.chainId <= 0)
    ) {
      errors.push(`${prefix}: chainId must be a positive integer or "any".`);
    }
    if (!entry.label.trim()) errors.push(`${prefix}: label is required.`);
    if (!entry.summary.trim()) errors.push(`${prefix}: summary is required.`);
    if (!entry.reviewedBy.trim()) {
      errors.push(`${prefix}: reviewedBy is required.`);
    }
    if (!isDateLike(entry.reviewedAt)) {
      errors.push(`${prefix}: reviewedAt must be an ISO-like date.`);
    }
    if (entry.expiresAt && !isDateLike(entry.expiresAt)) {
      errors.push(`${prefix}: expiresAt must be an ISO-like date when present.`);
    }
    if (containsUnsafeAttribution(entry.label, entry.summary)) {
      errors.push(
        `${prefix}: label or summary contains attribution language that needs legal review before shipping.`,
      );
    }
    if (entry.sources.length === 0) {
      errors.push(`${prefix}: at least one reviewed source is required.`);
    }

    entry.sources.forEach((source, sourceIndex) => {
      const sourcePrefix = `${prefix} source ${sourceIndex + 1}`;
      if (!source.title.trim()) {
        errors.push(`${sourcePrefix}: title is required.`);
      }
      if (!isHttpsUrl(source.url)) {
        errors.push(`${sourcePrefix}: url must be a valid HTTPS URL.`);
      }
      if (!source.publishedAt && !source.retrievedAt) {
        errors.push(
          `${sourcePrefix}: publishedAt or retrievedAt is required.`,
        );
      }
      if (source.publishedAt && !isDateLike(source.publishedAt)) {
        errors.push(`${sourcePrefix}: publishedAt must be ISO-like.`);
      }
      if (source.retrievedAt && !isDateLike(source.retrievedAt)) {
        errors.push(`${sourcePrefix}: retrievedAt must be ISO-like.`);
      }
    });
  });

  return { ok: errors.length === 0, errors };
}

export function knownRiskRegistryRiskLabel(
  riskLevel: KnownRiskRegistryRiskLevel,
): string {
  switch (riskLevel) {
    case "elevated":
      return "Reviewed risk match";
    case "possible":
      return "Registry review signal";
    case "informational":
      return "Registry context found";
    case "none_detected":
      return "No reviewed match found";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

export function normalizeKnownRiskRegistryAddress(
  value: string | null,
): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

function evidenceRiskLevel(
  entry: KnownRiskRegistryEntry,
): KnownRiskRegistryEvidence["riskLevel"] {
  if (entry.confidence === "high") return "elevated";
  if (entry.confidence === "medium") return "possible";
  return "informational";
}

function riskLevelFromEvidence(
  evidence: readonly KnownRiskRegistryEvidence[],
): KnownRiskRegistryRiskLevel {
  if (evidence.some((item) => item.riskLevel === "elevated" && !item.expired)) {
    return "elevated";
  }
  if (evidence.some((item) => item.riskLevel === "possible" && !item.expired)) {
    return "possible";
  }
  if (evidence.length > 0) return "informational";
  return "none_detected";
}

function dedupeSubjects(
  subjects: readonly KnownRiskRegistrySubject[],
): KnownRiskRegistrySubject[] {
  const byKey = new Map<string, KnownRiskRegistrySubject>();
  for (const subject of subjects) {
    const normalized = normalizeKnownRiskRegistryAddress(subject.address);
    if (!normalized) continue;
    const key = [
      normalized.toLowerCase(),
      subject.role,
      subject.sourceModule.toLowerCase(),
    ].join(":");
    if (byKey.has(key)) continue;
    byKey.set(key, {
      ...subject,
      address: normalized,
    });
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.address.localeCompare(b.address) ||
      a.role.localeCompare(b.role) ||
      a.sourceModule.localeCompare(b.sourceModule),
  );
}

function isExpired(expiresAt: string | undefined, checkedAt: string): boolean {
  if (!expiresAt) return false;
  const expires = Date.parse(expiresAt);
  const checked = Date.parse(checkedAt);
  return Number.isFinite(expires) && Number.isFinite(checked) && expires < checked;
}

function containsUnsafeAttribution(...values: readonly string[]): boolean {
  const text = values.join(" ").toLowerCase();
  return DEFAMATORY_TERMS.some((term) => new RegExp(`\\b${term}\\b`, "i").test(text));
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isDateLike(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(Date.parse(value));
}
