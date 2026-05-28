import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
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

  try {
    const result = await fetchRouteGasData(chain);
    return NextResponse.json(result, {
      status: 200,
      headers: approvalApiNoStoreHeaders({
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
