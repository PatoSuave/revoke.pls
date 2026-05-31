import { afterEach, describe, expect, it, vi } from "vitest";

import { resetLifeboatHexStakeRateLimitForTests } from "@/lib/lifeboat/hex-stake-api-controls";
import { emptyHexStakeSummary } from "@/lib/lifeboat/hex-stake";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

const discoverHexStakeStatus = vi.hoisted(() => vi.fn());

vi.mock("@/lib/lifeboat/hex-stake-server", () => ({
  discoverHexStakeStatus,
  hexStakeTimeoutSignal: (signal?: AbortSignal) => ({
    signal: signal ?? new AbortController().signal,
    cleanup: vi.fn(),
  }),
  isHexStakeDiagnosticChainId: (chainId: number) => chainId === 369,
}));

afterEach(() => {
  resetLifeboatHexStakeRateLimitForTests();
  discoverHexStakeStatus.mockReset();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function completeHexStakeResponse(chainId: number) {
  return {
    ok: true,
    status: "complete",
    chainId,
    chainName: "PulseChain",
    owner: OWNER,
    riskLevel: "none_detected",
    stakes: [],
    evidence: [],
    summary: emptyHexStakeSummary(),
    warnings: [
      "This read-only diagnostic does not run End Stake or Good Accounting.",
    ],
    errors: [],
    missingConfig: [],
    supported: true,
    supportNotes: [],
  };
}

describe("Wallet Lifeboat HEX stake route", () => {
  it("keeps invalid owners as bad requests before upstream calls", async () => {
    const response = await GET(
      new Request(
        "https://pulserevoke.test/api/lifeboat/hex-stake?chainId=369&owner=nope",
        { headers: { "x-forwarded-for": "203.0.113.80" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(discoverHexStakeStatus).not.toHaveBeenCalled();
  });

  it("rejects caller-controlled stake indexes and write-like params", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/hex-stake?chainId=369&owner=${OWNER}&goodAccounting=1`,
        { headers: { "x-forwarded-for": "203.0.113.81" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("read-only contract calls");
    expect(discoverHexStakeStatus).not.toHaveBeenCalled();
  });

  it("only supports PulseChain in the first safe pass", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/hex-stake?chainId=1&owner=${OWNER}`,
        { headers: { "x-forwarded-for": "203.0.113.82" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("chainId=369 only");
    expect(discoverHexStakeStatus).not.toHaveBeenCalled();
  });

  it("rate-limits repeated HEX stake diagnostic requests", async () => {
    discoverHexStakeStatus.mockImplementation(async ({ chainId }) =>
      completeHexStakeResponse(chainId),
    );

    let response: Response | null = null;
    for (let i = 0; i < 21; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/lifeboat/hex-stake?chainId=369&owner=${OWNER}`,
          { headers: { "x-forwarded-for": "203.0.113.83" } },
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
    expect(discoverHexStakeStatus).toHaveBeenCalledTimes(20);
  });
});
