import { keccak256, type Hex } from "viem";

import reviewedRegistryJson from "@/lib/token-contract-bytecode-template-registry.json";

export const TOKEN_BYTECODE_TEMPLATE_REGISTRY_LIMITS = Object.freeze({
  maxEntries: 500,
  maxRuntimeBytes: 512 * 1024,
  maxValidationErrors: 40,
});

export interface ReviewedBytecodeTemplateEntry {
  id: string;
  label: string;
  source: {
    repositoryUrl: string;
    commit: string;
    sourcePath: string;
    artifactPath: string;
  };
  review: {
    reviewedAt: string;
    reviewedBy: string;
    summary: string;
  };
  compiler: {
    version: string | null;
  };
  assessment: {
    classification: "normal" | "risky" | "neutral";
    severity: "info" | "low" | "medium" | "high" | "critical";
    capabilities: string[];
  };
  runtime: {
    byteLength: number;
    hash: `0x${string}`;
    hashWithoutMetadata: `0x${string}`;
    metadataDetected: boolean;
  };
}

export interface ReviewedBytecodeTemplateRegistry {
  $schema: "./token-contract-bytecode-template-registry.schema.json";
  schemaVersion: 1;
  entries: readonly ReviewedBytecodeTemplateEntry[];
}

export interface ReviewedBytecodeTemplateRegistryValidation {
  valid: boolean;
  registry: ReviewedBytecodeTemplateRegistry | null;
  errors: readonly string[];
}

export interface BytecodeTemplateMatchResult {
  status: "matched" | "not-matched" | "malformed" | "registry-invalid";
  matchKind: "exact-runtime" | "exact-runtime-without-metadata" | null;
  template: ReviewedBytecodeTemplateEntry | null;
  runtimeHash: Hex | null;
  runtimeHashWithoutMetadata: Hex | null;
  metadataDetected: boolean;
  warnings: readonly string[];
}

export interface MetadataStrippedBytecode {
  bytecode: Hex;
  metadataDetected: boolean;
  metadataLength: number | null;
}

const EXACT_MATCH_BOUNDARY =
  "An exact template match identifies reviewed runtime bytes only. It does not prove safe constructor state, current storage, ownership, liquidity, or later proxy implementation behavior.";
const NO_MATCH_BOUNDARY =
  "No reviewed template match is not evidence that the contract is unsafe or safe.";

const defaultRegistryValidation = validateReviewedBytecodeTemplateRegistry(
  reviewedRegistryJson,
);

export const REVIEWED_TOKEN_BYTECODE_TEMPLATE_REGISTRY =
  defaultRegistryValidation.registry ?? {
    $schema: "./token-contract-bytecode-template-registry.schema.json",
    schemaVersion: 1,
    entries: [],
  };

export function matchReviewedBytecodeTemplate(
  runtimeBytecode: unknown,
  registry: unknown = REVIEWED_TOKEN_BYTECODE_TEMPLATE_REGISTRY,
): BytecodeTemplateMatchResult {
  const runtime = normalizeRuntimeBytecode(runtimeBytecode);
  if (!runtime) {
    return {
      status: "malformed",
      matchKind: null,
      template: null,
      runtimeHash: null,
      runtimeHashWithoutMetadata: null,
      metadataDetected: false,
      warnings: [
        `Template matching requires non-empty even-length runtime bytecode of at most ${TOKEN_BYTECODE_TEMPLATE_REGISTRY_LIMITS.maxRuntimeBytes.toLocaleString("en-US")} bytes.`,
      ],
    };
  }

  const validation = validateReviewedBytecodeTemplateRegistry(registry);
  const stripped = stripSolidityMetadataForTemplateHash(runtime);
  const runtimeHash = keccak256(runtime);
  const runtimeHashWithoutMetadata = keccak256(stripped.bytecode);
  if (!validation.valid || !validation.registry) {
    return {
      status: "registry-invalid",
      matchKind: null,
      template: null,
      runtimeHash,
      runtimeHashWithoutMetadata,
      metadataDetected: stripped.metadataDetected,
      warnings: validation.errors,
    };
  }

  const fullMatches = validation.registry.entries.filter(
    (entry) => entry.runtime.hash === runtimeHash,
  );
  if (fullMatches.length === 1) {
    return {
      status: "matched",
      matchKind: "exact-runtime",
      template: fullMatches[0],
      runtimeHash,
      runtimeHashWithoutMetadata,
      metadataDetected: stripped.metadataDetected,
      warnings: [EXACT_MATCH_BOUNDARY],
    };
  }

  const executableMatches = validation.registry.entries.filter(
    (entry) =>
      entry.runtime.hashWithoutMetadata === runtimeHashWithoutMetadata,
  );
  if (executableMatches.length === 1) {
    return {
      status: "matched",
      matchKind: "exact-runtime-without-metadata",
      template: executableMatches[0],
      runtimeHash,
      runtimeHashWithoutMetadata,
      metadataDetected: stripped.metadataDetected,
      warnings: [
        "The executable runtime bytes match after removing a structurally valid Solidity CBOR metadata suffix; compiler metadata differs or was absent.",
        EXACT_MATCH_BOUNDARY,
      ],
    };
  }

  return {
    status: "not-matched",
    matchKind: null,
    template: null,
    runtimeHash,
    runtimeHashWithoutMetadata,
    metadataDetected: stripped.metadataDetected,
    warnings: [NO_MATCH_BOUNDARY],
  };
}

