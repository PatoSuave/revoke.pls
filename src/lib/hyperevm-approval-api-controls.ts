import type { DiscoveryLimits } from "@/lib/discovery";

export const HYPEREVM_APPROVAL_API_REQUEST_TIMEOUT_MS = 25_000;
export const HYPEREVM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP = 500;
export const HYPEREVM_APPROVAL_API_RPC_READ_CONCURRENCY = 8;
export const HYPEREVM_APPROVAL_API_EXPLORER_MIN_INTERVAL_MS = 350;

export const HYPEREVM_APPROVAL_API_DISCOVERY_LIMITS: DiscoveryLimits = {
  maxRequests: 40,
  maxRawLogs: 20_000,
  requestTimeoutMs: 8_000,
  pageCap: 1000,
  minSplitSpan: 64,
  retryAttempts: 1,
  retryDelayMs: 500,
  minRequestIntervalMs: HYPEREVM_APPROVAL_API_EXPLORER_MIN_INTERVAL_MS,
};

export const HYPEREVM_APPROVAL_API_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 20,
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

// Best-effort only: serverless instances do not share this memory. Deterministic
// scan caps and timeouts remain the primary protection.
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function checkHyperEVMApprovalApiRateLimit(
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
          resetAt: now + HYPEREVM_APPROVAL_API_RATE_LIMIT.windowMs,
        };

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  const remaining = Math.max(
    HYPEREVM_APPROVAL_API_RATE_LIMIT.maxRequests - bucket.count,
    0,
  );

  return {
    allowed: bucket.count <= HYPEREVM_APPROVAL_API_RATE_LIMIT.maxRequests,
    limit: HYPEREVM_APPROVAL_API_RATE_LIMIT.maxRequests,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function resetHyperEVMApprovalApiRateLimitForTests() {
  rateLimitBuckets.clear();
}

function pruneExpiredRateLimitBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
}
