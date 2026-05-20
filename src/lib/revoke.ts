import type { Address } from "viem";

import { erc20Abi } from "@/lib/erc20";
import { PERMIT2_ADDRESS, permit2RevokeAbi } from "@/lib/permit2";

/**
 * The minimum amount of information needed to revoke a single ERC-20
 * approval. Deliberately decoupled from the richer `Approval` UI model so
 * this module stays reusable from places that don't have full metadata.
 *
 * `chainId` is required so each revoke broadcasts on the chain the approval
 * actually lives on, regardless of what the wallet is currently connected to.
 */
export interface RevokeTarget {
  chainId: number;
  tokenAddress: Address;
  spenderAddress: Address;
  approvalKind?: "erc20" | "permit2";
  approvalContractAddress?: Address;
}

export interface WalletRevokeGuardInput {
  connectedAddress: Address | undefined;
  ownerAddress: Address;
  walletChainId: number | undefined;
  targetChainId: number;
}

export function getWalletRevokeBlockReason({
  connectedAddress,
  ownerAddress,
  walletChainId,
  targetChainId,
}: WalletRevokeGuardInput): string | null {
  if (!connectedAddress) {
    return "Connect the wallet that owns this approval before revoking.";
  }

  if (connectedAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
    return "Connected wallet does not match the scanned owner address.";
  }

  if (walletChainId !== targetChainId) {
    return `Switch the connected wallet to chain ${targetChainId} before revoking.`;
  }

  return null;
}

/**
 * Build the `approve(spender, 0)` contract call used to revoke an ERC-20
 * allowance. Pure function — does not submit, does not simulate, does not
 * mutate any global state. Feed directly into `writeContract`.
 */
export function buildRevokeCall(target: RevokeTarget) {
  if (target.approvalKind === "permit2") {
    return {
      address: target.approvalContractAddress ?? PERMIT2_ADDRESS,
      abi: permit2RevokeAbi,
      functionName: "approve" as const,
      args: [target.tokenAddress, target.spenderAddress, 0n, 0n] as const,
    };
  }

  return {
    address: target.tokenAddress,
    abi: erc20Abi,
    functionName: "approve" as const,
    args: [target.spenderAddress, 0n] as const,
  };
}