export function stripSolidityMetadataForTemplateHash(
  runtimeBytecode: Hex,
): MetadataStrippedBytecode {
  const normalized = normalizeRuntimeBytecode(runtimeBytecode);
  if (!normalized) {
    return {
      bytecode: "0x",
      metadataDetected: false,
      metadataLength: null,
    };
  }
  const hex = normalized.slice(2);
  if (hex.length < 8) {
    return {
      bytecode: normalized,
      metadataDetected: false,
      metadataLength: null,
    };
  }
  const metadataLength = Number.parseInt(hex.slice(-4), 16);
  const metadataStart = hex.length - 4 - metadataLength * 2;
  if (
    !Number.isSafeInteger(metadataLength) ||
    metadataLength <= 0 ||
    metadataStart < 2 ||
    metadataStart % 2 !== 0
  ) {
    return {
      bytecode: normalized,
      metadataDetected: false,
      metadataLength: null,
    };
  }
  const metadata = hex.slice(metadataStart, hex.length - 4);
  // Solidity metadata is a trailing CBOR map. Restrict stripping to the two
  // common definite-map prefixes already accepted by the report engine. A
  // coincidental trailing length is never enough to alter the fingerprint.
  if (!isRecognizedSolidityMetadata(metadata)) {
    return {
      bytecode: normalized,
      metadataDetected: false,
      metadataLength: null,
    };
  }
  return {
    bytecode: `0x${hex.slice(0, metadataStart)}`,
    metadataDetected: true,
    metadataLength,
  };
}

function isRecognizedSolidityMetadata(metadata: string): boolean {
  if (!metadata.startsWith("a1") && !metadata.startsWith("a2")) return false;
  return [
    "69706673", // ipfs
    "627a7a7230", // bzzr0
    "627a7a7231", // bzzr1
    "64736f6c63", // solc
  ].some((marker) => metadata.includes(marker));
}

