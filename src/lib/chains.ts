import { defineChain, type Chain, type Address } from "viem";

/**
 * Shared scanner chain registry.
 *
 * This is the single source of truth for the generic scan + revoke + batch
 * lane. Ethereum Mainnet, Arbitrum One, and Optimism are live product chains
 * with separate verified-row lanes, so they intentionally stay out of this
 * registry until their broader write paths are separately reviewed.
 */

export const PULSECHAIN_CHAIN_ID = 369;
export const BSC_CHAIN_ID = 56;
export const BASE_CHAIN_ID = 8453;
export const POLYGON_CHAIN_ID = 137;
export const AVALANCHE_CHAIN_ID = 43114;
export const MANTLE_CHAIN_ID = 5000;
export type SupportedChainId =
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID
  | typeof AVALANCHE_CHAIN_ID
  | typeof MANTLE_CHAIN_ID;

const PULSECHAIN_RPC_DEFAULT = "https://rpc.pulsechain.com";
const BSC_RPC_DEFAULT = "https://bsc-dataseed.bnbchain.org";
const BASE_RPC_DEFAULT = "https://mainnet.base.org";
const POLYGON_RPC_DEFAULT = "https://polygon.drpc.org";
const AVALANCHE_RPC_DEFAULT = "https://api.avax.network/ext/bc/C/rpc";
const MANTLE_RPC_DEFAULT = "https://rpc.mantle.xyz";

const PULSECHAIN_EXPLORER_BASE_URL = "https://scan.pulsechain.com";
const BSC_EXPLORER_BASE_URL = "https://bscscan.com";
const BASE_EXPLORER_BASE_URL = "https://basescan.org";
const POLYGON_EXPLORER_BASE_URL = "https://polygonscan.com";
const AVALANCHE_EXPLORER_BASE_URL = "https://snowscan.xyz";
const MANTLE_EXPLORER_BASE_URL = "https://explorer.mantle.xyz";

export const PULSECHAIN_EXPLORER_API_DEFAULT =
  "https://api.scan.pulsechain.com/api";
export const BSC_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const BASE_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const POLYGON_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const AVALANCHE_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const MANTLE_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const BSC_DEPRECATED_V1_EXPLORER_API_URL =
  "https://api.bscscan.com/api";
export const BASE_DEPRECATED_V1_EXPLORER_API_URL =
  "https://api.basescan.org/api";
export const POLYGON_DEPRECATED_V1_EXPLORER_API_URL =
  "https://api.polygonscan.com/api";
export const BSC_EXPLORER_CHAIN_ID_DEFAULT = BSC_CHAIN_ID.toString();
export const BASE_EXPLORER_CHAIN_ID_DEFAULT = BASE_CHAIN_ID.toString();
export const POLYGON_EXPLORER_CHAIN_ID_DEFAULT =
  POLYGON_CHAIN_ID.toString();
export const AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT =
  AVALANCHE_CHAIN_ID.toString();
export const MANTLE_EXPLORER_CHAIN_ID_DEFAULT = MANTLE_CHAIN_ID.toString();
export const BSC_OSAKA_MAX_TRANSACTION_GAS = 16_777_216n;
export const BSC_HIGH_GAS_WARNING_THRESHOLD = 1_000_000n;

export type SupportedChainKey =
  | "pulsechain"
  | "bsc"
  | "base"
  | "polygon"
  | "avalanche"
  | "mantle";

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanApiKey(value: string | undefined): string | undefined {
  const cleaned = cleanEnv(value);
  if (!cleaned) return undefined;
  if (cleaned === "PASTE_YOUR_BSCSCAN_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_POLYGONSCAN_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_AVALANCHE_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_MANTLE_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_ETHERSCAN_V2_KEY_HERE") return undefined;
  if (cleaned === "your_bscscan_key") return undefined;
  if (cleaned === "your_polygonscan_key") return undefined;
  if (cleaned === "your_avalanche_explorer_key") return undefined;
  if (cleaned === "your_mantle_explorer_key") return undefined;
  if (cleaned === "YOUR_ETHERSCAN_V2_KEY") return undefined;
  return cleaned;
}

function withNoTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function isDeprecatedBscV1ApiUrl(value: string | undefined): boolean {
  return (
    withNoTrailingSlash(value ?? "").toLowerCase() ===
    BSC_DEPRECATED_V1_EXPLORER_API_URL
  );
}

function isDeprecatedBaseV1ApiUrl(value: string | undefined): boolean {
  return (
    withNoTrailingSlash(value ?? "").toLowerCase() ===
    BASE_DEPRECATED_V1_EXPLORER_API_URL
  );
}

function isDeprecatedPolygonV1ApiUrl(value: string | undefined): boolean {
  return (
    withNoTrailingSlash(value ?? "").toLowerCase() ===
    POLYGON_DEPRECATED_V1_EXPLORER_API_URL
  );
}

const pulsechainRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL);
const bscRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_BSC_RPC_URL);
const baseRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_BASE_RPC_URL);
const polygonRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_POLYGON_RPC_URL);
const avalancheRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL);
const mantleRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_MANTLE_RPC_URL);
const pulsechainExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_PULSECHAIN_EXPLORER_API,
);
const bscExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BSC_EXPLORER_API_URL,
);
const baseExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BASE_EXPLORER_API_URL,
);
const polygonExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_POLYGON_EXPLORER_API_URL,
);
const avalancheExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_AVALANCHE_EXPLORER_API_URL,
);
const mantleExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_MANTLE_EXPLORER_API_URL,
);
const bscExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID,
);
const baseExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID,
);
const polygonExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID,
);
const avalancheExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID,
);
const mantleExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID,
);
const bscPreferredApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_BSC_EXPLORER_API_KEY,
);
const bscScanApiKeyEnv = cleanApiKey(process.env.NEXT_PUBLIC_BSCSCAN_API_KEY);
const baseExplorerApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_BASE_EXPLORER_API_KEY,
);
const polygonExplorerApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY,
);
const avalancheExplorerApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY,
);
const mantleExplorerApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY,
);
const bscDeprecatedV1ApiConfigured = isDeprecatedBscV1ApiUrl(bscExplorerApiEnv);
const baseDeprecatedV1ApiConfigured =
  isDeprecatedBaseV1ApiUrl(baseExplorerApiEnv);
const polygonDeprecatedV1ApiConfigured =
  isDeprecatedPolygonV1ApiUrl(polygonExplorerApiEnv);
const bscExplorerChainId =
  bscExplorerChainIdEnv === BSC_EXPLORER_CHAIN_ID_DEFAULT
    ? bscExplorerChainIdEnv
    : BSC_EXPLORER_CHAIN_ID_DEFAULT;
const baseExplorerChainId =
  baseExplorerChainIdEnv === BASE_EXPLORER_CHAIN_ID_DEFAULT
    ? baseExplorerChainIdEnv
    : BASE_EXPLORER_CHAIN_ID_DEFAULT;
const polygonExplorerChainId =
  polygonExplorerChainIdEnv === POLYGON_EXPLORER_CHAIN_ID_DEFAULT
    ? polygonExplorerChainIdEnv
    : POLYGON_EXPLORER_CHAIN_ID_DEFAULT;
const avalancheExplorerChainId =
  avalancheExplorerChainIdEnv === AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT
    ? avalancheExplorerChainIdEnv
    : AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT;
const mantleExplorerChainId =
  mantleExplorerChainIdEnv === MANTLE_EXPLORER_CHAIN_ID_DEFAULT
    ? mantleExplorerChainIdEnv
    : MANTLE_EXPLORER_CHAIN_ID_DEFAULT;
