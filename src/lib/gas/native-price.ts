import type { GasTrackerChainConfig } from "@/lib/gas/gas-chains";

const COINGECKO_SIMPLE_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price";
const NATIVE_USD_PRICE_TIMEOUT_MS = 2_500;
const NATIVE_USD_PRICE_CACHE_MS = 60_000;
const NATIVE_USD_PRICE_FAILURE_CACHE_MS = 10_000;

export interface NativeUsdPrice {
  priceUsd: number;
  updatedAt: string;
}

interface NativePriceCacheEntry {
  expiresAt: number;
  value: NativeUsdPrice | null;
}

interface CoinGeckoSimplePriceResponse {
  [coinId: string]:
    | {
        usd?: number;
        last_updated_at?: number;
      }
    | undefined;
}

const nativeUsdPriceCache = new Map<string, NativePriceCacheEntry>();
const inFlightNativeUsdPrices = new Map<string, Promise<NativeUsdPrice | null>>();

export async function fetchNativeUsdPrice(
  chain: Pick<GasTrackerChainConfig, "coingeckoId">,
  options: {
    fetchFn?: typeof fetch;
    signal?: AbortSignal;
    now?: number;
  } = {},
): Promise<NativeUsdPrice | null> {
  const now = options.now ?? Date.now();
  const cached = nativeUsdPriceCache.get(chain.coingeckoId);
  if (cached && cached.expiresAt > now) return cached.value;

  const existing = inFlightNativeUsdPrices.get(chain.coingeckoId);
  if (existing) return existing;

  const promise = requestNativeUsdPrice(chain.coingeckoId, options)
    .then((value) => {
      nativeUsdPriceCache.set(chain.coingeckoId, {
        expiresAt:
          Date.now() +
          (value ? NATIVE_USD_PRICE_CACHE_MS : NATIVE_USD_PRICE_FAILURE_CACHE_MS),
        value,
      });
      return value;
    })
    .finally(() => {
      inFlightNativeUsdPrices.delete(chain.coingeckoId);
    });
  inFlightNativeUsdPrices.set(chain.coingeckoId, promise);
  return promise;
}

export function resetNativeUsdPriceCacheForTests(): void {
  nativeUsdPriceCache.clear();
  inFlightNativeUsdPrices.clear();
}

async function requestNativeUsdPrice(
  coinId: string,
  options: {
    fetchFn?: typeof fetch;
    signal?: AbortSignal;
  },
): Promise<NativeUsdPrice | null> {
  const fetchFn = options.fetchFn ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    NATIVE_USD_PRICE_TIMEOUT_MS,
  );
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });

  try {
    const url = new URL(COINGECKO_SIMPLE_PRICE_URL);
    url.searchParams.set("ids", coinId);
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_last_updated_at", "true");
    url.searchParams.set("precision", "full");

    const response = await fetchFn(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as CoinGeckoSimplePriceResponse;
    const price = payload[coinId]?.usd;
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
      return null;
    }

    const updatedAtSeconds = payload[coinId]?.last_updated_at;
    return {
      priceUsd: price,
      updatedAt:
        typeof updatedAtSeconds === "number" && Number.isFinite(updatedAtSeconds)
          ? new Date(updatedAtSeconds * 1000).toISOString()
          : new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}
