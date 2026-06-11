import { describe, expect, it, vi } from "vitest";

import { parseDiscoveryResults, type ReadResult } from "./approvals";
import {
  AVALANCHE_CHAIN_ID,
  AVALANCHE_EXPLORER_API_DEFAULT,
  AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT,
  BASE_CHAIN_ID,
  BASE_EXPLORER_API_DEFAULT,
  BASE_EXPLORER_CHAIN_ID_DEFAULT,
  BSC_CHAIN_ID,
  BSC_DEPRECATED_V1_EXPLORER_API_URL,
  BSC_EXPLORER_CHAIN_ID_DEFAULT,
  BSC_EXPLORER_API_DEFAULT,
  BSC_HIGH_GAS_WARNING_THRESHOLD,
  BSC_OSAKA_MAX_TRANSACTION_GAS,
  MANTLE_CHAIN_ID,
  MANTLE_EXPLORER_API_DEFAULT,
  MANTLE_EXPLORER_CHAIN_ID_DEFAULT,
  POLYGON_CHAIN_ID,
  POLYGON_EXPLORER_API_DEFAULT,
  POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
  PULSECHAIN_CHAIN_ID,
  avalanche,
  base,
  bsc,
  getChainConfig,
  getSupportedChainShortNames,
  isSupportedChainId,
  mantle,
  polygon,
  supportedChainConfigList,
  supportedChains,
} from "./chains";
import { explorerAddressUrl, explorerTokenUrl, explorerTxUrl } from "./explorer";
import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "./arbitrum-approval-client";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "./ethereum-approval-client";
import { HYPEREVM_CLIENT_CHAIN_ID } from "./hyperevm-approval-client";
import { OPTIMISM_CLIENT_CHAIN_ID } from "./optimism-approval-client";
import {
  getSpenderEntry,
  getSpendersForChain,
  getTokensForChain,
} from "./registry";
import { buildRevokeCall } from "./revoke";
import { siteConfig } from "./site";
import type { DiscoveredPair } from "./discovery";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as const;
const TOKEN = "0x1111111111111111111111111111111111111111" as const;
const SPENDER = "0x2222222222222222222222222222222222222222" as const;
const PULSEX_ROUTER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9" as const;
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" as const;

function success(result: unknown): ReadResult {
  return { status: "success", result };
}

