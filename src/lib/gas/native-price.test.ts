import { afterEach, describe, expect, it, vi } from "vitest";

import { getGasTrackerChainConfig } from "@/lib/gas/gas-chains";
import {
  fetchNativeUsdPrice,
  resetNativeUsdPriceCacheForTests,
} from "@/lib/gas/native-price";

describe("native token USD price fetcher", () => {
  afterEach(() => {
    resetNativeUsdPriceCacheForTests();
  });

  it("fetches a native USD price from CoinGecko by chain coin ID", async () => {
    const chain = getGasTrackerChainConfig(369);
    if (!chain) throw new Error("PulseChain gas config missing.");
    const fetchFn = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("ids")).toBe("pulsechain");
      expect(url.searchParams.get("vs_currencies")).toBe("usd");
      return new Response(
        JSON.stringify({
          pulsechain: {
            usd: 0.00000695,
            last_updated_at: 1_779_927_849,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    await expect(fetchNativeUsdPrice(chain, { fetchFn })).resolves.toEqual({
      priceUsd: 0.00000695,
      updatedAt: "2026-05-28T00:24:09.000Z",
    });
  });

  it("caches successful price responses briefly", async () => {
    const chain = getGasTrackerChainConfig(1);
    if (!chain) throw new Error("Ethereum gas config missing.");
    const fetchFn = vi.fn<typeof fetch>(async () =>
      Response.json({
        ethereum: {
          usd: 2020.8,
          last_updated_at: 1_779_927_985,
        },
      }),
    );

    const first = await fetchNativeUsdPrice(chain, { fetchFn, now: 1000 });
    const second = await fetchNativeUsdPrice(chain, { fetchFn, now: 2000 });

    expect(first?.priceUsd).toBe(2020.8);
    expect(second?.priceUsd).toBe(2020.8);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("returns null instead of throwing when the price feed is unavailable", async () => {
    const chain = getGasTrackerChainConfig(999);
    if (!chain) throw new Error("HyperEVM gas config missing.");
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new Error("nope"));

    await expect(fetchNativeUsdPrice(chain, { fetchFn })).resolves.toBeNull();
  });
});
