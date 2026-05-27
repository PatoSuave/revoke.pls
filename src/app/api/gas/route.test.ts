import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/gas/route";

function rpcResponse(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/gas", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects unsupported chain IDs", async () => {
    const response = await GET(new Request("https://example.test/api/gas?chainId=1"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.status).toBe("bad-request");
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
    delete process.env.PULSECHAIN_RPC_URL;
  });

  it("returns PulseChain gas data from eth_gasPrice fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(rpcResponse("0x10"))
        .mockRejectedValueOnce(new Error("fee history unavailable"))
        .mockResolvedValueOnce(rpcResponse("0x11"))
        .mockResolvedValueOnce(rpcResponse("0x174876e800")),
    );

    const response = await GET(
      new Request("https://example.test/api/gas?chainId=369"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.available).toBe(true);
    expect(payload.chainId).toBe(369);
    expect(payload.blockNumber).toBe("17");
    expect(payload.gasPriceGwei).toBe("100");
    expect(payload.source).toBe("rpc-gas-price");
    expect(payload.typicalTransactions).toHaveLength(5);
  });
});
