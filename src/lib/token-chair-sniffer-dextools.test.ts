import { describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

import {
  fetchDextoolsTokenChairData,
  resolveDextoolsConfig,
} from "@/lib/token-chair-sniffer-dextools";

const TOKEN = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PAIR = getAddress("0x80A6347EdAB7cF23e8472585d68ce04Eb0925be0");

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("DEXTools Token Chair provider", () => {
  it("stays disabled without a server-only API key", async () => {
    const fetchImpl = vi.fn();
    const result = await fetchDextoolsTokenChairData(TOKEN, {
      fetchImpl,
      env: {},
      pairAddress: PAIR,
    });

    expect(result.status).toBe("not-configured");
    expect(result.sourceLabel).toBe("DEXTools");
    expect(result.pairAddress).toBe(PAIR);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("ignores public DEXTools key names", () => {
    const config = resolveDextoolsConfig({
      NEXT_PUBLIC_DEXTOOLS_API_KEY: "public-key",
    });

    expect(config.configured).toBe(false);
    expect(config.warnings.join(" ")).toContain("server-only");
  });

  it("normalizes useful score, holder, market, and social fields", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            dextScore: 81.5,
            holders: 12345,
            website: "https://example.com",
            socials: {
              twitter: "https://x.com/example",
              telegram: "https://t.me/example",
            },
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { price: "0.0123" } }))
      .mockResolvedValueOnce(
        jsonResponse({ data: { liquidity: 250000, volume24h: 50000 } }),
      );

    const result = await fetchDextoolsTokenChairData(TOKEN, {
      fetchImpl,
      env: { DEXTOOLS_API_KEY: "test-key" },
      pairAddress: PAIR,
    });

    expect(result.status).toBe("success");
    expect(result.dextScore).toBe(81.5);
    expect(result.holderCount).toBe(12345);
    expect(result.priceUsd).toBe("0.0123");
    expect(result.liquidityUsd).toBe(250000);
    expect(result.volume24h).toBe(50000);
    expect(result.websiteUrl).toBe("https://example.com");
    expect(result.socials).toEqual([
      { label: "X", url: "https://x.com/example" },
      { label: "Telegram", url: "https://t.me/example" },
    ]);
  });

  it("returns rate-limited without failing the core scan path", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ message: "too many requests" }, { status: 429 }),
    );
    const result = await fetchDextoolsTokenChairData(TOKEN, {
      fetchImpl,
      env: { DEXTOOLS_API_KEY: "test-key" },
      pairAddress: PAIR,
    });

    expect(result.status).toBe("rate-limited");
    expect(result.errors.join(" ")).toContain("HTTP 429");
  });

  it("treats malformed JSON as unable to verify", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("{", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await fetchDextoolsTokenChairData(TOKEN, {
      fetchImpl,
      env: { DEXTOOLS_API_KEY: "test-key" },
      pairAddress: PAIR,
    });

    expect(result.status).toBe("unable-to-verify");
    expect(result.errors.join(" ")).toContain("could not be parsed");
  });
});
