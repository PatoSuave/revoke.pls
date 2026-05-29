import { afterEach, describe, expect, it, vi } from "vitest";

import { resetLifeboatTimelineRateLimitForTests } from "@/lib/lifeboat/timeline-api-controls";
import { emptyTimelineSummary } from "@/lib/lifeboat/timeline";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

const discoverApprovalDrainTimeline = vi.hoisted(() => vi.fn());

vi.mock("@/lib/lifeboat/timeline-server", () => ({
  discoverApprovalDrainTimeline,
  isTimelineChainId: (chainId: number) =>
    [1, 10, 56, 137, 369, 999, 8453, 42161].includes(chainId),
  timelineTimeoutSignal: (signal?: AbortSignal) => ({
    signal: signal ?? new AbortController().signal,
    cleanup: vi.fn(),
  }),
}));

afterEach(() => {
  resetLifeboatTimelineRateLimitForTests();
  discoverApprovalDrainTimeline.mockReset();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function completeTimelineResponse(chainId: number) {
  return {
    ok: true,
    status: "complete",
    chainId,
    chainName: "Ethereum Mainnet",
    owner: OWNER,
    riskLevel: "none_detected",
    events: [],
    evidence: [],
    summary: emptyTimelineSummary(),
    warnings: [
      "This read-only timeline does not prove causation or identify an attacker.",
    ],
    errors: [],
    missingConfig: [],
  };
}

describe("Wallet Lifeboat approval-to-drain timeline route", () => {
  it("keeps invalid owners as bad requests before upstream calls", async () => {
    const response = await GET(
      new Request(
        "https://pulserevoke.test/api/lifeboat/timeline?chainId=1&owner=nope",
        { headers: { "x-forwarded-for": "203.0.113.60" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(discoverApprovalDrainTimeline).not.toHaveBeenCalled();
  });

  it("rejects caller-controlled history ranges", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/timeline?chainId=1&owner=${OWNER}&offset=5000`,
        { headers: { "x-forwarded-for": "203.0.113.61" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("bounded recent-history");
    expect(discoverApprovalDrainTimeline).not.toHaveBeenCalled();
  });

  it("rate-limits repeated timeline diagnostic requests", async () => {
    discoverApprovalDrainTimeline.mockImplementation(async ({ chainId }) =>
      completeTimelineResponse(chainId),
    );

    let response: Response | null = null;
    for (let i = 0; i < 21; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/lifeboat/timeline?chainId=1&owner=${OWNER}`,
          { headers: { "x-forwarded-for": "203.0.113.62" } },
        ),
      );
    }

    expect(response?.status).toBe(429);
    expectNoStore(response!);
    expect(response?.headers.get("Retry-After")).toBeTruthy();
    const body = await response!.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe("upstream-failure");
    expect(body.riskLevel).toBe("upstream_unavailable");
    expect(body.errors.join(" ")).toContain("rate limit");
    expect(discoverApprovalDrainTimeline).toHaveBeenCalledTimes(20);
  });
});