export function validateReviewedBytecodeTemplateRegistry(
  value: unknown,
): ReviewedBytecodeTemplateRegistryValidation {
  const errors: string[] = [];
  const addError = (message: string) => {
    if (
      errors.length <
      TOKEN_BYTECODE_TEMPLATE_REGISTRY_LIMITS.maxValidationErrors
    ) {
      errors.push(message);
    }
  };
  if (!isRecord(value)) {
    return {
      valid: false,
      registry: null,
      errors: ["Template registry must be a JSON object."],
    };
  }
  validateOnlyKeys(
    value,
    ["$schema", "schemaVersion", "entries"],
    "Template registry",
    addError,
  );
  if (
    value.$schema !==
    "./token-contract-bytecode-template-registry.schema.json"
  ) {
    addError("Template registry $schema is missing or unsupported.");
  }
  if (value.schemaVersion !== 1) {
    addError("Template registry schemaVersion must be 1.");
  }
  if (!Array.isArray(value.entries)) {
    addError("Template registry entries must be an array.");
  } else if (
    value.entries.length > TOKEN_BYTECODE_TEMPLATE_REGISTRY_LIMITS.maxEntries
  ) {
    addError(
      `Template registry exceeds ${TOKEN_BYTECODE_TEMPLATE_REGISTRY_LIMITS.maxEntries} entries.`,
    );
  }

  const entries = Array.isArray(value.entries)
    ? value.entries.slice(0, TOKEN_BYTECODE_TEMPLATE_REGISTRY_LIMITS.maxEntries)
    : [];
  const ids = new Set<string>();
  const fullHashes = new Set<string>();
  const executableHashes = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const prefix = `entries[${index}]`;
    if (!isRecord(entry)) {
      addError(`${prefix} must be an object.`);
      continue;
    }
    validateEntry(entry, prefix, addError);
    if (typeof entry.id === "string") {
      if (ids.has(entry.id)) addError(`${prefix}.id is duplicated.`);
      ids.add(entry.id);
    }
    const runtime = isRecord(entry.runtime) ? entry.runtime : null;
    if (typeof runtime?.hash === "string") {
      if (fullHashes.has(runtime.hash)) {
        addError(`${prefix}.runtime.hash is duplicated.`);
      }
      fullHashes.add(runtime.hash);
    }
    if (typeof runtime?.hashWithoutMetadata === "string") {
      if (executableHashes.has(runtime.hashWithoutMetadata)) {
        addError(`${prefix}.runtime.hashWithoutMetadata is duplicated.`);
      }
      executableHashes.add(runtime.hashWithoutMetadata);
    }
  }

  return errors.length > 0
    ? { valid: false, registry: null, errors }
    : {
        valid: true,
        registry: value as unknown as ReviewedBytecodeTemplateRegistry,
        errors: [],
      };
}

