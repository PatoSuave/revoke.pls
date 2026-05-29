import { afterEach, describe, expect, it, vi } from "vitest";

import { resetLifeboatPendingNonceRateLimitForTests } from "@/lib/lifeboat/pending-nonce-api-controls";
import { emptyPendingNonceSummary } from "@/lib/lifeboat/pending-nonce";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

const discoverPendingNonceActivity = vi.hoisted(() => vi.fn());

vi.mock("@/lib/lifeboat/pending-nonce-server", () => ({
  discoverPendingNonceActivity,
  isPendingNonceChainId: (chainId: number) =>
    [1, 10, 56, 137, 369, 999, 8453, 42161].includes(chainId),
  pendingNonceTimeoutSignal: (signal?: AbortSignal) => ({
    signal: signal ?? new AbortController().signal,
    cleanup: vi.fn(),
  }),
}));

afterEach(() => {
  resetLifeboatPendingNonceRateLimitForTests();
  discoverPendingNonceActivity.mockReset();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function completePendingNonceResponse(chainId: number) {
  return {
    ok: true,
    status: "complete",
    chainId,
    chainName: "Ethereum Mainnet",
    owner: OWNER,
    riskLevel: "none_detected",
    evidence: [],
    summary: emptyPendingNonceSummary(),
    warnings: [
      "This read-only nonce check cannot see every private transaction.",
    ],
    errors: [],
    missingConfig: [],
  };
}

describe("Wallet Lifeboat pending nonce route", () => {
  it("keeps invalid owners as bad requests before upstream calls", async () => {
    const response = await GET(
      new Request(
        "https://pulserevoke.test/api/lifeboat/pending-nonce?chainId=1&owner=nope",
        { headers: { "x-forwarded-for": "203.0.113.50" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(discoverPendingNonceActivity).not.toHaveBeenCalled();
  });

  it("rejects caller-controlled nonce tags", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/pending-nonce?chainId=1&owner=${OWNER}&blockTag=earliest`,
        { headers: { "x-forwarded-for": "203.0.113.51" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("latest and pending nonce only");
    expect(discoverPendingNonceActivity).not.toHaveBeenCalled();
  });

  it("rate-limits repeated pending nonce diagnostic requests", async () => {
    discoverPendingNonceActivity.mockImplementation(async ({ chainId }) =>
      completePendingNonceResponse(chainId),
    );

    let response: Response | null = null;
    for (let i = 0; i < 31; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/lifeboat/pending-nonce?chainId=1&owner=${OWNER}`,
          { headers: { "x-forwarded-for": "203.0.113.52" } },
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
    expect(discoverPendingNonceActivity).toHaveBeenCalledTimes(30);
  });
});
