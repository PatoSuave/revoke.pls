import { NextResponse } from "next/server";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  LIFEBOAT_TIMELINE_API_RATE_LIMIT,
  checkLifeboatTimelineRateLimit,
  type LifeboatTimelineRateLimitResult,
} from "@/lib/lifeboat/timeline-api-controls";
import {
  emptyTimelineSummary,
  normalizeTimelineOwner,
} from "@/lib/lifeboat/timeline";
import {
  discoverApprovalDrainTimeline,
  isTimelineChainId,
  timelineTimeoutSignal,
} from "@/lib/lifeboat/timeline-server";

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
      `Unsupported query param: ${unsupportedRangeParam}. Timeline diagnostics use a bounded recent-history window only.`,
    );
  }

  const chainId = Number(url.searchParams.get("chainId"));
  if (!Number.isInteger(chainId) || !isTimelineChainId(chainId)) {
    return badRequest(
      "Wallet Lifeboat timeline diagnostics currently support chainId=1, 10, 56, 137, 369, 999, 8453, and 42161.",
    );
  }

  const owner = normalizeTimelineOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );
  if (!owner) {
    return badRequest("Provide a valid owner address in ?owner=0x...");
  }

  const rateLimit = checkLifeboatTimelineRateLimit(
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
        events: [],
        evidence: [],
        summary: emptyTimelineSummary(),
        warnings: [
          "The approval-to-drain timeline is incomplete. Do not treat this as proof that the wallet has no suspicious sequence.",
        ],
        errors: ["Wallet Lifeboat timeline diagnostic rate limit exceeded."],
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

  const timed = timelineTimeoutSignal(request.signal);
  try {
    const result = await discoverApprovalDrainTimeline({
      chainId,
      owner,
      signal: timed.signal,
    });

    return NextResponse.json(result, {
      status: statusCodeFor(result.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Lifeboat-Diagnostic": "timeline",
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
      events: [],
      evidence: [],
      summary: emptyTimelineSummary(),
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

function rateLimitHeaders(
  rateLimit: LifeboatTimelineRateLimitResult,
  options: { includeRetryAfter?: boolean } = {},
): HeadersInit {
  return {
    ...(options.includeRetryAfter
      ? { "Retry-After": rateLimit.retryAfterSeconds.toString() }
      : {}),
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
    "X-RateLimit-Window-Ms": LIFEBOAT_TIMELINE_API_RATE_LIMIT.windowMs.toString(),
  };
}
