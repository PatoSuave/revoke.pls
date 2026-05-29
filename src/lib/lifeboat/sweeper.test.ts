import { describe, expect, it } from "vitest";

import {
  analyzeSweeperPattern,
  sweeperRiskLabel,
  type SweeperHistoryTransaction,
} from "@/lib/lifeboat/sweeper";

const OWNER = "0x1111111111111111111111111111111111111111";
const FUNDER = "0x2222222222222222222222222222222222222222";
const DRAIN = "0x3333333333333333333333333333333333333333";
const OTHER = "0x4444444444444444444444444444444444444444";

function tx(
  hash: string,
  from: string,
  to: string,
  valueWei: bigint,
  timestamp: number,
): SweeperHistoryTransaction {
  return {
    hash,
    from: from as `0x${string}`,
    to: to as `0x${string}`,
    valueWei,
    timestamp,
  };
}

describe("Wallet Lifeboat sweeper heuristic", () => {
  it("flags one quick native drain as a possible pattern", () => {
    const result = analyzeSweeperPattern({
      owner: OWNER,
      chainNativeSymbol: "ETH",
      transactions: [
        tx("0xin", FUNDER, OWNER, 1_000_000_000_000_000_000n, 100),
        tx("0xout", OWNER, DRAIN, 950_000_000_000_000_000n, 170),
      ],
    });

    expect(result.riskLevel).toBe("possible");
    expect(result.summary.quickDrainCount).toBe(1);
    expect(result.evidence[0]).toMatchObject({
      inboundTxHash: "0xin",
      outboundTxHash: "0xout",
      secondsBetween: 70,
      possibleSweeperAddress: DRAIN,
      amountNative: "1 ETH",
    });
  });

  it("flags repeated quick drains as a strong pattern", () => {
    const result = analyzeSweeperPattern({
      owner: OWNER,
      chainNativeSymbol: "PLS",
      transactions: [
        tx("0xin1", FUNDER, OWNER, 5_000_000_000_000_000_000n, 100),
        tx("0xout1", OWNER, DRAIN, 4_900_000_000_000_000_000n, 120),
        tx("0xin2", OTHER, OWNER, 6_000_000_000_000_000_000n, 300),
        tx("0xout2", OWNER, DRAIN, 5_900_000_000_000_000_000n, 330),
      ],
    });

    expect(result.riskLevel).toBe("strong");
    expect(result.summary.quickDrainCount).toBe(2);
    expect(result.summary.repeatedDrainRecipientCount).toBe(1);
  });

  it("keeps missing history as insufficient data instead of all clear", () => {
    const result = analyzeSweeperPattern({
      owner: OWNER,
      chainNativeSymbol: "ETH",
      transactions: [],
    });

    expect(result.riskLevel).toBe("insufficient_data");
    expect(sweeperRiskLabel(result.riskLevel)).toBe("Insufficient data");
    expect(result.warnings.join(" ").toLowerCase()).not.toContain(
      "hacker confirmed",
    );
  });

  it("uses conservative no-pattern wording when recent data has no quick drain", () => {
    const result = analyzeSweeperPattern({
      owner: OWNER,
      chainNativeSymbol: "ETH",
      transactions: [
        tx("0xin", FUNDER, OWNER, 1_000_000_000_000_000_000n, 100),
        tx("0xout", OWNER, DRAIN, 950_000_000_000_000_000n, 1_000),
      ],
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(sweeperRiskLabel(result.riskLevel)).toBe("No quick drain found");
  });
});
