export type ApprovalVerificationKind =
  | "erc20"
  | "permit2"
  | "nft-token"
  | "nft-operator";

export const CURRENT_APPROVAL_STATE_UNVERIFIED_TITLE =
  "Current state not verified";

export const CURRENT_APPROVAL_STATE_UNVERIFIED_BODY =
  "Pulse Revoke could not confirm this approval directly from the contract. The revoke button stays disabled until a live read confirms the approval is active.";

export const ZERO_ADDRESS_EXPLANATION_TITLE = "Zero address shown";

export const ZERO_ADDRESS_EXPLANATION_BODY =
  'The zero address usually represents "no approved address" when confirmed by a live contract read. This row is still marked unverified because Pulse Revoke could not complete the required live read.';

const VERIFICATION_METHOD_COPY: Record<ApprovalVerificationKind, string> = {
  erc20: "To verify this row, the app must read allowance(owner, spender).",
  permit2:
    "To verify this row, the app must read Permit2 allowance(owner, token, spender).",
  "nft-token":
    "To verify this row, the app must read getApproved(tokenId).",
  "nft-operator":
    "To verify this row, the app must read isApprovedForAll(owner, operator).",
};

export function getCurrentApprovalStateCopy(kind: ApprovalVerificationKind): {
  title: string;
  body: string;
  method: string;
} {
  return {
    title: CURRENT_APPROVAL_STATE_UNVERIFIED_TITLE,
    body: CURRENT_APPROVAL_STATE_UNVERIFIED_BODY,
    method: VERIFICATION_METHOD_COPY[kind],
  };
}

export function isCurrentApprovalStateUnverifiedReason(
  reason: string | null | undefined,
): boolean {
  if (!reason) return false;

  const normalized = reason.toLowerCase();
  if (normalized.includes("verified row; revoke available")) return false;
  if (normalized.includes("verified rows can still be revoked")) return false;

  return (
    normalized.includes("verification incomplete") ||
    normalized.includes("verification completes") ||
    normalized.includes("not fully verified") ||
    normalized.includes("live read")
  );
}
