import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import { PULSECHAIN_GAS_CHAIN_ID } from "@/lib/gas/gas-types";
import { fetchPulseChainGasData } from "@/lib/gas/pulsechain-gas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedChainId = Number(url.searchParams.get("chainId"));

  if (
    !Number.isInteger(requestedChainId) ||
    requestedChainId !== PULSECHAIN_GAS_CHAIN_ID
  ) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Gas tracker currently supports PulseChain chainId=369."],
      },
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  try {
    const result = await fetchPulseChainGasData({ signal: request.signal });
    return NextResponse.json(result, {
      status: 200,
      headers: approvalApiNoStoreHeaders({
        "X-Gas-Tracker-Source": result.source,
      }),
    });
  } catch {
    return NextResponse.json(
      {
        chainId: PULSECHAIN_GAS_CHAIN_ID,
        chainName: "PulseChain",
        nativeCurrency: "PLS",
        blockNumber: null,
        source: "unavailable",
        status: "unavailable",
        updatedAt: new Date().toISOString(),
        available: false,
        gasPriceGwei: null,
        baseFeeGwei: null,
        priorityFeeGwei: null,
        typicalTransactions: [],
        errors: ["PulseChain gas data is unavailable."],
      },
      {
        status: 200,
        headers: approvalApiNoStoreHeaders({
          "X-Gas-Tracker-Source": "unavailable",
        }),
      },
    );
  }
}
