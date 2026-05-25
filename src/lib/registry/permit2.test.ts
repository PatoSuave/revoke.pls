import { describe, expect, it } from "vitest";

import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
} from "@/lib/chains";
import { PERMIT2_ADDRESS } from "@/lib/permit2";

import {
  ARBITRUM_ONE_CHAIN_ID,
  ETHEREUM_MAINNET_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  PERMIT2_SPENDER_METADATA_REGISTRY,
  UNISWAP_DEPLOYMENTS_SOURCE_URL,
  getSpenderMetadataEntry,
  getSpendersForChain,
} from ".";

const LIVE_PERMIT2_CHAIN_IDS = [
  PULSECHAIN_CHAIN_ID,
  BSC_CHAIN_ID,
  BASE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  ETHEREUM_MAINNET_CHAIN_ID,
  ARBITRUM_ONE_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
] as const;

describe("Permit2 spender metadata", () => {
  it("labels Permit2 on every live scanner lane", () => {
    for (const chainId of LIVE_PERMIT2_CHAIN_IDS) {
      expect(getSpenderMetadataEntry(chainId, PERMIT2_ADDRESS)).toMatchObject({
        address: PERMIT2_ADDRESS,
        label: "Permit2",
        protocolSlug: "permit2",
        category: "permit2",
      });
    }
  });

  it("marks official Uniswap deployment chains as trusted metadata", () => {
    for (const chainId of [
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
      POLYGON_CHAIN_ID,
      ETHEREUM_MAINNET_CHAIN_ID,
      ARBITRUM_ONE_CHAIN_ID,
      OPTIMISM_CHAIN_ID,
    ] as const) {
      expect(getSpenderMetadataEntry(chainId, PERMIT2_ADDRESS)).toMatchObject({
        protocol: "Uniswap",
        isTrusted: true,
        source: UNISWAP_DEPLOYMENTS_SOURCE_URL,
      });
    }
  });

  it("keeps PulseChain Permit2 metadata conservative", () => {
    const entry = getSpenderMetadataEntry(PULSECHAIN_CHAIN_ID, PERMIT2_ADDRESS);

    expect(entry).toMatchObject({
      protocol: "Permit2-compatible",
      isTrusted: false,
    });
    expect(entry?.source).toBeUndefined();
    expect(entry?.notes).toContain("not listed in Uniswap official deployments");
  });

  it("does not expand connected-chain registry scan targets", () => {
    expect(PERMIT2_SPENDER_METADATA_REGISTRY).toHaveLength(6);
    expect(
      getSpendersForChain(PULSECHAIN_CHAIN_ID).some(
        (entry) => entry.address.toLowerCase() === PERMIT2_ADDRESS.toLowerCase(),
      ),
    ).toBe(false);
    expect(getSpendersForChain(BSC_CHAIN_ID)).toEqual([]);
    expect(getSpendersForChain(BASE_CHAIN_ID)).toEqual([]);
    expect(getSpendersForChain(POLYGON_CHAIN_ID)).toEqual([]);
  });
});
