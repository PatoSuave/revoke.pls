export const LIFEBOAT_SPENDER_RISK_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 20,
} as const;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface LifeboatSpenderRiskRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

// Best-effort only: serverless instances do not share this memory. The route
// also caps spender count and uses bounded RPC/explorer requests.
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkLifeboatSpenderRiskRateLimit(
  key: string,
  now = Date.now(),
): LifeboatSpenderRiskRateLimitResult {
  pruneExpiredRateLimitBuckets(now);

  const existing = rateLimitBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + LIFEBOAT_SPENDER_RISK_API_RATE_LIMIT.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(
    LIFEBOAT_SPENDER_RISK_API_RATE_LIMIT.maxRequests - bucket.count,
    0,
  );

  return {
    allowed: bucket.count <= LIFEBOAT_SPENDER_RISK_API_RATE_LIMIT.maxRequests,
    limit: LIFEBOAT_SPENDER_RISK_API_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetLifeboatSpenderRiskRateLimitForTests() {
  rateLimitBuckets.clear();
}

function pruneExpiredRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}
