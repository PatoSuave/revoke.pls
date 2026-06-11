import { describe, expect, it } from "vitest";

import {
  GAS_TRACKER_CHAINS,
  getGasTrackerChainConfig,
} from "@/lib/gas/gas-chains";

describe("gas tracker chain registry", () => {
  it("supports the app's EVM gas tracker chains", () => {
    expect(GAS_TRACKER_CHAINS.map((chain) => chain.chainId)).toEqual([
      369, 56, 8453, 137, 43114, 5000, 1, 42161, 10, 999,
    ]);
  });

  it("keeps PulseChain advisory isolated to PulseChain", () => {
    expect(getGasTrackerChainConfig(369)?.advisoryProvider).toBe(
      "owlracle-pulse",
    );
    expect(getGasTrackerChainConfig(1)?.advisoryProvider).toBeUndefined();
  });

  it("uses chain-specific status thresholds", () => {
    expect(getGasTrackerChainConfig(369)?.statusThresholds).toEqual({
      elevatedGwei: 750_000,
      highGwei: 2_000_000,
    });
    expect(getGasTrackerChainConfig(1)?.statusThresholds).toEqual({
      elevatedGwei: 25,
      highGwei: 75,
    });
  });

  it("maps every supported chain to a native-token CoinGecko price ID", () => {
    expect(
      GAS_TRACKER_CHAINS.map((chain) => [chain.chainId, chain.coingeckoId]),
    ).toEqual([
      [369, "pulsechain"],
      [56, "binancecoin"],
      [8453, "ethereum"],
      [137, "polygon-ecosystem-token"],
      [43114, "avalanche-2"],
      [5000, "mantle"],
      [1, "ethereum"],
      [42161, "ethereum"],
      [10, "ethereum"],
      [999, "hyperliquid"],
    ]);
  });
});
