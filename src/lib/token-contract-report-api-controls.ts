export const TOKEN_CONTRACT_REPORT_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 10,
} as const;

export const TOKEN_CONTRACT_REPORT_DEEP_RATE_LIMIT = {
  windowMs: 10 * 60_000,
  maxRequests: 3,
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
const deepRateLimitBuckets = new Map<string, RateLimitBucket>();
const inFlightDeepScans = new Set<string>();

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
  deepRateLimitBuckets.clear();
  inFlightDeepScans.clear();
}

export type TokenContractReportDeepScanAcquireResult =
  | {
      allowed: true;
      rateLimit: TokenContractReportRateLimitResult;
      release: () => void;
    }
  | {
      allowed: false;
      reason: "rate-limited" | "in-flight";
      rateLimit: TokenContractReportRateLimitResult;
    };

export function acquireTokenContractReportDeepScan(
  key: string,
  now = Date.now(),
): TokenContractReportDeepScanAcquireResult {
  pruneBuckets(deepRateLimitBuckets, now);
  const existing = deepRateLimitBuckets.get(key);
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + TOKEN_CONTRACT_REPORT_DEEP_RATE_LIMIT.windowMs };

  const rateLimit = rateLimitResult(
    bucket,
    TOKEN_CONTRACT_REPORT_DEEP_RATE_LIMIT,
    now,
  );
  if (inFlightDeepScans.has(key)) {
    return { allowed: false, reason: "in-flight", rateLimit };
  }

  bucket.count += 1;
  deepRateLimitBuckets.set(key, bucket);
  const consumedRateLimit = rateLimitResult(
    bucket,
    TOKEN_CONTRACT_REPORT_DEEP_RATE_LIMIT,
    now,
  );
  if (bucket.count > TOKEN_CONTRACT_REPORT_DEEP_RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      reason: "rate-limited",
      rateLimit: consumedRateLimit,
    };
  }

  inFlightDeepScans.add(key);
  let released = false;
  return {
    allowed: true,
    rateLimit: consumedRateLimit,
    release: () => {
      if (released) return;
      released = true;
      inFlightDeepScans.delete(key);
    },
  };
}

function pruneExpiredRateLimitBuckets(now: number) {
  pruneBuckets(rateLimitBuckets, now);
}

function pruneBuckets(buckets: Map<string, RateLimitBucket>, now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function rateLimitResult(
  bucket: RateLimitBucket,
  limit: { windowMs: number; maxRequests: number },
  now: number,
): TokenContractReportRateLimitResult {
  return {
    allowed: bucket.count <= limit.maxRequests,
    limit: limit.maxRequests,
    remaining: Math.max(limit.maxRequests - bucket.count, 0),
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  };
}

