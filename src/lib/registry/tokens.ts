import type { Address } from "viem";

/**
 * Static metadata for a token in the curated PulseChain registry.
 *
 * `symbol`, `name`, and `decimals` are fallbacks — the scanner still prefers
 * on-chain metadata and only falls back to these fields when the ERC-20
 * metadata calls fail (e.g. non-standard tokens, bytes32 symbol/name, etc).
 */
export interface TokenEntry {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Curated PulseChain token registry.
 *
 * Only includes addresses that have been independently verified against
 * PulseScan. Expand as the MVP grows — prefer adding a small number of
 * high-confidence entries over a large unverified list.
 *
 * Manual-verification TODO queue (not yet in the registry):
 *   - Bridged stablecoins (USDC.e, USDT.e, DAI) from the official PulseChain bridge
 *   - eHEX vs pHEX disambiguation in UI copy
 *   - Additional blue-chip ecosystem tokens (e.g. PLSD, LOAN, TSFi)
 */
export const TOKEN_REGISTRY: readonly TokenEntry[] = [
  {
    address: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
    symbol: "WPLS",
    name: "Wrapped Pulse",
    decimals: 18,
  },
  {
    address: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
    symbol: "PLSX",
    name: "PulseX",
    decimals: 18,
  },
  {
    address: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    symbol: "HEX",
    name: "HEX",
    decimals: 8,
  },
  {
    address: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d",
    symbol: "INC",
    name: "Incentive",
    decimals: 18,
  },
] as const;
