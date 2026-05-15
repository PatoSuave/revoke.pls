import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  ARBITRUM_ONE_CHAIN_ID,
  createArbitrumApprovalApiFailureResponse,
  normalizeArbitrumOwner,
  scanArbitrumApprovals,
} from "@/lib/arbitrum-approval-api";
import {
  ARBITRUM_APPROVAL_API_DISCOVERY_LIMITS,
  ARBITRUM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
  ARBITRUM_APPROVAL_API_RATE_LIMIT,
  ARBITRUM_APPROVAL_API_REQUEST_TIMEOUT_MS,
  ARBITRUM_APPROVAL_API_RPC_READ_CONCURRENCY,
  checkArbitrumApprovalApiRateLimit,
} from "@/lib/arbitrum-approval-api-controls";

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
          `Unsupported query param: ${unsupportedRangeParam}. Arbitrum approval discovery uses server-bounded windows only.`,
        ],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const requestedChainId =
    url.searchParams.get("chainId") ?? url.searchParams.get("chainid");
  if (
    requestedChainId !== null &&
    requestedChainId !== ARBITRUM_ONE_CHAIN_ID.toString()
  ) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Arbitrum approvals API only supports chainId=42161."],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const owner = normalizeArbitrumOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );

  if (!owner) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Provide a valid Arbitrum owner address in ?owner=0x..."],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const rateLimit = checkArbitrumApprovalApiRateLimit(rateLimitKey(request));
  if (!rateLimit.allowed) {
    const result = createArbitrumApprovalApiFailureResponse({
      status: "upstream-failure",
      errors: [
        "Arbitrum approvals API rate limit exceeded. Try again shortly.",
      ],
      diagnostics: {
        rateLimited: true,
        liveReadCandidateCap: ARBITRUM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
        rpcReadConcurrency: ARBITRUM_APPROVAL_API_RPC_READ_CONCURRENCY,
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
    ARBITRUM_APPROVAL_API_REQUEST_TIMEOUT_MS,
  );

  const result = await scanArbitrumApprovals(owner, {
    signal: controller.signal,
    discoveryLimits: ARBITRUM_APPROVAL_API_DISCOVERY_LIMITS,
    liveReadCandidateCap: ARBITRUM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
    rpcReadConcurrency: ARBITRUM_APPROVAL_API_RPC_READ_CONCURRENCY,
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
      "X-Arbitrum-Approval-Timeout-Ms":
        ARBITRUM_APPROVAL_API_REQUEST_TIMEOUT_MS.toString(),
      "X-Arbitrum-Approval-Live-Read-Cap":
        ARBITRUM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP.toString(),
    }),
  });
}

function rateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwardedIp ||
    "unknown-client"
  );
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
    "X-RateLimit-Window-Ms": ARBITRUM_APPROVAL_API_RATE_LIMIT.windowMs.toString(),
  };
}
