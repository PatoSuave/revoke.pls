import type { Address } from "viem";

import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  isSupportedChainId,
} from "@/lib/chains";

import {
  BASE_SPENDER_REGISTRY,
  BSC_SPENDER_REGISTRY,
  PULSECHAIN_SPENDER_REGISTRY,
  SPENDER_METADATA_REGISTRY,
  SPENDER_REGISTRY,
  type SpenderEntry,
} from "./spenders";
import {
  BASE_TOKEN_REGISTRY,
  BSC_TOKEN_REGISTRY,
  PULSECHAIN_TOKEN_REGISTRY,
  TOKEN_REGISTRY,
  type TokenEntry,
} from "./tokens";

export {
  BASE_TOKEN_REGISTRY,
  BSC_TOKEN_REGISTRY,
  MAINNET_TOKEN_REGISTRY,
  PULSECHAIN_TOKEN_REGISTRY,
  TOKEN_REGISTRY,
  type TokenCategory,
  type TokenEntry,
} from "./tokens";
export {
  ARBITRUM_ONE_CHAIN_ID,
  BASE_SPENDER_REGISTRY,
  BSC_SPENDER_REGISTRY,
  ETHEREUM_MAINNET_CHAIN_ID,
  LIBERTYSWAP_LEGACY_NOTE,
  LIBERTYSWAP_SOURCE_LABEL,
  LIBERTYSWAP_SOURCE_URL,
  LIBERTYSWAP_SPENDER_METADATA_REGISTRY,
  MAINNET_SPENDER_REGISTRY,
  PULSECHAIN_SPENDER_REGISTRY,
  SPENDER_METADATA_REGISTRY,
  SPENDER_REGISTRY,
  type SpenderContractStatus,
  type SpenderCategory,
  type SpenderEntry,
  type SpenderProtocolMetadata,
} from "./spenders";
export { RegistryValidationError } from "./validate";

function keyFor(chainId: number, address: string): string {
  return `${chainId}:${address.toLowerCase()}`;
}

const TOKEN_BY_CHAIN_ADDRESS = new Map<string, TokenEntry>(
  TOKEN_REGISTRY.map((t) => [keyFor(t.chainId, t.address), t]),
);
const SPENDER_BY_CHAIN_ADDRESS = new Map<string, SpenderEntry>(
  SPENDER_REGISTRY.map((s) => [keyFor(s.chainId, s.address), s]),
);
const SPENDER_METADATA_BY_CHAIN_ADDRESS = new Map<string, SpenderEntry>(
  SPENDER_METADATA_REGISTRY.map((s) => [keyFor(s.chainId, s.address), s]),
);

/** O(1) case-insensitive lookup scoped to a chain. */
export function getTokenEntry(
  chainId: number,
  address: Address,
): TokenEntry | undefined {
  if (!isSupportedChainId(chainId)) {
    return undefined;
  }

  return TOKEN_BY_CHAIN_ADDRESS.get(keyFor(chainId, address));
}

export function getSpenderEntry(
  chainId: number,
  address: Address,
): SpenderEntry | undefined {
  if (!isSupportedChainId(chainId)) {
    return undefined;
  }

  return SPENDER_BY_CHAIN_ADDRESS.get(keyFor(chainId, address));
}

export function getSpenderMetadataEntry(
  chainId: number,
  address: Address,
): SpenderEntry | undefined {
  return SPENDER_METADATA_BY_CHAIN_ADDRESS.get(keyFor(chainId, address));
}

/** Returns tokens in the curated registry for a given chain. */
export function getTokensForChain(chainId: number): readonly TokenEntry[] {
  if (!isSupportedChainId(chainId)) {
    return [];
  }

  if (chainId === PULSECHAIN_CHAIN_ID) {
    return PULSECHAIN_TOKEN_REGISTRY;
  }
  if (chainId === BSC_CHAIN_ID) {
    return BSC_TOKEN_REGISTRY;
  }
  if (chainId === BASE_CHAIN_ID) {
    return BASE_TOKEN_REGISTRY;
  }
  return [];
}

/** Returns spenders in the curated registry for a given chain. */
export function getSpendersForChain(chainId: number): readonly SpenderEntry[] {
  if (!isSupportedChainId(chainId)) {
    return [];
  }

  if (chainId === PULSECHAIN_CHAIN_ID) {
    return PULSECHAIN_SPENDER_REGISTRY;
  }
  if (chainId === BSC_CHAIN_ID) {
    return BSC_SPENDER_REGISTRY;
  }
  if (chainId === BASE_CHAIN_ID) {
    return BASE_SPENDER_REGISTRY;
  }
  return [];
}
