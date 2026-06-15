import { defineChain, type Chain } from "viem";

import {
  ARBITRUM_ONE_CLIENT_CHAIN_ID,
  ARBITRUM_ONE_DISPLAY_NAME,
  ARBITRUM_ONE_NATIVE_SYMBOL,
  ARBITRUM_ONE_PUBLIC_RPC_URL,
  ARBITRUM_ONE_SHORT_NAME,
} from "@/lib/arbitrum-approval-client";
import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  SONIC_CHAIN_ID,
} from "@/lib/chains";
import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  ETHEREUM_MAINNET_DISPLAY_NAME,
  ETHEREUM_MAINNET_NATIVE_SYMBOL,
  ETHEREUM_MAINNET_PUBLIC_RPC_URL,
  ETHEREUM_MAINNET_SHORT_NAME,
} from "@/lib/ethereum-approval-client";
import {
  HYPEREVM_CLIENT_CHAIN_ID,
  HYPEREVM_DISPLAY_NAME,
  HYPEREVM_NATIVE_SYMBOL,
  HYPEREVM_PUBLIC_RPC_URL,
  HYPEREVM_SHORT_NAME,
} from "@/lib/hyperevm-approval-client";
import {
  OPTIMISM_CLIENT_CHAIN_ID,
  OPTIMISM_DISPLAY_NAME,
  OPTIMISM_NATIVE_SYMBOL,
  OPTIMISM_PUBLIC_RPC_URL,
  OPTIMISM_SHORT_NAME,
} from "@/lib/optimism-approval-client";
import type { GasStatusThresholds } from "@/lib/gas/gas-status";

export type GasTrackerChainId =
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID
  | typeof SONIC_CHAIN_ID
  | typeof AVALANCHE_CHAIN_ID
  | typeof MANTLE_CHAIN_ID
  | typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID
  | typeof ARBITRUM_ONE_CLIENT_CHAIN_ID
  | typeof OPTIMISM_CLIENT_CHAIN_ID
  | typeof HYPEREVM_CLIENT_CHAIN_ID;

export interface GasTrackerChainConfig {
  chainId: GasTrackerChainId;
  chainName: string;
  shortName: string;
  nativeCurrency: string;
  nativeCurrencyName: string;
  viemChain: Chain;
  defaultRpcUrl: string;
  publicRpcUrl: string;
  serverRpcEnvNames: readonly string[];
  publicRpcEnvNames: readonly string[];
  statusThresholds: GasStatusThresholds;
  coingeckoId: string;
  advisoryProvider?: "owlracle-pulse";
  estimateNote?: string;
}

const PULSECHAIN_RPC_DEFAULT = "https://rpc.pulsechain.com";
const BSC_RPC_DEFAULT = "https://bsc-dataseed.bnbchain.org";
const BASE_RPC_DEFAULT = "https://mainnet.base.org";
const POLYGON_RPC_DEFAULT = "https://polygon.drpc.org";
const SONIC_RPC_DEFAULT = "https://rpc.soniclabs.com";
const AVALANCHE_RPC_DEFAULT = "https://api.avax.network/ext/bc/C/rpc";
const MANTLE_RPC_DEFAULT = "https://rpc.mantle.xyz";

const ethereumGasChain = defineGasChain({
  id: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  name: ETHEREUM_MAINNET_DISPLAY_NAME,
  nativeCurrency: {
    name: "Ether",
    symbol: ETHEREUM_MAINNET_NATIVE_SYMBOL,
    decimals: 18,
  },
  rpcUrl:
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL ??
    process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ??
    ETHEREUM_MAINNET_PUBLIC_RPC_URL,
  explorerUrl: "https://etherscan.io",
});

