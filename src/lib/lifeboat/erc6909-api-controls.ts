export const LIFEBOAT_ERC6909_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 30,
} as const;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface LifeboatErc6909RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

// Best-effort only: serverless instances do not share this memory. The route
// also makes bounded read-only RPC calls and has its own timeout.
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkLifeboatErc6909RateLimit(
  key: string,
  now = Date.now(),
): LifeboatErc6909RateLimitResult {
  pruneExpiredRateLimitBuckets(now);

  const existing = rateLimitBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + LIFEBOAT_ERC6909_API_RATE_LIMIT.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(
    LIFEBOAT_ERC6909_API_RATE_LIMIT.maxRequests - bucket.count,
    0,
  );

  return {
    allowed: bucket.count <= LIFEBOAT_ERC6909_API_RATE_LIMIT.maxRequests,
    limit: LIFEBOAT_ERC6909_API_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetLifeboatErc6909RateLimitForTests() {
  rateLimitBuckets.clear();
}

function pruneExpiredRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}
