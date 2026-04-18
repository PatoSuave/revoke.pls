import type { Address } from "viem";

/**
 * Metadata for a known spender contract on PulseChain.
 *
 * `label` is the display name for a specific contract (e.g. "PulseX Router v2").
 * `protocol` groups related contracts (e.g. all PulseX addresses share
 * protocol "PulseX").
 */
export interface SpenderEntry {
  address: Address;
  label: string;
  protocol: string;
  /** Optional outbound link to the protocol's official site. */
  url?: string;
}

/**
 * Curated PulseChain spender registry.
 *
 * Only includes addresses independently verified against PulseScan. Every
 * entry here is something a user of the major PulseChain DEX may have
 * granted ERC-20 approvals to.
 *
 * Manual-verification TODO queue (not yet in the registry):
 *   - Additional DEX aggregator routers as they launch on PulseChain
 *   - Lending protocol debt/collateral managers
 *   - Staking / farm contracts once a verified list is available
 *   - Bridge contracts (PulseChain bridge, third-party bridges)
 *
 * All additions should be manually cross-checked on https://scan.pulsechain.com
 * before merging.
 */
export const SPENDER_REGISTRY: readonly SpenderEntry[] = [
  {
    address: "0x165C3410fC91EF562C50559f7d2289fEbed552d9",
    label: "PulseX Router v2",
    protocol: "PulseX",
    url: "https://pulsex.com",
  },
  {
    address: "0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02",
    label: "PulseX Router v1",
    protocol: "PulseX",
    url: "https://pulsex.com",
  },
] as const;
