import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  LIFEBOAT_SMART_WALLET_API_RATE_LIMIT,
  checkLifeboatSmartWalletRateLimit,
  type LifeboatSmartWalletRateLimitResult,
} from "@/lib/lifeboat/smart-wallet-api-controls";
import {
  emptySmartWalletSummary,
  normalizeSmartWalletOwner,
} from "@/lib/lifeboat/smart-wallet";
import {
  discoverSmartWalletConfig,
  isSmartWalletDiagnosticChainId,
  smartWalletTimeoutSignal,
} from "@/lib/lifeboat/smart-wallet-server";

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
    "module",
    "exec",
  ].find((name) => url.searchParams.has(name));
  if (unsupportedParam) {
    return badRequest(
      `Unsupported query param: ${unsupportedParam}. Smart-wallet diagnostics read latest account code and Safe view methods only.`,
    );
  }

  const chainId = Number(url.searchParams.get("chainId"));
  if (!Number.isInteger(chainId) || !isSmartWalletDiagnosticChainId(chainId)) {
    return badRequest(
      "Wallet Lifeboat smart-wallet diagnostics currently recognize chainId=1, 10, 56, 137, 369, 999, 8453, and 42161.",
    );
  }

  const owner = normalizeSmartWalletOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );
  if (!owner) {
    return badRequest("Provide a valid owner address in ?owner=0x...");
  }

  const rateLimit = checkLifeboatSmartWalletRateLimit(rateLimitKey(request));
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
        summary: emptySmartWalletSummary(),
        warnings: [
          "The smart-wallet diagnostic is incomplete. Do not treat this as proof that no smart-wallet, Safe, module, guard, or session-key risk exists.",
        ],
        errors: [
          "Wallet Lifeboat smart-wallet diagnostic rate limit exceeded.",
        ],
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

  const timed = smartWalletTimeoutSignal(request.signal);
  try {
    const result = await discoverSmartWalletConfig({
      chainId,
      owner,
      signal: timed.signal,
    });

    return NextResponse.json(result, {
      status: statusCodeFor(result.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Lifeboat-Diagnostic": "smart-wallet",
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
      summary: emptySmartWalletSummary(),
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
  rateLimit: LifeboatSmartWalletRateLimitResult,
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
      LIFEBOAT_SMART_WALLET_API_RATE_LIMIT.windowMs.toString(),
  };
}
