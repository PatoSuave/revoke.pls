import { defineChain, type Chain } from "viem";

import {
  ARBITRUM_ONE_CLIENT_CHAIN_ID,
  ARBITRUM_ONE_DISPLAY_NAME,
  ARBITRUM_ONE_NATIVE_SYMBOL,
  ARBITRUM_ONE_PUBLIC_RPC_URL,
  ARBITRUM_ONE_SHORT_NAME,
} from "@/lib/arbitrum-approval-client";
import {
  ABSTRACT_CHAIN_ID,
  APECHAIN_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BSC_CHAIN_ID,
  CELO_CHAIN_ID,
  FRAXTAL_CHAIN_ID,
  GNOSIS_CHAIN_ID,
  KATANA_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  MONAD_CHAIN_ID,
  MOONBEAM_CHAIN_ID,
  OPBNB_CHAIN_ID,
  PLASMA_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  ROBINHOOD_CHAIN_ID,
  SEI_CHAIN_ID,
  SONIC_CHAIN_ID,
  TAIKO_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
  XDC_CHAIN_ID,
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
  | typeof LINEA_CHAIN_ID
  | typeof BLAST_CHAIN_ID
  | typeof BERACHAIN_CHAIN_ID
  | typeof CELO_CHAIN_ID
  | typeof GNOSIS_CHAIN_ID
  | typeof UNICHAIN_CHAIN_ID
  | typeof WORLDCHAIN_CHAIN_ID
  | typeof ROBINHOOD_CHAIN_ID
  | typeof MONAD_CHAIN_ID
  | typeof KATANA_CHAIN_ID
  | typeof SEI_CHAIN_ID
  | typeof PLASMA_CHAIN_ID
  | typeof ABSTRACT_CHAIN_ID
  | typeof FRAXTAL_CHAIN_ID
  | typeof TAIKO_CHAIN_ID
  | typeof OPBNB_CHAIN_ID
  | typeof MOONBEAM_CHAIN_ID
  | typeof APECHAIN_CHAIN_ID
  | typeof XDC_CHAIN_ID
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
const LINEA_RPC_DEFAULT = "https://rpc.linea.build";
const BLAST_RPC_DEFAULT = "https://rpc.blast.io";
const BERACHAIN_RPC_DEFAULT = "https://rpc.berachain.com";
const CELO_RPC_DEFAULT = "https://forno.celo.org";
const GNOSIS_RPC_DEFAULT = "https://rpc.gnosischain.com";
const UNICHAIN_RPC_DEFAULT = "https://mainnet.unichain.org";
const WORLDCHAIN_RPC_DEFAULT =
  "https://worldchain-mainnet.g.alchemy.com/public";
const ROBINHOOD_RPC_DEFAULT = "https://rpc.mainnet.chain.robinhood.com";
const MONAD_RPC_DEFAULT = "https://rpc.monad.xyz";
const KATANA_RPC_DEFAULT = "https://rpc.katana.network";
const SEI_RPC_DEFAULT = "https://evm-rpc.sei-apis.com";
const PLASMA_RPC_DEFAULT = "https://rpc.plasma.to";
const ABSTRACT_RPC_DEFAULT = "https://api.mainnet.abs.xyz";
const FRAXTAL_RPC_DEFAULT = "https://rpc.frax.com";
const TAIKO_RPC_DEFAULT = "https://rpc.mainnet.taiko.xyz";
const OPBNB_RPC_DEFAULT = "https://opbnb-mainnet-rpc.bnbchain.org";
const MOONBEAM_RPC_DEFAULT = "https://rpc.api.moonbeam.network";
const APECHAIN_RPC_DEFAULT = "https://rpc.apechain.com/http";
const XDC_RPC_DEFAULT = "https://rpc.xdcrpc.com";

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

const lineaGasChain = defineGasChain({
  id: LINEA_CHAIN_ID,
  name: "Linea",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_LINEA_RPC_URL ?? LINEA_RPC_DEFAULT,
  explorerUrl: "https://lineascan.build",
});

const blastGasChain = defineGasChain({
  id: BLAST_CHAIN_ID,
  name: "Blast",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_BLAST_RPC_URL ?? BLAST_RPC_DEFAULT,
  explorerUrl: "https://blastscan.io",
});

const berachainGasChain = defineGasChain({
  id: BERACHAIN_CHAIN_ID,
  name: "Berachain",
  nativeCurrency: {
    name: "BERA",
    symbol: "BERA",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_BERACHAIN_RPC_URL ?? BERACHAIN_RPC_DEFAULT,
  explorerUrl: "https://berascan.com",
});

const celoGasChain = defineGasChain({
  id: CELO_CHAIN_ID,
  name: "Celo",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_CELO_RPC_URL ?? CELO_RPC_DEFAULT,
  explorerUrl: "https://celoscan.io",
});

const gnosisGasChain = defineGasChain({
  id: GNOSIS_CHAIN_ID,
  name: "Gnosis",
  nativeCurrency: {
    name: "xDAI",
    symbol: "XDAI",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_GNOSIS_RPC_URL ?? GNOSIS_RPC_DEFAULT,
  explorerUrl: "https://gnosisscan.io",
});

const unichainGasChain = defineGasChain({
  id: UNICHAIN_CHAIN_ID,
  name: "Unichain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_UNICHAIN_RPC_URL ?? UNICHAIN_RPC_DEFAULT,
  explorerUrl: "https://uniscan.xyz",
});

const worldchainGasChain = defineGasChain({
  id: WORLDCHAIN_CHAIN_ID,
  name: "World Chain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_WORLDCHAIN_RPC_URL ?? WORLDCHAIN_RPC_DEFAULT,
  explorerUrl: "https://worldscan.org",
});

const robinhoodGasChain = defineGasChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ?? ROBINHOOD_RPC_DEFAULT,
  explorerUrl: "https://robinhoodchain.blockscout.com",
});

const monadGasChain = defineGasChain({
  id: MONAD_CHAIN_ID,
  name: "Monad",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? MONAD_RPC_DEFAULT,
  explorerUrl: "https://monadscan.com",
});

const katanaGasChain = defineGasChain({
  id: KATANA_CHAIN_ID,
  name: "Katana",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_KATANA_RPC_URL ?? KATANA_RPC_DEFAULT,
  explorerUrl: "https://katanascan.com",
});

const seiGasChain = defineGasChain({
  id: SEI_CHAIN_ID,
  name: "Sei",
  nativeCurrency: {
    name: "Sei",
    symbol: "SEI",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_SEI_RPC_URL ?? SEI_RPC_DEFAULT,
  explorerUrl: "https://seiscan.io",
});

const plasmaGasChain = defineGasChain({
  id: PLASMA_CHAIN_ID,
  name: "Plasma",
  nativeCurrency: {
    name: "Plasma",
    symbol: "XPL",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_PLASMA_RPC_URL ?? PLASMA_RPC_DEFAULT,
  explorerUrl: "https://plasmascan.to",
});

const abstractGasChain = defineGasChain({
  id: ABSTRACT_CHAIN_ID,
  name: "Abstract",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_ABSTRACT_RPC_URL ?? ABSTRACT_RPC_DEFAULT,
  explorerUrl: "https://abscan.org",
});

const fraxtalGasChain = defineGasChain({
  id: FRAXTAL_CHAIN_ID,
  name: "Fraxtal",
  nativeCurrency: {
    name: "Frax",
    symbol: "FRAX",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_FRAXTAL_RPC_URL ?? FRAXTAL_RPC_DEFAULT,
  explorerUrl: "https://fraxscan.com",
});

const taikoGasChain = defineGasChain({
  id: TAIKO_CHAIN_ID,
  name: "Taiko Mainnet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_TAIKO_RPC_URL ?? TAIKO_RPC_DEFAULT,
  explorerUrl: "https://taikoscan.io",
});

const opbnbGasChain = defineGasChain({
  id: OPBNB_CHAIN_ID,
  name: "opBNB",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_OPBNB_RPC_URL ?? OPBNB_RPC_DEFAULT,
  explorerUrl: "https://opbnb.bscscan.com",
});

const moonbeamGasChain = defineGasChain({
  id: MOONBEAM_CHAIN_ID,
  name: "Moonbeam",
  nativeCurrency: {
    name: "Moonbeam",
    symbol: "GLMR",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_MOONBEAM_RPC_URL ?? MOONBEAM_RPC_DEFAULT,
  explorerUrl: "https://moonbeam.moonscan.io",
});

const apechainGasChain = defineGasChain({
  id: APECHAIN_CHAIN_ID,
  name: "ApeChain",
  nativeCurrency: {
    name: "ApeCoin",
    symbol: "APE",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_APECHAIN_RPC_URL ?? APECHAIN_RPC_DEFAULT,
  explorerUrl: "https://apescan.io",
});

const xdcGasChain = defineGasChain({
  id: XDC_CHAIN_ID,
  name: "XDC Network",
  nativeCurrency: {
    name: "XDC",
    symbol: "XDC",
    decimals: 18,
  },
  rpcUrl: process.env.NEXT_PUBLIC_XDC_RPC_URL ?? XDC_RPC_DEFAULT,
  explorerUrl: "https://xdcscan.com",
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
    chainId: LINEA_CHAIN_ID,
    chainName: "Linea",
    shortName: "Linea",
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: lineaGasChain,
    defaultRpcUrl: LINEA_RPC_DEFAULT,
    publicRpcUrl: lineaGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["LINEA_RPC_URL", "LINEA_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_LINEA_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "Linea wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: BLAST_CHAIN_ID,
    chainName: "Blast",
    shortName: "Blast",
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: blastGasChain,
    defaultRpcUrl: BLAST_RPC_DEFAULT,
    publicRpcUrl: blastGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["BLAST_RPC_URL", "BLAST_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_BLAST_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "Blast wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: BERACHAIN_CHAIN_ID,
    chainName: "Berachain",
    shortName: "Berachain",
    nativeCurrency: "BERA",
    nativeCurrencyName: "BERA",
    viemChain: berachainGasChain,
    defaultRpcUrl: BERACHAIN_RPC_DEFAULT,
    publicRpcUrl: berachainGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["BERACHAIN_RPC_URL", "BERACHAIN_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_BERACHAIN_RPC_URL"],
    statusThresholds: { elevatedGwei: 5, highGwei: 25 },
    coingeckoId: "berachain",
  },
  {
    chainId: CELO_CHAIN_ID,
    chainName: "Celo",
    shortName: "Celo",
    nativeCurrency: "CELO",
    nativeCurrencyName: "CELO",
    viemChain: celoGasChain,
    defaultRpcUrl: CELO_RPC_DEFAULT,
    publicRpcUrl: celoGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["CELO_RPC_URL", "CELO_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_CELO_RPC_URL"],
    statusThresholds: { elevatedGwei: 1, highGwei: 5 },
    coingeckoId: "celo",
  },
  {
    chainId: GNOSIS_CHAIN_ID,
    chainName: "Gnosis",
    shortName: "Gnosis",
    nativeCurrency: "XDAI",
    nativeCurrencyName: "xDAI",
    viemChain: gnosisGasChain,
    defaultRpcUrl: GNOSIS_RPC_DEFAULT,
    publicRpcUrl: gnosisGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["GNOSIS_RPC_URL", "GNOSIS_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_GNOSIS_RPC_URL"],
    statusThresholds: { elevatedGwei: 2, highGwei: 10 },
    coingeckoId: "xdai",
  },
  {
    chainId: UNICHAIN_CHAIN_ID,
    chainName: "Unichain",
    shortName: "Unichain",
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: unichainGasChain,
    defaultRpcUrl: UNICHAIN_RPC_DEFAULT,
    publicRpcUrl: unichainGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["UNICHAIN_RPC_URL", "UNICHAIN_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_UNICHAIN_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "Unichain wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: WORLDCHAIN_CHAIN_ID,
    chainName: "World Chain",
    shortName: "World",
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: worldchainGasChain,
    defaultRpcUrl: WORLDCHAIN_RPC_DEFAULT,
    publicRpcUrl: worldchainGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["WORLDCHAIN_RPC_URL", "WORLDCHAIN_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_WORLDCHAIN_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "World Chain wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: ROBINHOOD_CHAIN_ID,
    chainName: "Robinhood Chain",
    shortName: "Robinhood",
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: robinhoodGasChain,
    defaultRpcUrl: ROBINHOOD_RPC_DEFAULT,
    publicRpcUrl: robinhoodGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["ROBINHOOD_RPC_URL", "ROBINHOOD_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_ROBINHOOD_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "Robinhood Chain wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: MONAD_CHAIN_ID,
    chainName: "Monad",
    shortName: "Monad",
    nativeCurrency: "MON",
    nativeCurrencyName: "Monad",
    viemChain: monadGasChain,
    defaultRpcUrl: MONAD_RPC_DEFAULT,
    publicRpcUrl: monadGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["MONAD_RPC_URL", "MONAD_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_MONAD_RPC_URL"],
    statusThresholds: { elevatedGwei: 2, highGwei: 10 },
    coingeckoId: "monad",
  },
  {
    chainId: KATANA_CHAIN_ID,
    chainName: "Katana",
    shortName: "Katana",
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: katanaGasChain,
    defaultRpcUrl: KATANA_RPC_DEFAULT,
    publicRpcUrl: katanaGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["KATANA_RPC_URL", "KATANA_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_KATANA_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "Katana wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: SEI_CHAIN_ID,
    chainName: "Sei",
    shortName: "Sei",
    nativeCurrency: "SEI",
    nativeCurrencyName: "Sei",
    viemChain: seiGasChain,
    defaultRpcUrl: SEI_RPC_DEFAULT,
    publicRpcUrl: seiGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["SEI_RPC_URL", "SEI_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_SEI_RPC_URL"],
    statusThresholds: { elevatedGwei: 2, highGwei: 10 },
    coingeckoId: "sei",
  },
  {
    chainId: PLASMA_CHAIN_ID,
    chainName: "Plasma",
    shortName: "Plasma",
    nativeCurrency: "XPL",
    nativeCurrencyName: "Plasma",
    viemChain: plasmaGasChain,
    defaultRpcUrl: PLASMA_RPC_DEFAULT,
    publicRpcUrl: plasmaGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["PLASMA_RPC_URL", "PLASMA_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_PLASMA_RPC_URL"],
    statusThresholds: { elevatedGwei: 1, highGwei: 5 },
    coingeckoId: "plasma",
  },
  {
    chainId: ABSTRACT_CHAIN_ID,
    chainName: "Abstract",
    shortName: "Abstract",
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: abstractGasChain,
    defaultRpcUrl: ABSTRACT_RPC_DEFAULT,
    publicRpcUrl: abstractGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["ABSTRACT_RPC_URL", "ABSTRACT_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_ABSTRACT_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "Abstract wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: FRAXTAL_CHAIN_ID,
    chainName: "Fraxtal",
    shortName: "Fraxtal",
    nativeCurrency: "FRAX",
    nativeCurrencyName: "Frax",
    viemChain: fraxtalGasChain,
    defaultRpcUrl: FRAXTAL_RPC_DEFAULT,
    publicRpcUrl: fraxtalGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["FRAXTAL_RPC_URL", "FRAXTAL_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_FRAXTAL_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "frax",
    estimateNote:
      "Fraxtal wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: TAIKO_CHAIN_ID,
    chainName: "Taiko Mainnet",
    shortName: "Taiko",
    nativeCurrency: "ETH",
    nativeCurrencyName: "Ether",
    viemChain: taikoGasChain,
    defaultRpcUrl: TAIKO_RPC_DEFAULT,
    publicRpcUrl: taikoGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["TAIKO_RPC_URL", "TAIKO_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_TAIKO_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "ethereum",
    estimateNote:
      "Taiko wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: OPBNB_CHAIN_ID,
    chainName: "opBNB",
    shortName: "opBNB",
    nativeCurrency: "BNB",
    nativeCurrencyName: "BNB",
    viemChain: opbnbGasChain,
    defaultRpcUrl: OPBNB_RPC_DEFAULT,
    publicRpcUrl: opbnbGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["OPBNB_RPC_URL", "OPBNB_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_OPBNB_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.05, highGwei: 0.5 },
    coingeckoId: "binancecoin",
    estimateNote:
      "opBNB wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: MOONBEAM_CHAIN_ID,
    chainName: "Moonbeam",
    shortName: "Moonbeam",
    nativeCurrency: "GLMR",
    nativeCurrencyName: "Moonbeam",
    viemChain: moonbeamGasChain,
    defaultRpcUrl: MOONBEAM_RPC_DEFAULT,
    publicRpcUrl: moonbeamGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["MOONBEAM_RPC_URL", "MOONBEAM_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_MOONBEAM_RPC_URL"],
    statusThresholds: { elevatedGwei: 2, highGwei: 10 },
    coingeckoId: "moonbeam",
  },
  {
    chainId: APECHAIN_CHAIN_ID,
    chainName: "ApeChain",
    shortName: "ApeChain",
    nativeCurrency: "APE",
    nativeCurrencyName: "ApeCoin",
    viemChain: apechainGasChain,
    defaultRpcUrl: APECHAIN_RPC_DEFAULT,
    publicRpcUrl: apechainGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["APECHAIN_RPC_URL", "APECHAIN_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_APECHAIN_RPC_URL"],
    statusThresholds: { elevatedGwei: 0.1, highGwei: 1 },
    coingeckoId: "apecoin",
    estimateNote:
      "ApeChain wallet estimates may include L1 data fees beyond this gas-price estimate.",
  },
  {
    chainId: XDC_CHAIN_ID,
    chainName: "XDC Network",
    shortName: "XDC",
    nativeCurrency: "XDC",
    nativeCurrencyName: "XDC",
    viemChain: xdcGasChain,
    defaultRpcUrl: XDC_RPC_DEFAULT,
    publicRpcUrl: xdcGasChain.rpcUrls.default.http[0],
    serverRpcEnvNames: ["XDC_RPC_URL", "XDC_MAINNET_RPC_URL"],
    publicRpcEnvNames: ["NEXT_PUBLIC_XDC_RPC_URL"],
    statusThresholds: { elevatedGwei: 2, highGwei: 10 },
    coingeckoId: "xdce-crowd-sale",
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
