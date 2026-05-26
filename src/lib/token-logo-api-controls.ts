export const TOKEN_LOGO_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 60,
} as const;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

// Best-effort only: serverless instances do not share this memory. The address
// cap, upstream timeout, and CDN caching remain the primary protection layers.
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkTokenLogoApiRateLimit(
  key: string,
  now = Date.now(),
): RateLimitResult {
  pruneExpiredRateLimitBuckets(now);

  const existing = rateLimitBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + TOKEN_LOGO_API_RATE_LIMIT.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(
    TOKEN_LOGO_API_RATE_LIMIT.maxRequests - bucket.count,
    0,
  );

  return {
    allowed: bucket.count <= TOKEN_LOGO_API_RATE_LIMIT.maxRequests,
    limit: TOKEN_LOGO_API_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetTokenLogoApiRateLimitForTests() {
  rateLimitBuckets.clear();
}

function pruneExpiredRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}
