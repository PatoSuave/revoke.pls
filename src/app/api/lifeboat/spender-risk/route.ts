import { NextResponse } from "next/server";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  LIFEBOAT_SPENDER_RISK_API_RATE_LIMIT,
  checkLifeboatSpenderRiskRateLimit,
  type LifeboatSpenderRiskRateLimitResult,
} from "@/lib/lifeboat/spender-risk-api-controls";
import {
  emptySpenderRiskSummary,
  normalizeSpenderRiskAddress,
} from "@/lib/lifeboat/spender-risk";
import {
  discoverSpenderContractRisk,
  isSpenderRiskChainId,
  spenderRiskTimeoutSignal,
} from "@/lib/lifeboat/spender-risk-server";

export const runtime = "nodejs";

const MAX_SPENDER_COUNT = 20;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const unsupportedParam = [
    "page",
    "offset",
    "fromBlock",
    "toBlock",
    "startblock",
    "endblock",
    "sort",
    "action",
    "module",
    "calldata",
    "tx",
  ].find((name) => url.searchParams.has(name));
  if (unsupportedParam) {
    return badRequest(
      `Unsupported query param: ${unsupportedParam}. Spender contract diagnostics only inspect a capped list of spender addresses.`,
    );
  }

  const chainId = Number(url.searchParams.get("chainId"));
  if (!Number.isInteger(chainId) || !isSpenderRiskChainId(chainId)) {
    return badRequest(
      "Wallet Lifeboat spender contract diagnostics currently support chainId=1, 10, 56, 137, 369, 999, 8453, and 42161.",
    );
  }

  const spenders = parseSpenders(url);
  if (spenders.invalid.length > 0) {
    return badRequest(`Invalid spender address: ${spenders.invalid[0]}`);
  }
  if (spenders.addresses.length > MAX_SPENDER_COUNT) {
    return badRequest(
      `Too many spender addresses. Provide at most ${MAX_SPENDER_COUNT} spenders.`,
    );
  }

  const rateLimit = checkLifeboatSpenderRiskRateLimit(
    rateLimitKeyFromRequest(request),
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        status: "upstream-failure",
        chainId,
        chainName: "Unknown",
        riskLevel: "upstream_unavailable",
        evidence: [],
        spenders: [],
        summary: emptySpenderRiskSummary(),
        warnings: [
          "The spender contract diagnostic is incomplete. Do not treat this as proof that approval spenders are safe.",
        ],
        errors: ["Wallet Lifeboat spender contract diagnostic rate limit exceeded."],
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

  const timed = spenderRiskTimeoutSignal(request.signal);
  try {
    const result = await discoverSpenderContractRisk({
      chainId,
      spenders: spenders.addresses,
      signal: timed.signal,
    });

    return NextResponse.json(result, {
      status: statusCodeFor(result.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Lifeboat-Diagnostic": "spender-risk",
      }),
    });
  } finally {
    timed.cleanup();
  }
}

function parseSpenders(url: URL): {
  addresses: `0x${string}`[];
  invalid: string[];
} {
  const raw = [
    ...url.searchParams.getAll("spender"),
    ...url.searchParams
      .getAll("spenders")
      .flatMap((value) => value.split(",")),
  ]
    .map((value) => value.trim())
    .filter(Boolean);
  const addresses: `0x${string}`[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const value of raw) {
    const address = normalizeSpenderRiskAddress(value);
    if (!address) {
      invalid.push(value);
      continue;
    }
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(address);
  }

  return { addresses, invalid };
}

function badRequest(message: string) {
  return NextResponse.json(
    {
      ok: false,
      status: "bad-request",
      chainId: null,
      chainName: "Unknown",
      riskLevel: "not_checked",
      evidence: [],
      spenders: [],
      summary: emptySpenderRiskSummary(),
      warnings: [],
      errors: [message],
      missingConfig: [],
    },
    { status: 400, headers: approvalApiNoStoreHeaders({}) },
  );
}

function statusCodeFor(status: string): number {
  if (status === "upstream-failure") return 502;
  if (status === "bad-request") return 400;
  if (status === "unsupported") return 501;
  return 200;
}

function rateLimitHeaders(
  rateLimit: LifeboatSpenderRiskRateLimitResult,
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
      LIFEBOAT_SPENDER_RISK_API_RATE_LIMIT.windowMs.toString(),
  };
}
