import { describe, expect, it } from "vitest";

import {
  addressPoisoningRiskLabel,
  analyzeAddressPoisoning,
  compareAddressSimilarity,
  type AddressPoisoningHistoryEvent,
} from "@/lib/lifeboat/address-poisoning";

const OWNER = "0x1111111111111111111111111111111111111111";
const REFERENCE = "0xabcdef12345678900000000000000000deadbeef";
const LOOKALIKE = "0xabcdef99999999999999999999999999deadbeef";
const OTHER = "0x2222222222222222222222222222222222222222";

function event(
  overrides: Partial<AddressPoisoningHistoryEvent> & {
    id: string;
    direction: AddressPoisoningHistoryEvent["direction"];
    txHash: string;
    timestamp: number;
    counterparty: string;
  },
): AddressPoisoningHistoryEvent {
  const from =
    overrides.direction === "inbound" ? overrides.counterparty : OWNER;
  const to = overrides.direction === "inbound" ? OWNER : overrides.counterparty;
  return {
    occurredAt: new Date(overrides.timestamp * 1000).toISOString(),
    blockNumber: null,
    assetType: "token",
    from: from as `0x${string}`,
    to: to as `0x${string}`,
    contractAddress: null,
    amount: "0 TEST",
    tokenSymbol: "TEST",
    explorerUrl: null,
    ...overrides,
    counterparty: overrides.counterparty as `0x${string}`,
  };
}

describe("Wallet Lifeboat address poisoning heuristic", () => {
  it("flags an inbound lookalike after an outbound reference address", () => {
    const result = analyzeAddressPoisoning({
      owner: OWNER,
      events: [
        event({
          id: "out:0xaaa",
          direction: "outbound",
          txHash: "0xaaa",
          timestamp: 100,
          counterparty: REFERENCE,
        }),
        event({
          id: "in:0xbbb",
          direction: "inbound",
          txHash: "0xbbb",
          timestamp: 200,
          counterparty: LOOKALIKE,
        }),
      ],
    });

    expect(result.riskLevel).toBe("elevated");
    expect(result.summary.possiblePoisoningCount).toBe(1);
    expect(result.evidence[0]).toMatchObject({
      txHash: "0xbbb",
      lookalikeAddress: LOOKALIKE,
      referenceAddress: REFERENCE,
      sharedPrefixLength: 6,
      sharedSuffixLength: 8,
      assetType: "token",
    });
  });

  it("does not flag exact address reuse as a lookalike", () => {
    const result = analyzeAddressPoisoning({
      owner: OWNER,
      events: [
        event({
          id: "out:0xaaa",
          direction: "outbound",
          txHash: "0xaaa",
          timestamp: 100,
          counterparty: REFERENCE,
        }),
        event({
          id: "in:0xbbb",
          direction: "inbound",
          txHash: "0xbbb",
          timestamp: 200,
          counterparty: REFERENCE,
        }),
      ],
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(result.evidence).toEqual([]);
  });

  it("keeps missing outbound references as insufficient data", () => {
    const result = analyzeAddressPoisoning({
      owner: OWNER,
      events: [
        event({
          id: "in:0xbbb",
          direction: "inbound",
          txHash: "0xbbb",
          timestamp: 200,
          counterparty: LOOKALIKE,
        }),
      ],
    });

    expect(result.riskLevel).toBe("insufficient_data");
    expect(addressPoisoningRiskLabel(result.riskLevel)).toBe(
      "Insufficient data",
    );
    expect(result.warnings.join(" ").toLowerCase()).toContain("not proof");
    expect(result.warnings.join(" ").toLowerCase()).not.toContain(
      "confirmed attacker",
    );
  });

  it("keeps unrelated inbound addresses as no signal found", () => {
    const result = analyzeAddressPoisoning({
      owner: OWNER,
      events: [
        event({
          id: "out:0xaaa",
          direction: "outbound",
          txHash: "0xaaa",
          timestamp: 100,
          counterparty: REFERENCE,
        }),
        event({
          id: "in:0xbbb",
          direction: "inbound",
          txHash: "0xbbb",
          timestamp: 200,
          counterparty: OTHER,
        }),
      ],
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(addressPoisoningRiskLabel(result.riskLevel)).toBe(
      "No lookalike signal found",
    );
  });

  it("compares prefix and suffix without treating matches as proof", () => {
    const similarity = compareAddressSimilarity(LOOKALIKE, REFERENCE);

    expect(similarity).toMatchObject({
      comparedPrefix: "0xabcdef",
      comparedSuffix: "deadbeef",
      sharedPrefixLength: 6,
      sharedSuffixLength: 8,
    });
  });
});
