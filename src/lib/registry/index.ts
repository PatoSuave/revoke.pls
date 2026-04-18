import type { Address } from "viem";

import { SPENDER_REGISTRY, type SpenderEntry } from "./spenders";
import { TOKEN_REGISTRY, type TokenEntry } from "./tokens";

export {
  TOKEN_REGISTRY,
  type TokenCategory,
  type TokenEntry,
} from "./tokens";
export {
  SPENDER_REGISTRY,
  type SpenderCategory,
  type SpenderEntry,
} from "./spenders";
export { RegistryValidationError } from "./validate";

const TOKEN_BY_ADDRESS = new Map<string, TokenEntry>(
  TOKEN_REGISTRY.map((t) => [t.address.toLowerCase(), t]),
);
const SPENDER_BY_ADDRESS = new Map<string, SpenderEntry>(
  SPENDER_REGISTRY.map((s) => [s.address.toLowerCase(), s]),
);

/** O(1) case-insensitive lookup for registry enrichment. */
export function getTokenEntry(address: Address): TokenEntry | undefined {
  return TOKEN_BY_ADDRESS.get(address.toLowerCase());
}

export function getSpenderEntry(address: Address): SpenderEntry | undefined {
  return SPENDER_BY_ADDRESS.get(address.toLowerCase());
}
