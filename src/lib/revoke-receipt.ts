import type { PostRevokeVerificationState } from "@/lib/post-revoke-verification";
import {
  getChainConfirmationStrategy,
  type ConfirmationStrategy,
} from "@/lib/chain-capabilities";

export type RevokeReceiptKind = "erc20" | "nft-operator" | "nft-token";
export type RevokeReceiptVerificationState = PostRevokeVerificationState;
export type RevokeReceiptStatus =
  | "pending"
  | "success"
  | "rejected"
  | "error";

export interface RevokeReceiptCopy {
  title: string;
  body: string;
  method: string;
  verification: string;
}

export const TRANSACTION_SUBMITTED_INCOMPLETE_COPY =
  "Pulse Revoke submitted the transaction, but live verification could not be completed. View the transaction on the explorer and rescan this wallet.";

export const PRECONFIRM_TRANSACTION_SEEN_COPY =
  "Transaction seen. Waiting for standard confirmation and live approval re-check before updating the approval state.";

export const ROLLUP_FINALITY_AWARE_TRANSACTION_COPY =
  "Transaction submitted. Waiting for chain confirmation and live approval re-check before updating the approval state.";

export const HYPEREVM_DUAL_BLOCK_TRANSACTION_COPY =
  "Transaction submitted on HyperEVM. Waiting for EVM confirmation and live approval re-check before updating the approval state.";

export const LIVE_VERIFICATION_INCOMPLETE_COPY =
  "Live verification incomplete. Rescan this wallet to verify the approval cleared.";

export const LIVE_VERIFICATION_CONFIRMED_COPY = "Confirmed cleared.";

export function getRevokeReceiptCopy({
  status,
  kind,
  chainId,
  verificationState = "incomplete",
}: {
  status: RevokeReceiptStatus;
  kind: RevokeReceiptKind;
  chainId?: number;
  verificationState?: PostRevokeVerificationState;
}): RevokeReceiptCopy {
  const method = revokeMethodLabel(kind);
  const confirmationStrategy = getChainConfirmationStrategy(chainId);
  const verification = verificationLabel(status, verificationState, {
    confirmationStrategy,
  });

  if (status === "pending") {
    return {
      title: "Transaction submitted",
      body: pendingBodyForStrategy(confirmationStrategy),
      method,
      verification,
    };
  }

  if (status === "success") {
    return {
      title: "Revoke confirmed",
      body: revokeSummary(kind),
      method,
      verification,
    };
  }

  if (status === "rejected") {
    return {
      title: "User rejected transaction",
      body: "The wallet did not submit a revoke transaction.",
      method,
      verification,
    };
  }

  return {
    title: "Transaction failed",
    body: "The revoke transaction did not complete successfully. Review the wallet or explorer details before trying again.",
    method,
    verification,
  };
}

export function revokeMethodLabel(kind: RevokeReceiptKind): string {
  if (kind === "erc20") return "approve(spender, 0)";
  if (kind === "nft-operator") return "setApprovalForAll(operator, false)";
  return "approve(address(0), tokenId)";
}

export function revokeSummary(kind: RevokeReceiptKind): string {
  if (kind === "erc20") {
    return "This approval was revoked by setting the spender's allowance to zero.";
  }

  if (kind === "nft-operator") {
    return "This operator approval was revoked.";
  }

  return "This token-specific approval was revoked.";
}

function verificationLabel(
  status: RevokeReceiptStatus,
  verificationState: PostRevokeVerificationState,
  options: { confirmationStrategy?: ConfirmationStrategy } = {},
): string {
  if (status === "success" && verificationState === "confirmed-cleared") {
    return LIVE_VERIFICATION_CONFIRMED_COPY;
  }

  if (status === "pending") {
    if (
      options.confirmationStrategy ===
      "preconfirm-aware-receipt-plus-live-recheck"
    ) {
      return "Waiting for standard confirmation and live approval re-check.";
    }
    if (options.confirmationStrategy === "rollup-safe-finalized-aware") {
      return "Waiting for chain confirmation and live approval re-check.";
    }
    if (options.confirmationStrategy === "hyperevm-dual-block-awareness") {
      return "Waiting for HyperEVM EVM confirmation and live approval re-check.";
    }
    return "Waiting for chain confirmation. Rescan this wallet after confirmation.";
  }

  if (
    status === "success" &&
    (verificationState === "not-run" || verificationState === "pending")
  ) {
    if (
      options.confirmationStrategy ===
      "preconfirm-aware-receipt-plus-live-recheck"
    ) {
      return "Transaction confirmed. Re-checking approval state on-chain before marking it revoked.";
    }
    if (options.confirmationStrategy === "rollup-safe-finalized-aware") {
      return "Chain confirmation observed. Re-checking approval state on-chain before marking it revoked.";
    }
    if (options.confirmationStrategy === "hyperevm-dual-block-awareness") {
      return "HyperEVM EVM confirmation observed. Re-checking approval state on-chain before marking it revoked.";
    }
    return "Checking live approval state...";
  }

  if (status === "success") {
    return LIVE_VERIFICATION_INCOMPLETE_COPY;
  }

  return "Verification incomplete.";
}

function pendingBodyForStrategy(
  strategy: ConfirmationStrategy,
): string {
  if (strategy === "preconfirm-aware-receipt-plus-live-recheck") {
    return PRECONFIRM_TRANSACTION_SEEN_COPY;
  }
  if (strategy === "rollup-safe-finalized-aware") {
    return ROLLUP_FINALITY_AWARE_TRANSACTION_COPY;
  }
  if (strategy === "hyperevm-dual-block-awareness") {
    return HYPEREVM_DUAL_BLOCK_TRANSACTION_COPY;
  }
  return TRANSACTION_SUBMITTED_INCOMPLETE_COPY;
}
