import { fetchGasData } from "@/lib/gas/evm-gas";
import type { GasTrackerChainConfig } from "@/lib/gas/gas-chains";
import type { GasApiResponse } from "@/lib/gas/gas-types";

const GAS_ROUTE_CACHE_TTL_MS = 10_000;

const inFlightGasData = new Map<number, Promise<GasApiResponse>>();
const gasDataCache = new Map<
  number,
  { expiresAt: number; response: GasApiResponse }
>();

export function fetchCachedRouteGasData(
  chain: GasTrackerChainConfig,
  now = Date.now(),
): Promise<GasApiResponse> {
  const cached = gasDataCache.get(chain.chainId);
  if (cached && cached.expiresAt > now) return Promise.resolve(cached.response);

  const existing = inFlightGasData.get(chain.chainId);
  if (existing) return existing;

  const promise = fetchGasData(chain, {
    includeAdvisory: chain.advisoryProvider === "owlracle-pulse",
  })
    .then((response) => {
      if (response.available) {
        gasDataCache.set(chain.chainId, {
          response,
          expiresAt: Date.now() + GAS_ROUTE_CACHE_TTL_MS,
        });
      }
      return response;
    })
    .finally(() => {
      inFlightGasData.delete(chain.chainId);
    });
  inFlightGasData.set(chain.chainId, promise);
  return promise;
}

export function resetGasRouteCacheForTests() {
  inFlightGasData.clear();
  gasDataCache.clear();
}
