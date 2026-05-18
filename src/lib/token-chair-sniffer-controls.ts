export const TOKEN_CHAIR_API_REQUEST_TIMEOUT_MS = 10_000;

export const TOKEN_CHAIR_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 20,
} as const;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface TokenChairRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

// Best-effort only: serverless instances do not share memory. The route timeout
// and bounded read windows are still the primary protections.
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkTokenChairApiRateLimit(
  key: string,
  now = Date.now(),
): TokenChairRateLimitResult {
  pruneExpiredRateLimitBuckets(now);

  const existing = rateLimitBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + TOKEN_CHAIR_API_RATE_LIMIT.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(
    TOKEN_CHAIR_API_RATE_LIMIT.maxRequests - bucket.count,
    0,
  );

  return {
    allowed: bucket.count <= TOKEN_CHAIR_API_RATE_LIMIT.maxRequests,
    limit: TOKEN_CHAIR_API_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetTokenChairApiRateLimitForTests() {
  rateLimitBuckets.clear();
}

function pruneExpiredRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}
