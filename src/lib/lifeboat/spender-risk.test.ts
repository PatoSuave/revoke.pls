import { describe, expect, it } from "vitest";

import {
  analyzeSpenderRisk,
  registryContextFromEntry,
  spenderRiskLabel,
  type SpenderContractSignal,
} from "@/lib/lifeboat/spender-risk";
import type { SpenderEntry } from "@/lib/registry";

const KNOWN = "0x1111111111111111111111111111111111111111";
const EOA = "0x2222222222222222222222222222222222222222";
const PROXY = "0x3333333333333333333333333333333333333333";

function signal(
  overrides: Partial<SpenderContractSignal> & { address: string },
): SpenderContractSignal {
  return {
    hasBytecode: true,
    verifiedSource: "verified",
    contractName: "KnownRouter",
    isProxy: false,
    implementationAddress: null,
    registryContext: null,
    explorerUrl: `https://example.test/address/${overrides.address}`,
    warnings: [],
    ...overrides,
    address: overrides.address as `0x${string}`,
  };
}

describe("Wallet Lifeboat spender contract risk", () => {
  it("keeps known registry context informational instead of guaranteed safe", () => {
    const result = analyzeSpenderRisk({
      spenders: [
        signal({
          address: KNOWN,
          registryContext: {
            label: "Known Router",
            protocol: "KnownSwap",
            category: "router",
            isTrusted: true,
            source: "https://example.test/docs",
            verificationMethod: "Manual docs review",
          },
        }),
      ],
    });

    expect(result.riskLevel).toBe("informational");
    expect(result.evidence[0]).toMatchObject({
      title: "Reviewed registry context",
      riskLevel: "informational",
    });
    expect(result.warnings.join(" ").toLowerCase()).toContain(
      "does not guarantee safety",
    );
  });

  it("flags approvals to no-bytecode spenders as review signals", () => {
    const result = analyzeSpenderRisk({
      spenders: [signal({ address: EOA, hasBytecode: false })],
    });

    expect(result.riskLevel).toBe("possible");
    expect(result.summary.eoaSpenderCount).toBe(1);
    expect(result.evidence[0]).toMatchObject({
      title: "No contract bytecode found",
      riskLevel: "possible",
    });
  });

  it("elevates proxy-like spenders when source is unavailable", () => {
    const result = analyzeSpenderRisk({
      spenders: [
        signal({
          address: PROXY,
          verifiedSource: "unverified",
          isProxy: true,
        }),
      ],
    });

    expect(result.riskLevel).toBe("elevated");
    expect(result.summary.proxyLikeCount).toBe(1);
    expect(result.summary.unverifiedSourceCount).toBe(1);
    expect(result.evidence.map((item) => item.title)).toContain(
      "Proxy-like spender contract",
    );
  });

  it("keeps missing spender input as insufficient data", () => {
    const result = analyzeSpenderRisk({ spenders: [] });

    expect(result.riskLevel).toBe("insufficient_data");
    expect(spenderRiskLabel(result.riskLevel)).toBe(
      "Insufficient spender data",
    );
  });

  it("keeps registry entries sourced when context is exported", () => {
    const entry: SpenderEntry = {
      chainId: 1,
      address: KNOWN as `0x${string}`,
      label: "Known Router",
      protocol: "KnownSwap",
      category: "router",
      isTrusted: true,
      source: "https://example.test/docs",
      verificationMethod: "Manual docs review",
    };

    expect(registryContextFromEntry(entry)).toMatchObject({
      label: "Known Router",
      protocol: "KnownSwap",
      source: "https://example.test/docs",
      verificationMethod: "Manual docs review",
    });
  });
});
