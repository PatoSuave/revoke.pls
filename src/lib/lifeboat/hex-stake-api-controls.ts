export const LIFEBOAT_HEX_STAKE_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 20,
} as const;

interface LifeboatHexStakeBucket {
  count: number;
  resetAt: number;
}

export interface LifeboatHexStakeRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, LifeboatHexStakeBucket>();

export function checkLifeboatHexStakeRateLimit(
  key: string,
  now = Date.now(),
): LifeboatHexStakeRateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const fresh = {
      count: 1,
      resetAt: now + LIFEBOAT_HEX_STAKE_API_RATE_LIMIT.windowMs,
    };
    buckets.set(key, fresh);
    return {
      allowed: true,
      limit: LIFEBOAT_HEX_STAKE_API_RATE_LIMIT.maxRequests,
      remaining: LIFEBOAT_HEX_STAKE_API_RATE_LIMIT.maxRequests - 1,
      resetAt: fresh.resetAt,
      retryAfterSeconds: 0,
    };
  }

  bucket.count += 1;
  const remaining = Math.max(
    LIFEBOAT_HEX_STAKE_API_RATE_LIMIT.maxRequests - bucket.count,
    0,
  );
  return {
    allowed: bucket.count <= LIFEBOAT_HEX_STAKE_API_RATE_LIMIT.maxRequests,
    limit: LIFEBOAT_HEX_STAKE_API_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1),
  };
}

export function resetLifeboatHexStakeRateLimitForTests() {
  buckets.clear();
}
