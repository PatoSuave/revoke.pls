import type { Address } from "viem";

import { erc20Abi } from "@/lib/erc20";

/**
 * The minimum amount of information needed to revoke a single ERC-20
 * approval. Deliberately decoupled from the richer `Approval` UI model so
 * this module stays reusable from places that don't have full metadata.
 */
export interface RevokeTarget {
  tokenAddress: Address;
  spenderAddress: Address;
}

/**
 * Build the `approve(spender, 0)` contract call used to revoke an ERC-20
 * allowance. Pure function — does not submit, does not simulate, does not
 * mutate any global state. Feed directly into `writeContract`.
 */
export function buildRevokeCall(target: RevokeTarget) {
  return {
    address: target.tokenAddress,
    abi: erc20Abi,
    functionName: "approve" as const,
    args: [target.spenderAddress, 0n] as const,
  };
}