const pulsechainGasChain = defineGasChain({
  id: PULSECHAIN_CHAIN_ID,
  name: "PulseChain",
  nativeCurrency: {
    name: "Pulse",
    symbol: "PLS",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL ?? PULSECHAIN_RPC_DEFAULT,
  explorerUrl: "https://scan.pulsechain.com",
});

const bscGasChain = defineGasChain({
  id: BSC_CHAIN_ID,
  name: "BNB Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_BSC_RPC_URL ?? BSC_RPC_DEFAULT,
  explorerUrl: "https://bscscan.com",
});

const baseGasChain = defineGasChain({
  id: BASE_CHAIN_ID,
  name: "Base",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL ?? BASE_RPC_DEFAULT,
  explorerUrl: "https://basescan.org",
});

const polygonGasChain = defineGasChain({
  id: POLYGON_CHAIN_ID,
  name: "Polygon",
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL ?? POLYGON_RPC_DEFAULT,
  explorerUrl: "https://polygonscan.com",
});

const sonicGasChain = defineGasChain({
  id: SONIC_CHAIN_ID,
  name: "Sonic Mainnet",
  nativeCurrency: {
    name: "Sonic",
    symbol: "S",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_SONIC_RPC_URL ?? SONIC_RPC_DEFAULT,
  explorerUrl: "https://sonicscan.org",
});

const avalancheGasChain = defineGasChain({
  id: AVALANCHE_CHAIN_ID,
  name: "Avalanche C-Chain",
  nativeCurrency: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL ?? AVALANCHE_RPC_DEFAULT,
  explorerUrl: "https://snowscan.xyz",
});

const mantleGasChain = defineGasChain({
  id: MANTLE_CHAIN_ID,
  name: "Mantle",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_MANTLE_RPC_URL ?? MANTLE_RPC_DEFAULT,
  explorerUrl: "https://explorer.mantle.xyz",
});

const arbitrumGasChain = defineGasChain({
  id: ARBITRUM_ONE_CLIENT_CHAIN_ID,
  name: ARBITRUM_ONE_DISPLAY_NAME,
  nativeCurrency: {
    name: "Ether",
    symbol: ARBITRUM_ONE_NATIVE_SYMBOL,
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ?? ARBITRUM_ONE_PUBLIC_RPC_URL,
  explorerUrl: "https://arbiscan.io",
});

const optimismGasChain = defineGasChain({
  id: OPTIMISM_CLIENT_CHAIN_ID,
  name: "OP Mainnet",
  nativeCurrency: {
    name: "Ether",
    symbol: OPTIMISM_NATIVE_SYMBOL,
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL ?? OPTIMISM_PUBLIC_RPC_URL,
  explorerUrl: "https://optimistic.etherscan.io",
});

const hyperevmGasChain = defineGasChain({
  id: HYPEREVM_CLIENT_CHAIN_ID,
  name: HYPEREVM_DISPLAY_NAME,
  nativeCurrency: {
    name: "HYPE",
    symbol: HYPEREVM_NATIVE_SYMBOL,
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_HYPEREVM_RPC_URL ?? HYPEREVM_PUBLIC_RPC_URL,
  explorerUrl: "https://hyperevmscan.io",
});

export const GAS_TRACKER_CHAINS = [
  {
    chainId: PULSECHAIN_CHAIN_ID,
    chainName: "PulseChain",
    shortName: "PulseChain",
    nativeCurrency: "PLS",
    nativeCurrencyName: "Pulse",
    viemChain: pulsechainGasChain,
    defaultRpcUrl: PULSECHAIN_RPC_DEFAULT,
    publicRpcUrl: pulsechainGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["PULSECHAIN_RPC_URL", "PULSECHAIN_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_PULSECHAIN_RPC_URL"],
    statusThresholds: { elevatedGwei: 750_000, highGwei: 2_000_000 },
    coingeckoId: "pulsechain",
    advisoryProvider: "owlracle-pulse",
  },
  {
    chainId: BSC_CHAIN_ID,
    chainName: "BNB Smart Chain",
    shortName: "BSC",
    nativeCurrency: "BNB",
    nativeCurrencyName: "BNB",
    viemChain: bscGasChain,
    defaultRpcUrl: BSC_RPC_DEFAULT,
    publicRpcUrl: bscGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["BSC_RPC_URL", "BSC_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_BSC_RPC_URL"],
    statusThresholds: { elevatedGwei: 3, highGwei: 10 },
    coingeckoId: "binancecoin",
  },
  {
    chainId: BASE_CHAIN_ID,
    chainName: "Base",
    shortName: "Base",
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: baseGasChain,
    defaultRpcUrl: BASE_RPC_DEFAULT,
    publicRpcUrl: baseGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["BASE_RPC_URL", "BASE_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_BASE_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.05, highGwei: 0.5 },
    coingeckoId: "ethereum",
    estimateNote:
      "Base wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: POLYGON_CHAIN_ID,
    chainName: "Polygon",
    shortName: "Polygon",
    nativeCurrency: "POL",
    nativeCurrencyName: "POL",
    viemChain: polygonGasChain,
    defaultRpcUrl: POLYGON_RPC_DEFAULT,
    publicRpcUrl: polygonGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["POLYGON_RPC_URL", "POLYGON_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_POLYGON_RPC_URL"],
    statusThresholds: { elevatedGwei: 100, highGwei: 300 },
    coingeckoId: "polygon-ecosystem-token",
  },
  {
    chainId: SONIC_CHAIN_ID,
    chainName: "Sonic Mainnet",
    shortName: "Sonic",
    nativeCurrency: "S",
    nativeCurrencyName: "Sonic",
    viemChain: sonicGasChain,
    defaultRpcUrl: SONIC_RPC_DEFAULT,
    publicRpcUrl: sonicGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["SONIC_RPC_URL", "SONIC_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_SONIC_RPC_URL"],
    statusThresholds: { elevatedGwei: 100, highGwei: 300 },
    coingeckoId: "sonic",
  },
  {
    chainId: AVALANCHE_CHAIN_ID,
    chainName: "Avalanche C-Chain",
    shortName: "Avalanche",
    nativeCurrency: "AVAX",
    nativeCurrencyName: "Avalanche",
    viemChain: avalancheGasChain,
    defaultRpcUrl: AVALANCHE_RPC_DEFAULT,
    publicRpcUrl: avalancheGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: [
      "AVALANCHE_RPC_URL",
      "AVALANCHE_C_CHAIN_RPC_URL",
      "AVALANCHE_MAINNET_RPC_URL",
    ],
    publicRpcEnvNames: ["NEXT_PUBLIC_AVALANCHE_RPC_URL"],
    statusThresholds: { elevatedGwei: 1, highGwei: 5 },
    coingeckoId: "avalanche-2",
  },
  {
    chainId: MANTLE_CHAIN_ID,
    chainName: "Mantle",
    shortName: "Mantle",
    nativeCurrency: "MNT",
    nativeCurrencyName: "Mantle",
    viemChain: mantleGasChain,
    defaultRpcUrl: MANTLE_RPC_DEFAULT,
    publicRpcUrl: mantleGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["MANTLE_RPC_URL", "MANTLE_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_MANTLE_RPC_URL"],
    statusThresholds: { elevatedGwei: 100, highGwei: 300 },
    coingeckoId: "mantle",
    estimateNote:
      "Mantle wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    chainName: ETHEREUM_MAINNET_DISPLAY_NAME,
    shortName: ETHEREUM_MAINNET_SHORT_NAME,
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: ethereumGasChain,
    defaultRpcUrl: ETHEREUM_MAINNET_PUBLIC_RPC_URL,
    publicRpcUrl: ethereumGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["MAINNET_RPC_URL", "ETHEREUM_RPC_URL"],
    publicRpcEnvNames: [
      "NEXT_PUBLIC_MAINNET_RPC_URL",
      "NEXT_PUBLIC_ETHEREUM_RPC_URL",
    ],
    statusThresholds: { elevatedGwei: 25, highGwei: 75 },
    coingeckoId: "ethereum",
  },
  {
    chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    chainName: ARBITRUM_ONE_DISPLAY_NAME,
    shortName: ARBITRUM_ONE_SHORT_NAME,
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: arbitrumGasChain,
    defaultRpcUrl: ARBITRUM_ONE_PUBLIC_RPC_URL,
    publicRpcUrl: arbitrumGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["ARBITRUM_ONE_RPC_URL", "ARBITRUM_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_ARBITRUM_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "Arbitrum wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: OPTIMISM_CLIENT_CHAIN_ID,
    chainName: OPTIMISM_DISPLAY_NAME,
    shortName: OPTIMISM_SHORT_NAME,
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: optimismGasChain,
    defaultRpcUrl: OPTIMISM_PUBLIC_RPC_URL,
    publicRpcUrl: optimismGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: [
      "OPTIMISM_RPC_URL",
      "OPTIMISM_MAINNET_RPC_URL",
      "OP_MAINNET_RPC_URL",
    ],
    publicRpcEnvNames: ["NEXT_PUBLIC_OPTIMISM_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "Optimism wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    chainName: HYPEREVM_DISPLAY_NAME,
    shortName: HYPEREVM_SHORT_NAME,
    nativeCurrency: "HYPE",
    nativeCurrencyName: "HYPE",
    viemChain: hyperevmGasChain,
    defaultRpcUrl: HYPEREVM_PUBLIC_RPC_URL,
    publicRpcUrl: hyperevmGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: [
      "HYPEREVM_RPC_URL",
      "HYPEREVM_MAINNET_RPC_URL",
      "HYPERLIQUID_EVM_RPC_URL",
    ],
    publicRpcEnvNames: ["NEXT_PUBLIC_HYPEREVM_RPC_URL"],
    statusThresholds: { elevatedGwei: 2, highGwei: 10 },
    coingeckoId: "hyperliquid",
  },
] as const satisfies readonly GasTrackerChainConfig[];

export const DEFAULT_GAS_TRACKER_CHAIN_ID = PULSECHAIN_CHAIN_ID;

export const GAS_TRACKER_CHAIN_IDS = GAS_TRACKER_CHAINS.map(
  (chain) => chain.chainId,
) as readonly GasTrackerChainId[];

export function isGasTrackerChainId(
  value: number | undefined,
): value is GasTrackerChainId {
  return GAS_TRACKER_CHAINS.some((chain) => chain.chainId === value);
}

export function getGasTrackerChainConfig(
  chainId: number | undefined,
): GasTrackerChainConfig | undefined {
  if (!isGasTrackerChainId(chainId)) return undefined;
  return GAS_TRACKER_CHAINS.find((chain) => chain.chainId === chainId);
}

function defineGasChain({
  id,
  name,
  nativeCurrency,
  rpcUrl,
  explorerUrl,
}: {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  explorerUrl: string;
}): Chain {
  return defineChain({
    id,
    name,
    nativeCurrency,
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
    blockExplorers: {
      default: {
        name: `${name} explorer`,
        url: explorerUrl,
      },
    },
  });
}
