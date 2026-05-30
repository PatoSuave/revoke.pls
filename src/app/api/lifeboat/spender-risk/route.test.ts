import { afterEach, describe, expect, it, vi } from "vitest";

import { resetLifeboatSpenderRiskRateLimitForTests } from "@/lib/lifeboat/spender-risk-api-controls";
import { emptySpenderRiskSummary } from "@/lib/lifeboat/spender-risk";
import { GET } from "./route";

const SPENDER = "0x1111111111111111111111111111111111111111";

const discoverSpenderContractRisk = vi.hoisted(() => vi.fn());

vi.mock("@/lib/lifeboat/spender-risk-server", () => ({
  discoverSpenderContractRisk,
  isSpenderRiskChainId: (chainId: number) =>
    [1, 10, 56, 137, 369, 999, 8453, 42161].includes(chainId),
  spenderRiskTimeoutSignal: (signal?: AbortSignal) => ({
    signal: signal ?? new AbortController().signal,
    cleanup: vi.fn(),
  }),
}));

afterEach(() => {
  resetLifeboatSpenderRiskRateLimitForTests();
  discoverSpenderContractRisk.mockReset();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function completeSpenderRiskResponse(chainId: number) {
  return {
    ok: true,
    status: "complete",
    chainId,
    chainName: "Ethereum Mainnet",
    riskLevel: "none_detected",
    evidence: [],
    spenders: [],
    summary: emptySpenderRiskSummary(),
    warnings: [
      "Unknown spender context is a review signal, not proof of malicious activity.",
    ],
    errors: [],
    missingConfig: [],
  };
}

describe("Wallet Lifeboat spender risk route", () => {
  it("rejects invalid spender addresses before upstream calls", async () => {
    const response = await GET(
      new Request(
        "https://pulserevoke.test/api/lifeboat/spender-risk?chainId=1&spender=nope",
        { headers: { "x-forwarded-for": "203.0.113.80" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(discoverSpenderContractRisk).not.toHaveBeenCalled();
  });

  it("rejects caller-controlled explorer parameters", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/spender-risk?chainId=1&spender=${SPENDER}&module=account`,
        { headers: { "x-forwarded-for": "203.0.113.81" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors.join(" ")).toContain("capped list");
    expect(discoverSpenderContractRisk).not.toHaveBeenCalled();
  });

  it("caps spender count", async () => {
    const url = new URL("https://pulserevoke.test/api/lifeboat/spender-risk");
    url.searchParams.set("chainId", "1");
    for (let i = 0; i < 21; i += 1) {
      url.searchParams.append(
        "spender",
        `0x${i.toString(16).padStart(40, "0")}`,
      );
    }

    const response = await GET(
      new Request(url, { headers: { "x-forwarded-for": "203.0.113.82" } }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.errors.join(" ")).toContain("at most 20");
    expect(discoverSpenderContractRisk).not.toHaveBeenCalled();
  });

  it("rate-limits repeated spender diagnostic requests", async () => {
    discoverSpenderContractRisk.mockImplementation(async ({ chainId }) =>
      completeSpenderRiskResponse(chainId),
    );

    let response: Response | null = null;
    for (let i = 0; i < 21; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/lifeboat/spender-risk?chainId=1&spender=${SPENDER}`,
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
    expect(body.errors.join(" ")).toContain("rate limit");
    expect(discoverSpenderContractRisk).toHaveBeenCalledTimes(20);
  });
});
