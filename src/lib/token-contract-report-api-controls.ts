export const TOKEN_CONTRACT_REPORT_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 10,
} as const;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface TokenContractReportRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkTokenContractReportApiRateLimit(
  key: string,
  now = Date.now(),
): TokenContractReportRateLimitResult {
  pruneExpiredRateLimitBuckets(now);

  const existing = rateLimitBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + TOKEN_CONTRACT_REPORT_API_RATE_LIMIT.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(
    TOKEN_CONTRACT_REPORT_API_RATE_LIMIT.maxRequests - bucket.count,
    0,
  );

  return {
    allowed: bucket.count <= TOKEN_CONTRACT_REPORT_API_RATE_LIMIT.maxRequests,
    limit: TOKEN_CONTRACT_REPORT_API_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetTokenContractReportApiRateLimitForTests() {
  rateLimitBuckets.clear();
}

function pruneExpiredRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}

