import { describe, expect, it } from "vitest";

import {
  ageDaysFromTimestamp,
  buildApprovalAgeInfo,
  formatApprovalAge,
  getApprovalAgeBucket,
} from "@/lib/approval-age/format";

const DAY = 86_400;

describe("approval age formatting", () => {
  it("formats unavailable, today, yesterday, day, and year labels", () => {
    expect(formatApprovalAge()).toBe("Approval age unavailable");
    expect(formatApprovalAge(0)).toBe("Approved today");
    expect(formatApprovalAge(1)).toBe("Approved yesterday");
    expect(formatApprovalAge(19)).toBe("Approved 19 days ago");
    expect(formatApprovalAge(842)).toBe("Approved 2 years ago");
    expect(formatApprovalAge(1460)).toBe("Approved 4 years ago");
  });

  it("calculates approval age buckets at boundary values", () => {
    expect(getApprovalAgeBucket()).toBe("unknown");
    expect(getApprovalAgeBucket(0)).toBe("new");
    expect(getApprovalAgeBucket(29)).toBe("new");
    expect(getApprovalAgeBucket(30)).toBe("thirty_days_plus");
    expect(getApprovalAgeBucket(364)).toBe("thirty_days_plus");
    expect(getApprovalAgeBucket(365)).toBe("one_year_plus");
    expect(getApprovalAgeBucket(1094)).toBe("one_year_plus");
    expect(getApprovalAgeBucket(1095)).toBe("ancient");
  });

  it("derives clamped whole-day ages from unix timestamps", () => {
    expect(ageDaysFromTimestamp(1_000_000 - 19 * DAY, 1_000_000)).toBe(19);
    expect(ageDaysFromTimestamp(1_000_000 + DAY, 1_000_000)).toBe(0);
  });

  it("builds unavailable info without guessing a timestamp", () => {
    expect(
      buildApprovalAgeInfo({
        chainId: 369,
        approvalBlockNumber: 123n,
      }),
    ).toMatchObject({
      chainId: 369,
      approvalBlockNumber: 123n,
      bucket: "unknown",
      label: "Approval age unavailable",
      source: "unavailable",
    });
  });
});
