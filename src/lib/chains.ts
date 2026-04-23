import { defineChain } from "viem";
import { mainnet as viemMainnet } from "viem/chains";

/**
 * Supported chain registry.
 *
 * This is the single source of truth for every chain the app supports. All
 * chain-specific behavior — RPC transport config, block-explorer URLs,
 * discovery-API endpoints, native symbols, UI copy — is keyed off
 * `supportedChainConfigs` so new chains can be added in one place.
 */

/**
 * PulseChain mainnet (chainId 369).
 * RPC is overridable via NEXT_PUBLIC_PULSECHAIN_RPC_URL for Vercel deployments.
 */
export const pulsechain = defineChain({
  id: 369,
  name: "PulseChain",
  nativeCurrency: {
    name: "Pulse",
    symbol: "PLS",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL ??
          "https://rpc.pulsechain.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "PulseScan",
      url: "https://scan.pulsechain.com",
    },
  },
  contracts: {
    // Canonical Multicall3 is deployed at the same deterministic address on
    // every major EVM chain, which lets wagmi/viem batch the scanner's
    // allowance + metadata reads into a single RPC call.
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

/**
 * Ethereum mainnet. Uses viem's canonical chain definition as the base so we
 * get the current default RPC, Multicall3 address, and Etherscan block
 * explorer metadata for free, with an optional RPC override for self-hosters
 * and preview deployments.
 */
export const mainnet = process.env.NEXT_PUBLIC_MAINNET_RPC_URL
  ? {
      ...viemMainnet,
      rpcUrls: {
        ...viemMainnet.rpcUrls,
        default: {
          ...viemMainnet.rpcUrls.default,
          http: [process.env.NEXT_PUBLIC_MAINNET_RPC_URL],
        },
      },
    }
  : viemMainnet;

/**
 * Per-chain configuration consumed by discovery, explorer helpers, the
 * scanner UI, and copy. Keep it intentionally narrow — if a value does not
 * vary by chain it stays out of here.
 */
export interface DiscoverySourceConfig {
  /** Short machine-friendly identifier surfaced in dev/debug views. */
  id: string;
  /** Human-readable source name shown in coverage copy. */
  name: string;
  /** Base URL the user can visit to learn more about the source. */
  url: string;
  /** Etherscan v1-compatible logs endpoint (Blockscout ships the same API). */
  apiUrl: string;
  /** Optional API key appended as `apikey` — required by Etherscan for
   *  non-trivial rate limits; ignored by Blockscout. */
  apiKey?: string;
  /**
   * Optional fixed query parameters appended to every discovery request.
   * Used for explorer-specific requirements (e.g. Etherscan v2 `chainid`).
   */
  queryParams?: Record<string, string>;
}

export interface ExplorerConfig {
  name: string;
  baseUrl: string;
}

export interface SupportedChainConfig {
  chain: typeof pulsechain | typeof mainnet;
  chainId: number;
  /** Short display name, e.g. "PulseChain" / "Ethereum". */
  displayName: string;
  /** Native coin symbol used in gas copy, e.g. "PLS" / "ETH". */
  nativeSymbol: string;
  explorer: ExplorerConfig;
  discovery: DiscoverySourceConfig;
}

const PULSECHAIN_EXPLORER_API_DEFAULT = "https://api.scan.pulsechain.com/api";
const MAINNET_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";

export const supportedChainConfigs: Record<number, SupportedChainConfig> = {
  [pulsechain.id]: {
    chain: pulsechain,
    chainId: pulsechain.id,
    displayName: "PulseChain",
    nativeSymbol: pulsechain.nativeCurrency.symbol,
    explorer: {
      name: "PulseScan",
      baseUrl: pulsechain.blockExplorers.default.url,
    },
    discovery: {
      id: "blockscout-pulsescan",
      name: "PulseScan (Blockscout)",
      url: pulsechain.blockExplorers.default.url,
      apiUrl:
        process.env.NEXT_PUBLIC_PULSECHAIN_EXPLORER_API ||
        PULSECHAIN_EXPLORER_API_DEFAULT,
    },
  },
  [mainnet.id]: {
    chain: mainnet,
    chainId: mainnet.id,
    displayName: "Ethereum",
    nativeSymbol: mainnet.nativeCurrency.symbol,
    explorer: {
      name: "Etherscan",
      baseUrl: mainnet.blockExplorers.default.url,
    },
    discovery: {
      id: "etherscan-mainnet",
      name: "Etherscan",
      url: mainnet.blockExplorers.default.url,
      apiUrl: MAINNET_EXPLORER_API_DEFAULT,
      apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || undefined,
      queryParams: { chainid: "1" },
    },
  },
};

export const supportedChains = [pulsechain, mainnet] as const;

export type SupportedChainId = (typeof supportedChains)[number]["id"];

export function isSupportedChainId(id: number | undefined): id is SupportedChainId {
  return typeof id === "number" && id in supportedChainConfigs;
}

/** Resolve the config for a supported chain, or `undefined` if unsupported. */
export function getChainConfig(
  chainId: number | undefined,
): SupportedChainConfig | undefined {
  if (!isSupportedChainId(chainId)) return undefined;
  return supportedChainConfigs[chainId];
}

/** Stable list of supported configs in UI display order. */
export const supportedChainConfigList: readonly SupportedChainConfig[] = [
  supportedChainConfigs[pulsechain.id],
  supportedChainConfigs[mainnet.id],
];
