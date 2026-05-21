import { describe, expect, it } from "vitest";

import {
  getErc20ResultState,
  getRevokeDisabledNoticeCopy,
  getScanRevokeDisabledReason,
} from "./scanner-result-state";
import { ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY } from "./scan-target";

describe("ERC-20 scanner result state", () => {
  it("uses verification incomplete when no active approvals exist but allowance reads failed", () => {
    expect(
      getErc20ResultState({
        activeApprovals: 0,
        failedAllowanceReads: 103,
        discoveredPairs: 103,
        discoveryTruncated: false,
      }),
    ).toBe("verification-incomplete");
  });

  it("uses verification incomplete when discovery is truncated and no active approvals exist", () => {
    expect(
      getErc20ResultState({
        activeApprovals: 0,
        failedAllowanceReads: 0,
        discoveredPairs: 45,
        discoveryTruncated: true,
      }),
    ).toBe("verification-incomplete");
  });

  it("uses clear for now when discovered approvals all verify as zero", () => {
    expect(
      getErc20ResultState({
        activeApprovals: 0,
        failedAllowanceReads: 0,
        discoveredPairs: 45,
        discoveryTruncated: false,
      }),
    ).toBe("clear");
  });

  it("uses active state whenever verified nonzero approvals exist", () => {
    expect(
      getErc20ResultState({
        activeApprovals: 2,
        failedAllowanceReads: 103,
        discoveredPairs: 105,
        discoveryTruncated: true,
      }),
    ).toBe("active");
  });

  it("disables revoke when discovery is truncated even with visible approvals", () => {
    expect(
      getScanRevokeDisabledReason({
        status: "success",
        failedLiveReads: 0,
        discoveryTruncated: true,
        approvalLabel: "ERC-20",
      }),
    ).toContain("truncated");
  });

  it("disables revoke when any live read failed", () => {
    expect(
      getScanRevokeDisabledReason({
        status: "success",
        failedLiveReads: 2,
        discoveryTruncated: false,
        approvalLabel: "NFT",
      }),
    ).toBe("2 live reads failed - revoke unavailable until verification completes.");
  });

  it("does not label wallet-only address scan state as verification incomplete", () => {
    expect(getRevokeDisabledNoticeCopy(ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY)).toEqual({
      title: "Address scan mode",
      body: ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY,
    });
  });

  it("keeps verification-incomplete reasons explicit and separate", () => {
    expect(
      getRevokeDisabledNoticeCopy(
        "2 live reads failed - revoke unavailable until verification completes.",
      ),
    ).toEqual({
      title:
        "Verification incomplete - current approval state could not be fully confirmed.",
      body: "Pulse Revoke found approval history, but some live contract reads failed. Those rows stay disabled because the app could not confirm whether the approval is active right now. Try rescanning; if the message remains, the token or NFT contract may be nonstandard, temporarily unavailable, or failing live approval reads.",
      detail:
        "2 live reads failed - revoke unavailable until verification completes.",
    });
  });

  it("explains truncated discovery without claiming approval state", () => {
    expect(
      getRevokeDisabledNoticeCopy(
        "ERC-20 discovery was truncated - revoke unavailable until verification completes.",
      ),
    ).toEqual({
      title:
        "Verification incomplete - current approval state could not be fully confirmed.",
      body: "Pulse Revoke found approval history, but discovery ended before every current approval state could be confirmed. Affected rows stay disabled because the app could not confirm whether the approval is active right now. Try rescanning; if the message remains, the explorer response may be capped or temporarily unavailable.",
      detail:
        "ERC-20 discovery was truncated - revoke unavailable until verification completes.",
    });
  });

  it("does not use safe wording in verification-incomplete notice copy", () => {
    const notice = getRevokeDisabledNoticeCopy(
      "2 live reads failed - revoke unavailable until verification completes.",
    );

    expect(`${notice?.title} ${notice?.body}`.toLowerCase()).not.toMatch(
      /\bsafe\b/,
    );
  });

  it("uses wrong-chain copy when a matching wallet is on the wrong chain", () => {
    expect(getRevokeDisabledNoticeCopy("Switch to BNB Smart Chain to revoke.")).toEqual({
      title: "Wrong network",
      body: "Switch to BNB Smart Chain to revoke.",
    });
  });
});
