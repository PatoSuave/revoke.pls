import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { keccak256, type Hex } from "viem";

import {
  REVIEWED_TOKEN_BYTECODE_TEMPLATE_REGISTRY,
  matchReviewedBytecodeTemplate,
  stripSolidityMetadataForTemplateHash,
  validateReviewedBytecodeTemplateRegistry,
  type ReviewedBytecodeTemplateEntry,
  type ReviewedBytecodeTemplateRegistry,
} from "@/lib/token-contract-bytecode-templates";

const temporaryDirectories: string[] = [];

function reviewedEntry(runtime: Hex): ReviewedBytecodeTemplateEntry {
  const stripped = stripSolidityMetadataForTemplateHash(runtime);
  return {
    id: "reviewed.reference.v1",
    label: "Reviewed reference implementation",
    source: {
      repositoryUrl: "https://github.com/example/reviewed-contracts",
      commit: "a".repeat(40),
      sourcePath: "src/Reference.sol",
      artifactPath: "artifacts/Reference.json",
    },
    review: {
      reviewedAt: "2026-07-14",
      reviewedBy: "Repository owner",
      summary: "Runtime artifact was compiled from and compared with the cited source.",
    },
    compiler: { version: "0.8.30" },
    assessment: {
      classification: "neutral",
      severity: "info",
      capabilities: ["Reference capability"],
    },
    runtime: {
      byteLength: (runtime.length - 2) / 2,
      hash: keccak256(runtime),
      hashWithoutMetadata: keccak256(stripped.bytecode),
      metadataDetected: stripped.metadataDetected,
    },
  };
}

