import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  TOKEN_CHAIR_CHAIN_ID,
  createTokenChairApiResponse,
  normalizeTokenChairAddress,
} from "@/lib/token-chair-sniffer";
import { fetchTokenChairScan } from "@/lib/token-chair-sniffer-scan";
import {
  TOKEN_CHAIR_API_RATE_LIMIT,
  TOKEN_CHAIR_API_REQUEST_TIMEOUT_MS,
  checkTokenChairApiRateLimit,
  type TokenChairRateLimitResult,
} from "@/lib/token-chair-sniffer-controls";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const unsupportedRangeParam = [
    "page",
    "offset",
    "fromBlock",
    "toBlock",
    "lookbackBlocks",
  ].find((name) => url.searchParams.has(name));
  if (unsupportedRangeParam) {
    return tokenChairJson(
      createTokenChairApiResponse({
        status: "bad-request",
        tokenAddress: null,
        errors: [
          `Unsupported query param: ${unsupportedRangeParam}. Token Chair Sniffer uses server-bounded read windows only.`,
        ],
      }),
      400,
    );
  }

  const requestedChain =
    url.searchParams.get("chainId") ?? url.searchParams.get("chainid");

  if (
    requestedChain !== null &&
    requestedChain.toLowerCase() !== TOKEN_CHAIR_CHAIN_ID
  ) {
    return tokenChairJson(
      createTokenChairApiResponse({
        status: "bad-request",
        tokenAddress: null,
        errors: ["Token Chair Sniffer only supports chainId=pulsechain."],
      }),
      400,
    );
  }

  const tokenAddress = normalizeTokenChairAddress(
    url.searchParams.get("token") ?? url.searchParams.get("address"),
  );

  if (!tokenAddress) {
    return tokenChairJson(
      createTokenChairApiResponse({
        status: "bad-request",
        tokenAddress: null,
        errors: ["Provide a valid EVM token address in ?token=0x..."],
      }),
      400,
    );
  }

  const rateLimit = checkTokenChairApiRateLimit(rateLimitKey(request));
  if (!rateLimit.allowed) {
    return tokenChairJson(
      createTokenChairApiResponse({
        status: "upstream-unavailable",
        tokenAddress,
        errors: [
          "Token Chair Sniffer API rate limit exceeded. Try again shortly.",
        ],
      }),
      429,
      rateLimitHeaders(rateLimit, { includeRetryAfter: true }),
    );
  }

  const result = await fetchTokenChairScan(
    tokenAddress,
    TOKEN_CHAIR_API_REQUEST_TIMEOUT_MS,
  );

  const httpStatus =
    result.status === "upstream-unavailable" ||
    result.status === "malformed-response"
      ? 502
      : 200;

  return tokenChairJson(result, httpStatus, rateLimitHeaders(rateLimit));
}

function tokenChairJson(
  body: unknown,
  status: number,
  headers: HeadersInit = {},
) {
  return NextResponse.json(body, {
    status,
    headers: approvalApiNoStoreHeaders({
      ...headers,
      "X-Token-Chair-Chain": TOKEN_CHAIR_CHAIN_ID,
      "X-Token-Chair-Timeout-Ms": TOKEN_CHAIR_API_REQUEST_TIMEOUT_MS.toString(),
    }),
  });
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
  rateLimit: TokenChairRateLimitResult,
  options: { includeRetryAfter?: boolean } = {},
): HeadersInit {
  return {
    ...(options.includeRetryAfter
      ? { "Retry-After": rateLimit.retryAfterSeconds.toString() }
      : {}),
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
    "X-RateLimit-Window-Ms": TOKEN_CHAIR_API_RATE_LIMIT.windowMs.toString(),
  };
}
