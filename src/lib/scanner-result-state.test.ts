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

  it("warns when discovery is truncated while keeping verified rows individually revokable", () => {
    expect(
      getScanRevokeDisabledReason({
        status: "success",
        failedLiveReads: 0,
        discoveryTruncated: true,
        approvalLabel: "ERC-20",
      }),
    ).toBe(
      "ERC-20 discovery was truncated - verified rows can still be revoked one at a time.",
    );
  });

  it("warns when any live read failed while keeping verified rows individually revokable", () => {
    expect(
      getScanRevokeDisabledReason({
        status: "success",
        failedLiveReads: 2,
        discoveryTruncated: false,
        approvalLabel: "NFT",
      }),
    ).toBe(
      "2 live reads failed - verified rows can still be revoked one at a time.",
    );
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
        "2 live reads failed - verified rows can still be revoked one at a time.",
      ),
    ).toEqual({
      title:
        "Verification incomplete - current approval state could not be fully confirmed.",
      body: "Pulse Revoke found approval history, but some live contract reads failed. Visible active rows passed their own live verification and can still be revoked one at a time when wallet and chain checks pass. Batch revoke stays disabled while coverage is incomplete.",
      detail:
        "2 live reads failed - verified rows can still be revoked one at a time.",
    });
  });

  it("explains truncated discovery without claiming approval state", () => {
    expect(
      getRevokeDisabledNoticeCopy(
        "ERC-20 discovery was truncated - verified rows can still be revoked one at a time.",
      ),
    ).toEqual({
      title:
        "Verification incomplete - current approval state could not be fully confirmed.",
      body: "Pulse Revoke found approval history, but discovery ended before every candidate could be checked. Visible active rows passed their own live verification and can still be revoked one at a time when wallet and chain checks pass. Batch revoke stays disabled while coverage is incomplete.",
      detail:
        "ERC-20 discovery was truncated - verified rows can still be revoked one at a time.",
    });
  });

  it("does not use safe wording in verification-incomplete notice copy", () => {
    const notice = getRevokeDisabledNoticeCopy(
      "2 live reads failed - verified rows can still be revoked one at a time.",
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
