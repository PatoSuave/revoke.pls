import type { Address } from "viem";

import {
  withTokenChairContractData,
  withTokenChairExplorerData,
  withTokenChairHolderData,
  withTokenChairLpLockerData,
  withTokenChairPairContractData,
  withTokenChairPulseXPairData,
  type TokenChairApiResponse,
} from "@/lib/token-chair-sniffer";
import { fetchTokenChairContractData } from "@/lib/token-chair-sniffer-contract";
import { fetchTokenChairExplorerData } from "@/lib/token-chair-sniffer-explorer";
import { fetchTokenChairHolderData } from "@/lib/token-chair-sniffer-holders";
import { fetchTokenChairLpLockerData } from "@/lib/token-chair-sniffer-lockers";
import { fetchTokenChairPairContractData } from "@/lib/token-chair-sniffer-pair";
import { fetchTokenChairPulseXPairs } from "@/lib/token-chair-sniffer-pulsex";
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
    const pulsexPairsPromise = fetchTokenChairPulseXPairs(tokenAddress, {
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
      pulsexPairsResult,
    ] = await Promise.all([
      contractPromise,
      explorerPromise,
      holderPromise,
      pairContractPromise,
      pulsexPairsPromise,
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
    const responseWithPulseX = withTokenChairPulseXPairData(
      responseWithPairContract,
      pulsexPairsResult,
    );
    const responseWithHolders = withTokenChairHolderData(
      responseWithPulseX,
      holderResult,
    );
    const lpLockerResult = await fetchTokenChairLpLockerData(
      holderResult.lp.pairAddress,
      holderResult.lp.address,
      pairContractResult?.totalSupplyRaw ?? holderResult.lp.totalSupplyRaw,
      {
        signal: controller.signal,
      },
    );

    return lpLockerResult.status === "not-applicable"
      ? responseWithHolders
      : withTokenChairLpLockerData(responseWithHolders, lpLockerResult);
  } finally {
    clearTimeout(timeout);
  }
}
