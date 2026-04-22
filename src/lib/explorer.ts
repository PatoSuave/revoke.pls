import type { Address } from "viem";

import { getChainConfig, pulsechain } from "@/lib/chains";

function baseUrlFor(chainId: number | undefined): string {
  const config = getChainConfig(chainId);
  const base = config?.explorer.baseUrl ?? pulsechain.blockExplorers.default.url;
  return base.replace(/\/$/, "");
}

export function explorerAddressUrl(
  chainId: number | undefined,
  address: Address | string,
): string {
  return `${baseUrlFor(chainId)}/address/${address}`;
}

export function explorerTxUrl(
  chainId: number | undefined,
  hash: string,
): string {
  return `${baseUrlFor(chainId)}/tx/${hash}`;
}

/** Display name for the active chain's explorer (falls back to PulseScan). */
export function explorerName(chainId: number | undefined): string {
  return getChainConfig(chainId)?.explorer.name ?? "PulseScan";
}
