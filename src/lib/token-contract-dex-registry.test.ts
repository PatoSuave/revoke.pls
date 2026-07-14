import { describe, expect, it } from "vitest";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import {
  tokenContractDexDeploymentForFactory,
  tokenContractDexDeploymentsForChain,
} from "@/lib/token-contract-dex-registry";

describe("token contract DEX deployment registry", () => {
  it("returns both reviewed PulseX generations with distinct routers", () => {
    const deployments = tokenContractDexDeploymentsForChain(
      PULSECHAIN_CHAIN_ID,
    );

    expect(deployments.map((deployment) => deployment.version)).toEqual([
      "v1",
      "v2",
    ]);
    expect(new Set(deployments.map((deployment) => deployment.router)).size).toBe(
      2,
    );
    expect(
      deployments.every(
        (deployment) =>
          deployment.wrappedNative === deployments[0].wrappedNative,
      ),
    ).toBe(true);
  });

  it("resolves a deployment only from its chain-scoped factory", () => {
    const [v1] = tokenContractDexDeploymentsForChain(PULSECHAIN_CHAIN_ID);

    expect(
      tokenContractDexDeploymentForFactory(PULSECHAIN_CHAIN_ID, v1.factory)
        ?.router,
    ).toBe(v1.router);
    expect(tokenContractDexDeploymentForFactory(1, v1.factory)).toBeNull();
  });
});
