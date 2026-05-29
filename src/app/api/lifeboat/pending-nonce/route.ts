import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  LIFEBOAT_PENDING_NONCE_API_RATE_LIMIT,
  checkLifeboatPendingNonceRateLimit,
  type LifeboatPendingNonceRateLimitResult,
} from "@/lib/lifeboat/pending-nonce-api-controls";
import {
  emptyPendingNonceSummary,
  normalizePendingNonceOwner,
} from "@/lib/lifeboat/pending-nonce";
import {
  discoverPendingNonceActivity,
  isPendingNonceChainId,
  pendingNonceTimeoutSignal,
} from "@/lib/lifeboat/pending-nonce-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const unsupportedParam = [
    "blockTag",
    "nonce",
    "fromBlock",
    "toBlock",
    "startblock",
    "endblock",
    "page",
    "offset",
  ].find((name) => url.searchParams.has(name));
  if (unsupportedParam) {
    return badRequest(
      `Unsupported query param: ${unsupportedParam}. Pending nonce diagnostics compare latest and pending nonce only.`,
    );
  }

  const chainId = Number(url.searchParams.get("chainId"));
  if (!Number.isInteger(chainId) || !isPendingNonceChainId(chainId)) {
    return badRequest(
      "Wallet Lifeboat pending nonce diagnostics currently support chainId=1, 10, 56, 137, 369, 999, 8453, and 42161.",
    );
  }

  const owner = normalizePendingNonceOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );
  if (!owner) {
    return badRequest("Provide a valid owner address in ?owner=0x...");
  }

  const rateLimit = checkLifeboatPendingNonceRateLimit(rateLimitKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        status: "upstream-failure",
        chainId,
        chainName: "Unknown",
        owner,
        riskLevel: "upstream_unavailable",
        evidence: [],
        summary: emptyPendingNonceSummary(),
        warnings: [
          "The pending nonce diagnostic is incomplete. Do not treat this as proof that the wallet has no pending or private transactions.",
        ],
        errors: ["Wallet Lifeboat pending nonce diagnostic rate limit exceeded."],
        missingConfig: [],
        rateLimited: true,
      },
      {
        status: 429,
        headers: approvalApiNoStoreHeaders(
          rateLimitHeaders(rateLimit, { includeRetryAfter: true }),
        ),
      },
    );
  }

  const timed = pendingNonceTimeoutSignal(request.signal);
  try {
    const result = await discoverPendingNonceActivity({
      chainId,
      owner,
      signal: timed.signal,
    });

    return NextResponse.json(result, {
      status: statusCodeFor(result.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Lifeboat-Diagnostic": "pending-nonce",
      }),
    });
  } finally {
    timed.cleanup();
  }
}

function badRequest(message: string) {
  return NextResponse.json(
    {
      ok: false,
      status: "bad-request",
      chainId: null,
      chainName: "Unknown",
      owner: null,
      riskLevel: "not_checked",
      evidence: [],
      summary: emptyPendingNonceSummary(),
      warnings: [],
      errors: [message],
      missingConfig: [],
    },
    { status: 400, headers: approvalApiNoStoreHeaders({}) },
  );
}

function statusCodeFor(status: string): number {
  if (status === "config-missing") return 503;
  if (status === "upstream-failure") return 502;
  if (status === "bad-request") return 400;
  if (status === "unsupported") return 501;
  return 200;
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
  rateLimit: LifeboatPendingNonceRateLimitResult,
  options: { includeRetryAfter?: boolean } = {},
): HeadersInit {
  return {
    ...(options.includeRetryAfter
      ? { "Retry-After": rateLimit.retryAfterSeconds.toString() }
      : {}),
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
    "X-RateLimit-Window-Ms":
      LIFEBOAT_PENDING_NONCE_API_RATE_LIMIT.windowMs.toString(),
  };
}
