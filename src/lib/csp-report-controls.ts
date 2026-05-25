export const CSP_REPORT_MAX_BYTES = 8_192;

export const CSP_REPORT_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 30,
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

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkCspReportRateLimit(
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
          resetAt: now + CSP_REPORT_RATE_LIMIT.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(CSP_REPORT_RATE_LIMIT.maxRequests - bucket.count, 0);

  return {
    allowed: bucket.count <= CSP_REPORT_RATE_LIMIT.maxRequests,
    limit: CSP_REPORT_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetCspReportRateLimitForTests() {
  rateLimitBuckets.clear();
}

function pruneExpiredRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}
