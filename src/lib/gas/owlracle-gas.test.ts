import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchFreshOwlraclePulsechainAdvisory,
  parseOwlraclePulsechainAdvisory,
  resetOwlracleAdvisoryCacheForTests,
} from "@/lib/gas/owlracle-gas";

function jsonResponse(result: unknown, status = 200): Response {
  return new Response(JSON.stringify(result), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Owlracle PulseChain gas advisory", () => {
  afterEach(() => {
    resetOwlracleAdvisoryCacheForTests();
    delete process.env.OWLRACLE_API_KEY;
  });

  it("maps Owlracle gas speeds into low, medium, and high tiers", () => {
    const advisory = parseOwlraclePulsechainAdvisory({
      timestamp: "2026-05-27T18:19:07.120Z",
      avgTime: 10.25,
      avgTx: 40.8,
      speeds: [
        { acceptance: 0.9, gasPrice: 1_817_438.7019 },
        { acceptance: 0.35, gasPrice: 625_641.8319 },
        { acceptance: 0.6, gasPrice: 722_089.529 },
      ],
    });

    expect(advisory).toMatchObject({
      provider: "owlracle",
      updatedAt: "2026-05-27T18:19:07.120Z",
      avgBlockTimeSeconds: 10.25,
      avgTransactionsPerBlock: 40.8,
      tiers: [
        { label: "Low", acceptance: 0.35, gasPriceGwei: "625641.83" },
        { label: "Medium", acceptance: 0.6, gasPriceGwei: "722089.53" },
        { label: "High", acceptance: 0.9, gasPriceGwei: "1817438.7" },
      ],
    });
  });

  it("returns null when Owlracle data is unavailable or malformed", () => {
    expect(parseOwlraclePulsechainAdvisory({ speeds: [] })).toBeNull();
    expect(parseOwlraclePulsechainAdvisory({ speeds: [{}] })).toBeNull();
  });

  it("keeps the API key in the server-side request only", async () => {
    process.env.OWLRACLE_API_KEY = "secret-owl-key";
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        timestamp: "2026-05-27T18:19:07.120Z",
        speeds: [{ acceptance: 0.35, gasPrice: 625_641.8319 }],
      }),
    );

    const advisory = await fetchFreshOwlraclePulsechainAdvisory({ fetchFn });
    const requestedUrl = String(fetchFn.mock.calls[0][0]);

    expect(requestedUrl).toContain("apikey=secret-owl-key");
    expect(JSON.stringify(advisory)).not.toContain("secret-owl-key");
  });
});
