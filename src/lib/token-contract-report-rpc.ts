import { fallback, http, type Transport } from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";

export const PULSECHAIN_REPORT_BACKUP_RPC_DEFAULT =
  "https://rpc.pulsechainstats.com";

export const TOKEN_CONTRACT_REPORT_RPC_ATTEMPT_TIMEOUT_MS = 3_500;

interface TokenContractReportRpcUrlsOptions {
  chainId: number;
  primaryRpcUrl: string;
}

interface TokenContractReportTransportOptions {
  attemptTimeoutMs?: number;
  fetcher?: typeof fetch;
}

export function tokenContractReportRpcUrls({
  chainId,
  primaryRpcUrl,
}: TokenContractReportRpcUrlsOptions): string[] {
  const urls = [primaryRpcUrl];

  if (chainId === PULSECHAIN_CHAIN_ID) {
    urls.push(PULSECHAIN_REPORT_BACKUP_RPC_DEFAULT);
  }

  return urls.filter(
    (url, index) =>
      urls.findIndex(
        (candidate) => normalizeRpcUrl(candidate) === normalizeRpcUrl(url),
      ) === index,
  );
}

export function createTokenContractReportTransport(
  rpcUrls: readonly string[],
  options: TokenContractReportTransportOptions = {},
): Transport {
  const urls = rpcUrls.filter(Boolean);
  const primaryUrl = urls[0];
  if (!primaryUrl) {
    throw new Error("Token contract report RPC URL is required.");
  }

  if (urls.length === 1) return http(primaryUrl);

  const attemptTimeoutMs =
    options.attemptTimeoutMs ?? TOKEN_CONTRACT_REPORT_RPC_ATTEMPT_TIMEOUT_MS;
  const transports = urls.map((url, index) =>
    http(url, {
      fetchFn: options.fetcher,
      key: `token-contract-report-http-${index + 1}`,
      name: `Token contract report RPC ${index + 1}`,
      retryCount: 0,
      timeout: attemptTimeoutMs,
    }),
  );

  return fallback(transports, {
    key: "token-contract-report-fallback",
    name: "Token contract report RPC fallback",
    rank: false,
    retryCount: 0,
  });
}

function normalizeRpcUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}