const bscExplorerApiKeyEnv = bscPreferredApiKeyEnv ?? bscScanApiKeyEnv;
const bscDiscoveryWarnings = [
  bscDeprecatedV1ApiConfigured
    ? `NEXT_PUBLIC_BSC_EXPLORER_API_URL is set to the deprecated BscScan V1 endpoint (${BSC_DEPRECATED_V1_EXPLORER_API_URL}). BSC historical discovery uses ${BSC_EXPLORER_API_DEFAULT} with chainid=${BSC_EXPLORER_CHAIN_ID_DEFAULT}; update the Vercel env var to avoid confusion.`
    : null,
  bscExplorerChainIdEnv &&
  bscExplorerChainIdEnv !== BSC_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID must be ${BSC_EXPLORER_CHAIN_ID_DEFAULT} for BNB Smart Chain. The app is using chainid=${BSC_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
  !bscPreferredApiKeyEnv && bscScanApiKeyEnv
    ? "Using deprecated desktop/static fallback NEXT_PUBLIC_BSCSCAN_API_KEY. Prefer NEXT_PUBLIC_BSC_EXPLORER_API_KEY only for builds without API routes."
    : null,
].filter((warning): warning is string => Boolean(warning));
const baseDiscoveryWarnings = [
  baseDeprecatedV1ApiConfigured
    ? `NEXT_PUBLIC_BASE_EXPLORER_API_URL is set to the deprecated BaseScan V1 endpoint (${BASE_DEPRECATED_V1_EXPLORER_API_URL}). Base historical discovery uses ${BASE_EXPLORER_API_DEFAULT} with chainid=${BASE_EXPLORER_CHAIN_ID_DEFAULT}; update the Vercel env var to avoid confusion.`
    : null,
  baseExplorerChainIdEnv &&
  baseExplorerChainIdEnv !== BASE_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID must be ${BASE_EXPLORER_CHAIN_ID_DEFAULT} for Base Mainnet. The app is using chainid=${BASE_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const polygonDiscoveryWarnings = [
  polygonDeprecatedV1ApiConfigured
    ? `NEXT_PUBLIC_POLYGON_EXPLORER_API_URL is set to the deprecated PolygonScan V1 endpoint (${POLYGON_DEPRECATED_V1_EXPLORER_API_URL}). Polygon historical discovery uses ${POLYGON_EXPLORER_API_DEFAULT} with chainid=${POLYGON_EXPLORER_CHAIN_ID_DEFAULT}; update the Vercel env var to avoid confusion.`
    : null,
  polygonExplorerChainIdEnv &&
  polygonExplorerChainIdEnv !== POLYGON_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID must be ${POLYGON_EXPLORER_CHAIN_ID_DEFAULT} for Polygon Mainnet. The app is using chainid=${POLYGON_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const avalancheDiscoveryWarnings = [
  avalancheExplorerChainIdEnv &&
  avalancheExplorerChainIdEnv !== AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID must be ${AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT} for Avalanche C-Chain. The app is using chainid=${AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const mantleDiscoveryWarnings = [
  mantleExplorerChainIdEnv &&
  mantleExplorerChainIdEnv !== MANTLE_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID must be ${MANTLE_EXPLORER_CHAIN_ID_DEFAULT} for Mantle Mainnet. The app is using chainid=${MANTLE_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));

export const pulsechain = defineChain({
  id: PULSECHAIN_CHAIN_ID,
  name: "PulseChain",
  nativeCurrency: {
    name: "Pulse",
    symbol: "PLS",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [pulsechainRpcEnv ?? PULSECHAIN_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "PulseScan",
      url: PULSECHAIN_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const bsc = defineChain({
  id: BSC_CHAIN_ID,
  name: "BNB Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [bscRpcEnv ?? BSC_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "BscScan",
      url: BSC_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const base = defineChain({
  id: BASE_CHAIN_ID,
  name: "Base",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [baseRpcEnv ?? BASE_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: BASE_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const polygon = defineChain({
  id: POLYGON_CHAIN_ID,
  name: "Polygon",
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [polygonRpcEnv ?? POLYGON_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: POLYGON_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const avalanche = defineChain({
  id: AVALANCHE_CHAIN_ID,
  name: "Avalanche C-Chain",
  nativeCurrency: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [avalancheRpcEnv ?? AVALANCHE_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "SnowScan",
      url: AVALANCHE_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const mantle = defineChain({
  id: MANTLE_CHAIN_ID,
  name: "Mantle",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [mantleRpcEnv ?? MANTLE_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Explorer",
      url: MANTLE_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export interface DiscoverySourceConfig {
  /** Short machine-friendly identifier surfaced in dev/debug views. */
  id: string;
  /** Human-readable source name shown in coverage copy. */
  name: string;
  /** Provider behavior used by the request builder for API-specific params. */
  apiProviderKind?: "blockscout-compatible" | "etherscan-v2";
  /** API provider shown in diagnostics when it differs from explorer links. */
  apiProviderName?: string;
  /** Base URL the user can visit to learn more about the source. */
  url: string;
  /** Etherscan-compatible logs endpoint base URL. */
  apiUrl: string;
  /** Name of the public env var that can override `apiUrl`. */
  apiUrlEnvVar: string;
  /** Fixed Etherscan V2 chain ID query value for this discovery source. */
  apiChainId?: string;
  /** Env var name that can configure the explorer API chain ID. */
  apiChainIdEnvVar?: string;
  /** Public API key appended as `apikey` when configured. */
  apiKey?: string;
  /** Name of the public env var that contains the explorer API key. */
  apiKeyEnvVar?: string;
  /** Accepted API-key env vars in preference order. */
  apiKeyEnvVars?: readonly string[];
  /** Whether useful historical discovery requires an API key. */
  requiresApiKey?: boolean;
  /** Privacy-safe presence flag for diagnostics. Never print the key itself. */
  hasApiKey: boolean;
  /** Privacy-safe presence flag for diagnostics. */
  hasApiUrl: boolean;
  /** Whether the API URL came from the default baked-in value. */
  usesDefaultApiUrl: boolean;
  /**
   * Optional fixed query parameters appended to every discovery request.
   * Kept for explorer-specific compatibility when needed.
   */
  queryParams?: Record<string, string>;
  /** Public note used in docs/debug copy for cap/rate-limit expectations. */
  limitations: string;
  /** Source-specific API-key error. */
  missingApiKeyMessage?: string;
  /** Privacy-safe configuration warnings surfaced in diagnostics. */
  warnings?: readonly string[];
}

export interface ExplorerUrlBuilders {
  address: (address: Address | string) => string;
  token: (address: Address | string) => string;
  transaction: (hash: string) => string;
}

export interface ExplorerConfig {
  name: string;
  baseUrl: string;
  apiUrl: string;
  apiUrlEnvVar: string;
  apiKeyEnvVar?: string;
  urls: ExplorerUrlBuilders;
}

export interface RpcConfig {
  envVar: string;
  defaultUrl: string;
  url: string;
  usesDefault: boolean;
  hasEnvOverride: boolean;
}

export interface ChainStandardLabels {
  /** User-facing fungible token standard for this chain. */
  fungible: string;
  /** User-facing NFT single-token collection standard for this chain. */
  nft: string;
  /** User-facing multi-token NFT / semi-fungible standard for this chain. */
  multiToken: string;
  /** User-facing generic label for shared NFT operator approvals. */
  nftOperator: string;
}

export interface DiscoverySettings {
  sourceKind: "explorer-logs";
  providerName: string;
  approvalEventTopicMode: "topic0-topic1-owner";
  defaultFromBlock: string;
  defaultToBlock: string;
  pageSize: number;
  historicalRpcLogs: "disabled";
  capWarning: string;
}

export interface SupportedChainConfig {
  key: SupportedChainKey;
  chain: Chain;
  chainId: SupportedChainId;
  displayName: string;
  shortName: string;
  nativeSymbol: string;
  rpc: RpcConfig;
  explorer: ExplorerConfig;
  discovery: DiscoverySourceConfig;
  discoverySettings: DiscoverySettings;
  standardLabels: ChainStandardLabels;
  maxTransactionGas?: bigint;
  highGasWarningThreshold?: bigint;
}

function explorerUrls(baseUrl: string): ExplorerUrlBuilders {
  const base = withNoTrailingSlash(baseUrl);
  return {
    address: (address) => `${base}/address/${address}`,
    token: (address) => `${base}/token/${address}`,
    transaction: (hash) => `${base}/tx/${hash}`,
  };
}

function buildRpcConfig(
  envVar: string,
  defaultUrl: string,
  env: string | undefined,
): RpcConfig {
  return {
    envVar,
    defaultUrl,
    url: env ?? defaultUrl,
    usesDefault: !env,
    hasEnvOverride: Boolean(env),
  };
}

function buildDiscoveryConfig(args: {
  id: string;
  name: string;
  apiProviderKind?: DiscoverySourceConfig["apiProviderKind"];
  apiProviderName?: string;
  url: string;
  apiUrlEnvVar: string;
  apiUrlDefault: string;
  apiChainId?: string;
  apiChainIdEnvVar?: string;
  apiKeyEnvVar?: string;
  apiKeyEnvVars?: readonly string[];
  requiresApiKey?: boolean;
  queryParams?: Record<string, string>;
  limitations: string;
  missingApiKeyMessage?: string;
  warnings?: readonly string[];
  apiUrlEnv?: string;
  apiKeyEnv?: string;
}): DiscoverySourceConfig {
  const apiUrl = args.apiUrlEnv ?? args.apiUrlDefault;
  const apiKey = args.apiKeyEnv;

  return {
    id: args.id,
    name: args.name,
    apiProviderKind: args.apiProviderKind,
    apiProviderName: args.apiProviderName,
    url: args.url,
    apiUrl,
    apiUrlEnvVar: args.apiUrlEnvVar,
    apiChainId: args.apiChainId,
    apiChainIdEnvVar: args.apiChainIdEnvVar,
    apiKey,
    apiKeyEnvVar: args.apiKeyEnvVar,
    apiKeyEnvVars: args.apiKeyEnvVars,
    requiresApiKey: args.requiresApiKey,
    hasApiKey: Boolean(apiKey),
    hasApiUrl: Boolean(apiUrl),
    usesDefaultApiUrl: !args.apiUrlEnv,
    queryParams: args.queryParams,
    limitations: args.limitations,
    missingApiKeyMessage: args.missingApiKeyMessage,
    warnings: args.warnings,
  };
}

const pulsechainRpc = buildRpcConfig(
  "NEXT_PUBLIC_PULSECHAIN_RPC_URL",
  PULSECHAIN_RPC_DEFAULT,
  pulsechainRpcEnv,
);
const bscRpc = buildRpcConfig(
  "NEXT_PUBLIC_BSC_RPC_URL",
  BSC_RPC_DEFAULT,
  bscRpcEnv,
);
const baseRpc = buildRpcConfig(
  "NEXT_PUBLIC_BASE_RPC_URL",
  BASE_RPC_DEFAULT,
  baseRpcEnv,
);
const polygonRpc = buildRpcConfig(
  "NEXT_PUBLIC_POLYGON_RPC_URL",
  POLYGON_RPC_DEFAULT,
  polygonRpcEnv,
);
const avalancheRpc = buildRpcConfig(
  "NEXT_PUBLIC_AVALANCHE_RPC_URL",
  AVALANCHE_RPC_DEFAULT,
  avalancheRpcEnv,
);
const mantleRpc = buildRpcConfig(
  "NEXT_PUBLIC_MANTLE_RPC_URL",
  MANTLE_RPC_DEFAULT,
  mantleRpcEnv,
);

const pulsechainDiscovery = buildDiscoveryConfig({
  id: "blockscout-pulsescan",
  name: "PulseScan (Blockscout)",
  apiProviderKind: "blockscout-compatible",
  url: PULSECHAIN_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_PULSECHAIN_EXPLORER_API",
  apiUrlDefault: PULSECHAIN_EXPLORER_API_DEFAULT,
  apiUrlEnv: pulsechainExplorerApiEnv,
  limitations:
    "PulseScan log discovery is windowed and may report truncation when explorer caps are reached.",
});

const bscDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-bsc",
  name: "Etherscan API V2 (BSC logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: BSC_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_BSC_EXPLORER_API_URL",
  apiUrlDefault: BSC_EXPLORER_API_DEFAULT,
  apiChainId: bscExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_BSC_EXPLORER_API_KEY",
  apiKeyEnvVars: [
    "NEXT_PUBLIC_BSC_EXPLORER_API_KEY",
    "NEXT_PUBLIC_BSCSCAN_API_KEY",
  ],
  apiUrlEnv: bscDeprecatedV1ApiConfigured ? undefined : bscExplorerApiEnv,
  apiKeyEnv: bscExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: bscExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for BNB Smart Chain logs.",
  missingApiKeyMessage:
    "BSC historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_BSC_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use BSC_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: bscDiscoveryWarnings,
});

const baseDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-base",
  name: "Etherscan API V2 (Base logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: BASE_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_BASE_EXPLORER_API_URL",
  apiUrlDefault: BASE_EXPLORER_API_DEFAULT,
  apiChainId: baseExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_BASE_EXPLORER_API_KEY",
  apiKeyEnvVars: ["NEXT_PUBLIC_BASE_EXPLORER_API_KEY"],
  apiUrlEnv: baseDeprecatedV1ApiConfigured ? undefined : baseExplorerApiEnv,
  apiKeyEnv: baseExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: baseExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Base logs.",
  missingApiKeyMessage:
    "Base historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_BASE_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use BASE_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: baseDiscoveryWarnings,
});

const polygonDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-polygon",
  name: "Etherscan API V2 (Polygon logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: POLYGON_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_POLYGON_EXPLORER_API_URL",
  apiUrlDefault: POLYGON_EXPLORER_API_DEFAULT,
  apiChainId: polygonExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY",
  apiKeyEnvVars: ["NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY"],
  apiUrlEnv: polygonDeprecatedV1ApiConfigured
    ? undefined
    : polygonExplorerApiEnv,
  apiKeyEnv: polygonExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: polygonExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Polygon logs.",
  missingApiKeyMessage:
    "Polygon historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use POLYGON_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: polygonDiscoveryWarnings,
});

const avalancheDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-avalanche",
  name: "Etherscan API V2 (Avalanche logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: AVALANCHE_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_AVALANCHE_EXPLORER_API_URL",
  apiUrlDefault: AVALANCHE_EXPLORER_API_DEFAULT,
  apiChainId: avalancheExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY",
  apiKeyEnvVars: ["NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY"],
  apiUrlEnv: avalancheExplorerApiEnv,
  apiKeyEnv: avalancheExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: avalancheExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Avalanche C-Chain logs.",
  missingApiKeyMessage:
    "Avalanche historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use AVALANCHE_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: avalancheDiscoveryWarnings,
});

const mantleDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-mantle",
  name: "Etherscan API V2 (Mantle logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: MANTLE_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_MANTLE_EXPLORER_API_URL",
  apiUrlDefault: MANTLE_EXPLORER_API_DEFAULT,
  apiChainId: mantleExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY",
  apiKeyEnvVars: ["NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY"],
  apiUrlEnv: mantleExplorerApiEnv,
  apiKeyEnv: mantleExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: mantleExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Mantle logs.",
  missingApiKeyMessage:
    "Mantle historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use MANTLE_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: mantleDiscoveryWarnings,
});

export const supportedChainConfigs = {
  [PULSECHAIN_CHAIN_ID]: {
    key: "pulsechain",
    chain: pulsechain,
    chainId: PULSECHAIN_CHAIN_ID,
    displayName: "PulseChain",
    shortName: "PulseChain",
    nativeSymbol: "PLS",
    rpc: pulsechainRpc,
    explorer: {
      name: "PulseScan",
      baseUrl: PULSECHAIN_EXPLORER_BASE_URL,
      apiUrl: pulsechainDiscovery.apiUrl,
      apiUrlEnvVar: pulsechainDiscovery.apiUrlEnvVar,
      urls: explorerUrls(PULSECHAIN_EXPLORER_BASE_URL),
    },
    discovery: pulsechainDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "PulseScan",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "PulseScan can cap large log responses; the scanner reports truncation instead of showing a false clear state.",
    },
    standardLabels: {
      fungible: "PRC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [BSC_CHAIN_ID]: {
    key: "bsc",
    chain: bsc,
    chainId: BSC_CHAIN_ID,
    displayName: "BNB Smart Chain",
    shortName: "BSC",
    nativeSymbol: "BNB",
    rpc: bscRpc,
    explorer: {
      name: "BscScan",
      baseUrl: BSC_EXPLORER_BASE_URL,
      apiUrl: bscDiscovery.apiUrl,
      apiUrlEnvVar: bscDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: bscDiscovery.apiKeyEnvVar,
      urls: explorerUrls(BSC_EXPLORER_BASE_URL),
    },
    discovery: bscDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for BSC logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "BEP-20",
      nft: "BEP-721",
      multiToken: "BEP-1155",
      nftOperator: "BEP-721/BEP-1155",
    },
    maxTransactionGas: BSC_OSAKA_MAX_TRANSACTION_GAS,
    highGasWarningThreshold: BSC_HIGH_GAS_WARNING_THRESHOLD,
  },
  [BASE_CHAIN_ID]: {
    key: "base",
    chain: base,
    chainId: BASE_CHAIN_ID,
    displayName: "Base",
    shortName: "Base",
    nativeSymbol: "ETH",
    rpc: baseRpc,
    explorer: {
      name: "BaseScan",
      baseUrl: BASE_EXPLORER_BASE_URL,
      apiUrl: baseDiscovery.apiUrl,
      apiUrlEnvVar: baseDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: baseDiscovery.apiKeyEnvVar,
      urls: explorerUrls(BASE_EXPLORER_BASE_URL),
    },
    discovery: baseDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Base logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [POLYGON_CHAIN_ID]: {
    key: "polygon",
    chain: polygon,
    chainId: POLYGON_CHAIN_ID,
    displayName: "Polygon",
    shortName: "Polygon",
    nativeSymbol: "POL",
    rpc: polygonRpc,
    explorer: {
      name: "PolygonScan",
      baseUrl: POLYGON_EXPLORER_BASE_URL,
      apiUrl: polygonDiscovery.apiUrl,
      apiUrlEnvVar: polygonDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: polygonDiscovery.apiKeyEnvVar,
      urls: explorerUrls(POLYGON_EXPLORER_BASE_URL),
    },
    discovery: polygonDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Polygon logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [AVALANCHE_CHAIN_ID]: {
    key: "avalanche",
    chain: avalanche,
    chainId: AVALANCHE_CHAIN_ID,
    displayName: "Avalanche C-Chain",
    shortName: "Avalanche",
    nativeSymbol: "AVAX",
    rpc: avalancheRpc,
    explorer: {
      name: "SnowScan",
      baseUrl: AVALANCHE_EXPLORER_BASE_URL,
      apiUrl: avalancheDiscovery.apiUrl,
      apiUrlEnvVar: avalancheDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: avalancheDiscovery.apiKeyEnvVar,
      urls: explorerUrls(AVALANCHE_EXPLORER_BASE_URL),
    },
    discovery: avalancheDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Avalanche logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [MANTLE_CHAIN_ID]: {
    key: "mantle",
    chain: mantle,
    chainId: MANTLE_CHAIN_ID,
    displayName: "Mantle",
    shortName: "Mantle",
    nativeSymbol: "MNT",
    rpc: mantleRpc,
    explorer: {
      name: "Mantle Explorer",
      baseUrl: MANTLE_EXPLORER_BASE_URL,
      apiUrl: mantleDiscovery.apiUrl,
      apiUrlEnvVar: mantleDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: mantleDiscovery.apiKeyEnvVar,
      urls: explorerUrls(MANTLE_EXPLORER_BASE_URL),
    },
    discovery: mantleDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Mantle logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
} as const satisfies Record<number, SupportedChainConfig>;

export const supportedChains = [
  pulsechain,
  bsc,
  base,
  polygon,
  avalanche,
  mantle,
] as const;

export function isSupportedChainId(
  id: number | undefined,
): id is SupportedChainId {
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
export const supportedChainConfigList = [
  supportedChainConfigs[PULSECHAIN_CHAIN_ID],
  supportedChainConfigs[BSC_CHAIN_ID],
  supportedChainConfigs[BASE_CHAIN_ID],
  supportedChainConfigs[POLYGON_CHAIN_ID],
  supportedChainConfigs[AVALANCHE_CHAIN_ID],
  supportedChainConfigs[MANTLE_CHAIN_ID],
] as const;

function joinNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" or ");
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
}

export function getSupportedChainNames(): string {
  return joinNames(supportedChainConfigList.map((c) => c.displayName));
}

export function getSupportedChainShortNames(): string {
  return joinNames(supportedChainConfigList.map((c) => c.shortName));
}
