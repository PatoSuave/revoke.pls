import { afterEach, describe, expect, it } from "vitest";

import { getGasTrackerChainConfig } from "@/lib/gas/gas-chains";
import { resolveGasRpcUrl } from "@/lib/gas/evm-gas";

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
});
