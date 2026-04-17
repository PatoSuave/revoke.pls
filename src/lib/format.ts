import type { Address } from "viem";

export function shortenAddress(address: Address | string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}
