import { NextResponse } from "next/server";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  discoverServerErc20Approvals,
  discoverServerNftApprovals,
  isServerDiscoveryChainId,
  normalizeServerDiscoveryOwner,
  serverDiscoveryTimeoutSignal,
} from "@/lib/server-approval-discovery";
import {
  SERVER_APPROVAL_API_RATE_LIMIT,
  checkServerApprovalApiRateLimit,
  type RateLimitResult,
} from "@/lib/server-approval-api-controls";

export const runtime = "nodejs";

type DiscoveryScope = "erc20" | "nft";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const unsupportedRangeParam = ["page", "offset", "fromBlock", "toBlock"].find(
    (name) => url.searchParams.has(name),
  );
  if (unsupportedRangeParam) {
    return badRequest(
      `Unsupported query param: ${unsupportedRangeParam}. Server discovery uses bounded windows only.`,
    );
  }

  const chainId = Number(url.searchParams.get("chainId"));
  if (!Number.isInteger(chainId) || !isServerDiscoveryChainId(chainId)) {
    return badRequest(
      "Server discovery currently supports chainId=56, 8453, 137, 43114, and 5000.",
    );
  }

  const scope = parseScope(url.searchParams.get("scope"));
  if (!scope) {
    return badRequest("Provide scope=erc20 or scope=nft.");
  }

  const owner = normalizeServerDiscoveryOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );
  if (!owner) {
    return badRequest("Provide a valid owner address in ?owner=0x...");
  }

  const rateLimit = checkServerApprovalApiRateLimit(
    rateLimitKeyFromRequest(request),
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        status: "upstream-failure",
        chainId,
        warnings: [],
        errors: [
          "Server approval discovery rate limit exceeded. Try again shortly.",
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

  const timed = serverDiscoveryTimeoutSignal(request.signal);
  try {
    const result =
      scope === "erc20"
        ? await discoverServerErc20Approvals({
            chainId,
            owner,
            signal: timed.signal,
          })
        : await discoverServerNftApprovals({
            chainId,
            owner,
            signal: timed.signal,
          });

    return NextResponse.json(result, {
      status: statusCodeFor(result.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Approval-Discovery-Source": "server",
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "upstream-failure",
        chainId,
        warnings: [],
        errors: [
          timed.signal.aborted
            ? "Server-side approval discovery timed out."
            : `Server-side approval discovery failed: ${redactSensitiveErrorText(
                error instanceof Error ? error.message : String(error),
              )}`,
        ],
        missingConfig: [],
      },
      {
        status: 502,
        headers: approvalApiNoStoreHeaders({
          "X-Approval-Discovery-Source": "server",
        }),
      },
    );
  } finally {
    timed.cleanup();
  }
}

function badRequest(message: string) {
  return NextResponse.json(
    {
      ok: false,
      status: "bad-request",
      errors: [message],
      warnings: [],
      missingConfig: [],
    },
    { status: 400, headers: approvalApiNoStoreHeaders({}) },
  );
}

function parseScope(value: string | null): DiscoveryScope | null {
  return value === "erc20" || value === "nft" ? value : null;
}

function statusCodeFor(status: string): number {
  if (status === "config-missing") return 503;
  if (status === "upstream-failure") return 502;
  if (status === "bad-request") return 400;
  return 200;
}

function rateLimitHeaders(
  rateLimit: RateLimitResult,
  options: { includeRetryAfter?: boolean } = {},
): HeadersInit {
  return {
    ...(options.includeRetryAfter
      ? { "Retry-After": rateLimit.retryAfterSeconds.toString() }
      : {}),
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
    "X-RateLimit-Window-Ms": SERVER_APPROVAL_API_RATE_LIMIT.windowMs.toString(),
  };
}

function redactSensitiveErrorText(value: string): string {
  return value
    .replace(/([?&]apikey=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]api_key=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]key=)[^&\s)]+/gi, "$1[redacted]");
}
