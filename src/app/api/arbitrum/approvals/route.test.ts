import { afterEach, describe, expect, it } from "vitest";

import { resetArbitrumApprovalApiRateLimitForTests } from "@/lib/arbitrum-approval-api-controls";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

afterEach(() => {
  resetArbitrumApprovalApiRateLimitForTests();
});

describe("Arbitrum approvals API route hardening", () => {
  it("keeps invalid owners as bad requests before rate limiting", async () => {
    const response = await GET(
      new Request("https://pulserevoke.test/api/arbitrum/approvals?owner=nope", {
        headers: { "x-forwarded-for": "203.0.113.11" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
  });

  it("rejects non-Arbitrum chain IDs before discovery", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/arbitrum/approvals?owner=${OWNER}&chainId=1`,
        { headers: { "x-forwarded-for": "203.0.113.12" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("chainId=42161");
  });

  it("rejects caller-controlled Arbitrum discovery ranges", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/arbitrum/approvals?owner=${OWNER}&fromBlock=1`,
        { headers: { "x-forwarded-for": "203.0.113.14" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("server-bounded windows");
  });

  it("rate-limits repeated public Arbitrum scan requests as non-clear JSON", async () => {
    let response: Response | null = null;
    for (let i = 0; i < 21; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/arbitrum/approvals?owner=${OWNER}`,
          { headers: { "x-forwarded-for": "203.0.113.13" } },
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
