import { describe, expect, it } from "vitest";

import {
  analyzeHexStakes,
  hexStakeRiskLabel,
  type HexStakeContractRow,
} from "@/lib/lifeboat/hex-stake";

function stake(overrides: Partial<HexStakeContractRow> = {}): HexStakeContractRow {
  return {
    stakeId: 1n,
    stakedHearts: 100_00000000n,
    stakeShares: 1_000_000n,
    lockedDay: 1_000,
    stakedDays: 100,
    unlockedDay: 0,
    isAutoStake: false,
    ...overrides,
  };
}

describe("Wallet Lifeboat HEX stake diagnostic", () => {
  it("classifies active stakes without execution language", () => {
    const analysis = analyzeHexStakes({
      currentDay: 1_050,
      totalOpenStakeCount: 1,
      rows: [stake()],
      maxStakeRows: 64,
    });

    expect(analysis.riskLevel).toBe("informational");
    expect(analysis.summary.activeStakeCount).toBe(1);
    expect(analysis.stakes[0]).toMatchObject({
      status: "active",
      daysRemaining: 50,
      stakedHex: "100 HEX",
    });
    expect(analysis.warnings.join(" ")).toContain("does not run or prepare");
    expect(analysis.warnings.join(" ").toLowerCase()).not.toContain("all clear");
  });

  it("flags mature and late stakes as review context", () => {
    const analysis = analyzeHexStakes({
      currentDay: 1_105,
      totalOpenStakeCount: 2,
      rows: [
        stake({ stakeId: 1n, lockedDay: 1_005, stakedDays: 100 }),
        stake({ stakeId: 2n, lockedDay: 1_000, stakedDays: 100 }),
      ],
      maxStakeRows: 64,
    });

    expect(analysis.riskLevel).toBe("possible");
    expect(analysis.summary.matureStakeCount).toBe(1);
    expect(analysis.summary.lateStakeCount).toBe(1);
    expect(analysis.evidence.map((item) => item.title)).toContain(
      "Mature stake past end day",
    );
  });

  it("labels stakes past the grace window as Good Accounting candidates without writes", () => {
    const analysis = analyzeHexStakes({
      currentDay: 1_130,
      totalOpenStakeCount: 1,
      rows: [stake()],
      maxStakeRows: 64,
    });

    expect(analysis.riskLevel).toBe("elevated");
    expect(hexStakeRiskLabel(analysis.riskLevel)).toBe("Late stake review");
    expect(analysis.summary.goodAccountingCandidateCount).toBe(1);
    expect(analysis.evidence[0].description).toContain(
      "does not execute or prepare",
    );
  });

  it("keeps truncated stake lists incomplete", () => {
    const analysis = analyzeHexStakes({
      currentDay: 1_050,
      totalOpenStakeCount: 65,
      rows: Array.from({ length: 64 }, (_, index) =>
        stake({ stakeId: BigInt(index + 1) }),
      ),
      maxStakeRows: 64,
    });

    expect(analysis.riskLevel).toBe("insufficient_data");
    expect(analysis.summary.truncated).toBe(true);
    expect(analysis.summary.checkedStakeCount).toBe(64);
  });
});
