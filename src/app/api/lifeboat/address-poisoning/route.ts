import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  LIFEBOAT_ADDRESS_POISONING_API_RATE_LIMIT,
  checkLifeboatAddressPoisoningRateLimit,
  type LifeboatAddressPoisoningRateLimitResult,
} from "@/lib/lifeboat/address-poisoning-api-controls";
import {
  emptyAddressPoisoningSummary,
  normalizeAddressPoisoningOwner,
} from "@/lib/lifeboat/address-poisoning";
import {
  addressPoisoningTimeoutSignal,
  discoverAddressPoisoningSignals,
  isAddressPoisoningChainId,
} from "@/lib/lifeboat/address-poisoning-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const unsupportedRangeParam = [
    "page",
    "offset",
    "fromBlock",
    "toBlock",
    "startblock",
    "endblock",
    "sort",
    "action",
    "module",
  ].find((name) => url.searchParams.has(name));
  if (unsupportedRangeParam) {
    return badRequest(
      `Unsupported query param: ${unsupportedRangeParam}. Address poisoning diagnostics use a bounded recent-history window only.`,
    );
  }

  const chainId = Number(url.searchParams.get("chainId"));
  if (!Number.isInteger(chainId) || !isAddressPoisoningChainId(chainId)) {
    return badRequest(
      "Wallet Lifeboat address poisoning diagnostics currently support chainId=1, 10, 56, 137, 369, 999, 8453, and 42161.",
    );
  }

  const owner = normalizeAddressPoisoningOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );
  if (!owner) {
    return badRequest("Provide a valid owner address in ?owner=0x...");
  }

  const rateLimit = checkLifeboatAddressPoisoningRateLimit(rateLimitKey(request));
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
        summary: emptyAddressPoisoningSummary(),
        warnings: [
          "The address poisoning diagnostic is incomplete. Do not treat this as proof that the wallet has no lookalike-address risk.",
        ],
        errors: [
          "Wallet Lifeboat address poisoning diagnostic rate limit exceeded.",
        ],
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

  const timed = addressPoisoningTimeoutSignal(request.signal);
  try {
    const result = await discoverAddressPoisoningSignals({
      chainId,
      owner,
      signal: timed.signal,
    });

    return NextResponse.json(result, {
      status: statusCodeFor(result.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Lifeboat-Diagnostic": "address-poisoning",
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
      summary: emptyAddressPoisoningSummary(),
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
  rateLimit: LifeboatAddressPoisoningRateLimitResult,
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
      LIFEBOAT_ADDRESS_POISONING_API_RATE_LIMIT.windowMs.toString(),
  };
}
