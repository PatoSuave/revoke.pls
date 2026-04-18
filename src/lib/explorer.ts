import type { Address } from "viem";

import { pulsechain } from "@/lib/chains";

const EXPLORER_BASE = pulsechain.blockExplorers.default.url.replace(/\/$/, "");

export function explorerAddressUrl(address: Address | string): string {
  return `${EXPLORER_BASE}/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_BASE}/tx/${hash}`;
}
