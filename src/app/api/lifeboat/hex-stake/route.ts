import { NextResponse } from "next/server";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  LIFEBOAT_HEX_STAKE_API_RATE_LIMIT,
  checkLifeboatHexStakeRateLimit,
  type LifeboatHexStakeRateLimitResult,
} from "@/lib/lifeboat/hex-stake-api-controls";
import {
  emptyHexStakeSummary,
  normalizeHexStakeOwner,
} from "@/lib/lifeboat/hex-stake";
import {
  discoverHexStakeStatus,
  hexStakeTimeoutSignal,
  isHexStakeDiagnosticChainId,
} from "@/lib/lifeboat/hex-stake-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const unsupportedParam = [
    "function",
    "method",
    "calldata",
    "data",
    "tx",
    "stakeIndex",
    "index",
    "page",
    "offset",
    "fromBlock",
    "toBlock",
    "endStake",
    "emergencyEndStake",
    "goodAccounting",
  ].find((name) => url.searchParams.has(name));
  if (unsupportedParam) {
    return badRequest(
      `Unsupported query param: ${unsupportedParam}. HEX stake diagnostics use bounded read-only contract calls only.`,
    );
  }

  const chainId = Number(url.searchParams.get("chainId"));
  if (!Number.isInteger(chainId) || !isHexStakeDiagnosticChainId(chainId)) {
    return badRequest(
      "Wallet Lifeboat HEX stake diagnostics currently support chainId=369 only.",
    );
  }

  const owner = normalizeHexStakeOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );
  if (!owner) {
    return badRequest("Provide a valid owner address in ?owner=0x...");
  }

  const rateLimit = checkLifeboatHexStakeRateLimit(
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
        stakes: [],
        evidence: [],
        summary: emptyHexStakeSummary(),
        warnings: [
          "The HEX stake diagnostic is incomplete. Do not treat this as proof that the wallet has no active, mature, late, or historical stakes.",
        ],
        errors: ["Wallet Lifeboat HEX stake diagnostic rate limit exceeded."],
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

  const timed = hexStakeTimeoutSignal(request.signal);
  try {
    const result = await discoverHexStakeStatus({
      chainId,
      owner,
      signal: timed.signal,
    });

    return NextResponse.json(result, {
      status: statusCodeFor(result.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Lifeboat-Diagnostic": "hex-stake",
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
      stakes: [],
      evidence: [],
      summary: emptyHexStakeSummary(),
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
  rateLimit: LifeboatHexStakeRateLimitResult,
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
      LIFEBOAT_HEX_STAKE_API_RATE_LIMIT.windowMs.toString(),
  };
}
