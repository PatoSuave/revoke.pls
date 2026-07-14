import { afterEach, describe, expect, it } from "vitest";

import {
  acquireTokenContractReportDeepScan,
  resetTokenContractReportApiRateLimitForTests,
} from "@/lib/token-contract-report-api-controls";

afterEach(() => resetTokenContractReportApiRateLimitForTests());

describe("token contract deep scan controls", () => {
  it("permits only one in-flight scan per key", () => {
    const first = acquireTokenContractReportDeepScan("203.0.113.7", 1_000);
    expect(first.allowed).toBe(true);

    const second = acquireTokenContractReportDeepScan("203.0.113.7", 1_001);
    expect(second).toMatchObject({ allowed: false, reason: "in-flight" });

    if (first.allowed) first.release();
    expect(acquireTokenContractReportDeepScan("203.0.113.7", 1_002).allowed).toBe(
      true,
    );
  });

  it("limits deep scans to three starts per ten-minute window", () => {
    for (let index = 0; index < 3; index += 1) {
      const lease = acquireTokenContractReportDeepScan(
        "198.51.100.8",
        10_000 + index,
      );
      expect(lease.allowed).toBe(true);
      if (lease.allowed) lease.release();
    }

    expect(
      acquireTokenContractReportDeepScan("198.51.100.8", 10_004),
    ).toMatchObject({ allowed: false, reason: "rate-limited" });
    expect(
      acquireTokenContractReportDeepScan("198.51.100.8", 610_001).allowed,
    ).toBe(true);
  });
});
