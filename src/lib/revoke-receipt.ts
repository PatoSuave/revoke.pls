export type RevokeReceiptKind = "erc20" | "nft-operator" | "nft-token";
export type RevokeReceiptStatus =
  | "pending"
  | "success"
  | "rejected"
  | "error";
export type RevokeReceiptVerificationState =
  | "confirmed-cleared"
  | "incomplete";

export interface RevokeReceiptCopy {
  title: string;
  body: string;
  method: string;
  verification: string;
}

export const TRANSACTION_SUBMITTED_INCOMPLETE_COPY =
  "Revoke.PLS submitted the transaction, but live verification could not be completed. View the transaction on the explorer and rescan this wallet.";

export const LIVE_VERIFICATION_INCOMPLETE_COPY =
  "Live verification incomplete. Rescan this wallet to verify the approval cleared.";

export const LIVE_VERIFICATION_CONFIRMED_COPY = "Confirmed cleared.";

export function getRevokeReceiptCopy({
  status,
  kind,
  verificationState = "incomplete",
}: {
  status: RevokeReceiptStatus;
  kind: RevokeReceiptKind;
  verificationState?: RevokeReceiptVerificationState;
}): RevokeReceiptCopy {
  const method = revokeMethodLabel(kind);
  const verification = verificationLabel(status, verificationState);

  if (status === "pending") {
    return {
      title: "Transaction submitted",
      body: TRANSACTION_SUBMITTED_INCOMPLETE_COPY,
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
  verificationState: RevokeReceiptVerificationState,
): string {
  if (verificationState === "confirmed-cleared") {
    return LIVE_VERIFICATION_CONFIRMED_COPY;
  }

  if (status === "pending") {
    return "Waiting for chain confirmation. Rescan this wallet after confirmation.";
  }

  if (status === "success") {
    return LIVE_VERIFICATION_INCOMPLETE_COPY;
  }

  return "Verification incomplete.";
}
