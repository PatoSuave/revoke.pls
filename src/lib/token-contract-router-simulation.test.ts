import { describe, expect, it, vi } from "vitest";
import { getAddress, type Address } from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import { tokenContractDexDeploymentsForChain } from "@/lib/token-contract-dex-registry";
import {
  runTokenContractRouterSimulations,
  type TokenContractRouterSimulationDependencies,
} from "@/lib/token-contract-router-simulation";

const TOKEN = getAddress("0x1111111111111111111111111111111111111111");
const HOLDER = getAddress("0x2222222222222222222222222222222222222222");
const PAIR_V1 = getAddress("0x3333333333333333333333333333333333333333");
const PAIR_V2 = getAddress("0x4444444444444444444444444444444444444444");

describe("router-level token simulations", () => {
  it("runs bounded PulseX V1 and V2 buy and sell eth_call probes", async () => {
    const dependencies = simulationDependencies();
    const result = await runTokenContractRouterSimulations({
      chainId: PULSECHAIN_CHAIN_ID,
      tokenAddress: TOKEN,
      holder: HOLDER,
      holderBalance: "1000000",
      capturedBlock: 123n,
      pairs: pairCandidates(),
      dependencies,
    });

    expect(result.attempts).toHaveLength(4);
    expect(result.attempts.map((attempt) => attempt.kind)).toEqual([
      "router-buy",
      "router-sell",
      "router-buy",
      "router-sell",
    ]);
    expect(result.attempts.every((attempt) => attempt.status === "succeeded")).toBe(
      true,
    );
    expect(result.attempts.map((attempt) => attempt.routerVersion)).toEqual([
      "v1",
      "v1",
      "v2",
      "v2",
    ]);
    expect(dependencies.call).toHaveBeenCalledTimes(4);
    expect(dependencies.call).toHaveBeenCalledWith(
      expect.objectContaining({ value: expect.any(BigInt) }),
    );
  });

  it("reports missing balance and allowance as prerequisites instead of failed swaps", async () => {
    const dependencies = simulationDependencies({
      nativeBalance: 0n,
      allowance: 0n,
    });
    const result = await runTokenContractRouterSimulations({
      chainId: PULSECHAIN_CHAIN_ID,
      tokenAddress: TOKEN,
      holder: HOLDER,
      holderBalance: "1000000",
      capturedBlock: 123n,
      pairs: pairCandidates().slice(0, 1),
      dependencies,
    });

    expect(result.attempts).toEqual([
      expect.objectContaining({
        kind: "router-buy",
        status: "skipped",
        stage: "prerequisite",
      }),
      expect.objectContaining({
        kind: "router-sell",
        status: "skipped",
        stage: "allowance",
      }),
    ]);
    expect(dependencies.call).not.toHaveBeenCalled();
  });

  it("refuses to simulate through a router whose identity does not match", async () => {
    const dependencies = simulationDependencies({
      wrongFactory: getAddress("0x9999999999999999999999999999999999999999"),
    });
    const result = await runTokenContractRouterSimulations({
      chainId: PULSECHAIN_CHAIN_ID,
      tokenAddress: TOKEN,
      holder: HOLDER,
      holderBalance: "1000000",
      capturedBlock: 123n,
      pairs: pairCandidates().slice(0, 1),
      dependencies,
    });

    expect(result.attempts).toEqual([
      expect.objectContaining({ status: "skipped", stage: "router-validation" }),
      expect.objectContaining({ status: "skipped", stage: "router-validation" }),
    ]);
    expect(dependencies.call).not.toHaveBeenCalled();
  });
});

function pairCandidates() {
  const [v1, v2] = tokenContractDexDeploymentsForChain(PULSECHAIN_CHAIN_ID);
  return [
    {
      pair: {
        chainSlug: "pulsechain",
        dexId: "pulsex",
        labels: ["v1"],
        pairAddress: PAIR_V1,
        baseTokenAddress: TOKEN,
        quoteTokenAddress: v1.wrappedNative,
        liquidityUsd: null,
        pairCreatedAt: null,
        url: null,
      },
      factory: v1.factory,
    },
    {
      pair: {
        chainSlug: "pulsechain",
        dexId: "pulsex",
        labels: ["v2"],
        pairAddress: PAIR_V2,
        baseTokenAddress: TOKEN,
        quoteTokenAddress: v2.wrappedNative,
        liquidityUsd: null,
        pairCreatedAt: null,
        url: null,
      },
      factory: v2.factory,
    },
  ];
}

function simulationDependencies(
  options: {
    nativeBalance?: bigint;
    allowance?: bigint;
    wrongFactory?: Address;
  } = {},
): TokenContractRouterSimulationDependencies & {
  call: ReturnType<typeof vi.fn<TokenContractRouterSimulationDependencies["call"]>>;
} {
  const deployments = tokenContractDexDeploymentsForChain(PULSECHAIN_CHAIN_ID);
  const readContract = vi.fn<TokenContractRouterSimulationDependencies["readContract"]>(
    async ({ address, functionName }) => {
      if (functionName === "allowance") return options.allowance ?? 1_000_000n;
      const deployment = deployments.find(
        (candidate) => candidate.router.toLowerCase() === address.toLowerCase(),
      );
      if (!deployment) throw new Error("unexpected address");
      if (functionName === "factory") {
        return options.wrongFactory ?? deployment.factory;
      }
      if (functionName === "WPLS") return deployment.wrappedNative;
      throw new Error("unsupported getter");
    },
  );
  const call = vi.fn<TokenContractRouterSimulationDependencies["call"]>(
    async () => ({ data: "0x" }),
  );
  return {
    getBytecode: async () => "0x6000",
    readContract,
    getBalance: async () => options.nativeBalance ?? 1_000_000_000_000n,
    call,
  };
}
