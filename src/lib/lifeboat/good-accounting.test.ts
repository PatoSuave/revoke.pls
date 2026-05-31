import { describe, expect, it } from "vitest";

import { analyzeGoodAccountingAssist } from "@/lib/lifeboat/good-accounting";
import { emptyHexStakeSummary, type LifeboatHexStakeApiResponse } from "@/lib/lifeboat/hex-stake";

const OWNER = "0x1111111111111111111111111111111111111111";

function hexStakeResponse(
  overrides: Partial<LifeboatHexStakeApiResponse> = {},
): LifeboatHexStakeApiResponse {
  return {
    ok: true,
    status: "complete",
    chainId: 369,
    chainName: "PulseChain",
    owner: OWNER,
    riskLevel: "elevated",
    stakes: [
      {
        stakeId: "123",
        stakedHearts: "10000000000",
        stakedHex: "100 HEX",
        stakeShares: "1000000",
        lockedDay: 1000,
        stakedDays: 100,
        endDay: 1100,
        unlockedDay: 0,
        isAutoStake: false,
        servedDays: 100,
        daysRemaining: 0,
        daysLate: 30,
        status: "good_accounting_candidate",
      },
    ],
    evidence: [],
    summary: {
      ...emptyHexStakeSummary(),
      currentDay: 1130,
      checkedStakeCount: 1,
      totalOpenStakeCount: 1,
      goodAccountingCandidateCount: 1,
      maxStakeRows: 64,
    },
    warnings: [],
    errors: [],
    missingConfig: [],
    supported: true,
    supportNotes: [],
    ...overrides,
  };
}

describe("Wallet Lifeboat Good Accounting Assist", () => {
  it("surfaces clean-wallet candidates without execution behavior", () => {
    const analysis = analyzeGoodAccountingAssist(hexStakeResponse());

    expect(analysis.riskLevel).toBe("elevated");
    expect(analysis.summary.candidateCount).toBe(1);
    expect(analysis.candidates[0]).toMatchObject({
      stakeId: "123",
      daysLate: 30,
      cleanWalletNote:
        "A clean wallet may be able to review Good Accounting manually; Lifeboat does not create or submit that transaction.",
    });
    expect(analysis.evidence[0].title).toBe("Possible Good Accounting candidate");
    const copy = [
      ...analysis.warnings,
      analysis.candidates[0].cleanWalletNote,
      analysis.evidence[0].description,
    ].join(" ");
    expect(copy).toContain("clean wallet");
    expect(copy).not.toContain("private key");
    expect(copy).not.toContain("seed phrase");
    expect(copy).not.toContain("sendTransaction");
    expect(copy).not.toContain("writeContract");
  });

  it("does not show a false all-clear when HEX reads are partial", () => {
    const analysis = analyzeGoodAccountingAssist(
      hexStakeResponse({
        status: "partial",
        stakes: [],
        summary: {
          ...emptyHexStakeSummary(),
          checkedStakeCount: 64,
          totalOpenStakeCount: 65,
          truncated: true,
          maxStakeRows: 64,
        },
      }),
    );

    expect(analysis.riskLevel).toBe("insufficient_data");
    expect(analysis.summary.sourceComplete).toBe(false);
    expect(analysis.warnings.join(" ").toLowerCase()).not.toContain("all clear");
  });

  it("keeps unsupported networks distinct from no candidates", () => {
    const analysis = analyzeGoodAccountingAssist(
      hexStakeResponse({
        status: "unsupported",
        supported: false,
        riskLevel: "unsupported",
        stakes: [],
        summary: emptyHexStakeSummary(),
      }),
    );

    expect(analysis.riskLevel).toBe("unsupported");
    expect(analysis.summary.sourceSupported).toBe(false);
    expect(analysis.summary.candidateCount).toBe(0);
  });
});
