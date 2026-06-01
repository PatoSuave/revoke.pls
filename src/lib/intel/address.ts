import { getAddress, isAddress } from "viem";

import type { IntelAddressValidation } from "./types";

export function validateIntelWalletAddress(
  input: string,
): IntelAddressValidation {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      ok: false,
      reason: "Enter a complete 0x EVM wallet address.",
    };
  }

  if (!isAddress(trimmed)) {
    return {
      ok: false,
      reason: "Use a complete 42-character 0x EVM address.",
    };
  }

  return {
    ok: true,
    normalizedAddress: getAddress(trimmed) as `0x${string}`,
  };
}

export function compactIntelAddress(address: `0x${string}`): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
