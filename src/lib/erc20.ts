import { erc20Abi, formatUnits } from "viem";

export { erc20Abi };

/**
 * 2**256 - 1. What most wallets set when the user grants an "unlimited"
 * approval through legacy ERC-20 approve() flows.
 */
export const MAX_UINT256 = (1n << 256n) - 1n;

/**
 * Practical threshold for treating an allowance as effectively unlimited.
 * Some routers/approval flows set values slightly below max uint256 (e.g.
 * 2**96 - 1 for Uniswap Permit2 style flows, or 2**128). Anything >= 2**128
 * is far beyond any realistic token supply.
 */
export const UNLIMITED_THRESHOLD = 1n << 128n;

export function isUnlimitedAllowance(raw: bigint): boolean {
  return raw >= UNLIMITED_THRESHOLD;
}

/**
 * Format a raw ERC-20 allowance into a short, human-readable string.
 * Returns the string label only — unlimited handling is the caller's job.
 */
export function formatAllowance(raw: bigint, decimals: number): string {
  const str = formatUnits(raw, decimals);
  const [intPart, fracPart = ""] = str.split(".");
  const intAsBig = BigInt(intPart);
  const intFormatted = intAsBig.toLocaleString("en-US");

  const fracTrimmed = fracPart.slice(0, 4).replace(/0+$/, "");
  if (fracTrimmed) return `${intFormatted}.${fracTrimmed}`;
  if (intAsBig === 0n && fracPart.length > 0) return "~0";
  return intFormatted;
}
