import { getAddress, type Address } from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";

export interface TokenContractDexDeployment {
  chainId: number;
  dexId: string;
  label: string;
  version: "v1" | "v2";
  factory: Address;
  router: Address;
  wrappedNative: Address;
}

/**
 * Reviewed, chain-scoped deployments used only for read-only pair discovery and
 * eth_call simulation. A registry match confirms deployment identity, not that
 * a token or pool is safe.
 */
export const TOKEN_CONTRACT_DEX_DEPLOYMENTS = [
  {
    chainId: PULSECHAIN_CHAIN_ID,
    dexId: "pulsex",
    label: "PulseX V1",
    version: "v1",
    factory: getAddress("0x1715a3E4A142d8b698131108995174F37aEBA10D"),
    router: getAddress("0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02"),
    wrappedNative: getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27"),
  },
  {
    chainId: PULSECHAIN_CHAIN_ID,
    dexId: "pulsex",
    label: "PulseX V2",
    version: "v2",
    factory: getAddress("0x29eA7545DEf87022BAdc76323F373EA1e707C523"),
    router: getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9"),
    wrappedNative: getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27"),
  },
] as const satisfies readonly TokenContractDexDeployment[];

export function tokenContractDexDeploymentsForChain(
  chainId: number,
): readonly TokenContractDexDeployment[] {
  return TOKEN_CONTRACT_DEX_DEPLOYMENTS.filter(
    (deployment) => deployment.chainId === chainId,
  );
}
export function tokenContractDexDeploymentForFactory(
  chainId: number,
  factory: Address | null,
): TokenContractDexDeployment | null {
  if (!factory) return null;
  return (
    tokenContractDexDeploymentsForChain(chainId).find(
      (deployment) =>
        deployment.factory.toLowerCase() === factory.toLowerCase(),
    ) ?? null
  );
}
