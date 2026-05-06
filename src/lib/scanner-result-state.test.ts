import { describe, expect, it } from "vitest";

import {
  getErc20ResultState,
  getScanRevokeDisabledReason,
} from "./scanner-result-state";

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
});
