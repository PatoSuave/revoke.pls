import { describe, expect, it, vi } from "vitest";

import { parseDiscoveryResults, type ReadResult } from "./approvals";
import {
  ABSTRACT_CHAIN_ID,
  ABSTRACT_EXPLORER_API_DEFAULT,
  ABSTRACT_EXPLORER_CHAIN_ID_DEFAULT,
  AVALANCHE_CHAIN_ID,
  AVALANCHE_EXPLORER_API_DEFAULT,
  AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT,
  BASE_CHAIN_ID,
  BASE_EXPLORER_API_DEFAULT,
  BASE_EXPLORER_CHAIN_ID_DEFAULT,
  BERACHAIN_CHAIN_ID,
  BERACHAIN_EXPLORER_API_DEFAULT,
  BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT,
  BLAST_CHAIN_ID,
  BLAST_EXPLORER_API_DEFAULT,
  BLAST_EXPLORER_CHAIN_ID_DEFAULT,
  BSC_CHAIN_ID,
  BSC_DEPRECATED_V1_EXPLORER_API_URL,
  BSC_EXPLORER_CHAIN_ID_DEFAULT,
  BSC_EXPLORER_API_DEFAULT,
  BSC_HIGH_GAS_WARNING_THRESHOLD,
  BSC_OSAKA_MAX_TRANSACTION_GAS,
  CELO_CHAIN_ID,
  CELO_EXPLORER_API_DEFAULT,
  CELO_EXPLORER_CHAIN_ID_DEFAULT,
  EIP_7825_MAX_TRANSACTION_GAS,
  GNOSIS_CHAIN_ID,
  GNOSIS_EXPLORER_API_DEFAULT,
  GNOSIS_EXPLORER_CHAIN_ID_DEFAULT,
  KATANA_CHAIN_ID,
  KATANA_EXPLORER_API_DEFAULT,
  KATANA_EXPLORER_CHAIN_ID_DEFAULT,
  LINEA_CHAIN_ID,
  LINEA_EXPLORER_API_DEFAULT,
  LINEA_EXPLORER_CHAIN_ID_DEFAULT,
  MANTLE_CHAIN_ID,
  MANTLE_EXPLORER_API_DEFAULT,
  MANTLE_EXPLORER_CHAIN_ID_DEFAULT,
  MONAD_CHAIN_ID,
  MONAD_EXPLORER_API_DEFAULT,
  MONAD_EXPLORER_CHAIN_ID_DEFAULT,
  PLASMA_CHAIN_ID,
  PLASMA_EXPLORER_API_DEFAULT,
  PLASMA_EXPLORER_CHAIN_ID_DEFAULT,
  POLYGON_CHAIN_ID,
  POLYGON_EXPLORER_API_DEFAULT,
  POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
  PULSECHAIN_CHAIN_ID,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER_API_DEFAULT,
  SEI_CHAIN_ID,
  SEI_EXPLORER_API_DEFAULT,
  SEI_EXPLORER_CHAIN_ID_DEFAULT,
  SONIC_CHAIN_ID,
  SONIC_EXPLORER_API_DEFAULT,
  SONIC_EXPLORER_CHAIN_ID_DEFAULT,
  UNICHAIN_CHAIN_ID,
  UNICHAIN_EXPLORER_API_DEFAULT,
  UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT,
  WORLDCHAIN_CHAIN_ID,
  WORLDCHAIN_EXPLORER_API_DEFAULT,
  WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT,
  abstract,
  avalanche,
  berachain,
  blast,
  base,
  bsc,
  celo,
  getChainConfig,
  getSupportedChainShortNames,
  gnosis,
  isSupportedChainId,
  katana,
  linea,
  mantle,
  monad,
  plasma,
  polygon,
  robinhood,
  sei,
  sonic,
  supportedChainConfigList,
  supportedChains,
  unichain,
  worldchain,
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
      SONIC_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
      LINEA_CHAIN_ID,
      BLAST_CHAIN_ID,
      BERACHAIN_CHAIN_ID,
      CELO_CHAIN_ID,
      GNOSIS_CHAIN_ID,
      UNICHAIN_CHAIN_ID,
      WORLDCHAIN_CHAIN_ID,
      ROBINHOOD_CHAIN_ID,
      MONAD_CHAIN_ID,
      KATANA_CHAIN_ID,
      SEI_CHAIN_ID,
      PLASMA_CHAIN_ID,
      ABSTRACT_CHAIN_ID,
    ]);
    expect(supportedChainConfigList.map((chain) => chain.chainId)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
      POLYGON_CHAIN_ID,
      SONIC_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
      LINEA_CHAIN_ID,
      BLAST_CHAIN_ID,
      BERACHAIN_CHAIN_ID,
      CELO_CHAIN_ID,
      GNOSIS_CHAIN_ID,
      UNICHAIN_CHAIN_ID,
      WORLDCHAIN_CHAIN_ID,
      ROBINHOOD_CHAIN_ID,
      MONAD_CHAIN_ID,
      KATANA_CHAIN_ID,
      SEI_CHAIN_ID,
      PLASMA_CHAIN_ID,
      ABSTRACT_CHAIN_ID,
    ]);
    expect(supportedChainConfigList.map((chain) => chain.shortName)).toEqual([
      "PulseChain",
      "BSC",
      "Base",
      "Polygon",
      "Sonic",
      "Avalanche",
      "Mantle",
      "Linea",
      "Blast",
      "Berachain",
      "Celo",
      "Gnosis",
      "Unichain",
      "World",
      "Robinhood",
      "Monad",
      "Katana",
      "Sei",
      "Plasma",
      "Abstract",
    ]);
    expect(getSupportedChainShortNames()).toBe(
      "PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast, Berachain, Celo, Gnosis, Unichain, World, Robinhood, Monad, Katana, Sei, Plasma, or Abstract",
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
    expect(config?.maxTransactionGas).toBe(EIP_7825_MAX_TRANSACTION_GAS);
    expect(config?.highGasWarningThreshold).toBe(
      (EIP_7825_MAX_TRANSACTION_GAS * 85n) / 100n,
    );
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

  it("configures Sonic identity, S gas, standards, and API defaults", () => {
    const config = getChainConfig(SONIC_CHAIN_ID);

    expect(config?.chainId).toBe(146);
    expect(config?.displayName).toBe("Sonic Mainnet");
    expect(config?.shortName).toBe("Sonic");
    expect(config?.nativeSymbol).toBe("S");
    expect(config?.maxTransactionGas).toBeUndefined();
    expect(config?.highGasWarningThreshold).toBeUndefined();
    expect(config?.standardLabels).toMatchObject({
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
    });
    expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
    expect(config?.discovery.apiProviderName).toBe("Etherscan API V2");
    expect(config?.explorer.baseUrl).toBe("https://sonicscan.org");
    expect(config?.explorer.name).toBe("SonicScan");
    expect(config?.rpc.defaultUrl).toBe("https://rpc.soniclabs.com");
    expect(config?.discovery.apiUrl).toBe(SONIC_EXPLORER_API_DEFAULT);
    expect(config?.discovery.apiChainId).toBe(
      SONIC_EXPLORER_CHAIN_ID_DEFAULT,
    );
    expect(config?.discovery.queryParams).toMatchObject({ chainid: "146" });
    expect(config?.discovery.apiUrlEnvVar).toBe(
      "NEXT_PUBLIC_SONIC_EXPLORER_API_URL",
    );
    expect(config?.discovery.apiChainIdEnvVar).toBe(
      "NEXT_PUBLIC_SONIC_EXPLORER_CHAIN_ID",
    );
    expect(config?.discovery.apiKeyEnvVar).toBe(
      "NEXT_PUBLIC_SONIC_EXPLORER_API_KEY",
    );
    expect(config?.discovery.apiKeyEnvVars).toEqual([
      "NEXT_PUBLIC_SONIC_EXPLORER_API_KEY",
    ]);
    expect(sonic.id).toBe(146);
    expect(sonic.nativeCurrency.symbol).toBe("S");
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

  it("configures shared-key Etherscan V2 generic chains without public keys", () => {
    const cases = [
      {
        chainId: LINEA_CHAIN_ID,
        displayName: "Linea",
        nativeSymbol: "ETH",
        explorerName: "LineaScan",
        explorerBaseUrl: "https://lineascan.build",
        rpcUrl: "https://rpc.linea.build",
        apiUrl: LINEA_EXPLORER_API_DEFAULT,
        apiChainId: LINEA_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["LINEA_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: linea,
      },
      {
        chainId: BLAST_CHAIN_ID,
        displayName: "Blast",
        nativeSymbol: "ETH",
        explorerName: "Blastscan",
        explorerBaseUrl: "https://blastscan.io",
        rpcUrl: "https://rpc.blast.io",
        apiUrl: BLAST_EXPLORER_API_DEFAULT,
        apiChainId: BLAST_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["BLAST_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: blast,
      },
      {
        chainId: BERACHAIN_CHAIN_ID,
        displayName: "Berachain",
        nativeSymbol: "BERA",
        explorerName: "Berascan",
        explorerBaseUrl: "https://berascan.com",
        rpcUrl: "https://rpc.berachain.com",
        apiUrl: BERACHAIN_EXPLORER_API_DEFAULT,
        apiChainId: BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["BERACHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: berachain,
      },
      {
        chainId: CELO_CHAIN_ID,
        displayName: "Celo",
        nativeSymbol: "CELO",
        explorerName: "CeloScan",
        explorerBaseUrl: "https://celoscan.io",
        rpcUrl: "https://forno.celo.org",
        apiUrl: CELO_EXPLORER_API_DEFAULT,
        apiChainId: CELO_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["CELO_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: celo,
      },
      {
        chainId: GNOSIS_CHAIN_ID,
        displayName: "Gnosis",
        nativeSymbol: "XDAI",
        explorerName: "Gnosisscan",
        explorerBaseUrl: "https://gnosisscan.io",
        rpcUrl: "https://rpc.gnosischain.com",
        apiUrl: GNOSIS_EXPLORER_API_DEFAULT,
        apiChainId: GNOSIS_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["GNOSIS_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: gnosis,
      },
      {
        chainId: UNICHAIN_CHAIN_ID,
        displayName: "Unichain",
        nativeSymbol: "ETH",
        explorerName: "Uniscan",
        explorerBaseUrl: "https://uniscan.xyz",
        rpcUrl: "https://mainnet.unichain.org",
        apiUrl: UNICHAIN_EXPLORER_API_DEFAULT,
        apiChainId: UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["UNICHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: unichain,
      },
      {
        chainId: WORLDCHAIN_CHAIN_ID,
        displayName: "World Chain",
        shortName: "World",
        nativeSymbol: "ETH",
        explorerName: "Worldscan",
        explorerBaseUrl: "https://worldscan.org",
        rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public",
        apiUrl: WORLDCHAIN_EXPLORER_API_DEFAULT,
        apiChainId: WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["WORLDCHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: worldchain,
      },
      {
        chainId: MONAD_CHAIN_ID,
        displayName: "Monad",
        nativeSymbol: "MON",
        explorerName: "Monadscan",
        explorerBaseUrl: "https://monadscan.com",
        rpcUrl: "https://rpc.monad.xyz",
        apiUrl: MONAD_EXPLORER_API_DEFAULT,
        apiChainId: MONAD_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["MONAD_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: monad,
      },
      {
        chainId: KATANA_CHAIN_ID,
        displayName: "Katana",
        nativeSymbol: "ETH",
        explorerName: "Katanascan",
        explorerBaseUrl: "https://katanascan.com",
        rpcUrl: "https://rpc.katana.network",
        apiUrl: KATANA_EXPLORER_API_DEFAULT,
        apiChainId: KATANA_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["KATANA_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: katana,
      },
      {
        chainId: SEI_CHAIN_ID,
        displayName: "Sei",
        nativeSymbol: "SEI",
        explorerName: "Seiscan",
        explorerBaseUrl: "https://seiscan.io",
        rpcUrl: "https://evm-rpc.sei-apis.com",
        apiUrl: SEI_EXPLORER_API_DEFAULT,
        apiChainId: SEI_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["SEI_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: sei,
      },
      {
        chainId: PLASMA_CHAIN_ID,
        displayName: "Plasma",
        nativeSymbol: "XPL",
        explorerName: "PlasmaScan",
        explorerBaseUrl: "https://plasmascan.to",
        rpcUrl: "https://rpc.plasma.to",
        apiUrl: PLASMA_EXPLORER_API_DEFAULT,
        apiChainId: PLASMA_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["PLASMA_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: plasma,
      },
      {
        chainId: ABSTRACT_CHAIN_ID,
        displayName: "Abstract",
        nativeSymbol: "ETH",
        explorerName: "Abscan",
        explorerBaseUrl: "https://abscan.org",
        rpcUrl: "https://api.mainnet.abs.xyz",
        apiUrl: ABSTRACT_EXPLORER_API_DEFAULT,
        apiChainId: ABSTRACT_EXPLORER_CHAIN_ID_DEFAULT,
        apiKeyEnvVars: ["ABSTRACT_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
        chain: abstract,
      },
    ] as const;

    for (const item of cases) {
      const config = getChainConfig(item.chainId);

      expect(config?.chainId).toBe(item.chainId);
      expect(config?.displayName).toBe(item.displayName);
      expect(config?.shortName).toBe("shortName" in item ? item.shortName : item.displayName);
      expect(config?.nativeSymbol).toBe(item.nativeSymbol);
      expect(config?.standardLabels).toMatchObject({
        fungible: "ERC-20",
        nft: "ERC-721",
        multiToken: "ERC-1155",
      });
      expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
      expect(config?.discovery.apiProviderName).toBe("Etherscan API V2");
      expect(config?.explorer.name).toBe(item.explorerName);
      expect(config?.explorer.baseUrl).toBe(item.explorerBaseUrl);
      expect(config?.rpc.defaultUrl).toBe(item.rpcUrl);
      expect(config?.discovery.apiUrl).toBe(item.apiUrl);
      expect(config?.discovery.apiChainId).toBe(item.apiChainId);
      expect(config?.discovery.queryParams).toMatchObject({
        chainid: item.apiChainId,
      });
      expect(config?.discovery.apiKeyEnvVars).toEqual(item.apiKeyEnvVars);
      expect(config?.discovery.apiKeyEnvVars?.join(" ")).not.toContain(
        "NEXT_PUBLIC",
      );
      expect(item.chain.id).toBe(item.chainId);
      expect(item.chain.nativeCurrency.symbol).toBe(item.nativeSymbol);
    }
  });

  it("keeps PulseChain gas and explorer labels intact", () => {
    const config = getChainConfig(PULSECHAIN_CHAIN_ID);

    expect(config?.nativeSymbol).toBe("PLS");
    expect(config?.maxTransactionGas).toBeUndefined();
    expect(config?.highGasWarningThreshold).toBeUndefined();
    expect(config?.explorer.name).toBe("PulseScan");
    expect(config?.standardLabels.fungible).toBe("PRC-20");
  });

  it("configures Robinhood Chain as Blockscout-compatible with ETH gas", () => {
    const config = getChainConfig(ROBINHOOD_CHAIN_ID);

    expect(config?.chainId).toBe(4663);
    expect(config?.displayName).toBe("Robinhood Chain");
    expect(config?.shortName).toBe("Robinhood");
    expect(config?.nativeSymbol).toBe("ETH");
    expect(config?.rpc.defaultUrl).toBe(
      "https://rpc.mainnet.chain.robinhood.com",
    );
    expect(config?.explorer.name).toBe("Robinhood Blockscout");
    expect(config?.explorer.baseUrl).toBe(
      "https://robinhoodchain.blockscout.com",
    );
    expect(config?.discovery.apiProviderKind).toBe("blockscout-compatible");
    expect(config?.discovery.apiProviderName).toBe("Robinhood Blockscout");
    expect(config?.discovery.apiUrl).toBe(ROBINHOOD_EXPLORER_API_DEFAULT);
    expect(config?.discovery.apiUrlEnvVar).toBe(
      "NEXT_PUBLIC_ROBINHOOD_EXPLORER_API_URL",
    );
    expect(config?.discovery.requiresApiKey).toBeUndefined();
    expect(config?.discovery.apiKeyEnvVars).toBeUndefined();
    expect(config?.discovery.queryParams).toBeUndefined();
    expect(robinhood.id).toBe(4663);
    expect(robinhood.nativeCurrency.symbol).toBe("ETH");
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

  it("builds SonicScan explorer links", () => {
    expect(explorerAddressUrl(SONIC_CHAIN_ID, SPENDER)).toBe(
      `https://sonicscan.org/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(SONIC_CHAIN_ID, TOKEN)).toBe(
      `https://sonicscan.org/token/${TOKEN}`,
    );
    expect(explorerTxUrl(SONIC_CHAIN_ID, "0xabc")).toBe(
      "https://sonicscan.org/tx/0xabc",
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

  it("builds shared-key Etherscan V2 generic explorer links", () => {
    expect(explorerAddressUrl(LINEA_CHAIN_ID, SPENDER)).toBe(
      `https://lineascan.build/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(LINEA_CHAIN_ID, TOKEN)).toBe(
      `https://lineascan.build/token/${TOKEN}`,
    );
    expect(explorerTxUrl(LINEA_CHAIN_ID, "0xabc")).toBe(
      "https://lineascan.build/tx/0xabc",
    );
    expect(explorerAddressUrl(BLAST_CHAIN_ID, SPENDER)).toBe(
      `https://blastscan.io/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(BLAST_CHAIN_ID, TOKEN)).toBe(
      `https://blastscan.io/token/${TOKEN}`,
    );
    expect(explorerTxUrl(BLAST_CHAIN_ID, "0xabc")).toBe(
      "https://blastscan.io/tx/0xabc",
    );
    expect(explorerAddressUrl(BERACHAIN_CHAIN_ID, SPENDER)).toBe(
      `https://berascan.com/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(BERACHAIN_CHAIN_ID, TOKEN)).toBe(
      `https://berascan.com/token/${TOKEN}`,
    );
    expect(explorerTxUrl(BERACHAIN_CHAIN_ID, "0xabc")).toBe(
      "https://berascan.com/tx/0xabc",
    );
    expect(explorerAddressUrl(CELO_CHAIN_ID, SPENDER)).toBe(
      `https://celoscan.io/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(CELO_CHAIN_ID, TOKEN)).toBe(
      `https://celoscan.io/token/${TOKEN}`,
    );
    expect(explorerTxUrl(CELO_CHAIN_ID, "0xabc")).toBe(
      "https://celoscan.io/tx/0xabc",
    );
    expect(explorerAddressUrl(GNOSIS_CHAIN_ID, SPENDER)).toBe(
      `https://gnosisscan.io/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(GNOSIS_CHAIN_ID, TOKEN)).toBe(
      `https://gnosisscan.io/token/${TOKEN}`,
    );
    expect(explorerTxUrl(GNOSIS_CHAIN_ID, "0xabc")).toBe(
      "https://gnosisscan.io/tx/0xabc",
    );
    expect(explorerAddressUrl(UNICHAIN_CHAIN_ID, SPENDER)).toBe(
      `https://uniscan.xyz/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(UNICHAIN_CHAIN_ID, TOKEN)).toBe(
      `https://uniscan.xyz/token/${TOKEN}`,
    );
    expect(explorerTxUrl(UNICHAIN_CHAIN_ID, "0xabc")).toBe(
      "https://uniscan.xyz/tx/0xabc",
    );
    expect(explorerAddressUrl(WORLDCHAIN_CHAIN_ID, SPENDER)).toBe(
      `https://worldscan.org/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(WORLDCHAIN_CHAIN_ID, TOKEN)).toBe(
      `https://worldscan.org/token/${TOKEN}`,
    );
    expect(explorerTxUrl(WORLDCHAIN_CHAIN_ID, "0xabc")).toBe(
      "https://worldscan.org/tx/0xabc",
    );
    expect(explorerAddressUrl(ROBINHOOD_CHAIN_ID, SPENDER)).toBe(
      `https://robinhoodchain.blockscout.com/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(ROBINHOOD_CHAIN_ID, TOKEN)).toBe(
      `https://robinhoodchain.blockscout.com/token/${TOKEN}`,
    );
    expect(explorerTxUrl(ROBINHOOD_CHAIN_ID, "0xabc")).toBe(
      "https://robinhoodchain.blockscout.com/tx/0xabc",
    );
    expect(explorerAddressUrl(MONAD_CHAIN_ID, SPENDER)).toBe(
      `https://monadscan.com/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(MONAD_CHAIN_ID, TOKEN)).toBe(
      `https://monadscan.com/token/${TOKEN}`,
    );
    expect(explorerTxUrl(MONAD_CHAIN_ID, "0xabc")).toBe(
      "https://monadscan.com/tx/0xabc",
    );
    expect(explorerAddressUrl(KATANA_CHAIN_ID, SPENDER)).toBe(
      `https://katanascan.com/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(KATANA_CHAIN_ID, TOKEN)).toBe(
      `https://katanascan.com/token/${TOKEN}`,
    );
    expect(explorerTxUrl(KATANA_CHAIN_ID, "0xabc")).toBe(
      "https://katanascan.com/tx/0xabc",
    );
    expect(explorerAddressUrl(SEI_CHAIN_ID, SPENDER)).toBe(
      `https://seiscan.io/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(SEI_CHAIN_ID, TOKEN)).toBe(
      `https://seiscan.io/token/${TOKEN}`,
    );
    expect(explorerTxUrl(SEI_CHAIN_ID, "0xabc")).toBe(
      "https://seiscan.io/tx/0xabc",
    );
    expect(explorerAddressUrl(PLASMA_CHAIN_ID, SPENDER)).toBe(
      `https://plasmascan.to/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(PLASMA_CHAIN_ID, TOKEN)).toBe(
      `https://plasmascan.to/token/${TOKEN}`,
    );
    expect(explorerTxUrl(PLASMA_CHAIN_ID, "0xabc")).toBe(
      "https://plasmascan.to/tx/0xabc",
    );
    expect(explorerAddressUrl(ABSTRACT_CHAIN_ID, SPENDER)).toBe(
      `https://abscan.org/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(ABSTRACT_CHAIN_ID, TOKEN)).toBe(
      `https://abscan.org/token/${TOKEN}`,
    );
    expect(explorerTxUrl(ABSTRACT_CHAIN_ID, "0xabc")).toBe(
      "https://abscan.org/tx/0xabc",
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

  it("does not leak existing registry labels onto generic EVM chains", () => {
    for (const chainId of [
      SONIC_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
      LINEA_CHAIN_ID,
      BLAST_CHAIN_ID,
      BERACHAIN_CHAIN_ID,
      CELO_CHAIN_ID,
      GNOSIS_CHAIN_ID,
      UNICHAIN_CHAIN_ID,
      WORLDCHAIN_CHAIN_ID,
      ROBINHOOD_CHAIN_ID,
      MONAD_CHAIN_ID,
      KATANA_CHAIN_ID,
      SEI_CHAIN_ID,
      PLASMA_CHAIN_ID,
      ABSTRACT_CHAIN_ID,
    ]) {
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

  it("builds generic EVM ERC-20-compatible revoke calls with approve(spender, 0)", () => {
    for (const chainId of [
      SONIC_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
      LINEA_CHAIN_ID,
      BLAST_CHAIN_ID,
      BERACHAIN_CHAIN_ID,
      CELO_CHAIN_ID,
      GNOSIS_CHAIN_ID,
      UNICHAIN_CHAIN_ID,
      WORLDCHAIN_CHAIN_ID,
      ROBINHOOD_CHAIN_ID,
      MONAD_CHAIN_ID,
      KATANA_CHAIN_ID,
      SEI_CHAIN_ID,
      PLASMA_CHAIN_ID,
      ABSTRACT_CHAIN_ID,
    ]) {
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
    expect(copy).toContain("Sonic");
    expect(copy).toContain("Avalanche");
    expect(copy).toContain("Mantle");
    expect(copy).toContain("Linea");
    expect(copy).toContain("Blast");
    expect(copy).toContain("Berachain");
    expect(copy).toContain("Celo");
    expect(copy).toContain("Gnosis");
    expect(copy).toContain("Unichain");
    expect(copy).toContain("World");
    expect(copy).toContain("Monad");
    expect(copy).toContain("Katana");
    expect(copy).toContain("Sei");
    expect(copy).toContain("Plasma");
    expect(copy).toContain("Abstract");
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

  it("defaults the Sonic explorer API chain ID to 146 when the env var is absent", async () => {
    const original = process.env.NEXT_PUBLIC_SONIC_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_SONIC_EXPLORER_CHAIN_ID;
    vi.resetModules();

    try {
      const chains = await import("./chains");
      const config = chains.getChainConfig(chains.SONIC_CHAIN_ID);

      expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
      expect(config?.discovery.apiChainId).toBe("146");
      expect(config?.discovery.queryParams).toMatchObject({ chainid: "146" });
    } finally {
      if (original !== undefined) {
        process.env.NEXT_PUBLIC_SONIC_EXPLORER_CHAIN_ID = original;
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

  it("defaults the shared Etherscan V2 explorer API chain IDs when env vars are absent", async () => {
    const originals = {
      linea: process.env.NEXT_PUBLIC_LINEA_EXPLORER_CHAIN_ID,
      blast: process.env.NEXT_PUBLIC_BLAST_EXPLORER_CHAIN_ID,
      berachain: process.env.NEXT_PUBLIC_BERACHAIN_EXPLORER_CHAIN_ID,
      celo: process.env.NEXT_PUBLIC_CELO_EXPLORER_CHAIN_ID,
      gnosis: process.env.NEXT_PUBLIC_GNOSIS_EXPLORER_CHAIN_ID,
      unichain: process.env.NEXT_PUBLIC_UNICHAIN_EXPLORER_CHAIN_ID,
      worldchain: process.env.NEXT_PUBLIC_WORLDCHAIN_EXPLORER_CHAIN_ID,
      monad: process.env.NEXT_PUBLIC_MONAD_EXPLORER_CHAIN_ID,
      katana: process.env.NEXT_PUBLIC_KATANA_EXPLORER_CHAIN_ID,
      sei: process.env.NEXT_PUBLIC_SEI_EXPLORER_CHAIN_ID,
      plasma: process.env.NEXT_PUBLIC_PLASMA_EXPLORER_CHAIN_ID,
      abstract: process.env.NEXT_PUBLIC_ABSTRACT_EXPLORER_CHAIN_ID,
    };
    delete process.env.NEXT_PUBLIC_LINEA_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_BLAST_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_BERACHAIN_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_CELO_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_GNOSIS_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_UNICHAIN_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_WORLDCHAIN_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_MONAD_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_KATANA_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_SEI_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_PLASMA_EXPLORER_CHAIN_ID;
    delete process.env.NEXT_PUBLIC_ABSTRACT_EXPLORER_CHAIN_ID;
    vi.resetModules();

    try {
      const chains = await import("./chains");
      const cases = [
        [chains.LINEA_CHAIN_ID, "59144"],
        [chains.BLAST_CHAIN_ID, "81457"],
        [chains.BERACHAIN_CHAIN_ID, "80094"],
        [chains.CELO_CHAIN_ID, "42220"],
        [chains.GNOSIS_CHAIN_ID, "100"],
        [chains.UNICHAIN_CHAIN_ID, "130"],
        [chains.WORLDCHAIN_CHAIN_ID, "480"],
        [chains.MONAD_CHAIN_ID, "143"],
        [chains.KATANA_CHAIN_ID, "747474"],
        [chains.SEI_CHAIN_ID, "1329"],
        [chains.PLASMA_CHAIN_ID, "9745"],
        [chains.ABSTRACT_CHAIN_ID, "2741"],
      ] as const;

      for (const [chainId, expected] of cases) {
        const config = chains.getChainConfig(chainId);
        expect(config?.discovery.apiProviderKind).toBe("etherscan-v2");
        expect(config?.discovery.apiChainId).toBe(expected);
        expect(config?.discovery.queryParams).toMatchObject({
          chainid: expected,
        });
      }
    } finally {
      if (originals.linea !== undefined) {
        process.env.NEXT_PUBLIC_LINEA_EXPLORER_CHAIN_ID = originals.linea;
      }
      if (originals.blast !== undefined) {
        process.env.NEXT_PUBLIC_BLAST_EXPLORER_CHAIN_ID = originals.blast;
      }
      if (originals.berachain !== undefined) {
        process.env.NEXT_PUBLIC_BERACHAIN_EXPLORER_CHAIN_ID =
          originals.berachain;
      }
      if (originals.celo !== undefined) {
        process.env.NEXT_PUBLIC_CELO_EXPLORER_CHAIN_ID = originals.celo;
      }
      if (originals.gnosis !== undefined) {
        process.env.NEXT_PUBLIC_GNOSIS_EXPLORER_CHAIN_ID = originals.gnosis;
      }
      if (originals.unichain !== undefined) {
        process.env.NEXT_PUBLIC_UNICHAIN_EXPLORER_CHAIN_ID =
          originals.unichain;
      }
      if (originals.worldchain !== undefined) {
        process.env.NEXT_PUBLIC_WORLDCHAIN_EXPLORER_CHAIN_ID =
          originals.worldchain;
      }
      if (originals.monad !== undefined) {
        process.env.NEXT_PUBLIC_MONAD_EXPLORER_CHAIN_ID = originals.monad;
      }
      if (originals.katana !== undefined) {
        process.env.NEXT_PUBLIC_KATANA_EXPLORER_CHAIN_ID = originals.katana;
      }
      if (originals.sei !== undefined) {
        process.env.NEXT_PUBLIC_SEI_EXPLORER_CHAIN_ID = originals.sei;
      }
      if (originals.plasma !== undefined) {
        process.env.NEXT_PUBLIC_PLASMA_EXPLORER_CHAIN_ID = originals.plasma;
      }
      if (originals.abstract !== undefined) {
        process.env.NEXT_PUBLIC_ABSTRACT_EXPLORER_CHAIN_ID =
          originals.abstract;
      }
      vi.resetModules();
    }
  });
});