function registry(
  entries: readonly ReviewedBytecodeTemplateEntry[],
): ReviewedBytecodeTemplateRegistry {
  return {
    $schema: "./token-contract-bytecode-template-registry.schema.json",
    schemaVersion: 1,
    entries,
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("reviewed bytecode template registry", () => {
  it("ships an intentionally empty, valid reviewed registry", () => {
    expect(
      validateReviewedBytecodeTemplateRegistry(
        REVIEWED_TOKEN_BYTECODE_TEMPLATE_REGISTRY,
      ),
    ).toMatchObject({ valid: true, errors: [] });
    expect(REVIEWED_TOKEN_BYTECODE_TEMPLATE_REGISTRY.entries).toEqual([]);

    const result = matchReviewedBytecodeTemplate("0x6001600055");
    expect(result).toMatchObject({
      status: "not-matched",
      matchKind: null,
      template: null,
    });
    expect(result.warnings.join(" ")).toContain("not evidence");
  });

  it("matches only exact full runtime hashes", () => {
    const runtime = "0x6001600055" as Hex;
    const entry = reviewedEntry(runtime);

    expect(matchReviewedBytecodeTemplate(runtime, registry([entry]))).toMatchObject({
      status: "matched",
      matchKind: "exact-runtime",
      template: {
        id: entry.id,
        assessment: { classification: "neutral", severity: "info" },
      },
      runtimeHash: entry.runtime.hash,
    });
    expect(
      matchReviewedBytecodeTemplate("0x6002600055", registry([entry])),
    ).toMatchObject({ status: "not-matched", template: null });
  });

  it("matches exact executable bytes after conservative Solidity metadata stripping", () => {
    const executable = "6001600055";
    const firstMetadata = "a16469706673420102";
    const secondMetadata = "a16469706673420304";
    const registered = `0x${executable}${firstMetadata}0009` as Hex;
    const inspected = `0x${executable}${secondMetadata}0009` as Hex;
    const entry = reviewedEntry(registered);

    const result = matchReviewedBytecodeTemplate(inspected, registry([entry]));

    expect(result).toMatchObject({
      status: "matched",
      matchKind: "exact-runtime-without-metadata",
      metadataDetected: true,
      template: { id: entry.id },
    });
    expect(result.runtimeHash).not.toBe(entry.runtime.hash);
    expect(result.runtimeHashWithoutMetadata).toBe(
      entry.runtime.hashWithoutMetadata,
    );
  });

  it("does not strip an arbitrary suffix that only resembles a length field", () => {
    const runtime = "0x6001600055600060000004" as Hex;

    expect(stripSolidityMetadataForTemplateHash(runtime)).toEqual({
      bytecode: runtime,
      metadataDetected: false,
      metadataLength: null,
    });

    const unrecognizedCbor =
      "0x6001600055a1646e6f70654201020009" as Hex;
    expect(stripSolidityMetadataForTemplateHash(unrecognizedCbor)).toEqual({
      bytecode: unrecognizedCbor,
      metadataDetected: false,
      metadataLength: null,
    });
  });

  it("rejects malformed, duplicate, and unreviewed registry data", () => {
    expect(matchReviewedBytecodeTemplate("0x123")).toMatchObject({
      status: "malformed",
      runtimeHash: null,
    });

    const entry = reviewedEntry("0x6001600055");
    const validation = validateReviewedBytecodeTemplateRegistry(
      registry([entry, { ...entry }]),
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors.join(" ")).toContain("duplicated");

    expect(
      matchReviewedBytecodeTemplate("0x6001600055", {
        schemaVersion: 1,
        entries: [],
      }),
    ).toMatchObject({ status: "registry-invalid", template: null });

    expect(
      validateReviewedBytecodeTemplateRegistry(
        registry([
          {
            ...entry,
            assessment: {
              classification: "risky",
              severity: "info",
              capabilities: ["Privileged mint"],
            },
          },
        ]),
      ).errors.join(" "),
    ).toContain("must express risk");

    expect(
      validateReviewedBytecodeTemplateRegistry(
        registry([
          {
            ...entry,
            assessment: {
              classification: "risky",
              severity: "high",
              capabilities: [],
            },
          },
        ]),
      ).errors.join(" "),
    ).toContain("at least one reviewed capability");

    expect(
      validateReviewedBytecodeTemplateRegistry({
        ...registry([entry]),
        unexpected: true,
      }).errors.join(" "),
    ).toContain("not supported");

    expect(
      validateReviewedBytecodeTemplateRegistry(
        registry([
          {
            ...entry,
            review: { ...entry.review, reviewedAt: "2026-02-30" },
          },
        ]),
      ).errors.join(" "),
    ).toContain("reviewedAt is invalid");

    expect(
      validateReviewedBytecodeTemplateRegistry(
        registry([
          {
            ...entry,
            assessment: {
              classification: "neutral",
              severity: "medium",
              capabilities: ["Repeated", "Repeated"],
            },
          },
        ]),
      ).errors.join(" "),
    ).toContain("severity must be info");
  });

  it("generates deterministic bounded registry data from an explicit reviewed artifact manifest", () => {
    const directory = mkdtempSync(join(tmpdir(), "token-bytecode-registry-"));
    temporaryDirectories.push(directory);
    const artifactPath = join(directory, "Reference.json");
    const manifestPath = join(directory, "manifest.json");
    const firstOutputPath = join(directory, "registry-first.json");
    const secondOutputPath = join(directory, "registry-second.json");
    const runtime = "0x6001600055" as Hex;
    writeFileSync(
      artifactPath,
      JSON.stringify({ deployedBytecode: runtime }),
      "utf8",
    );
    writeFileSync(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          {
            id: "reviewed.reference.v1",
            label: "Reviewed reference implementation",
            artifactPath: "Reference.json",
            repositoryUrl: "https://github.com/example/reviewed-contracts",
            commit: "a".repeat(40),
            sourcePath: "src/Reference.sol",
            reviewedAt: "2026-07-14",
            reviewedBy: "Repository owner",
            reviewSummary:
              "Runtime artifact was compiled from and compared with the cited source.",
            compilerVersion: "0.8.30",
            classification: "neutral",
            severity: "info",
            capabilities: ["Reference capability"],
          },
        ],
      }),
      "utf8",
    );
    const script = resolve(
      process.cwd(),
      "scripts/generate-token-bytecode-registry.mjs",
    );
    const run = (output: string, extraArguments: string[] = []) =>
      execFileSync(
        process.execPath,
        [
          script,
          `--manifest=${manifestPath}`,
          `--output=${output}`,
          ...extraArguments,
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );

    run(firstOutputPath);
    run(secondOutputPath);
    expect(readFileSync(firstOutputPath, "utf8")).toBe(
      readFileSync(secondOutputPath, "utf8"),
    );
    expect(() => run(firstOutputPath, ["--check"])).not.toThrow();

    const generated = JSON.parse(
      readFileSync(firstOutputPath, "utf8"),
    ) as unknown;
    expect(validateReviewedBytecodeTemplateRegistry(generated)).toMatchObject({
      valid: true,
      errors: [],
    });
    expect(generated).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        entries: [
          expect.objectContaining({
            id: "reviewed.reference.v1",
            assessment: {
              classification: "neutral",
              severity: "info",
              capabilities: ["Reference capability"],
            },
            runtime: expect.objectContaining({
              byteLength: 5,
              hash: keccak256(runtime),
              hashWithoutMetadata: keccak256(runtime),
              metadataDetected: false,
            }),
          }),
        ],
      }),
    );

    writeFileSync(
      manifestPath,
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          {
            id: "reviewed.risky.v1",
            label: "Reviewed risky implementation",
            artifactPath: "Reference.json",
            repositoryUrl: "https://github.com/example/reviewed-contracts",
            commit: "a".repeat(40),
            sourcePath: "src/Reference.sol",
            reviewedAt: "2026-07-14",
            reviewedBy: "Repository owner",
            reviewSummary: "Reviewed risky template without a documented capability.",
            compilerVersion: "0.8.30",
            classification: "risky",
            severity: "high",
            capabilities: [],
          },
        ],
      }),
      "utf8",
    );
    expect(() => run(join(directory, "invalid-registry.json"))).toThrow();
  });
});
