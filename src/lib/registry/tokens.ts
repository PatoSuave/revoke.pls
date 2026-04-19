import type { Address } from "viem";

import {
  validateAddresses,
  validateDecimals,
  validateRequiredStrings,
} from "./validate";

/**
 * Broad classification for a registry token. Used by the UI to colour
 * badges and by potential future risk rules. Keep the union small and
 * factual — if you are not confident, use `"unknown"`.
 *
 *   native-wrapped — the canonical wrapper for the chain's native coin
 *   ecosystem     — a native PulseChain token issued by the ecosystem
 *   stablecoin    — native or bridged stablecoin
 *   bridged       — an asset bridged from another chain
 *   governance    — a token used primarily for governance
 *   unknown       — no claim made
 */
export type TokenCategory =
  | "native-wrapped"
  | "ecosystem"
  | "stablecoin"
  | "bridged"
  | "governance"
  | "unknown";

/**
 * Static metadata for a token in the curated PulseChain registry.
 *
 * `symbol`, `name`, and `decimals` are fallbacks — the scanner still prefers
 * on-chain metadata and only falls back to these fields when the ERC-20
 * metadata calls fail (e.g. non-standard tokens, bytes32 symbol/name, etc).
 *
 * Optional provenance fields (`source`, `lastReviewed`) are **factual only**.
 * Leave them absent rather than guessing. See `src/lib/registry/README.md`
 * for the review workflow.
 */
export interface TokenEntry {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  category: TokenCategory;
  /** Short human-readable note about the token. Optional. */
  notes?: string;
  /** Where the address was pulled from (docs URL, explorer tag, etc). */
  source?: string;
  /** Free-form note about when/how the entry was last reviewed. Leave
   *  absent if unknown — do not fabricate dates. */
  lastReviewed?: string;
}

/**
 * Curated PulseChain token registry.
 *
 * Only includes addresses that have been independently verified against
 * PulseScan. Expand as the MVP grows — prefer adding a small number of
 * high-confidence entries over a large unverified list.
 *
 * Manual-verification TODO queue (not yet in the registry):
 *   - PulseChain-native bridged assets (e.g. pDAI, pUSDC, pUSDT, pWETH)
 *     issued via the official PulseChain bridge — each needs its own entry
 *     separate from the fork-copied Ethereum mainnet contracts below.
 *   - eHEX vs pHEX disambiguation in UI copy.
 *   - Additional blue-chip ecosystem tokens (e.g. PLSD, LOAN, TSFi, PHUX,
 *     PHIAT) once a single canonical source of addresses is identified.
 *
 * About the "from ETH" entries below: PulseChain launched in May 2023 as a
 * full-state fork of Ethereum, so every ERC-20 that existed on Ethereum at
 * the snapshot block exists at the *same address* on PulseChain. Their
 * symbols and names are copied verbatim from Ethereum (the contract code is
 * identical). On-chain balances on PulseChain come from that fork snapshot
 * and have since diverged — the ETH-side peg mechanisms (MakerDAO for DAI,
 * Circle for USDC, Tether for USDT) do not apply on PulseChain. These tokens
 * do, however, still hold live PulseX approvals for fork-holders trading them,
 * which is why they earn their place in the registry.
 */
export const TOKEN_REGISTRY: readonly TokenEntry[] = [
  {
    address: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
    symbol: "WPLS",
    name: "Wrapped Pulse",
    decimals: 18,
    category: "native-wrapped",
    notes: "Canonical wrapped native coin for PulseChain.",
    source: "https://scan.pulsechain.com",
  },
  {
    address: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
    symbol: "PLSX",
    name: "PulseX",
    decimals: 18,
    category: "ecosystem",
    source: "https://pulsex.com",
  },
  {
    address: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    symbol: "HEX",
    name: "HEX",
    decimals: 8,
    category: "ecosystem",
    source: "https://scan.pulsechain.com",
  },
  {
    address: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d",
    symbol: "INC",
    name: "Incentive",
    decimals: 18,
    category: "ecosystem",
    source: "https://pulsex.com",
  },
  {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    category: "bridged",
    notes:
      "Fork-copied from Ethereum at PulseChain genesis. Same address and bytecode as Ethereum mainnet DAI; peg mechanism does not apply on PulseChain.",
    source: "https://scan.pulsechain.com",
  },
  {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    category: "bridged",
    notes:
      "Fork-copied from Ethereum at PulseChain genesis. Same address and bytecode as Ethereum mainnet USDC; Circle does not redeem on PulseChain.",
    source: "https://scan.pulsechain.com",
  },
  {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    category: "bridged",
    notes:
      "Fork-copied from Ethereum at PulseChain genesis. Same address and bytecode as Ethereum mainnet USDT; Tether does not redeem on PulseChain.",
    source: "https://scan.pulsechain.com",
  },
  {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    category: "bridged",
    notes:
      "Fork-copied from Ethereum at PulseChain genesis. Same address and bytecode as Ethereum mainnet WETH; wraps PulseChain-side ETH balances from the fork snapshot.",
    source: "https://scan.pulsechain.com",
  },
] as const;

// Dev-time sanity checks. See `./validate.ts` for behavior in production.
validateAddresses(TOKEN_REGISTRY, "TOKEN_REGISTRY");
for (const t of TOKEN_REGISTRY) {
  validateRequiredStrings(
    t as unknown as Record<string, unknown>,
    ["symbol", "name", "category"],
    "TOKEN_REGISTRY",
    t.address,
  );
  validateDecimals(t.decimals, "TOKEN_REGISTRY", t.address);
}
