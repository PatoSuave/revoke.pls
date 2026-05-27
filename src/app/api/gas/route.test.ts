import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/gas/route";
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
    resetOwlracleAdvisoryCacheForTests();
    delete process.env.PULSECHAIN_RPC_URL;
    delete process.env.OWLRACLE_API_KEY;
  });

  it("rejects unsupported chain IDs", async () => {
    const response = await GET(new Request("https://example.test/api/gas?chainId=1"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.status).toBe("bad-request");
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
    expect(payload.advisory.tiers).toHaveLength(3);
    expect(text).not.toContain("hidden-owl-key");
  });
});
