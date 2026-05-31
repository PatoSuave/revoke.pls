import { describe, expect, it } from "vitest";

import {
  analyzeKnownRiskRegistry,
  emptyKnownRiskRegistryAnalysis,
  findKnownRiskRegistryEntries,
  knownRiskRegistryRiskLabel,
  validateKnownRiskRegistryEntries,
  type KnownRiskRegistryEntry,
  type KnownRiskRegistrySubject,
} from "@/lib/lifeboat/known-risk-registry";

const ADDRESS = "0x1111111111111111111111111111111111111111";
const OTHER_ADDRESS = "0x2222222222222222222222222222222222222222";

const SUBJECT: KnownRiskRegistrySubject = {
  address: ADDRESS,
  role: "approval-spender",
  label: "Approval spender",
  sourceModule: "approval-scan",
};

const ENTRY: KnownRiskRegistryEntry = {
  id: "reviewed-risk-context-1",
  address: ADDRESS,
  chainId: 369,
  label: "Reviewed risk context",
  category: "reported-risk-spender",
  confidence: "high",
  summary:
    "Reviewed public source context links this address to wallet-drain risk reports.",
  reviewedAt: "2026-05-30T00:00:00.000Z",
  reviewedBy: "Pulse Revoke review",
  sources: [
    {
      title: "Reviewed public report",
      url: "https://example.com/reviewed-report",
      publishedAt: "2026-05-29T00:00:00.000Z",
    },
  ],
};

describe("Wallet Lifeboat known-risk registry", () => {
  it("keeps the default empty registry as context without proving safety", () => {
    const result = analyzeKnownRiskRegistry({
      chainId: 369,
      subjects: [SUBJECT],
    });

    expect(result.status).toBe("complete");
    expect(result.riskLevel).toBe("none_detected");
    expect(result.summary.checkedSubjectCount).toBe(1);
    expect(result.summary.matchCount).toBe(0);
    expect(result.warnings.join(" ")).toContain("No match is not proof");
  });

  it("returns an idle not-checked state before a scan starts", () => {
    const result = emptyKnownRiskRegistryAnalysis();

    expect(result.status).toBe("idle");
    expect(result.riskLevel).toBe("not_checked");
    expect(knownRiskRegistryRiskLabel(result.riskLevel)).toBe("Not scanned");
  });

  it("requires reviewed source metadata before entries are accepted", () => {
    const invalid: KnownRiskRegistryEntry = {
      ...ENTRY,
      sources: [{ title: "", url: "http://example.com/report" }],
    };

    const result = validateKnownRiskRegistryEntries([invalid]);

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("title is required");
    expect(result.errors.join(" ")).toContain("valid HTTPS URL");
    expect(result.errors.join(" ")).toContain("publishedAt or retrievedAt");
  });

  it("rejects attribution language that needs legal review", () => {
    const invalid: KnownRiskRegistryEntry = {
      ...ENTRY,
      label: "Known attacker wallet",
    };

    const result = validateKnownRiskRegistryEntries([invalid]);

    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("legal review");
  });

  it("matches chain-scoped entries only on the requested chain", () => {
    expect(
      findKnownRiskRegistryEntries({
        address: ADDRESS,
        chainId: 369,
        registry: [ENTRY],
      }),
    ).toHaveLength(1);
    expect(
      findKnownRiskRegistryEntries({
        address: ADDRESS,
        chainId: 1,
        registry: [ENTRY],
      }),
    ).toHaveLength(0);
  });

  it("allows an any-chain entry to match every chain", () => {
    const anyChainEntry: KnownRiskRegistryEntry = {
      ...ENTRY,
      id: "any-chain-context",
      chainId: "any",
    };

    const result = findKnownRiskRegistryEntries({
      address: ADDRESS,
      chainId: 1,
      registry: [anyChainEntry],
    });

    expect(result).toHaveLength(1);
  });

  it("classifies a high-confidence reviewed match as elevated context", () => {
    const result = analyzeKnownRiskRegistry({
      chainId: 369,
      subjects: [SUBJECT],
      registry: [ENTRY],
    });

    expect(result.riskLevel).toBe("elevated");
    expect(knownRiskRegistryRiskLabel(result.riskLevel)).toBe(
      "Reviewed risk match",
    );
    expect(result.evidence[0]).toMatchObject({
      entryId: ENTRY.id,
      address: ADDRESS,
      subjectRole: "approval-spender",
      confidence: "high",
      expired: false,
    });
    expect(result.warnings.join(" ")).toContain("context rather than proof");
  });

  it("keeps expired matches informational instead of elevated", () => {
    const expired: KnownRiskRegistryEntry = {
      ...ENTRY,
      expiresAt: "2026-05-01T00:00:00.000Z",
    };

    const result = analyzeKnownRiskRegistry({
      chainId: 369,
      subjects: [SUBJECT],
      registry: [expired],
      checkedAt: "2026-05-30T00:00:00.000Z",
    });

    expect(result.riskLevel).toBe("informational");
    expect(result.evidence[0]?.expired).toBe(true);
  });

  it("dedupes subjects by address, role, and source module", () => {
    const result = analyzeKnownRiskRegistry({
      chainId: 369,
      subjects: [
        SUBJECT,
        { ...SUBJECT },
        {
          address: OTHER_ADDRESS,
          role: "erc4337-paymaster",
          label: "Paymaster",
          sourceModule: "erc4337",
        },
      ],
      registry: [ENTRY],
    });

    expect(result.summary.checkedSubjectCount).toBe(2);
    expect(result.summary.uniqueAddressCount).toBe(2);
    expect(result.summary.matchCount).toBe(1);
  });
});
