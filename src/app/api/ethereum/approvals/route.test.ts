import { afterEach, describe, expect, it } from "vitest";

import { resetEthereumApprovalApiRateLimitForTests } from "@/lib/ethereum-approval-api-controls";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

afterEach(() => {
  resetEthereumApprovalApiRateLimitForTests();
});

describe("Ethereum approvals API route hardening", () => {
  it("keeps invalid owners as bad requests before rate limiting", async () => {
    const response = await GET(
      new Request("https://pulserevoke.test/api/ethereum/approvals?owner=nope", {
        headers: { "x-forwarded-for": "203.0.113.1" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
  });

  it("rate-limits repeated public Ethereum scan requests as non-clear JSON", async () => {
    let response: Response | null = null;
    for (let i = 0; i < 21; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/ethereum/approvals?owner=${OWNER}`,
          { headers: { "x-forwarded-for": "203.0.113.2" } },
        ),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBeTruthy();
    const body = await response!.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe("upstream-failure");
    expect(body.diagnostics.rateLimited).toBe(true);
    expect(body.diagnostics.incompleteVerificationCount).toBeGreaterThan(0);
    expect(body.status).not.toBe("complete-clear");
  });
});
