import { afterEach, describe, expect, it } from "vitest";

import { getGasTrackerChainConfig } from "@/lib/gas/gas-chains";
import { fetchEvmGasSample, resolveGasRpcUrl } from "@/lib/gas/evm-gas";

describe("generic EVM gas RPC config", () => {
  afterEach(() => {
    delete process.env.BSC_RPC_URL;
    delete process.env.NEXT_PUBLIC_BSC_RPC_URL;
  });

  it("prefers server-only RPC URLs over browser-visible fallbacks", () => {
    const chain = getGasTrackerChainConfig(56);
    if (!chain) throw new Error("BSC gas config missing.");

    process.env.BSC_RPC_URL = "https://server.example/rpc";
    process.env.NEXT_PUBLIC_BSC_RPC_URL = "https://public.example/rpc";

    expect(resolveGasRpcUrl(chain)).toBe("https://server.example/rpc");
  });

  it("falls back to public RPC URLs when server-only RPC is absent", () => {
    const chain = getGasTrackerChainConfig(56);
    if (!chain) throw new Error("BSC gas config missing.");

    process.env.NEXT_PUBLIC_BSC_RPC_URL = "https://public.example/rpc";

    expect(resolveGasRpcUrl(chain)).toBe("https://public.example/rpc");
  });

  it("falls back to eth_gasPrice when fee history returns a zero gas price", async () => {
    const chain = getGasTrackerChainConfig(10);
    if (!chain) throw new Error("Optimism gas config missing.");

    const fetchFn = async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { method: string };
      const resultByMethod: Record<string, unknown> = {
        eth_blockNumber: "0x2a",
        eth_feeHistory: {
          oldestBlock: "0x29",
          baseFeePerGas: ["0x0", "0x0"],
          reward: [["0x0"]],
        },
        eth_gasPrice: "0x3b9aca00",
      };

      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: resultByMethod[body.method],
        }),
        { status: 200 },
      );
    };

    const sample = await fetchEvmGasSample(chain, {
      rpcUrl: "https://rpc.example",
      fetchFn,
    });

    expect(sample).toMatchObject({
      blockNumber: 42n,
      gasPriceWei: 1_000_000_000n,
      source: "rpc-gas-price",
    });
  });
});
