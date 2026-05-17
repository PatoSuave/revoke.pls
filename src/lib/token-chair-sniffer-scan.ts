import type { Address } from "viem";

import {
  withTokenChairContractData,
  withTokenChairExplorerData,
  withTokenChairHolderData,
  type TokenChairApiResponse,
} from "@/lib/token-chair-sniffer";
import { fetchTokenChairContractData } from "@/lib/token-chair-sniffer-contract";
import { fetchTokenChairExplorerData } from "@/lib/token-chair-sniffer-explorer";
import { fetchTokenChairHolderData } from "@/lib/token-chair-sniffer-holders";
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

    const holderResult = await fetchTokenChairHolderData(
      tokenAddress,
      marketResult.market?.pairAddress,
      {
        signal: controller.signal,
      },
    );

    return withTokenChairHolderData(
      withTokenChairExplorerData(
        withTokenChairContractData(marketResult, contractResult),
        explorerResult,
      ),
      holderResult,
    );
  } finally {
    clearTimeout(timeout);
  }
}
