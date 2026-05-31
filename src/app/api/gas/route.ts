import { NextResponse } from "next/server";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  GAS_API_RATE_LIMIT,
  checkGasApiRateLimit,
  type RateLimitResult,
} from "@/lib/gas/gas-api-controls";
import {
  GAS_TRACKER_CHAIN_IDS,
  getGasTrackerChainConfig,
  type GasTrackerChainConfig,
} from "@/lib/gas/gas-chains";
import {
  fetchGasData,
  unavailableGasResponseForChain,
} from "@/lib/gas/evm-gas";
import type { GasApiResponse } from "@/lib/gas/gas-types";

export const runtime = "nodejs";

const inFlightGasData = new Map<number, Promise<GasApiResponse>>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedChainId = Number(url.searchParams.get("chainId"));
  const chain = getGasTrackerChainConfig(requestedChainId);

  if (!Number.isInteger(requestedChainId) || !chain) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        supportedChainIds: GAS_TRACKER_CHAIN_IDS,
        errors: [
          `Gas tracker supports chainId=${GAS_TRACKER_CHAIN_IDS.join(", ")}.`,
        ],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const rateLimit = checkGasApiRateLimit(
    rateLimitKeyFromRequest(request),
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        status: "rate-limited",
        supportedChainIds: GAS_TRACKER_CHAIN_IDS,
        errors: ["Gas tracker request limit reached. Try again shortly."],
      },
      {
        status: 429,
        headers: approvalApiNoStoreHeaders(
          rateLimitHeaders(rateLimit, { includeRetryAfter: true }),
        ),
      },
    );
  }

  try {
    const result = await fetchRouteGasData(chain);
    return NextResponse.json(result, {
      status: 200,
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Gas-Tracker-Source": result.source,
      }),
    });
  } catch {
    return NextResponse.json(
      unavailableGasResponseForChain(chain, new Date().toISOString(), [
        `${chain.chainName} gas data is unavailable.`,
      ]),
      {
        status: 200,
        headers: approvalApiNoStoreHeaders({
          ...rateLimitHeaders(rateLimit),
          "X-Gas-Tracker-Source": "unavailable",
        }),
      },
    );
  }
}

function fetchRouteGasData(
  chain: GasTrackerChainConfig,
): Promise<GasApiResponse> {
  const existing = inFlightGasData.get(chain.chainId);
  if (existing) return existing;

  const promise = fetchGasData(chain, {
    includeAdvisory: chain.advisoryProvider === "owlracle-pulse",
  }).finally(() => {
    inFlightGasData.delete(chain.chainId);
  });
  inFlightGasData.set(chain.chainId, promise);
  return promise;
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
    "X-RateLimit-Window-Ms": GAS_API_RATE_LIMIT.windowMs.toString(),
  };
}
