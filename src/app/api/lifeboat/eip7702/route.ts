import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  LIFEBOAT_EIP7702_API_RATE_LIMIT,
  checkLifeboatEip7702RateLimit,
  type LifeboatEip7702RateLimitResult,
} from "@/lib/lifeboat/eip7702-api-controls";
import {
  emptyEip7702Summary,
  normalizeEip7702Owner,
} from "@/lib/lifeboat/eip7702";
import {
  discoverEip7702Delegation,
  eip7702TimeoutSignal,
  isEip7702DiagnosticChainId,
} from "@/lib/lifeboat/eip7702-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const unsupportedParam = [
    "blockTag",
    "fromBlock",
    "toBlock",
    "startblock",
    "endblock",
    "page",
    "offset",
    "calldata",
    "tx",
  ].find((name) => url.searchParams.has(name));
  if (unsupportedParam) {
    return badRequest(
      `Unsupported query param: ${unsupportedParam}. EIP-7702 diagnostics read latest account code only.`,
    );
  }

  const chainId = Number(url.searchParams.get("chainId"));
  if (!Number.isInteger(chainId) || !isEip7702DiagnosticChainId(chainId)) {
    return badRequest(
      "Wallet Lifeboat EIP-7702 diagnostics currently recognize chainId=1, 10, 56, 137, 369, 999, 8453, and 42161.",
    );
  }

  const owner = normalizeEip7702Owner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );
  if (!owner) {
    return badRequest("Provide a valid owner address in ?owner=0x...");
  }

  const rateLimit = checkLifeboatEip7702RateLimit(rateLimitKey(request));
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
        summary: emptyEip7702Summary(),
        warnings: [
          "The EIP-7702 delegation diagnostic is incomplete. Do not treat this as proof that the wallet has no delegation or account-code risk.",
        ],
        errors: ["Wallet Lifeboat EIP-7702 diagnostic rate limit exceeded."],
        missingConfig: [],
        supported: false,
        supportNotes: [],
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

  const timed = eip7702TimeoutSignal(request.signal);
  try {
    const result = await discoverEip7702Delegation({
      chainId,
      owner,
      signal: timed.signal,
    });

    return NextResponse.json(result, {
      status: statusCodeFor(result.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Lifeboat-Diagnostic": "eip7702",
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
      summary: emptyEip7702Summary(),
      warnings: [],
      errors: [message],
      missingConfig: [],
      supported: false,
      supportNotes: [],
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
  rateLimit: LifeboatEip7702RateLimitResult,
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
      LIFEBOAT_EIP7702_API_RATE_LIMIT.windowMs.toString(),
  };
}
