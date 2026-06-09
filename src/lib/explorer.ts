import type { Address } from "viem";

import {
  ARBITRUM_ONE_CLIENT_CHAIN_ID,
  ARBITRUM_ONE_EXPLORER_BASE_URL,
  ARBITRUM_ONE_EXPLORER_NAME,
  arbitrumExplorerAddressUrl,
  arbitrumExplorerTokenUrl,
  arbitrumExplorerTxUrl,
} from "@/lib/arbitrum-approval-client";
import { getChainConfig, pulsechain } from "@/lib/chains";
import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  ETHEREUM_MAINNET_EXPLORER_BASE_URL,
  ETHEREUM_MAINNET_EXPLORER_NAME,
  ethereumExplorerAddressUrl,
  ethereumExplorerTokenUrl,
  ethereumExplorerTxUrl,
} from "@/lib/ethereum-approval-client";
import {
  HYPEREVM_CLIENT_CHAIN_ID,
  HYPEREVM_EXPLORER_BASE_URL,
  HYPEREVM_EXPLORER_NAME,
  hyperevmExplorerAddressUrl,
  hyperevmExplorerTokenUrl,
  hyperevmExplorerTxUrl,
} from "@/lib/hyperevm-approval-client";
import {
  OPTIMISM_CLIENT_CHAIN_ID,
  OPTIMISM_EXPLORER_BASE_URL,
  OPTIMISM_EXPLORER_NAME,
  optimismExplorerAddressUrl,
  optimismExplorerTokenUrl,
  optimismExplorerTxUrl,
} from "@/lib/optimism-approval-client";

function baseUrlFor(chainId: number | undefined): string {
  if (chainId === ARBITRUM_ONE_CLIENT_CHAIN_ID) {
    return ARBITRUM_ONE_EXPLORER_BASE_URL;
  }
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ETHEREUM_MAINNET_EXPLORER_BASE_URL;
  }
  if (chainId === OPTIMISM_CLIENT_CHAIN_ID) {
    return OPTIMISM_EXPLORER_BASE_URL;
  }
  if (chainId === HYPEREVM_CLIENT_CHAIN_ID) {
    return HYPEREVM_EXPLORER_BASE_URL;
  }
  const config = getChainConfig(chainId);
  const base = config?.explorer.baseUrl ?? pulsechain.blockExplorers.default.url;
  return base.replace(/\/$/, "");
}

export function explorerAddressUrl(
  chainId: number | undefined,
  address: Address | string,
): string {
  if (chainId === ARBITRUM_ONE_CLIENT_CHAIN_ID) {
    return arbitrumExplorerAddressUrl(address);
  }
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ethereumExplorerAddressUrl(address);
  }
  if (chainId === OPTIMISM_CLIENT_CHAIN_ID) {
    return optimismExplorerAddressUrl(address);
  }
  if (chainId === HYPEREVM_CLIENT_CHAIN_ID) {
    return hyperevmExplorerAddressUrl(address);
  }
  const config = getChainConfig(chainId);
  return config?.explorer.urls.address(address) ?? `${baseUrlFor(chainId)}/address/${address}`;
}

export function explorerTokenUrl(
  chainId: number | undefined,
  address: Address | string,
): string {
  if (chainId === ARBITRUM_ONE_CLIENT_CHAIN_ID) {
    return arbitrumExplorerTokenUrl(address);
  }
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ethereumExplorerTokenUrl(address);
  }
  if (chainId === OPTIMISM_CLIENT_CHAIN_ID) {
    return optimismExplorerTokenUrl(address);
  }
  if (chainId === HYPEREVM_CLIENT_CHAIN_ID) {
    return hyperevmExplorerTokenUrl(address);
  }
  const config = getChainConfig(chainId);
  return config?.explorer.urls.token(address) ?? `${baseUrlFor(chainId)}/token/${address}`;
}

export function explorerTxUrl(
  chainId: number | undefined,
  hash: string,
): string {
  if (chainId === ARBITRUM_ONE_CLIENT_CHAIN_ID) {
    return arbitrumExplorerTxUrl(hash);
  }
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ethereumExplorerTxUrl(hash);
  }
  if (chainId === OPTIMISM_CLIENT_CHAIN_ID) {
    return optimismExplorerTxUrl(hash);
  }
  if (chainId === HYPEREVM_CLIENT_CHAIN_ID) {
    return hyperevmExplorerTxUrl(hash);
  }
  const config = getChainConfig(chainId);
  return config?.explorer.urls.transaction(hash) ?? `${baseUrlFor(chainId)}/tx/${hash}`;
}

/** Display name for the active chain's explorer (falls back to PulseScan). */
export function explorerName(chainId: number | undefined): string {
  if (chainId === ARBITRUM_ONE_CLIENT_CHAIN_ID) {
    return ARBITRUM_ONE_EXPLORER_NAME;
  }
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ETHEREUM_MAINNET_EXPLORER_NAME;
  }
  if (chainId === OPTIMISM_CLIENT_CHAIN_ID) {
    return OPTIMISM_EXPLORER_NAME;
  }
  if (chainId === HYPEREVM_CLIENT_CHAIN_ID) {
    return HYPEREVM_EXPLORER_NAME;
  }
  return getChainConfig(chainId)?.explorer.name ?? "PulseScan";
}
