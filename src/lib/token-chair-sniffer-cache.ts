import type { Address } from "viem";

import type { TokenChairApiResponse } from "@/lib/token-chair-sniffer";
import { TOKEN_CHAIR_API_CACHE_TTL_MS } from "@/lib/token-chair-sniffer-controls";

interface TokenChairCacheEntry {
  expiresAt: number;
  response: TokenChairApiResponse;
}

const tokenChairCache = new Map<string, TokenChairCacheEntry>();

export function getCachedTokenChairResponse(
  tokenAddress: Address,
  now = Date.now(),
): TokenChairApiResponse | null {
  const key = tokenChairCacheKey(tokenAddress);
  const entry = tokenChairCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    tokenChairCache.delete(key);
    return null;
  }

  return entry.response;
}

export function setCachedTokenChairResponse(
  tokenAddress: Address,
  response: TokenChairApiResponse,
  now = Date.now(),
) {
  tokenChairCache.set(tokenChairCacheKey(tokenAddress), {
    expiresAt: now + TOKEN_CHAIR_API_CACHE_TTL_MS,
    response,
  });
}

export function resetTokenChairResponseCacheForTests() {
  tokenChairCache.clear();
}

function tokenChairCacheKey(tokenAddress: Address): string {
  return tokenAddress.toLowerCase();
}
