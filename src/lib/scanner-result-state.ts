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
