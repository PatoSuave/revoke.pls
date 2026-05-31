import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/gas/route";
import {
  GAS_API_RATE_LIMIT,
  resetGasApiRateLimitForTests,
} from "@/lib/gas/gas-api-controls";
import { resetNativeUsdPriceCacheForTests } from "@/lib/gas/native-price";
import { resetOwlracleAdvisoryCacheForTests } from "@/lib/gas/owlracle-gas";

function rpcResponse(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/gas", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetGasApiRateLimitForTests();
    resetNativeUsdPriceCacheForTests();
    resetOwlracleAdvisoryCacheForTests();
    delete process.env.PULSECHAIN_RPC_URL;
    delete process.env.MAINNET_RPC_URL;
    delete process.env.OWLRACLE_API_KEY;
  });

  it("rejects unsupported chain IDs", async () => {
    const response = await GET(
      new Request("https://example.test/api/gas?chainId=12345"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.status).toBe("bad-request");
    expect(payload.supportedChainIds).toContain(369);
    expect(payload.supportedChainIds).toContain(1);
  });

  it("rate-limits repeated gas tracker requests by platform-forwarded client IP", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    let response: Response | null = null;
    for (let i = 0; i <= GAS_API_RATE_LIMIT.maxRequests; i += 1) {
      response = await GET(
        new Request("https://example.test/api/gas?chainId=369", {
          headers: {
            "cf-connecting-ip": `198.51.100.${i % 200}`,
            "x-forwarded-for": "203.0.113.70",
          },
        }),
      );
    }

    const payload = await response!.json();
    expect(response?.status).toBe(429);
    expect(payload.status).toBe("rate-limited");
    expect(response?.headers.get("Retry-After")).toBeTruthy();
    expect(response?.headers.get("X-RateLimit-Limit")).toBe(
      GAS_API_RATE_LIMIT.maxRequests.toString(),
    );
  });

  it("dedupes simultaneous PulseChain sample requests", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("api.owlracle.info")) {
        return new Response(
          JSON.stringify({
            timestamp: "2026-05-27T18:19:07.120Z",
            speeds: [{ acceptance: 0.35, gasPrice: 100 }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("api.coingecko.com")) {
        return Response.json({
          pulsechain: {
            usd: 0.00000695,
            last_updated_at: 1_779_927_849,
          },
        });
      }

      const body = JSON.parse(String(init?.body ?? "{}")) as {
        method?: string;
      };
      if (body.method === "eth_blockNumber") return rpcResponse("0x20");
      if (body.method === "eth_feeHistory") {
        return rpcResponse({
          oldestBlock: "0x20",
          baseFeePerGas: ["0x174876e800", "0x174876e800"],
          reward: [["0x0"]],
        });
      }
      return new Response("unknown method", { status: 400 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      GET(new Request("https://example.test/api/gas?chainId=369")),
      GET(new Request("https://example.test/api/gas?chainId=369")),
    ]);
    const [firstPayload, secondPayload] = await Promise.all([
      first.json(),
      second.json(),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstPayload.blockNumber).toBe("32");
    expect(secondPayload.blockNumber).toBe("32");
    expect(firstPayload.nativeTokenPriceUsd).toBe("$0.00000695");
    expect(firstPayload.typicalTransactions[0].costUsd).toBe("<$0.000001");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("returns gas data for Ethereum Mainnet without PulseChain advisory calls", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("api.coingecko.com")) {
        return Response.json({
          ethereum: {
            usd: 2020.8,
            last_updated_at: 1_779_927_985,
          },
        });
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        method?: string;
      };
      if (body.method === "eth_blockNumber") return rpcResponse("0x2a");
      if (body.method === "eth_feeHistory") {
        return rpcResponse({
          oldestBlock: "0x2a",
          baseFeePerGas: ["0x3b9aca00", "0x77359400"],
          reward: [["0x3b9aca00"]],
        });
      }
      return new Response("unknown method", { status: 400 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("https://example.test/api/gas?chainId=1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.available).toBe(true);
    expect(payload.chainId).toBe(1);
    expect(payload.chainName).toBe("Ethereum Mainnet");
    expect(payload.nativeCurrency).toBe("ETH");
    expect(payload.gasPriceGwei).toBe("3");
    expect(payload.advisory).toBeUndefined();
    expect(payload.nativeTokenPriceUsd).toBe("$2,020.80");
    expect(payload.nativeTokenPriceSource).toBe("coingecko-simple-price");
    expect(payload.typicalTransactions[0].costUsd).toBe("$0.1273");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns unavailable state without leaking RPC URLs when RPC fails", async () => {
    process.env.PULSECHAIN_RPC_URL = "https://secret.example/rpc?key=hidden";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("https://secret.example/rpc?key=hidden")),
    );

    const response = await GET(
      new Request("https://example.test/api/gas?chainId=369"),
    );
    const text = await response.text();
    const payload = JSON.parse(text);

    expect(response.status).toBe(200);
    expect(payload.available).toBe(false);
    expect(payload.source).toBe("unavailable");
    expect(text).not.toContain("secret.example");
    expect(text).not.toContain("hidden");
  });

  it("returns PulseChain gas data from eth_gasPrice fallback with advisory data", async () => {
    process.env.OWLRACLE_API_KEY = "hidden-owl-key";
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input, init) => {
        const url = String(input);
        if (url.includes("api.owlracle.info")) {
          return new Response(
            JSON.stringify({
              timestamp: "2026-05-27T18:19:07.120Z",
              avgTime: 10,
              avgTx: 40,
              speeds: [
                { acceptance: 0.35, gasPrice: 625_000 },
                { acceptance: 0.6, gasPrice: 750_000 },
                { acceptance: 0.9, gasPrice: 2_000_000 },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("api.coingecko.com")) {
          return Response.json({
            pulsechain: {
              usd: 0.00000695,
              last_updated_at: 1_779_927_849,
            },
          });
        }

        const body = JSON.parse(String(init?.body ?? "{}")) as {
          method?: string;
        };
        if (body.method === "eth_blockNumber") return rpcResponse("0x11");
        if (body.method === "eth_feeHistory") {
          return new Response("method not found", { status: 500 });
        }
        if (body.method === "eth_gasPrice") return rpcResponse("0x174876e800");
        return new Response("unknown method", { status: 400 });
      }),
    );

    const response = await GET(
      new Request("https://example.test/api/gas?chainId=369"),
    );
    const text = await response.text();
    const payload = JSON.parse(text);

    expect(response.status).toBe(200);
    expect(payload.available).toBe(true);
    expect(payload.chainId).toBe(369);
    expect(payload.blockNumber).toBe("17");
    expect(payload.gasPriceGwei).toBe("100");
    expect(payload.source).toBe("rpc-gas-price");
    expect(payload.typicalTransactions).toHaveLength(5);
    expect(payload.nativeTokenPriceUsd).toBe("$0.00000695");
    expect(payload.typicalTransactions[1].costUsd).toBe("<$0.000001");
    expect(payload.advisory.tiers).toHaveLength(3);
    expect(text).not.toContain("hidden-owl-key");
  });
});
