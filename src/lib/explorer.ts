import type { Address } from "viem";

import { getChainConfig, pulsechain } from "@/lib/chains";
import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  ETHEREUM_MAINNET_EXPLORER_BASE_URL,
  ETHEREUM_MAINNET_EXPLORER_NAME,
  ethereumExplorerAddressUrl,
  ethereumExplorerTokenUrl,
  ethereumExplorerTxUrl,
} from "@/lib/ethereum-approval-client";

function baseUrlFor(chainId: number | undefined): string {
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ETHEREUM_MAINNET_EXPLORER_BASE_URL;
  }
  const config = getChainConfig(chainId);
  const base = config?.explorer.baseUrl ?? pulsechain.blockExplorers.default.url;
  return base.replace(/\/$/, "");
}

export function explorerAddressUrl(
  chainId: number | undefined,
  address: Address | string,
): string {
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ethereumExplorerAddressUrl(address);
  }
  const config = getChainConfig(chainId);
  return config?.explorer.urls.address(address) ?? `${baseUrlFor(chainId)}/address/${address}`;
}

export function explorerTokenUrl(
  chainId: number | undefined,
  address: Address | string,
): string {
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ethereumExplorerTokenUrl(address);
  }
  const config = getChainConfig(chainId);
  return config?.explorer.urls.token(address) ?? `${baseUrlFor(chainId)}/token/${address}`;
}

export function explorerTxUrl(
  chainId: number | undefined,
  hash: string,
): string {
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ethereumExplorerTxUrl(hash);
  }
  const config = getChainConfig(chainId);
  return config?.explorer.urls.transaction(hash) ?? `${baseUrlFor(chainId)}/tx/${hash}`;
}

/** Display name for the active chain's explorer (falls back to PulseScan). */
export function explorerName(chainId: number | undefined): string {
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ETHEREUM_MAINNET_EXPLORER_NAME;
  }
  return getChainConfig(chainId)?.explorer.name ?? "PulseScan";
}
