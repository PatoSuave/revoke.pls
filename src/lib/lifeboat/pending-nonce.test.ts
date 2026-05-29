import { describe, expect, it } from "vitest";

import {
  analyzePendingNonce,
  pendingNonceRiskLabel,
} from "@/lib/lifeboat/pending-nonce";

describe("Wallet Lifeboat pending nonce heuristic", () => {
  it("flags one pending nonce as possible activity", () => {
    const result = analyzePendingNonce({
      latestNonce: 10n,
      pendingNonce: 11n,
      checkedAt: "2026-05-29T20:00:00.000Z",
    });

    expect(result.riskLevel).toBe("possible");
    expect(result.summary.pendingTransactionCount).toBe(1);
    expect(result.evidence[0]).toMatchObject({
      latestNonce: "10",
      pendingNonce: "11",
      pendingTransactionCount: 1,
      checkedAt: "2026-05-29T20:00:00.000Z",
    });
  });

  it("flags multiple pending nonces as elevated activity", () => {
    const result = analyzePendingNonce({
      latestNonce: 5n,
      pendingNonce: 8n,
    });

    expect(result.riskLevel).toBe("elevated");
    expect(result.summary.pendingTransactionCount).toBe(3);
    expect(pendingNonceRiskLabel(result.riskLevel)).toBe(
      "Multiple pending nonces",
    );
  });

  it("keeps no gap wording conservative", () => {
    const result = analyzePendingNonce({
      latestNonce: 7n,
      pendingNonce: 7n,
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(result.evidence).toEqual([]);
    expect(pendingNonceRiskLabel(result.riskLevel)).toBe("No pending nonce gap");
    expect(result.warnings.join(" ").toLowerCase()).not.toContain("all clear");
  });
});
