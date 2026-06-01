import { NextResponse } from "next/server";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  LIFEBOAT_ERC4337_API_RATE_LIMIT,
  checkLifeboatErc4337RateLimit,
  type LifeboatErc4337RateLimitResult,
} from "@/lib/lifeboat/erc4337-api-controls";
import {
  emptyErc4337Summary,
  normalizeErc4337Owner,
} from "@/lib/lifeboat/erc4337";
import {
  discoverErc4337Activity,
  erc4337TimeoutSignal,
  isErc4337DiagnosticChainId,
} from "@/lib/lifeboat/erc4337-server";

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
    "bundler",
    "paymaster",
    "submit",
  ].find((name) => url.searchParams.has(name));
  if (unsupportedParam) {
    return badRequest(
      `Unsupported query param: ${unsupportedParam}. ERC-4337 diagnostics use a bounded recent EntryPoint event window only.`,
    );
  }

  const chainId = Number(url.searchParams.get("chainId"));
  if (!Number.isInteger(chainId) || !isErc4337DiagnosticChainId(chainId)) {
    return badRequest(
      "Wallet Lifeboat ERC-4337 diagnostics currently recognize chainId=1, 10, 56, 137, 369, 999, 8453, and 42161.",
    );
  }

  const owner = normalizeErc4337Owner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );
  if (!owner) {
    return badRequest("Provide a valid owner address in ?owner=0x...");
  }

  const rateLimit = checkLifeboatErc4337RateLimit(
    rateLimitKeyFromRequest(request),
  );
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
        events: [],
        summary: emptyErc4337Summary(),
        warnings: [
          "The ERC-4337 diagnostic is incomplete. Do not treat this as proof that no UserOperation, paymaster, factory, session-key, or account-abstraction risk exists.",
        ],
        errors: ["Wallet Lifeboat ERC-4337 diagnostic rate limit exceeded."],
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

  const timed = erc4337TimeoutSignal(request.signal);
  try {
    const result = await discoverErc4337Activity({
      chainId,
      owner,
      signal: timed.signal,
    });

    return NextResponse.json(result, {
      status: statusCodeFor(result.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Lifeboat-Diagnostic": "erc4337",
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
      events: [],
      summary: emptyErc4337Summary(),
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

function rateLimitHeaders(
  rateLimit: LifeboatErc4337RateLimitResult,
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
      LIFEBOAT_ERC4337_API_RATE_LIMIT.windowMs.toString(),
  };
}