describe("supported chain config", () => {
  it("activates exactly the generic scan and revoke chains", () => {
    expect(supportedChains.map((chain) => chain.id)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
      POLYGON_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
    ]);
    expect(supportedChainConfigList.map((chain) => chain.chainId)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
      POLYGON_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
    ]);
    expect(supportedChainConfigList.map((chain) => chain.shortName)).toEqual([
      "PulseChain",
      "BSC",
      "Base",
      "Polygon",
      "Avalanche",
      "Mantle",
    ]);
    expect(getSupportedChainShortNames()).toBe(
      "PulseChain, BSC, Base, Polygon, Avalanche, or Mantle",
    );
    expect(isSupportedChainId(1)).toBe(false);
    expect(isSupportedChainId(ARBITRUM_ONE_CLIENT_CHAIN_ID)).toBe(false);
  });

  it("configures BSC identity, gas, standards, and API defaults", () => {
    const config = getChainConfig(BSC_CHAIN_ID);

    expect(config?.chainId).toBe(56);
    expect(config?.displayName).toBe("BNB Smart Chain");
    expect(config?.shortName).toBe("BSC");
    expect(config?.nativeSymbol).toBe("BNB");
    expect(config?.maxTransactionGas).toBe(BSC_OSAKA_MAX_TRANSACTION_GAS);
    expect(config?.highGasWarningThreshold).toBe(
      BSC_HIGH_GAS_WARNING_THRESHOLD,
    );
    expect(config?.standardLabels).toMatchObject({
      fungible: "BEP-20",
      nft: "BEP-721",
      multiToken: "BEP-1155",
    });
    expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
    expect(config?.discovery.apiProviderName).toBe("Etherscan API V2");
    expect(config?.explorer.baseUrl).toBe("https://bscscan.com");
    expect(config?.explorer.name).toBe("BscScan");
    expect(config?.discovery.apiUrl).toBe(BSC_EXPLORER_API_DEFAULT);
    expect(config?.discovery.apiChainId).toBe(BSC_EXPLORER_CHAIN_ID_DEFAULT);
    expect(config?.discovery.queryParams).toMatchObject({ chainid: "56" });
    expect(config?.discovery.apiUrlEnvVar).toBe(
      "NEXT_PUBLIC_BSC_EXPLORER_API_URL",
    );
    expect(config?.discovery.apiChainIdEnvVar).toBe(
      "NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID",
    );
    expect(config?.discovery.apiKeyEnvVar).toBe(
      "NEXT_PUBLIC_BSC_EXPLORER_API_KEY",
    );
    expect(config?.discovery.apiKeyEnvVars).toEqual([
      "NEXT_PUBLIC_BSC_EXPLORER_API_KEY",
      "NEXT_PUBLIC_BSCSCAN_API_KEY",
    ]);
    expect(bsc.id).toBe(56);
    expect(bsc.nativeCurrency.symbol).toBe("BNB");
  });

  it("configures Base identity, ETH gas, standards, and API defaults", () => {
    const config = getChainConfig(BASE_CHAIN_ID);

    expect(config?.chainId).toBe(8453);
    expect(config?.displayName).toBe("Base");
    expect(config?.shortName).toBe("Base");
    expect(config?.nativeSymbol).toBe("ETH");
    expect(config?.maxTransactionGas).toBeUndefined();
    expect(config?.highGasWarningThreshold).toBeUndefined();
    expect(config?.standardLabels).toMatchObject({
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
    });
    expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
    expect(config?.discovery.apiProviderName).toBe("Etherscan API V2");
    expect(config?.explorer.baseUrl).toBe("https://basescan.org");
    expect(config?.explorer.name).toBe("BaseScan");
    expect(config?.discovery.apiUrl).toBe(BASE_EXPLORER_API_DEFAULT);
    expect(config?.discovery.apiChainId).toBe(
      BASE_EXPLORER_CHAIN_ID_DEFAULT,
    );
    expect(config?.discovery.queryParams).toMatchObject({ chainid: "8453" });
    expect(config?.discovery.apiUrlEnvVar).toBe(
      "NEXT_PUBLIC_BASE_EXPLORER_API_URL",
    );
    expect(config?.discovery.apiChainIdEnvVar).toBe(
      "NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID",
    );
    expect(config?.discovery.apiKeyEnvVar).toBe(
      "NEXT_PUBLIC_BASE_EXPLORER_API_KEY",
    );
    expect(config?.discovery.apiKeyEnvVars).toEqual([
      "NEXT_PUBLIC_BASE_EXPLORER_API_KEY",
    ]);
    expect(base.id).toBe(8453);
    expect(base.nativeCurrency.symbol).toBe("ETH");
  });

  it("configures Polygon identity, POL gas, standards, and API defaults", () => {
    const config = getChainConfig(POLYGON_CHAIN_ID);

    expect(config?.chainId).toBe(137);
    expect(config?.displayName).toBe("Polygon");
    expect(config?.shortName).toBe("Polygon");
    expect(config?.nativeSymbol).toBe("POL");
    expect(config?.maxTransactionGas).toBeUndefined();
    expect(config?.highGasWarningThreshold).toBeUndefined();
    expect(config?.standardLabels).toMatchObject({
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
    });
    expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
    expect(config?.discovery.apiProviderName).toBe("Etherscan API V2");
    expect(config?.explorer.baseUrl).toBe("https://polygonscan.com");
    expect(config?.explorer.name).toBe("PolygonScan");
    expect(config?.rpc.defaultUrl).toBe("https://polygon.drpc.org");
    expect(config?.discovery.apiUrl).toBe(POLYGON_EXPLORER_API_DEFAULT);
    expect(config?.discovery.apiChainId).toBe(
      POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
    );
    expect(config?.discovery.queryParams).toMatchObject({ chainid: "137" });
    expect(config?.discovery.apiUrlEnvVar).toBe(
      "NEXT_PUBLIC_POLYGON_EXPLORER_API_URL",
    );
    expect(config?.discovery.apiChainIdEnvVar).toBe(
      "NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID",
    );
    expect(config?.discovery.apiKeyEnvVar).toBe(
      "NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY",
    );
    expect(config?.discovery.apiKeyEnvVars).toEqual([
      "NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY",
    ]);
    expect(polygon.id).toBe(137);
    expect(polygon.nativeCurrency.symbol).toBe("POL");
  });

  it("configures Avalanche identity, AVAX gas, standards, and API defaults", () => {
    const config = getChainConfig(AVALANCHE_CHAIN_ID);

    expect(config?.chainId).toBe(43114);
    expect(config?.displayName).toBe("Avalanche C-Chain");
    expect(config?.shortName).toBe("Avalanche");
    expect(config?.nativeSymbol).toBe("AVAX");
    expect(config?.maxTransactionGas).toBeUndefined();
    expect(config?.highGasWarningThreshold).toBeUndefined();
    expect(config?.standardLabels).toMatchObject({
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
    });
    expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
    expect(config?.discovery.apiProviderName).toBe("Etherscan API V2");
    expect(config?.explorer.baseUrl).toBe("https://snowscan.xyz");
    expect(config?.explorer.name).toBe("SnowScan");
    expect(config?.rpc.defaultUrl).toBe(
      "https://api.avax.network/ext/bc/C/rpc",
    );
    expect(config?.discovery.apiUrl).toBe(AVALANCHE_EXPLORER_API_DEFAULT);
    expect(config?.discovery.apiChainId).toBe(
      AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT,
    );
    expect(config?.discovery.queryParams).toMatchObject({ chainid: "43114" });
    expect(config?.discovery.apiUrlEnvVar).toBe(
      "NEXT_PUBLIC_AVALANCHE_EXPLORER_API_URL",
    );
    expect(config?.discovery.apiChainIdEnvVar).toBe(
      "NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID",
    );
    expect(config?.discovery.apiKeyEnvVar).toBe(
      "NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY",
    );
    expect(config?.discovery.apiKeyEnvVars).toEqual([
      "NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY",
    ]);
    expect(avalanche.id).toBe(43114);
    expect(avalanche.nativeCurrency.symbol).toBe("AVAX");
  });

  it("configures Mantle identity, MNT gas, standards, and API defaults", () => {
    const config = getChainConfig(MANTLE_CHAIN_ID);

    expect(config?.chainId).toBe(5000);
    expect(config?.displayName).toBe("Mantle");
    expect(config?.shortName).toBe("Mantle");
    expect(config?.nativeSymbol).toBe("MNT");
    expect(config?.maxTransactionGas).toBeUndefined();
    expect(config?.highGasWarningThreshold).toBeUndefined();
    expect(config?.standardLabels).toMatchObject({
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
    });
    expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
    expect(config?.discovery.apiProviderName).toBe("Etherscan API V2");
    expect(config?.explorer.baseUrl).toBe("https://explorer.mantle.xyz");
    expect(config?.explorer.name).toBe("Mantle Explorer");
    expect(config?.rpc.defaultUrl).toBe("https://rpc.mantle.xyz");
    expect(config?.discovery.apiUrl).toBe(MANTLE_EXPLORER_API_DEFAULT);
    expect(config?.discovery.apiChainId).toBe(
      MANTLE_EXPLORER_CHAIN_ID_DEFAULT,
    );
    expect(config?.discovery.queryParams).toMatchObject({ chainid: "5000" });
    expect(config?.discovery.apiUrlEnvVar).toBe(
      "NEXT_PUBLIC_MANTLE_EXPLORER_API_URL",
    );
    expect(config?.discovery.apiChainIdEnvVar).toBe(
      "NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID",
    );
    expect(config?.discovery.apiKeyEnvVar).toBe(
      "NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY",
    );
    expect(config?.discovery.apiKeyEnvVars).toEqual([
      "NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY",
    ]);
    expect(mantle.id).toBe(5000);
    expect(mantle.nativeCurrency.symbol).toBe("MNT");
  });

  it("keeps PulseChain gas and explorer labels intact", () => {
    const config = getChainConfig(PULSECHAIN_CHAIN_ID);

    expect(config?.nativeSymbol).toBe("PLS");
    expect(config?.maxTransactionGas).toBeUndefined();
    expect(config?.highGasWarningThreshold).toBeUndefined();
    expect(config?.explorer.name).toBe("PulseScan");
    expect(config?.standardLabels.fungible).toBe("PRC-20");
  });

  it("builds BscScan explorer links", () => {
    expect(explorerAddressUrl(BSC_CHAIN_ID, SPENDER)).toBe(
      `https://bscscan.com/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(BSC_CHAIN_ID, TOKEN)).toBe(
      `https://bscscan.com/token/${TOKEN}`,
    );
    expect(explorerTxUrl(BSC_CHAIN_ID, "0xabc")).toBe(
      "https://bscscan.com/tx/0xabc",
    );
  });

  it("builds BaseScan explorer links", () => {
    expect(explorerAddressUrl(BASE_CHAIN_ID, SPENDER)).toBe(
      `https://basescan.org/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(BASE_CHAIN_ID, TOKEN)).toBe(
      `https://basescan.org/token/${TOKEN}`,
    );
    expect(explorerTxUrl(BASE_CHAIN_ID, "0xabc")).toBe(
      "https://basescan.org/tx/0xabc",
    );
  });

  it("builds PolygonScan explorer links", () => {
    expect(explorerAddressUrl(POLYGON_CHAIN_ID, SPENDER)).toBe(
      `https://polygonscan.com/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(POLYGON_CHAIN_ID, TOKEN)).toBe(
      `https://polygonscan.com/token/${TOKEN}`,
    );
    expect(explorerTxUrl(POLYGON_CHAIN_ID, "0xabc")).toBe(
      "https://polygonscan.com/tx/0xabc",
    );
  });

  it("builds SnowScan explorer links", () => {
    expect(explorerAddressUrl(AVALANCHE_CHAIN_ID, SPENDER)).toBe(
      `https://snowscan.xyz/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(AVALANCHE_CHAIN_ID, TOKEN)).toBe(
      `https://snowscan.xyz/token/${TOKEN}`,
    );
    expect(explorerTxUrl(AVALANCHE_CHAIN_ID, "0xabc")).toBe(
      "https://snowscan.xyz/tx/0xabc",
    );
  });

  it("builds Mantle explorer links", () => {
    expect(explorerAddressUrl(MANTLE_CHAIN_ID, SPENDER)).toBe(
      `https://explorer.mantle.xyz/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(MANTLE_CHAIN_ID, TOKEN)).toBe(
      `https://explorer.mantle.xyz/token/${TOKEN}`,
    );
    expect(explorerTxUrl(MANTLE_CHAIN_ID, "0xabc")).toBe(
      "https://explorer.mantle.xyz/tx/0xabc",
    );
  });

  it("builds Etherscan links for wallet-only Ethereum revokes without activating Ethereum", () => {
    expect(isSupportedChainId(ETHEREUM_MAINNET_CLIENT_CHAIN_ID)).toBe(false);
    expect(explorerAddressUrl(ETHEREUM_MAINNET_CLIENT_CHAIN_ID, SPENDER)).toBe(
      `https://etherscan.io/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(ETHEREUM_MAINNET_CLIENT_CHAIN_ID, TOKEN)).toBe(
      `https://etherscan.io/token/${TOKEN}`,
    );
    expect(explorerTxUrl(ETHEREUM_MAINNET_CLIENT_CHAIN_ID, "0xabc")).toBe(
      "https://etherscan.io/tx/0xabc",
    );
  });

  it("builds Arbiscan links for separate-lane Arbitrum without activating Arbitrum", () => {
    expect(isSupportedChainId(ARBITRUM_ONE_CLIENT_CHAIN_ID)).toBe(false);
    expect(explorerAddressUrl(ARBITRUM_ONE_CLIENT_CHAIN_ID, SPENDER)).toBe(
      `https://arbiscan.io/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(ARBITRUM_ONE_CLIENT_CHAIN_ID, TOKEN)).toBe(
      `https://arbiscan.io/token/${TOKEN}`,
    );
    expect(explorerTxUrl(ARBITRUM_ONE_CLIENT_CHAIN_ID, "0xabc")).toBe(
      "https://arbiscan.io/tx/0xabc",
    );
  });

  it("builds Optimistic Etherscan links for separate-lane Optimism without activating Optimism", () => {
    expect(isSupportedChainId(OPTIMISM_CLIENT_CHAIN_ID)).toBe(false);
    expect(explorerAddressUrl(OPTIMISM_CLIENT_CHAIN_ID, SPENDER)).toBe(
      `https://optimistic.etherscan.io/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(OPTIMISM_CLIENT_CHAIN_ID, TOKEN)).toBe(
      `https://optimistic.etherscan.io/token/${TOKEN}`,
    );
    expect(explorerTxUrl(OPTIMISM_CLIENT_CHAIN_ID, "0xabc")).toBe(
      "https://optimistic.etherscan.io/tx/0xabc",
    );
  });

  it("builds Hyperevmscan links for separate-lane HyperEVM without activating HyperEVM", () => {
    expect(isSupportedChainId(HYPEREVM_CLIENT_CHAIN_ID)).toBe(false);
    expect(explorerAddressUrl(HYPEREVM_CLIENT_CHAIN_ID, SPENDER)).toBe(
      `https://hyperevmscan.io/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(HYPEREVM_CLIENT_CHAIN_ID, TOKEN)).toBe(
      `https://hyperevmscan.io/token/${TOKEN}`,
    );
    expect(explorerTxUrl(HYPEREVM_CLIENT_CHAIN_ID, "0xabc")).toBe(
      "https://hyperevmscan.io/tx/0xabc",
    );
  });

  it("does not leak PulseChain registry labels onto BSC", () => {
    expect(getSpenderEntry(PULSECHAIN_CHAIN_ID, PULSEX_ROUTER)?.label).toBe(
      "PulseX Router v2",
    );
    expect(getSpenderEntry(BSC_CHAIN_ID, PULSEX_ROUTER)).toBeUndefined();
  });

  it("does not leak PulseChain or BSC registry labels onto Base", () => {
    expect(getSpenderEntry(BASE_CHAIN_ID, PULSEX_ROUTER)).toBeUndefined();
    expect(getTokensForChain(BASE_CHAIN_ID)).toEqual([]);
    expect(getSpendersForChain(BASE_CHAIN_ID)).toEqual([]);
  });

  it("does not leak PulseChain, BSC, or Base registry labels onto Polygon", () => {
    expect(getSpenderEntry(POLYGON_CHAIN_ID, PULSEX_ROUTER)).toBeUndefined();
    expect(getTokensForChain(POLYGON_CHAIN_ID)).toEqual([]);
    expect(getSpendersForChain(POLYGON_CHAIN_ID)).toEqual([]);
  });

  it("does not leak existing registry labels onto Avalanche or Mantle", () => {
    for (const chainId of [AVALANCHE_CHAIN_ID, MANTLE_CHAIN_ID]) {
      expect(getSpenderEntry(chainId, PULSEX_ROUTER)).toBeUndefined();
      expect(getTokensForChain(chainId)).toEqual([]);
      expect(getSpendersForChain(chainId)).toEqual([]);
    }
  });

  it("does not expose dormant Ethereum registries through active lookup helpers", () => {
    expect(isSupportedChainId(1)).toBe(false);
    expect(getSpenderEntry(1, UNISWAP_ROUTER)).toBeUndefined();
    expect(getTokensForChain(1)).toEqual([]);
    expect(getSpendersForChain(1)).toEqual([]);
  });

  it("builds a BEP-20-compatible revoke call with approve(spender, 0)", () => {
    const request = {
      ...buildRevokeCall({
        chainId: BSC_CHAIN_ID,
        tokenAddress: TOKEN,
        spenderAddress: SPENDER,
      }),
      chainId: BSC_CHAIN_ID,
    };

    expect(request).toMatchObject({
      address: TOKEN,
      functionName: "approve",
      args: [SPENDER, 0n],
    });
  });

  it("builds a PulseChain PRC-20-compatible revoke call with chainId 369", () => {
    const request = {
      ...buildRevokeCall({
        chainId: PULSECHAIN_CHAIN_ID,
        tokenAddress: TOKEN,
        spenderAddress: SPENDER,
      }),
      chainId: PULSECHAIN_CHAIN_ID,
    };

    expect(request).toMatchObject({
      address: TOKEN,
      functionName: "approve",
      args: [SPENDER, 0n],
    });
  });

  it("builds a Base ERC-20-compatible revoke call with approve(spender, 0)", () => {
    const request = {
      ...buildRevokeCall({
        chainId: BASE_CHAIN_ID,
        tokenAddress: TOKEN,
        spenderAddress: SPENDER,
      }),
      chainId: BASE_CHAIN_ID,
    };

    expect(request).toMatchObject({
      address: TOKEN,
      functionName: "approve",
      args: [SPENDER, 0n],
    });
  });

  it("builds a Polygon ERC-20-compatible revoke call with approve(spender, 0)", () => {
    const request = {
      ...buildRevokeCall({
        chainId: POLYGON_CHAIN_ID,
        tokenAddress: TOKEN,
        spenderAddress: SPENDER,
      }),
      chainId: POLYGON_CHAIN_ID,
    };

    expect(request).toMatchObject({
      address: TOKEN,
      functionName: "approve",
      args: [SPENDER, 0n],
    });
  });

  it("builds Avalanche and Mantle ERC-20-compatible revoke calls with approve(spender, 0)", () => {
    for (const chainId of [AVALANCHE_CHAIN_ID, MANTLE_CHAIN_ID]) {
      const request = {
        ...buildRevokeCall({
          chainId,
          tokenAddress: TOKEN,
          spenderAddress: SPENDER,
        }),
        chainId,
      };

      expect(request).toMatchObject({
        address: TOKEN,
        functionName: "approve",
        args: [SPENDER, 0n],
      });
    }
  });

  it("builds an Ethereum ERC-20 revoke call with approve(spender, 0)", () => {
    const request = {
      ...buildRevokeCall({
        chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        tokenAddress: TOKEN,
        spenderAddress: SPENDER,
      }),
      chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    };

    expect(request).toMatchObject({
      address: TOKEN,
      functionName: "approve",
      args: [SPENDER, 0n],
      chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    });
  });

  it("carries chain ID onto parsed approval records", () => {
    const pair: DiscoveredPair = {
      chainId: BASE_CHAIN_ID,
      approvalType: "fungible",
      tokenAddress: TOKEN,
      ownerAddress: OWNER,
      spenderAddress: SPENDER,
    };

    const parsed = parseDiscoveryResults(
      [success("TOK"), success(18), success("Token"), success(1n)],
      OWNER,
      BASE_CHAIN_ID,
      [pair],
    );

    expect(parsed.approvals[0]).toMatchObject({
      chainId: BASE_CHAIN_ID,
      key: `${BASE_CHAIN_ID}-${TOKEN}-${SPENDER}`,
    });
  });

  it("presents Ethereum and Arbitrum in public product copy without adding them to active chain config", () => {
    const copy = [
      siteConfig.tagline,
      siteConfig.description,
      siteConfig.longDescription,
      ...siteConfig.keywords,
    ].join(" ");

    expect(copy).toContain("BSC");
    expect(copy).toContain("Base");
    expect(copy).toContain("Polygon");
    expect(copy).toContain("Avalanche");
    expect(copy).toContain("Mantle");
    expect(copy).toContain("Ethereum");
    expect(copy).toContain("Arbitrum");
    expect(isSupportedChainId(1)).toBe(false);
    expect(isSupportedChainId(ARBITRUM_ONE_CLIENT_CHAIN_ID)).toBe(false);
    expect(copy).not.toContain("Etherscan");
  });

  it("warns and falls back when the deprecated BscScan V1 API URL is configured", async () => {
    const original = process.env.NEXT_PUBLIC_BSC_EXPLORER_API_URL;
    process.env.NEXT_PUBLIC_BSC_EXPLORER_API_URL =
      BSC_DEPRECATED_V1_EXPLORER_API_URL;
    vi.resetModules();

    try {
      const chains = await import("./chains");
      const config = chains.getChainConfig(chains.BSC_CHAIN_ID);

      expect(config?.discovery.apiUrl).toBe(chains.BSC_EXPLORER_API_DEFAULT);
      expect(config?.discovery.warnings?.join(" ")).toContain(
        "deprecated BscScan V1 endpoint",
      );
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_BSC_EXPLORER_API_URL;
      } else {
        process.env.NEXT_PUBLIC_BSC_EXPLORER_API_URL = original;
      }
      vi.resetModules();
    }
  });

  it("defaults the BSC explorer API chain ID to 56 when the env var is absent", async () => {
    const original = process.env.NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID;
    vi.resetModules();

    try {
      const chains = await import("./chains");
      const config = chains.getChainConfig(chains.BSC_CHAIN_ID);

      expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
      expect(config?.discovery.apiChainId).toBe("56");
      expect(config?.discovery.queryParams).toMatchObject({ chainid: "56" });
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID = original;
      }
      vi.resetModules();
    }
  });

  it("defaults the Base explorer API chain ID to 8453 when the env var is absent", async () => {
    const original = process.env.NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID;
    vi.resetModules();

    try {
      const chains = await import("./chains");
      const config = chains.getChainConfig(chains.BASE_CHAIN_ID);

      expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
      expect(config?.discovery.apiChainId).toBe("8453");
      expect(config?.discovery.queryParams).toMatchObject({ chainid: "8453" });
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID = original;
      }
      vi.resetModules();
    }
  });

  it("defaults the Polygon explorer API chain ID to 137 when the env var is absent", async () => {
    const original = process.env.NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID;
    vi.resetModules();

    try {
      const chains = await import("./chains");
      const config = chains.getChainConfig(chains.POLYGON_CHAIN_ID);

      expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
      expect(config?.discovery.apiChainId).toBe("137");
      expect(config?.discovery.queryParams).toMatchObject({ chainid: "137" });
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID = original;
      }
      vi.resetModules();
    }
  });

  it("defaults the Avalanche explorer API chain ID to 43114 when the env var is absent", async () => {
    const original = process.env.NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID;
    vi.resetModules();

    try {
      const chains = await import("./chains");
      const config = chains.getChainConfig(chains.AVALANCHE_CHAIN_ID);

      expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
      expect(config?.discovery.apiChainId).toBe("43114");
      expect(config?.discovery.queryParams).toMatchObject({ chainid: "43114" });
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID = original;
      }
      vi.resetModules();
    }
  });

  it("defaults the Mantle explorer API chain ID to 5000 when the env var is absent", async () => {
    const original = process.env.NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID;
    vi.resetModules();

    try {
      const chains = await import("./chains");
      const config = chains.getChainConfig(chains.MANTLE_CHAIN_ID);

      expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
      expect(config?.discovery.apiChainId).toBe("5000");
      expect(config?.discovery.queryParams).toMatchObject({ chainid: "5000" });
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID = original;
      }
      vi.resetModules();
    }
  });
});
