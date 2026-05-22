import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import { getRequestClientKey } from "@/lib/request-client-key";
import {
  TOKEN_CHAIR_CHAIN_ID,
  createTokenChairApiResponse,
  normalizeTokenChairAddress,
} from "@/lib/token-chair-sniffer";
import { fetchTokenChairScan } from "@/lib/token-chair-sniffer-scan";
import {
  TOKEN_CHAIR_API_RATE_LIMIT,
  TOKEN_CHAIR_API_MAX_QUERY_VALUE_LENGTH,
  TOKEN_CHAIR_API_REQUEST_TIMEOUT_MS,
  checkTokenChairApiRateLimit,
  type TokenChairRateLimitResult,
} from "@/lib/token-chair-sniffer-controls";

export const runtime = "nodejs";

const TOKEN_CHAIR_ALLOWED_QUERY_PARAMS = new Set([
  "token",
  "address",
  "chainId",
  "chainid",
]);
const BLOCKED_TOKEN_CHAIR_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dead",
]);

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

  const queryIssue = validateTokenChairQuery(url.searchParams);
  if (queryIssue) {
    return tokenChairJson(
      createTokenChairApiResponse({
        status: "bad-request",
        tokenAddress: null,
        errors: [queryIssue],
      }),
      400,
    );
  }

  const requestedChain = tokenChairQueryValue(url.searchParams, [
    "chainId",
    "chainid",
  ]);

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

  const tokenParam = url.searchParams.get("token");
  const addressParam = url.searchParams.get("address");
  const tokenAddress = normalizeTokenChairAddress(tokenParam ?? addressParam);
  const aliasConflict = conflictingTokenChairAliases(tokenParam, addressParam);

  if (aliasConflict) {
    return tokenChairJson(
      createTokenChairApiResponse({
        status: "bad-request",
        tokenAddress: null,
        errors: [
          "Provide either ?token=0x... or ?address=0x..., not conflicting values.",
        ],
      }),
      400,
    );
  }

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

  if (BLOCKED_TOKEN_CHAIR_ADDRESSES.has(tokenAddress.toLowerCase())) {
    return tokenChairJson(
      createTokenChairApiResponse({
        status: "bad-request",
        tokenAddress: null,
        errors: [
          "Provide a token contract address; zero and burn addresses cannot be scanned.",
        ],
      }),
      400,
    );
  }

  const rateLimit = checkTokenChairApiRateLimit(getRequestClientKey(request));
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

function validateTokenChairQuery(searchParams: URLSearchParams): string | null {
  for (const [name, value] of searchParams) {
    if (name.length > TOKEN_CHAIR_API_MAX_QUERY_VALUE_LENGTH) {
      return "Unsupported query param name is too long.";
    }

    if (!TOKEN_CHAIR_ALLOWED_QUERY_PARAMS.has(name)) {
      return `Unsupported query param: ${name}. Token Chair Sniffer accepts only token, address, and chainId.`;
    }

    if (value.length > TOKEN_CHAIR_API_MAX_QUERY_VALUE_LENGTH) {
      return `Query param ${name} is too long.`;
    }
  }

  for (const name of TOKEN_CHAIR_ALLOWED_QUERY_PARAMS) {
    if (searchParams.getAll(name).length > 1) {
      return `Duplicate query param: ${name}.`;
    }
  }

  if (searchParams.has("chainId") && searchParams.has("chainid")) {
    return "Duplicate query param: chainId.";
  }

  return null;
}

function tokenChairQueryValue(
  searchParams: URLSearchParams,
  names: readonly string[],
): string | null {
  for (const name of names) {
    const value = searchParams.get(name);
    if (value !== null) return value;
  }
  return null;
}

function conflictingTokenChairAliases(
  tokenParam: string | null,
  addressParam: string | null,
): boolean {
  if (tokenParam === null || addressParam === null) return false;
  const tokenAddress = normalizeTokenChairAddress(tokenParam);
  const address = normalizeTokenChairAddress(addressParam);
  if (!tokenAddress || !address) return true;
  return tokenAddress.toLowerCase() !== address.toLowerCase();
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
