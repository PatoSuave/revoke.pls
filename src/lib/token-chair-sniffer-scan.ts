import type { Address } from "viem";

import {
  withTokenChairContractData,
  withTokenChairExplorerData,
  withTokenChairHolderData,
  withTokenChairPairContractData,
  type TokenChairApiResponse,
} from "@/lib/token-chair-sniffer";
import { fetchTokenChairContractData } from "@/lib/token-chair-sniffer-contract";
import { fetchTokenChairExplorerData } from "@/lib/token-chair-sniffer-explorer";
import { fetchTokenChairHolderData } from "@/lib/token-chair-sniffer-holders";
import { fetchTokenChairPairContractData } from "@/lib/token-chair-sniffer-pair";
import { fetchDexScreenerTokenPairs } from "@/lib/token-chair-sniffer-server";

export const TOKEN_CHAIR_REQUEST_TIMEOUT_MS = 10_000;
export const TOKEN_CHAIR_SCAN_HOLDER_MAX_PAGES = 2;

export async function fetchTokenChairScan(
  tokenAddress: Address,
  timeoutMs = TOKEN_CHAIR_REQUEST_TIMEOUT_MS,
): Promise<TokenChairApiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const marketPromise = fetchDexScreenerTokenPairs(tokenAddress, {
      signal: controller.signal,
    });
    const contractPromise = fetchTokenChairContractData(tokenAddress, {
      signal: controller.signal,
    });
    const explorerPromise = fetchTokenChairExplorerData(tokenAddress, {
      signal: controller.signal,
    });

    const marketResult = await marketPromise;
    const selectedPairAddress = marketResult.market?.pairAddress;
    const holderPromise = fetchTokenChairHolderData(
      tokenAddress,
      selectedPairAddress,
      {
        signal: controller.signal,
        maxPages: TOKEN_CHAIR_SCAN_HOLDER_MAX_PAGES,
      },
    );
    const pairContractPromise = selectedPairAddress
      ? fetchTokenChairPairContractData(tokenAddress, selectedPairAddress, {
          signal: controller.signal,
        })
      : Promise.resolve(null);

    const [
      contractResult,
      explorerResult,
      holderResult,
      pairContractResult,
    ] = await Promise.all([
      contractPromise,
      explorerPromise,
      holderPromise,
      pairContractPromise,
    ]);

    const responseWithMarketContractAndExplorer = withTokenChairExplorerData(
      withTokenChairContractData(marketResult, contractResult),
      explorerResult,
    );
    const responseWithPairContract = pairContractResult
      ? withTokenChairPairContractData(
          responseWithMarketContractAndExplorer,
          pairContractResult,
        )
      : responseWithMarketContractAndExplorer;

    return withTokenChairHolderData(
      responseWithPairContract,
      holderResult,
    );
  } finally {
    clearTimeout(timeout);
  }
}
