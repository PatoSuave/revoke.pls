import { afterEach, describe, expect, it, vi } from "vitest";

import { resetLifeboatSmartWalletRateLimitForTests } from "@/lib/lifeboat/smart-wallet-api-controls";
import { emptySmartWalletSummary } from "@/lib/lifeboat/smart-wallet";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

const discoverSmartWalletConfig = vi.hoisted(() => vi.fn());

vi.mock("@/lib/lifeboat/smart-wallet-server", () => ({
  discoverSmartWalletConfig,
  isSmartWalletDiagnosticChainId: (chainId: number) =>
    [1, 10, 56, 137, 369, 999, 8453, 42161].includes(chainId),
  smartWalletTimeoutSignal: (signal?: AbortSignal) => ({
    signal: signal ?? new AbortController().signal,
    cleanup: vi.fn(),
  }),
}));

afterEach(() => {
  resetLifeboatSmartWalletRateLimitForTests();
  discoverSmartWalletConfig.mockReset();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function completeSmartWalletResponse(chainId: number) {
  return {
    ok: true,
    status: "complete",
    chainId,
    chainName: "Ethereum Mainnet",
    owner: OWNER,
    riskLevel: "none_detected",
    evidence: [],
    summary: emptySmartWalletSummary(),
    warnings: [
      "This read-only diagnostic checks latest account code and Safe-compatible view methods only.",
    ],
    errors: [],
    missingConfig: [],
    supported: true,
    supportNotes: [],
  };
}

describe("Wallet Lifeboat smart-wallet route", () => {
  it("keeps invalid owners as bad requests before upstream calls", async () => {
    const response = await GET(
      new Request(
        "https://pulserevoke.test/api/lifeboat/smart-wallet?chainId=1&owner=nope",
        { headers: { "x-forwarded-for": "203.0.113.70" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(discoverSmartWalletConfig).not.toHaveBeenCalled();
  });

  it("rejects caller-controlled execution parameters", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/smart-wallet?chainId=1&owner=${OWNER}&exec=1`,
        { headers: { "x-forwarded-for": "203.0.113.71" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("view methods only");
    expect(discoverSmartWalletConfig).not.toHaveBeenCalled();
  });

  it("rate-limits repeated smart-wallet diagnostic requests", async () => {
    discoverSmartWalletConfig.mockImplementation(async ({ chainId }) =>
      completeSmartWalletResponse(chainId),
    );

    let response: Response | null = null;
    for (let i = 0; i < 31; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/lifeboat/smart-wallet?chainId=1&owner=${OWNER}`,
          { headers: { "x-forwarded-for": "203.0.113.72" } },
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
    expect(discoverSmartWalletConfig).toHaveBeenCalledTimes(30);
  });
});
