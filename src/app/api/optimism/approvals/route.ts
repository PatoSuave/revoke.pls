import { NextResponse } from "next/server";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  OPTIMISM_CHAIN_ID,
  createOptimismApprovalApiFailureResponse,
  normalizeOptimismOwner,
  scanOptimismApprovals,
} from "@/lib/optimism-approval-api";
import {
  OPTIMISM_APPROVAL_API_DISCOVERY_LIMITS,
  OPTIMISM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
  OPTIMISM_APPROVAL_API_RATE_LIMIT,
  OPTIMISM_APPROVAL_API_REQUEST_TIMEOUT_MS,
  OPTIMISM_APPROVAL_API_RPC_READ_CONCURRENCY,
  checkOptimismApprovalApiRateLimit,
} from "@/lib/optimism-approval-api-controls";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const unsupportedRangeParam = ["page", "offset", "fromBlock", "toBlock"].find(
    (name) => url.searchParams.has(name),
  );
  if (unsupportedRangeParam) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: [
          `Unsupported query param: ${unsupportedRangeParam}. Optimism approval discovery uses server-bounded windows only.`,
        ],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const requestedChainId =
    url.searchParams.get("chainId") ?? url.searchParams.get("chainid");
  if (
    requestedChainId !== null &&
    requestedChainId !== OPTIMISM_CHAIN_ID.toString()
  ) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Optimism approvals API only supports chainId=10."],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const owner = normalizeOptimismOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );

  if (!owner) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Provide a valid Optimism owner address in ?owner=0x..."],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const rateLimit = checkOptimismApprovalApiRateLimit(
    rateLimitKeyFromRequest(request),
  );
  if (!rateLimit.allowed) {
    const result = createOptimismApprovalApiFailureResponse({
      status: "upstream-failure",
      errors: [
        "Optimism approvals API rate limit exceeded. Try again shortly.",
      ],
      diagnostics: {
        rateLimited: true,
        liveReadCandidateCap: OPTIMISM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
        rpcReadConcurrency: OPTIMISM_APPROVAL_API_RPC_READ_CONCURRENCY,
        incompleteVerificationCount: 1,
        incompleteReasons: ["route rate limit exceeded"],
      },
    });

    return NextResponse.json(result, {
      status: 429,
      headers: approvalApiNoStoreHeaders(
        rateLimitHeaders(rateLimit, { includeRetryAfter: true }),
      ),
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    OPTIMISM_APPROVAL_API_REQUEST_TIMEOUT_MS,
  );

  const result = await scanOptimismApprovals(owner, {
    signal: controller.signal,
    discoveryLimits: OPTIMISM_APPROVAL_API_DISCOVERY_LIMITS,
    liveReadCandidateCap: OPTIMISM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
    rpcReadConcurrency: OPTIMISM_APPROVAL_API_RPC_READ_CONCURRENCY,
  }).finally(() => clearTimeout(timeout));
  const httpStatus =
    result.status === "config-missing"
      ? 503
      : result.status === "upstream-failure"
        ? 502
        : 200;

  return NextResponse.json(result, {
    status: httpStatus,
    headers: approvalApiNoStoreHeaders({
      ...rateLimitHeaders(rateLimit),
      "X-Optimism-Approval-Timeout-Ms":
        OPTIMISM_APPROVAL_API_REQUEST_TIMEOUT_MS.toString(),
      "X-Optimism-Approval-Live-Read-Cap":
        OPTIMISM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP.toString(),
    }),
  });
}

function rateLimitHeaders(
  rateLimit: {
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterSeconds: number;
  },
  options: { includeRetryAfter?: boolean } = {},
): HeadersInit {
  return {
    ...(options.includeRetryAfter
      ? { "Retry-After": rateLimit.retryAfterSeconds.toString() }
      : {}),
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
    "X-RateLimit-Window-Ms": OPTIMISM_APPROVAL_API_RATE_LIMIT.windowMs.toString(),
  };
}
