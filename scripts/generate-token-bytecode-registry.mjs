#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { keccak256 } from "viem";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const DEFAULT_MANIFEST = resolve(
  REPOSITORY_ROOT,
  "scripts/token-bytecode-template-manifest.json",
);
const DEFAULT_OUTPUT = resolve(
  REPOSITORY_ROOT,
  "src/lib/token-contract-bytecode-template-registry.json",
);
const REGISTRY_SCHEMA =
  "./token-contract-bytecode-template-registry.schema.json";
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
const MAX_RUNTIME_BYTES = 512 * 1024;
const MAX_ENTRIES = 500;

function usage() {
  console.log(
    [
      "Generate the exact reviewed token bytecode template registry.",
      "",
      "Usage:",
      "  node scripts/generate-token-bytecode-registry.mjs",
      "  node scripts/generate-token-bytecode-registry.mjs --manifest=PATH --output=PATH",
      "  node scripts/generate-token-bytecode-registry.mjs --check",
      "",
      "Only explicitly reviewed manifest entries are accepted. Runtime bytecode",
      "must be concrete hexadecimal data; unresolved link placeholders are rejected.",
    ].join("\n"),
  );
}

function parseArguments(argv) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    output: DEFAULT_OUTPUT,
    check: false,
    help: false,
  };
  for (const argument of argv) {
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--check") options.check = true;
    else if (argument.startsWith("--manifest=")) {
      options.manifest = resolve(argument.slice("--manifest=".length));
    } else if (argument.startsWith("--output=")) {
      options.output = resolve(argument.slice("--output=".length));
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function readBoundedJson(path, maximumBytes, label) {
  const stats = statSync(path);
  if (!stats.isFile()) throw new Error(`${label} is not a regular file: ${path}`);
  if (stats.size > maximumBytes) {
    throw new Error(`${label} exceeds the ${maximumBytes}-byte cap: ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function generateRegistry(manifestPath) {
  const manifest = readBoundedJson(
    manifestPath,
    MAX_MANIFEST_BYTES,
    "Template manifest",
  );
  if (!isRecord(manifest) || manifest.schemaVersion !== 1) {
    throw new Error("Template manifest schemaVersion must be 1.");
  }
  if (!Array.isArray(manifest.entries)) {
    throw new Error("Template manifest entries must be an array.");
  }
  if (manifest.entries.length > MAX_ENTRIES) {
    throw new Error(`Template manifest exceeds ${MAX_ENTRIES} entries.`);
  }

  const manifestRoot = realpathSync(dirname(manifestPath));
  const entries = manifest.entries.map((entry, index) =>
    generateEntry(entry, index, manifestRoot),
  );
  entries.sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );
  enforceUnique(entries, "id", (entry) => entry.id);
  enforceUnique(entries, "runtime hash", (entry) => entry.runtime.hash);
  enforceUnique(
    entries,
    "metadata-stripped runtime hash",
    (entry) => entry.runtime.hashWithoutMetadata,
  );
  return {
    $schema: REGISTRY_SCHEMA,
    schemaVersion: 1,
    entries,
  };
}

function generateEntry(value, index, manifestRoot) {
  const prefix = `entries[${index}]`;
  if (!isRecord(value)) throw new Error(`${prefix} must be an object.`);
  const id = requiredString(value.id, `${prefix}.id`, 80);
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) {
    throw new Error(`${prefix}.id must be a lowercase registry identifier.`);
  }
  const label = requiredString(value.label, `${prefix}.label`, 120);
  const artifactPath = requiredString(
    value.artifactPath,
    `${prefix}.artifactPath`,
    300,
  );
  const artifactAbsolutePath = resolveReviewedArtifactPath(
    manifestRoot,
    artifactPath,
    prefix,
  );
  const artifact = readBoundedJson(
    artifactAbsolutePath,
    MAX_ARTIFACT_BYTES,
    `${prefix} artifact`,
  );
  const runtime = extractRuntimeBytecode(artifact, prefix);
  const stripped = stripSolidityMetadata(runtime);

  const repositoryUrl = requiredString(
    value.repositoryUrl,
    `${prefix}.repositoryUrl`,
    500,
  );
  if (!isHttpsUrl(repositoryUrl)) {
    throw new Error(`${prefix}.repositoryUrl must be an HTTPS URL.`);
  }
  const commit = requiredString(value.commit, `${prefix}.commit`, 40);
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error(`${prefix}.commit must be a full lowercase Git commit.`);
  }
  const sourcePath = requiredString(
    value.sourcePath,
    `${prefix}.sourcePath`,
    300,
  );
  const reviewedAt = requiredString(
    value.reviewedAt,
    `${prefix}.reviewedAt`,
    10,
  );
  if (
    !isIsoCalendarDate(reviewedAt)
  ) {
    throw new Error(`${prefix}.reviewedAt must be a valid YYYY-MM-DD date.`);
  }
  const reviewedBy = requiredString(
    value.reviewedBy,
    `${prefix}.reviewedBy`,
    120,
  );
  const summary = requiredString(
    value.reviewSummary,
    `${prefix}.reviewSummary`,
    600,
  );
  const compilerVersion = optionalString(
    value.compilerVersion,
    `${prefix}.compilerVersion`,
    120,
  );
  const classification = requiredEnum(
    value.classification,
    `${prefix}.classification`,
    ["normal", "risky", "neutral"],
  );
  const severity = requiredEnum(
    value.severity,
    `${prefix}.severity`,
    ["info", "low", "medium", "high", "critical"],
  );
  if (classification === "risky" && severity === "info") {
    throw new Error(`${prefix}.severity must express risk for a risky template.`);
  }
  if (classification !== "risky" && severity !== "info") {
    throw new Error(`${prefix}.severity must be info unless classification is risky.`);
  }
  if (!Array.isArray(value.capabilities) || value.capabilities.length > 20) {
    throw new Error(`${prefix}.capabilities must contain at most 20 strings.`);
  }
  const capabilities = value.capabilities.map((capability, capabilityIndex) =>
    requiredString(
      capability,
      `${prefix}.capabilities[${capabilityIndex}]`,
      160,
    ),
  );
  if (capabilities.some((capability) => capability.trim().length === 0)) {
    throw new Error(`${prefix}.capabilities cannot contain blank values.`);
  }
  if (new Set(capabilities).size !== capabilities.length) {
    throw new Error(`${prefix}.capabilities cannot contain duplicates.`);
  }
  if (classification === "risky" && capabilities.length === 0) {
    throw new Error(
      `${prefix}.capabilities must name at least one reviewed capability for a risky template.`,
    );
  }

  return {
    id,
    label,
    source: {
      repositoryUrl,
      commit,
      sourcePath,
      artifactPath: artifactPath.replaceAll("\\", "/"),
    },
    review: { reviewedAt, reviewedBy, summary },
    compiler: { version: compilerVersion },
    assessment: { classification, severity, capabilities },
    runtime: {
      byteLength: (runtime.length - 2) / 2,
      hash: keccak256(runtime),
      hashWithoutMetadata: keccak256(stripped.bytecode),
      metadataDetected: stripped.metadataDetected,
    },
  };
}

function resolveReviewedArtifactPath(manifestRoot, artifactPath, prefix) {
  if (isAbsolute(artifactPath)) {
    throw new Error(`${prefix}.artifactPath must be relative to the manifest.`);
  }
  const candidate = resolve(manifestRoot, artifactPath);
  if (!existsSync(candidate)) {
    throw new Error(`${prefix}.artifactPath does not exist: ${artifactPath}`);
  }
  const realCandidate = realpathSync(candidate);
  const relativePath = relative(manifestRoot, realCandidate);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`${prefix}.artifactPath escapes the manifest directory.`);
  }
  return realCandidate;
}

function extractRuntimeBytecode(artifact, prefix) {
  if (!isRecord(artifact)) throw new Error(`${prefix} artifact must be an object.`);
  const evm = isRecord(artifact.evm) ? artifact.evm : null;
  const evmDeployed = isRecord(evm?.deployedBytecode)
    ? evm.deployedBytecode
    : null;
  const deployed = isRecord(artifact.deployedBytecode)
    ? artifact.deployedBytecode
    : null;
  const candidates = [
    typeof artifact.deployedBytecode === "string"
      ? artifact.deployedBytecode
      : null,
    typeof deployed?.object === "string" ? deployed.object : null,
    typeof evmDeployed?.object === "string" ? evmDeployed.object : null,
  ];
  const candidate = candidates.find((item) => item !== null);
  if (!candidate) {
    throw new Error(
      `${prefix} artifact does not contain deployed runtime bytecode.`,
    );
  }
  const prefixed = candidate.startsWith("0x") ? candidate : `0x${candidate}`;
  if (!/^0x(?:[0-9a-fA-F]{2})+$/.test(prefixed)) {
    throw new Error(
      `${prefix} deployed runtime bytecode is empty, malformed, or contains unresolved links.`,
    );
  }
  if ((prefixed.length - 2) / 2 > MAX_RUNTIME_BYTES) {
    throw new Error(
      `${prefix} deployed runtime bytecode exceeds ${MAX_RUNTIME_BYTES} bytes.`,
    );
  }
  return prefixed.toLowerCase();
}

function stripSolidityMetadata(runtime) {
  const hex = runtime.slice(2);
  if (hex.length < 8) {
    return { bytecode: runtime, metadataDetected: false };
  }
  const metadataLength = Number.parseInt(hex.slice(-4), 16);
  const metadataStart = hex.length - 4 - metadataLength * 2;
  if (
    !Number.isSafeInteger(metadataLength) ||
    metadataLength <= 0 ||
    metadataStart < 2 ||
    metadataStart % 2 !== 0
  ) {
    return { bytecode: runtime, metadataDetected: false };
  }
  const metadata = hex.slice(metadataStart, hex.length - 4);
  if (!isRecognizedSolidityMetadata(metadata)) {
    return { bytecode: runtime, metadataDetected: false };
  }
  return {
    bytecode: `0x${hex.slice(0, metadataStart)}`,
    metadataDetected: true,
  };
}

function isRecognizedSolidityMetadata(metadata) {
  if (!metadata.startsWith("a1") && !metadata.startsWith("a2")) return false;
  return [
    "69706673", // ipfs
    "627a7a7230", // bzzr0
    "627a7a7231", // bzzr1
    "64736f6c63", // solc
  ].some((marker) => metadata.includes(marker));
}

function enforceUnique(entries, label, selector) {
  const seen = new Set();
  for (const entry of entries) {
    const value = selector(entry);
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function requiredString(value, label, maximumLength) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error(`${label} is missing or invalid.`);
  }
  return value;
}

function optionalString(value, label, maximumLength) {
  if (value === undefined || value === null) return null;
  return requiredString(value, label, maximumLength);
}

function requiredEnum(value, label, allowed) {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${label} must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isIsoCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function serializeRegistry(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

function writeAtomically(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  try {
    writeFileSync(temporaryPath, contents, { encoding: "utf8", flag: "w" });
    renameSync(temporaryPath, path);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  const registry = generateRegistry(options.manifest);
  const serialized = serializeRegistry(registry);
  if (options.check) {
    if (!existsSync(options.output)) {
      throw new Error(`Registry output does not exist: ${options.output}`);
    }
    const existing = readFileSync(options.output, "utf8");
    if (existing !== serialized) {
      throw new Error(
        "Reviewed bytecode template registry is stale. Run the generator and review the diff.",
      );
    }
    console.log(`Reviewed bytecode template registry is current (${registry.entries.length} entries).`);
    return;
  }
  writeAtomically(options.output, serialized);
  console.log(`Wrote ${registry.entries.length} reviewed bytecode template entries to ${options.output}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
