import { describe, expect, it, vi } from "vitest";

import {
  fetchPulseChainGasData,
  fetchPulseChainGasSample,
} from "@/lib/gas/pulsechain-gas";

function rpcResponse(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("PulseChain gas RPC", () => {
  it("uses fee history when supported", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(rpcResponse("0xbc614e"))
      .mockResolvedValueOnce(
        rpcResponse({
          oldestBlock: "0xbc614e",
          baseFeePerGas: ["0x174876e800", "0x1d1a94a200"],
          reward: [["0x3b9aca00"]],
        }),
      );

    const sample = await fetchPulseChainGasSample({
      rpcUrl: "https://rpc.example",
      fetchFn,
    });

    expect(sample.blockNumber).toBe(12_345_678n);
    expect(sample.source).toBe("rpc-fee-history");
    expect(sample.baseFeeWei).toBe(125_000_000_000n);
    expect(sample.priorityFeeWei).toBe(1_000_000_000n);
    expect(sample.gasPriceWei).toBe(126_000_000_000n);
  });

  it("falls back to eth_gasPrice when fee history is unavailable", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(rpcResponse("0x10"))
      .mockRejectedValueOnce(new Error("method not found"))
      .mockResolvedValueOnce(rpcResponse("0x11"))
      .mockResolvedValueOnce(rpcResponse("0x174876e800"));

    const sample = await fetchPulseChainGasSample({
      rpcUrl: "https://rpc.example",
      fetchFn,
    });

    expect(sample.blockNumber).toBe(17n);
    expect(sample.source).toBe("rpc-gas-price");
    expect(sample.gasPriceWei).toBe(100_000_000_000n);
  });

  it("returns an unavailable API response without exposing RPC details", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(
      new Error("https://secret.example/rpc?key=do-not-leak failed"),
    );

    const response = await fetchPulseChainGasData({
      rpcUrl: "https://secret.example/rpc?key=do-not-leak",
      fetchFn,
    });

    expect(response.available).toBe(false);
    expect(response.source).toBe("unavailable");
    expect(JSON.stringify(response)).not.toContain("secret.example");
    expect(JSON.stringify(response)).not.toContain("do-not-leak");
  });
});
