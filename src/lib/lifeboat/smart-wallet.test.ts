import { describe, expect, it } from "vitest";

import {
  analyzeSmartWallet,
  smartWalletRiskLabel,
} from "@/lib/lifeboat/smart-wallet";

const OWNER = "0x1111111111111111111111111111111111111111";
const SAFE_OWNER = "0x2222222222222222222222222222222222222222";
const MODULE = "0x3333333333333333333333333333333333333333";

describe("Wallet Lifeboat smart-wallet diagnostic", () => {
  it("treats empty account code as no smart-wallet code found", () => {
    const result = analyzeSmartWallet({
      owner: OWNER,
      code: "0x",
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(result.evidence).toEqual([]);
    expect(result.summary.hasCode).toBe(false);
    expect(smartWalletRiskLabel(result.riskLevel)).toBe("No account code found");
  });

  it("flags contract code when Safe-compatible reads are unavailable", () => {
    const result = analyzeSmartWallet({
      owner: OWNER,
      code: "0x6001600055",
    });

    expect(result.riskLevel).toBe("possible");
    expect(result.summary.isSmartWalletLike).toBe(true);
    expect(result.summary.isSafeLike).toBe(false);
    expect(result.evidence[0]).toMatchObject({
      title: "Account code present",
      riskLevel: "possible",
      codeLengthBytes: 5,
    });
  });

  it("surfaces Safe owners and threshold as informational context", () => {
    const result = analyzeSmartWallet({
      owner: OWNER,
      code: "0x6001600055",
      safeConfig: {
        owners: [SAFE_OWNER],
        threshold: 2,
        modules: [],
        nonce: "9",
      },
    });

    expect(result.riskLevel).toBe("informational");
    expect(result.summary).toMatchObject({
      isSafeLike: true,
      ownerCount: 1,
      threshold: 2,
      moduleCount: 0,
      nonce: "9",
    });
  });

  it("raises review level for enabled Safe modules", () => {
    const result = analyzeSmartWallet({
      owner: OWNER,
      code: "0x6001600055",
      safeConfig: {
        owners: [SAFE_OWNER],
        threshold: 1,
        modules: [MODULE],
        nonce: "10",
      },
    });

    expect(result.riskLevel).toBe("elevated");
    expect(result.evidence[0]).toMatchObject({
      title: "Safe modules enabled",
      riskLevel: "elevated",
      safeModules: [MODULE],
    });
    expect(result.warnings.join(" ")).toContain("read-only diagnostic");
    expect(result.warnings.join(" ").toLowerCase()).not.toContain(
      "disable modules",
    );
  });
});
