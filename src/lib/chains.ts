import { defineChain, type Chain, type Address } from "viem";

/**
 * Supported chain registry.
 *
 * This is the single source of truth for active app chains. The active list is
 * intentionally narrow: PulseChain mainnet and BNB Smart Chain only.
 */

export const PULSECHAIN_CHAIN_ID = 369;
export const BSC_CHAIN_ID = 56;
export type SupportedChainId =
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID;

const PULSECHAIN_RPC_DEFAULT = "https://rpc.pulsechain.com";
const BSC_RPC_DEFAULT = "https://bsc-dataseed.bnbchain.org";

const PULSECHAIN_EXPLORER_BASE_URL = "https://scan.pulsechain.com";
const BSC_EXPLORER_BASE_URL = "https://bscscan.com";

export const PULSECHAIN_EXPLORER_API_DEFAULT =
  "https://api.scan.pulsechain.com/api";
export const BSC_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const BSC_DEPRECATED_V1_EXPLORER_API_URL =
  "https://api.bscscan.com/api";
export const BSC_EXPLORER_CHAIN_ID_DEFAULT = BSC_CHAIN_ID.toString();

export type SupportedChainKey = "pulsechain" | "bsc";

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanApiKey(value: string | undefined): string | undefined {
  const cleaned = cleanEnv(value);
  if (!cleaned) return undefined;
  if (cleaned === "PASTE_YOUR_BSCSCAN_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_ETHERSCAN_V2_KEY_HERE") return undefined;
  if (cleaned === "your_bscscan_key") return undefined;
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

const pulsechainRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL);
const bscRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_BSC_RPC_URL);
const pulsechainExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_PULSECHAIN_EXPLORER_API,
);
const bscExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BSC_EXPLORER_API_URL,
);
const bscExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID,
);
const bscPreferredApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_BSC_EXPLORER_API_KEY,
);
const bscScanApiKeyEnv = cleanApiKey(process.env.NEXT_PUBLIC_BSCSCAN_API_KEY);
const bscDeprecatedV1ApiConfigured = isDeprecatedBscV1ApiUrl(bscExplorerApiEnv);
const bscExplorerChainId =
  bscExplorerChainIdEnv === BSC_EXPLORER_CHAIN_ID_DEFAULT
    ? bscExplorerChainIdEnv
    : BSC_EXPLORER_CHAIN_ID_DEFAULT;
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
    ? "Using deprecated fallback NEXT_PUBLIC_BSCSCAN_API_KEY. Prefer NEXT_PUBLIC_BSC_EXPLORER_API_KEY for the Etherscan API V2 key."
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

export interface DiscoverySourceConfig {
  /** Short machine-friendly identifier surfaced in dev/debug views. */
  id: string;
  /** Human-readable source name shown in coverage copy. */
  name: string;
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

const pulsechainDiscovery = buildDiscoveryConfig({
  id: "blockscout-pulsescan",
  name: "PulseScan (Blockscout)",
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
    "BSC historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_BSC_EXPLORER_API_KEY to an Etherscan V2 API key with BNB Smart Chain access. NEXT_PUBLIC_BSCSCAN_API_KEY is only a deprecated fallback.",
  warnings: bscDiscoveryWarnings,
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
  },
} as const satisfies Record<number, SupportedChainConfig>;

export const supportedChains = [pulsechain, bsc] as const;

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
] as const;

export function getSupportedChainNames(): string {
  return supportedChainConfigList.map((c) => c.displayName).join(" or ");
}
