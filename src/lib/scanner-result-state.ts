export type Erc20ResultState =
  | "active"
  | "verification-incomplete"
  | "clear"
  | "no-history";

export function hasIncompleteVerification(input: {
  failedLiveReads: number;
  discoveryTruncated: boolean;
}): boolean {
  return input.failedLiveReads > 0 || input.discoveryTruncated;
}

export function getErc20ResultState(input: {
  activeApprovals: number;
  failedAllowanceReads: number;
  discoveredPairs: number;
  discoveryTruncated?: boolean;
}): Erc20ResultState {
  if (input.activeApprovals > 0) return "active";
  if (
    hasIncompleteVerification({
      failedLiveReads: input.failedAllowanceReads,
      discoveryTruncated: input.discoveryTruncated ?? false,
    })
  ) {
    return "verification-incomplete";
  }
  if (input.discoveredPairs > 0) return "clear";
  return "no-history";
}

export function getScanRevokeDisabledReason(input: {
  status: "idle" | "pending" | "success" | "error";
  failedLiveReads: number;
  discoveryTruncated: boolean;
  approvalLabel: string;
}): string | null {
  if (input.status !== "success") {
    return "Scan has not completed - revoke unavailable.";
  }
  if (input.discoveryTruncated) {
    return `${input.approvalLabel} discovery was truncated - revoke unavailable until verification completes.`;
  }
  if (input.failedLiveReads > 0) {
    return `${input.failedLiveReads} live read${
      input.failedLiveReads === 1 ? "" : "s"
    } failed - revoke unavailable until verification completes.`;
  }
  return null;
}

export function getRevokeDisabledNoticeCopy(
  reason: string | null,
): { title: string; body: string; detail?: string } | null {
  if (!reason) return null;

  if (reason.includes("verification completes")) {
    const truncated = reason.toLowerCase().includes("truncated");

    return {
      title:
        "Verification incomplete - current approval state could not be fully confirmed.",
      body: truncated
        ? "Revoke.PLS found approval history, but discovery ended before every current approval state could be confirmed. Affected rows stay disabled because the app could not confirm whether the approval is active right now. Try rescanning; if the message remains, the explorer response may be capped or temporarily unavailable."
        : "Revoke.PLS found approval history, but some live contract reads failed. Those rows stay disabled because the app could not confirm whether the approval is active right now. Try rescanning; if the message remains, the token or NFT contract may be nonstandard, temporarily unavailable, or failing live approval reads.",
      detail: reason,
    };
  }

  if (reason.startsWith("Address scan mode")) {
    return {
      title: "Address scan mode",
      body: reason,
    };
  }

  if (reason.startsWith("Connected wallet does not match")) {
    return {
      title: "Wallet mismatch",
      body: reason,
    };
  }

  if (reason.startsWith("Switch to ")) {
    return {
      title: "Wrong network",
      body: reason,
    };
  }

  return {
    title: "Revoke unavailable",
    body: reason,
  };
}
