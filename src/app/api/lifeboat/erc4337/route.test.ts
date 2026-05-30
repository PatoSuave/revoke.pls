import { afterEach, describe, expect, it, vi } from "vitest";

import { resetLifeboatErc4337RateLimitForTests } from "@/lib/lifeboat/erc4337-api-controls";
import { emptyErc4337Summary } from "@/lib/lifeboat/erc4337";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

const discoverErc4337Activity = vi.hoisted(() => vi.fn());

vi.mock("@/lib/lifeboat/erc4337-server", () => ({
  discoverErc4337Activity,
  isErc4337DiagnosticChainId: (chainId: number) =>
    [1, 10, 56, 137, 369, 999, 8453, 42161].includes(chainId),
  erc4337TimeoutSignal: (signal?: AbortSignal) => ({
    signal: signal ?? new AbortController().signal,
    cleanup: vi.fn(),
  }),
}));

afterEach(() => {
  resetLifeboatErc4337RateLimitForTests();
  discoverErc4337Activity.mockReset();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function completeErc4337Response(chainId: number) {
  return {
    ok: true,
    status: "complete",
    chainId,
    chainName: "Ethereum Mainnet",
    owner: OWNER,
    riskLevel: "none_detected",
    evidence: [],
    events: [],
    summary: emptyErc4337Summary(),
    warnings: [
      "This read-only diagnostic checks recent EntryPoint UserOperationEvent logs only.",
    ],
    errors: [],
    missingConfig: [],
    supported: true,
    supportNotes: [],
  };
}

describe("Wallet Lifeboat ERC-4337 route", () => {
  it("keeps invalid owners as bad requests before upstream calls", async () => {
    const response = await GET(
      new Request(
        "https://pulserevoke.test/api/lifeboat/erc4337?chainId=1&owner=nope",
        { headers: { "x-forwarded-for": "203.0.113.80" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(discoverErc4337Activity).not.toHaveBeenCalled();
  });

  it("rejects caller-controlled bundler or range parameters", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/erc4337?chainId=1&owner=${OWNER}&bundler=https://example.test`,
        { headers: { "x-forwarded-for": "203.0.113.81" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("bounded recent EntryPoint");
    expect(discoverErc4337Activity).not.toHaveBeenCalled();
  });

  it("rate-limits repeated ERC-4337 diagnostic requests", async () => {
    discoverErc4337Activity.mockImplementation(async ({ chainId }) =>
      completeErc4337Response(chainId),
    );

    let response: Response | null = null;
    for (let i = 0; i < 31; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/lifeboat/erc4337?chainId=1&owner=${OWNER}`,
          { headers: { "x-forwarded-for": "203.0.113.82" } },
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
    expect(discoverErc4337Activity).toHaveBeenCalledTimes(30);
  });
});
