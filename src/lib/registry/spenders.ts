import type { Address } from "viem";

import { validateAddresses, validateRequiredStrings } from "./validate";

/**
 * Functional classification for a spender contract. Drives optional UI
 * badges and is available to future risk rules (e.g. "unlimited approvals
 * on a bridge deserve extra caution"). Keep this union small and factual —
 * if you are not sure, use `"unknown"`.
 *
 *   router   — DEX router / swap aggregator entry contract
 *   dex      — DEX pair, LBP, or order-book contract
 *   bridge   — cross-chain bridge contract
 *   staking  — single-sided staking contract
 *   farm     — LP staking / yield farm contract
 *   unknown  — no category claim made
 */
export type SpenderCategory =
  | "router"
  | "dex"
  | "bridge"
  | "staking"
  | "farm"
  | "unknown";

/**
 * Metadata for a known spender contract on PulseChain.
 *
 * `label` is the display name for a specific contract (e.g. "PulseX Router v2").
 * `protocol` groups related contracts (e.g. all PulseX addresses share
 * protocol "PulseX"); `protocolSlug` is a short machine-friendly identifier
 * for URLs/badges.
 *
 * `isTrusted` is an explicit, conservative flag. It is only `true` when the
 * address has been manually cross-checked against the protocol's official
 * source and the contract is considered canonical. It is **not** a general
 * safety rating — it simply means "we know what this address is". A trusted
 * spender with an unlimited allowance is still worth reviewing.
 *
 * Provenance fields (`verificationMethod`, `source`, `lastReviewed`) are
 * **factual only**. Leave them absent rather than guessing. See
 * `src/lib/registry/README.md` for the review workflow.
 */
export interface SpenderEntry {
  address: Address;
  label: string;
  protocol: string;
  protocolSlug?: string;
  category: SpenderCategory;
  isTrusted: boolean;
  url?: string;
  notes?: string;
  /** How the address was verified (e.g. "Manual PulseScan cross-check"). */
  verificationMethod?: string;
  /** Source the address was pulled from (docs URL, official tweet, etc). */
  source?: string;
  /** Free-form note about when/how the entry was last reviewed. Leave
   *  absent if unknown — do not fabricate dates. */
  lastReviewed?: string;
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
 * Manual-verification TODO queue (candidates — verify address on PulseScan
 * against the protocol's own documentation before adding):
 *   - PulseX MasterChef v1 and v2 (farm staking; label per version)
 *   - Piteas DEX aggregator router
 *   - 9mm / 9inch DEX router(s)
 *   - PHUX / PHIAT router and vault contracts
 *   - Official PulseChain bridge contracts (ETH ↔ PLS legs, per direction)
 *   - Any NFT marketplace router that proxies approvals (e.g. Tangled, Rarible
 *     if deployed) — each needs its own entry once documented.
 *
 * All additions should be manually cross-checked on PulseScan before merging
 * and should set `isTrusted` and `category` accurately. See
 * `src/lib/registry/README.md` for the full checklist.
 */
export const SPENDER_REGISTRY: readonly SpenderEntry[] = [
  {
    address: "0x165C3410fC91EF562C50559f7d2289fEbed552d9",
    label: "PulseX Router v2",
    protocol: "PulseX",
    protocolSlug: "pulsex",
    category: "router",
    isTrusted: true,
    url: "https://pulsex.com",
    notes: "Canonical PulseX v2 router. Wraps swap, addLiquidity, removeLiquidity.",
    verificationMethod:
      "Manual PulseScan cross-check against pulsex.com documentation.",
    source: "https://pulsex.com",
  },
  {
    address: "0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02",
    label: "PulseX Router v1",
    protocol: "PulseX",
    protocolSlug: "pulsex",
    category: "router",
    isTrusted: true,
    url: "https://pulsex.com",
    notes: "Legacy PulseX v1 router. Still holds live approvals for older positions.",
    verificationMethod:
      "Manual PulseScan cross-check against pulsex.com documentation.",
    source: "https://pulsex.com",
  },
] as const;

// Dev-time sanity checks. See `./validate.ts` for behavior in production.
validateAddresses(SPENDER_REGISTRY, "SPENDER_REGISTRY");
for (const s of SPENDER_REGISTRY) {
  validateRequiredStrings(
    s as unknown as Record<string, unknown>,
    ["label", "protocol", "category"],
    "SPENDER_REGISTRY",
    s.address,
  );
}
