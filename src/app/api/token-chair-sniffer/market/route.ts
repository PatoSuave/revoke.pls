import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  TOKEN_CHAIR_CHAIN_ID,
  createTokenChairApiResponse,
  normalizeTokenChairAddress,
  withTokenChairContractData,
  withTokenChairExplorerData,
  withTokenChairHolderData,
  type TokenChairApiResponse,
} from "@/lib/token-chair-sniffer";
import { fetchTokenChairContractData } from "@/lib/token-chair-sniffer-contract";
import { fetchTokenChairExplorerData } from "@/lib/token-chair-sniffer-explorer";
import { fetchTokenChairHolderData } from "@/lib/token-chair-sniffer-holders";
import { fetchDexScreenerTokenPairs } from "@/lib/token-chair-sniffer-server";

export const runtime = "nodejs";

const TOKEN_CHAIR_REQUEST_TIMEOUT_MS = 10_000;

export async function GET(request: Request) {
  const url = new URL(request.url);
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

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TOKEN_CHAIR_REQUEST_TIMEOUT_MS,
  );

  let result: TokenChairApiResponse;
  try {
    const [marketResult, contractResult, explorerResult] = await Promise.all([
      fetchDexScreenerTokenPairs(tokenAddress, {
        signal: controller.signal,
      }),
      fetchTokenChairContractData(tokenAddress, {
        signal: controller.signal,
      }),
      fetchTokenChairExplorerData(tokenAddress, {
        signal: controller.signal,
      }),
    ]);

    const holderResult = await fetchTokenChairHolderData(
      tokenAddress,
      marketResult.market?.pairAddress,
      {
        signal: controller.signal,
      },
    );

    result = withTokenChairHolderData(
      withTokenChairExplorerData(
        withTokenChairContractData(marketResult, contractResult),
        explorerResult,
      ),
      holderResult,
    );
  } finally {
    clearTimeout(timeout);
  }

  const httpStatus =
    result.status === "upstream-unavailable" ||
    result.status === "malformed-response"
      ? 502
      : 200;

  return tokenChairJson(result, httpStatus);
}

function tokenChairJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: approvalApiNoStoreHeaders({
      "X-Token-Chair-Chain": TOKEN_CHAIR_CHAIN_ID,
      "X-Token-Chair-Timeout-Ms": TOKEN_CHAIR_REQUEST_TIMEOUT_MS.toString(),
    }),
  });
}
