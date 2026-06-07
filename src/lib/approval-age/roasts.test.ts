import { describe, expect, it } from "vitest";

import {
  containsSafetyClaim,
  generateApprovalRoasts,
  shouldRevealRoastLines,
} from "@/lib/approval-age/roasts";
import type { ApprovalAgeSummary } from "@/lib/approval-age/types";

const EMPTY_SUMMARY: ApprovalAgeSummary = {
  totalRows: 0,
  rowsWithAge: 0,
  rowsWithoutAge: 0,
  approvalsToday: 0,
  approvalsThirtyDaysPlus: 0,
  approvalsOneYearPlus: 0,
  ancientApprovals: 0,
  unlimitedApprovals: 0,
  nftOperatorApprovals: 0,
  unknownSpenders: 0,
};

function summary(overrides: Partial<ApprovalAgeSummary>): ApprovalAgeSummary {
  return {
    ...EMPTY_SUMMARY,
    totalRows: 5,
    rowsWithAge: 5,
    ...overrides,
  };
}

describe("approval age roasts", () => {
  it("generates a no-finding roast for empty active approval rows", () => {
    expect(generateApprovalRoasts(EMPTY_SUMMARY)).toEqual([
      "This scan gave the wallet nothing spicy to explain, just an empty approval stage.",
    ]);
  });

  it("generates ancient approval roasts", () => {
    expect(
      generateApprovalRoasts(
        summary({
          approvalsThirtyDaysPlus: 3,
          approvalsOneYearPlus: 3,
          ancientApprovals: 2,
        }),
      )[0],
    ).toContain("ancient approvals");
  });

  it("generates unlimited approval roasts", () => {
    expect(
      generateApprovalRoasts(summary({ unlimitedApprovals: 1 })).join(" "),
    ).toContain("unlimited approval");
  });

  it("generates NFT operator approval roasts", () => {
    expect(
      generateApprovalRoasts(summary({ nftOperatorApprovals: 2 })).join(" "),
    ).toContain("NFT operator approvals");
  });

  it("generates unknown-age roasts", () => {
    expect(
      generateApprovalRoasts(
        summary({
          rowsWithAge: 2,
          rowsWithoutAge: 3,
        }),
      ).join(" "),
    ).toContain("would not give up a timestamp");
  });

  it("keeps roast copy bounded and free of safety claims", () => {
    const cases = [
      EMPTY_SUMMARY,
      summary({
        approvalsToday: 1,
        approvalsThirtyDaysPlus: 6,
        approvalsOneYearPlus: 4,
        ancientApprovals: 2,
        unlimitedApprovals: 3,
        nftOperatorApprovals: 2,
        unknownSpenders: 5,
        rowsWithAge: 5,
        rowsWithoutAge: 1,
      }),
      summary({ unknownSpenders: 1 }),
    ];

    for (const item of cases) {
      const roasts = generateApprovalRoasts(item);
      expect(roasts.length).toBeGreaterThanOrEqual(1);
      expect(roasts.length).toBeLessThanOrEqual(5);
      expect(roasts.some(containsSafetyClaim)).toBe(false);
    }
  });

  it("keeps roast lines hidden before opt-in", () => {
    expect(shouldRevealRoastLines({ completed: false, optedIn: false })).toBe(
      false,
    );
    expect(shouldRevealRoastLines({ completed: true, optedIn: false })).toBe(
      false,
    );
    expect(shouldRevealRoastLines({ completed: true, optedIn: true })).toBe(
      true,
    );
  });
});
