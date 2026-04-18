import type { Address } from "viem";

/**
 * Metadata for a known spender contract on PulseChain.
 *
 * `label` is the display name for a specific contract (e.g. "PulseX Router v2").
 * `protocol` groups related contracts (e.g. all PulseX addresses share
 * protocol "PulseX").
 *
 * `isTrusted` is an explicit, conservative flag. It is only `true` when the
 * address has been manually cross-checked against the protocol's official
 * source and the contract is considered canonical. It is **not** a general
 * safety rating — it simply means "we know what this address is". A trusted
 * spender with an unlimited allowance is still worth reviewing.
 *
 * `notes` is a short, optional, human-readable description shown in UI
 * tooltips and detail views. `verifiedOn` documents provenance for the
 * trust claim (e.g. which source was used to verify the address).
 */
export interface SpenderEntry {
  address: Address;
  label: string;
  protocol: string;
  isTrusted: boolean;
  url?: string;
  notes?: string;
  verifiedOn?: string;
}

/**
 * Curated PulseChain spender registry.
 *
 * Every entry has been manually cross-checked on https://scan.pulsechain.com
 * against the protocol's own published documentation. `isTrusted: true` is
 * used conservatively and **only** means the address is confirmed canonical
 * for the labeled protocol — not that interacting with the protocol is
 * risk-free.
 *
 * Manual-verification TODO queue (not yet in the registry):
 *   - Additional DEX aggregator routers as they launch on PulseChain
 *   - Lending protocol debt/collateral managers
 *   - Staking / farm contracts once a verified list is available
 *   - Bridge contracts (PulseChain bridge, third-party bridges)
 *
 * All additions should be manually cross-checked on PulseScan before merging
 * and should set `isTrusted` accurately.
 */
export const SPENDER_REGISTRY: readonly SpenderEntry[] = [
  {
    address: "0x165C3410fC91EF562C50559f7d2289fEbed552d9",
    label: "PulseX Router v2",
    protocol: "PulseX",
    isTrusted: true,
    url: "https://pulsex.com",
    notes: "Canonical PulseX v2 router. Wraps swap, addLiquidity, removeLiquidity.",
    verifiedOn: "Manual PulseScan cross-check against pulsex.com documentation.",
  },
  {
    address: "0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02",
    label: "PulseX Router v1",
    protocol: "PulseX",
    isTrusted: true,
    url: "https://pulsex.com",
    notes: "Legacy PulseX v1 router. Still holds live approvals for older positions.",
    verifiedOn: "Manual PulseScan cross-check against pulsex.com documentation.",
  },
] as const;
