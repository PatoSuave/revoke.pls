import { afterEach, describe, expect, it, vi } from "vitest";

import { resetLifeboatErc6909RateLimitForTests } from "@/lib/lifeboat/erc6909-api-controls";
import { emptyErc6909Summary } from "@/lib/lifeboat/erc6909";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

const discoverErc6909Approvals = vi.hoisted(() => vi.fn());

vi.mock("@/lib/lifeboat/erc6909-server", () => ({
  discoverErc6909Approvals,
  isErc6909DiagnosticChainId: (chainId: number) =>
    [1, 10, 56, 137, 369, 999, 8453, 42161].includes(chainId),
  erc6909TimeoutSignal: (signal?: AbortSignal) => ({
    signal: signal ?? new AbortController().signal,
    cleanup: vi.fn(),
  }),
}));

afterEach(() => {
  resetLifeboatErc6909RateLimitForTests();
  discoverErc6909Approvals.mockReset();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function completeErc6909Response(chainId: number) {
  return {
    ok: true,
    status: "complete",
    chainId,
    chainName: "Ethereum Mainnet",
    owner: OWNER,
    riskLevel: "none_detected",
    evidence: [],
    events: [],
    summary: emptyErc6909Summary(),
    warnings: [
      "This read-only diagnostic checks a bounded recent RPC log window.",
    ],
    errors: [],
    missingConfig: [],
    supported: true,
    supportNotes: [],
  };
}

describe("Wallet Lifeboat ERC-6909 route", () => {
  it("keeps invalid owners as bad requests before upstream calls", async () => {
    const response = await GET(
      new Request(
        "https://pulserevoke.test/api/lifeboat/erc6909?chainId=1&owner=nope",
        { headers: { "x-forwarded-for": "203.0.113.90" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(discoverErc6909Approvals).not.toHaveBeenCalled();
  });

  it("rejects caller-controlled ranges and write-like parameters", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/erc6909?chainId=1&owner=${OWNER}&setOperator=true`,
        { headers: { "x-forwarded-for": "203.0.113.91" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("bounded recent owner-topic");
    expect(discoverErc6909Approvals).not.toHaveBeenCalled();
  });

  it("rate-limits repeated ERC-6909 diagnostic requests", async () => {
    discoverErc6909Approvals.mockImplementation(async ({ chainId }) =>
      completeErc6909Response(chainId),
    );

    let response: Response | null = null;
    for (let i = 0; i < 31; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/lifeboat/erc6909?chainId=1&owner=${OWNER}`,
          { headers: { "x-forwarded-for": "203.0.113.92" } },
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
    expect(discoverErc6909Approvals).toHaveBeenCalledTimes(30);
  });
});
