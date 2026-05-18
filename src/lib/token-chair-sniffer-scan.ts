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

export async function fetchTokenChairScan(
  tokenAddress: Address,
  timeoutMs = TOKEN_CHAIR_REQUEST_TIMEOUT_MS,
): Promise<TokenChairApiResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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

    const selectedPairAddress = marketResult.market?.pairAddress;
    const [holderResult, pairContractResult] = await Promise.all([
      fetchTokenChairHolderData(tokenAddress, selectedPairAddress, {
        signal: controller.signal,
      }),
      selectedPairAddress
        ? fetchTokenChairPairContractData(tokenAddress, selectedPairAddress, {
            signal: controller.signal,
          })
        : Promise.resolve(null),
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
