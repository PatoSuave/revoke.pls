import type { Address } from "viem";

import {
  MAINNET_SPENDER_REGISTRY,
  PULSECHAIN_SPENDER_REGISTRY,
  SPENDER_REGISTRY,
  type SpenderEntry,
} from "./spenders";
import {
  MAINNET_TOKEN_REGISTRY,
  PULSECHAIN_TOKEN_REGISTRY,
  TOKEN_REGISTRY,
  type TokenEntry,
} from "./tokens";

export {
  MAINNET_TOKEN_REGISTRY,
  PULSECHAIN_TOKEN_REGISTRY,
  TOKEN_REGISTRY,
  type TokenCategory,
  type TokenEntry,
} from "./tokens";
export {
  MAINNET_SPENDER_REGISTRY,
  PULSECHAIN_SPENDER_REGISTRY,
  SPENDER_REGISTRY,
  type SpenderCategory,
  type SpenderEntry,
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

/** O(1) case-insensitive lookup scoped to a chain. */
export function getTokenEntry(
  chainId: number,
  address: Address,
): TokenEntry | undefined {
  return TOKEN_BY_CHAIN_ADDRESS.get(keyFor(chainId, address));
}

export function getSpenderEntry(
  chainId: number,
  address: Address,
): SpenderEntry | undefined {
  return SPENDER_BY_CHAIN_ADDRESS.get(keyFor(chainId, address));
}

/** Returns tokens in the curated registry for a given chain. */
export function getTokensForChain(chainId: number): readonly TokenEntry[] {
  if (chainId === PULSECHAIN_TOKEN_REGISTRY[0]?.chainId) {
    return PULSECHAIN_TOKEN_REGISTRY;
  }
  if (chainId === MAINNET_TOKEN_REGISTRY[0]?.chainId) {
    return MAINNET_TOKEN_REGISTRY;
  }
  return TOKEN_REGISTRY.filter((t) => t.chainId === chainId);
}

/** Returns spenders in the curated registry for a given chain. */
export function getSpendersForChain(chainId: number): readonly SpenderEntry[] {
  if (chainId === PULSECHAIN_SPENDER_REGISTRY[0]?.chainId) {
    return PULSECHAIN_SPENDER_REGISTRY;
  }
  if (chainId === MAINNET_SPENDER_REGISTRY[0]?.chainId) {
    return MAINNET_SPENDER_REGISTRY;
  }
  return SPENDER_REGISTRY.filter((s) => s.chainId === chainId);
}
