import type { Address } from "viem";

import { mainnet, pulsechain } from "@/lib/chains";

import { validateAddresses, validateRequiredStrings } from "./validate";

/**
 * Functional classification for a spender contract. Drives optional UI
 * badges and is available to future risk rules (e.g. "unlimited approvals
 * on a bridge deserve extra caution"). Keep this union small and factual —
 * if you are not sure, use `"unknown"`.
 *
 *   router    — DEX router / swap aggregator entry contract
 *   dex       — DEX pair, LBP, or order-book contract
 *   bridge    — cross-chain bridge contract
 *   staking   — single-sided staking contract
 *   farm      — LP staking / yield farm contract
 *   permit2   — canonical Permit2 approval router
 *   unknown   — no category claim made
 */
export type SpenderCategory =
  | "router"
  | "dex"
  | "bridge"
  | "staking"
  | "farm"
  | "permit2"
  | "unknown";

/**
 * Metadata for a known spender contract.
 *
 * Entries are keyed by `(chainId, address)` so the same address can refer
 * to different spenders on different chains. Do not reuse a PulseChain entry
 * to label a look-alike Ethereum spender or vice versa without explicit
 * verification on each chain.
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
  chainId: number;
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
 * Curated PulseChain spender registry. Every entry has been manually
 * cross-checked on https://scan.pulsechain.com against the protocol's own
 * published documentation. `isTrusted: true` is used conservatively and
 * **only** means the address is confirmed canonical for the labeled
 * protocol — not that interacting with the protocol is risk-free.
 */
export const PULSECHAIN_SPENDER_REGISTRY: readonly SpenderEntry[] = [
  {
    chainId: pulsechain.id,
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
    chainId: pulsechain.id,
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

/**
 * Curated Ethereum mainnet spender registry. Focuses on the highest-volume
 * approval targets: Uniswap V2/V3 routers, the canonical Permit2, and
 * Uniswap's Universal Router. Each entry is cross-checked on Etherscan
 * against the protocol's official docs.
 */
export const MAINNET_SPENDER_REGISTRY: readonly SpenderEntry[] = [
  {
    chainId: mainnet.id,
    address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    label: "Uniswap V2 Router 02",
    protocol: "Uniswap",
    protocolSlug: "uniswap",
    category: "router",
    isTrusted: true,
    url: "https://uniswap.org",
    notes: "Canonical Uniswap V2 router (router02). Long-lived and widely approved.",
    verificationMethod:
      "Manual Etherscan cross-check against Uniswap deployments docs.",
    source: "https://docs.uniswap.org",
  },
  {
    chainId: mainnet.id,
    address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    label: "Uniswap V3 SwapRouter",
    protocol: "Uniswap",
    protocolSlug: "uniswap",
    category: "router",
    isTrusted: true,
    url: "https://uniswap.org",
    notes: "Canonical Uniswap V3 SwapRouter. Original v3 router address.",
    verificationMethod:
      "Manual Etherscan cross-check against Uniswap v3-periphery deployments.",
    source: "https://docs.uniswap.org",
  },
  {
    chainId: mainnet.id,
    address: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    label: "Uniswap V3 SwapRouter02",
    protocol: "Uniswap",
    protocolSlug: "uniswap",
    category: "router",
    isTrusted: true,
    url: "https://uniswap.org",
    notes:
      "Uniswap V3 SwapRouter02 (v3 with v2 compatibility). Common approval target for v3 swaps.",
    verificationMethod:
      "Manual Etherscan cross-check against Uniswap swap-router-contracts deployments.",
    source: "https://docs.uniswap.org",
  },
  {
    chainId: mainnet.id,
    address: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    label: "Permit2",
    protocol: "Uniswap",
    protocolSlug: "permit2",
    category: "permit2",
    isTrusted: true,
    url: "https://docs.uniswap.org/contracts/permit2/overview",
    notes:
      "Canonical Permit2 contract. An unlimited Permit2 approval delegates signed sub-approvals, which carry their own risk surface — review periodically.",
    verificationMethod:
      "Manual Etherscan cross-check against Uniswap permit2 repo deployments.",
    source: "https://docs.uniswap.org",
  },
  {
    chainId: mainnet.id,
    address: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    label: "Uniswap V3 NonfungiblePositionManager",
    protocol: "Uniswap",
    protocolSlug: "uniswap",
    category: "dex",
    isTrusted: true,
    url: "https://uniswap.org",
    notes:
      "Uniswap V3 position manager. Receives token approvals when minting/adjusting concentrated-liquidity positions.",
    verificationMethod:
      "Manual Etherscan cross-check against Uniswap v3-periphery deployments.",
    source: "https://docs.uniswap.org",
  },
] as const;

/** Combined flat view across every supported chain. */
export const SPENDER_REGISTRY: readonly SpenderEntry[] = [
  ...PULSECHAIN_SPENDER_REGISTRY,
  ...MAINNET_SPENDER_REGISTRY,
] as const;

// Dev-time sanity checks. Scoped per chain so that the same address appearing
// on two chains (legitimate) does not trip the duplicate-address check.
validateAddresses(PULSECHAIN_SPENDER_REGISTRY, "SPENDER_REGISTRY[pulsechain]");
validateAddresses(MAINNET_SPENDER_REGISTRY, "SPENDER_REGISTRY[mainnet]");
for (const s of SPENDER_REGISTRY) {
  validateRequiredStrings(
    s as unknown as Record<string, unknown>,
    ["label", "protocol", "category"],
    "SPENDER_REGISTRY",
    `${s.chainId}:${s.address}`,
  );
}
