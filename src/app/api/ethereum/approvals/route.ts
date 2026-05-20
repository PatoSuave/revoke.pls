import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  createEthereumApprovalApiFailureResponse,
  normalizeEthereumOwner,
  scanEthereumApprovals,
} from "@/lib/ethereum-approval-api";
import {
  ETHEREUM_APPROVAL_API_DISCOVERY_LIMITS,
  ETHEREUM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
  ETHEREUM_APPROVAL_API_RATE_LIMIT,
  ETHEREUM_APPROVAL_API_REQUEST_TIMEOUT_MS,
  ETHEREUM_APPROVAL_API_RPC_READ_CONCURRENCY,
  checkEthereumApprovalApiRateLimit,
} from "@/lib/ethereum-approval-api-controls";
import { getRequestClientKey } from "@/lib/request-client-key";

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
          `Unsupported query param: ${unsupportedRangeParam}. Ethereum approval discovery uses server-bounded windows only.`,
        ],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const requestedChainId =
    url.searchParams.get("chainId") ?? url.searchParams.get("chainid");
  if (
    requestedChainId !== null &&
    requestedChainId !== ETHEREUM_MAINNET_CHAIN_ID.toString()
  ) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Ethereum approvals API only supports chainId=1."],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const owner = normalizeEthereumOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );

  if (!owner) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Provide a valid Ethereum owner address in ?owner=0x..."],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const rateLimit = checkEthereumApprovalApiRateLimit(
    getRequestClientKey(request),
  );
  if (!rateLimit.allowed) {
    const result = createEthereumApprovalApiFailureResponse({
      status: "upstream-failure",
      errors: [
        "Ethereum approvals API rate limit exceeded. Try again shortly.",
      ],
      diagnostics: {
        rateLimited: true,
        liveReadCandidateCap: ETHEREUM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
        rpcReadConcurrency: ETHEREUM_APPROVAL_API_RPC_READ_CONCURRENCY,
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
    ETHEREUM_APPROVAL_API_REQUEST_TIMEOUT_MS,
  );

  const result = await scanEthereumApprovals(owner, {
    signal: controller.signal,
    discoveryLimits: ETHEREUM_APPROVAL_API_DISCOVERY_LIMITS,
    liveReadCandidateCap: ETHEREUM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
    rpcReadConcurrency: ETHEREUM_APPROVAL_API_RPC_READ_CONCURRENCY,
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
      "X-Ethereum-Approval-Timeout-Ms":
        ETHEREUM_APPROVAL_API_REQUEST_TIMEOUT_MS.toString(),
      "X-Ethereum-Approval-Live-Read-Cap":
        ETHEREUM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP.toString(),
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
    "X-RateLimit-Window-Ms": ETHEREUM_APPROVAL_API_RATE_LIMIT.windowMs.toString(),
  };
}
