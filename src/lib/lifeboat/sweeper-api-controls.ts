export const LIFEBOAT_SWEEPER_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 20,
} as const;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface LifeboatSweeperRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

// Best-effort only: serverless instances do not share this memory. The route
// also keeps its upstream request count bounded and timeout-controlled.
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkLifeboatSweeperRateLimit(
  key: string,
  now = Date.now(),
): LifeboatSweeperRateLimitResult {
  pruneExpiredRateLimitBuckets(now);

  const existing = rateLimitBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + LIFEBOAT_SWEEPER_API_RATE_LIMIT.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(
    LIFEBOAT_SWEEPER_API_RATE_LIMIT.maxRequests - bucket.count,
    0,
  );

  return {
    allowed: bucket.count <= LIFEBOAT_SWEEPER_API_RATE_LIMIT.maxRequests,
    limit: LIFEBOAT_SWEEPER_API_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetLifeboatSweeperRateLimitForTests() {
  rateLimitBuckets.clear();
}

function pruneExpiredRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}