function validateEntry(
  entry: Record<string, unknown>,
  prefix: string,
  addError: (message: string) => void,
) {
  validateOnlyKeys(
    entry,
    ["id", "label", "source", "review", "compiler", "assessment", "runtime"],
    prefix,
    addError,
  );
  if (!isBoundedString(entry.id, 1, 80) || !/^[a-z0-9][a-z0-9._-]*$/.test(entry.id)) {
    addError(`${prefix}.id is invalid.`);
  }
  if (!isBoundedString(entry.label, 1, 120)) {
    addError(`${prefix}.label is invalid.`);
  }
  const source = isRecord(entry.source) ? entry.source : null;
  if (!source) {
    addError(`${prefix}.source is invalid.`);
  } else {
    validateOnlyKeys(
      source,
      ["repositoryUrl", "commit", "sourcePath", "artifactPath"],
      `${prefix}.source`,
      addError,
    );
    if (!isHttpsUrl(source.repositoryUrl)) {
      addError(`${prefix}.source.repositoryUrl must be an HTTPS URL.`);
    }
    if (
      typeof source.commit !== "string" ||
      !/^[0-9a-f]{40}$/.test(source.commit)
    ) {
      addError(`${prefix}.source.commit must be a full lowercase Git commit.`);
    }
    if (!isBoundedString(source.sourcePath, 1, 300)) {
      addError(`${prefix}.source.sourcePath is invalid.`);
    }
    if (!isBoundedString(source.artifactPath, 1, 300)) {
      addError(`${prefix}.source.artifactPath is invalid.`);
    }
  }
  const review = isRecord(entry.review) ? entry.review : null;
  if (!review) {
    addError(`${prefix}.review is invalid.`);
  } else {
    validateOnlyKeys(
      review,
      ["reviewedAt", "reviewedBy", "summary"],
      `${prefix}.review`,
      addError,
    );
    if (
      typeof review.reviewedAt !== "string" ||
      !isIsoCalendarDate(review.reviewedAt)
    ) {
      addError(`${prefix}.review.reviewedAt is invalid.`);
    }
    if (!isBoundedString(review.reviewedBy, 1, 120)) {
      addError(`${prefix}.review.reviewedBy is invalid.`);
    }
    if (!isBoundedString(review.summary, 1, 600)) {
      addError(`${prefix}.review.summary is invalid.`);
    }
  }
  const compiler = isRecord(entry.compiler) ? entry.compiler : null;
  if (compiler) {
    validateOnlyKeys(
      compiler,
      ["version"],
      `${prefix}.compiler`,
      addError,
    );
  }
  if (
    !compiler ||
    !(
      compiler.version === null ||
      isBoundedString(compiler.version, 1, 120)
    )
  ) {
    addError(`${prefix}.compiler.version is invalid.`);
  }
  const assessment = isRecord(entry.assessment) ? entry.assessment : null;
  if (!assessment) {
    addError(`${prefix}.assessment is invalid.`);
  } else {
    validateOnlyKeys(
      assessment,
      ["classification", "severity", "capabilities"],
      `${prefix}.assessment`,
      addError,
    );
    if (!new Set(["normal", "risky", "neutral"]).has(String(assessment.classification))) {
      addError(`${prefix}.assessment.classification is invalid.`);
    }
    if (!new Set(["info", "low", "medium", "high", "critical"]).has(String(assessment.severity))) {
      addError(`${prefix}.assessment.severity is invalid.`);
    }
    if (
      assessment.classification === "risky" &&
      assessment.severity === "info"
    ) {
      addError(`${prefix}.assessment.severity must express risk for a risky template.`);
    }
    if (
      assessment.classification !== "risky" &&
      assessment.severity !== "info"
    ) {
      addError(`${prefix}.assessment.severity must be info unless the template is risky.`);
    }
    if (
      !Array.isArray(assessment.capabilities) ||
      assessment.capabilities.length > 20 ||
      assessment.capabilities.some(
        (capability) =>
          !isBoundedString(capability, 1, 160) || capability.trim().length === 0,
      )
    ) {
      addError(`${prefix}.assessment.capabilities is invalid.`);
    } else {
      if (
        assessment.classification === "risky" &&
        assessment.capabilities.length === 0
      ) {
        addError(
          `${prefix}.assessment.capabilities must name at least one reviewed capability for a risky template.`,
        );
      }
      if (new Set(assessment.capabilities).size !== assessment.capabilities.length) {
        addError(`${prefix}.assessment.capabilities contains duplicates.`);
      }
    }
  }
  const runtime = isRecord(entry.runtime) ? entry.runtime : null;
  if (!runtime) {
    addError(`${prefix}.runtime is invalid.`);
    return;
  }
  validateOnlyKeys(
    runtime,
    ["byteLength", "hash", "hashWithoutMetadata", "metadataDetected"],
    `${prefix}.runtime`,
    addError,
  );
  if (
    !Number.isSafeInteger(runtime.byteLength) ||
    Number(runtime.byteLength) < 1 ||
    Number(runtime.byteLength) >
      TOKEN_BYTECODE_TEMPLATE_REGISTRY_LIMITS.maxRuntimeBytes
  ) {
    addError(`${prefix}.runtime.byteLength is invalid.`);
  }
  if (!isHash(runtime.hash)) addError(`${prefix}.runtime.hash is invalid.`);
  if (!isHash(runtime.hashWithoutMetadata)) {
    addError(`${prefix}.runtime.hashWithoutMetadata is invalid.`);
  }
  if (typeof runtime.metadataDetected !== "boolean") {
    addError(`${prefix}.runtime.metadataDetected is invalid.`);
  }
}

function validateOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  prefix: string,
  addError: (message: string) => void,
) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) addError(`${prefix}.${key} is not supported.`);
  }
}

function normalizeRuntimeBytecode(value: unknown): Hex | null {
  if (
    typeof value !== "string" ||
    !/^0x(?:[0-9a-fA-F]{2})+$/.test(value) ||
    (value.length - 2) / 2 >
      TOKEN_BYTECODE_TEMPLATE_REGISTRY_LIMITS.maxRuntimeBytes
  ) {
    return null;
  }
  return value.toLowerCase() as Hex;
}

function isHash(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBoundedString(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return (
    typeof value === "string" &&
    value.length >= minimum &&
    value.length <= maximum &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function isHttpsUrl(value: unknown): boolean {
  if (!isBoundedString(value, 1, 500)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
