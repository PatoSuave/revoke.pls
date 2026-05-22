import type { Address } from "viem";

import {
  DEX_SCREENER_TOKEN_PAIRS_URL,
  createTokenChairApiResponse,
  normalizeDexScreenerTokenPairsResponse,
  type TokenChairApiResponse,
} from "@/lib/token-chair-sniffer";
import { TOKEN_CHAIR_DEX_SCREENER_MAX_RESPONSE_BYTES } from "@/lib/token-chair-sniffer-controls";
import {
  isTokenChairResponseTooLargeError,
  readTokenChairBoundedJson,
} from "@/lib/token-chair-sniffer-fetch";

interface FetchDexScreenerTokenPairsOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  now?: number;
}

export async function fetchDexScreenerTokenPairs(
  tokenAddress: Address,
  options: FetchDexScreenerTokenPairsOptions = {},
): Promise<TokenChairApiResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = `${DEX_SCREENER_TOKEN_PAIRS_URL}/${tokenAddress}`;

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
      signal: options.signal,
    });
  } catch (error) {
    return createTokenChairApiResponse({
      status: "upstream-unavailable",
      tokenAddress,
      errors: [upstreamErrorMessage(error)],
    });
  }

  if (!response.ok) {
    return createTokenChairApiResponse({
      status: "upstream-unavailable",
      tokenAddress,
      errors: [`DEX Screener returned HTTP ${response.status}.`],
    });
  }

  let payload: unknown;
  try {
    payload = await readTokenChairBoundedJson(
      response,
      "DEX Screener",
      TOKEN_CHAIR_DEX_SCREENER_MAX_RESPONSE_BYTES,
    );
  } catch (error) {
    return createTokenChairApiResponse({
      status: "malformed-response",
      tokenAddress,
      errors: [
        isTokenChairResponseTooLargeError(error)
          ? "DEX Screener returned a response that was too large to process safely."
          : "DEX Screener returned a response that could not be parsed as JSON.",
      ],
    });
  }

  return normalizeDexScreenerTokenPairsResponse(payload, tokenAddress, {
    now: options.now,
  });
}

function upstreamErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "DEX Screener request timed out.";
  }
  return "DEX Screener market data is temporarily unavailable.";
}
