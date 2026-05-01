import { describe, expect, it } from "vitest";

import { getErc20ResultState } from "./scanner-result-state";

describe("ERC-20 scanner result state", () => {
  it("uses verification incomplete when no active approvals exist but allowance reads failed", () => {
    expect(
      getErc20ResultState({
        activeApprovals: 0,
        failedAllowanceReads: 103,
        discoveredPairs: 103,
      }),
    ).toBe("verification-incomplete");
  });

  it("uses clear for now when discovered approvals all verify as zero", () => {
    expect(
      getErc20ResultState({
        activeApprovals: 0,
        failedAllowanceReads: 0,
        discoveredPairs: 45,
      }),
    ).toBe("clear");
  });

  it("uses active state whenever verified nonzero approvals exist", () => {
    expect(
      getErc20ResultState({
        activeApprovals: 2,
        failedAllowanceReads: 103,
        discoveredPairs: 105,
      }),
    ).toBe("active");
  });
});
