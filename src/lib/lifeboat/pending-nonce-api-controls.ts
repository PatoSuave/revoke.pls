export const LIFEBOAT_PENDING_NONCE_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 30,
} as const;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface LifeboatPendingNonceRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

// Best-effort only: serverless instances do not share this memory. The route
// also makes only two bounded RPC calls per request and has its own timeout.
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkLifeboatPendingNonceRateLimit(
  key: string,
  now = Date.now(),
): LifeboatPendingNonceRateLimitResult {
  pruneExpiredRateLimitBuckets(now);

  const existing = rateLimitBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + LIFEBOAT_PENDING_NONCE_API_RATE_LIMIT.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(
    LIFEBOAT_PENDING_NONCE_API_RATE_LIMIT.maxRequests - bucket.count,
    0,
  );

  return {
    allowed: bucket.count <= LIFEBOAT_PENDING_NONCE_API_RATE_LIMIT.maxRequests,
    limit: LIFEBOAT_PENDING_NONCE_API_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetLifeboatPendingNonceRateLimitForTests() {
  rateLimitBuckets.clear();
}

function pruneExpiredRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}
