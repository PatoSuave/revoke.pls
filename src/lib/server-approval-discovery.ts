import "server-only";

import { getAddress, isAddress, type Address } from "viem";

import {
  ABSTRACT_CHAIN_ID,
  ABSTRACT_EXPLORER_API_DEFAULT,
  ABSTRACT_EXPLORER_CHAIN_ID_DEFAULT,
  APECHAIN_CHAIN_ID,
  APECHAIN_EXPLORER_API_DEFAULT,
  APECHAIN_EXPLORER_CHAIN_ID_DEFAULT,
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
  BSC_EXPLORER_API_DEFAULT,
  BSC_EXPLORER_CHAIN_ID_DEFAULT,
  FRAXTAL_CHAIN_ID,
  FRAXTAL_EXPLORER_API_DEFAULT,
  FRAXTAL_EXPLORER_CHAIN_ID_DEFAULT,
  KATANA_CHAIN_ID,
  KATANA_EXPLORER_API_DEFAULT,
  KATANA_EXPLORER_CHAIN_ID_DEFAULT,
  CELO_CHAIN_ID,
  CELO_EXPLORER_API_DEFAULT,
  CELO_EXPLORER_CHAIN_ID_DEFAULT,
  GNOSIS_CHAIN_ID,
  GNOSIS_EXPLORER_API_DEFAULT,
  GNOSIS_EXPLORER_CHAIN_ID_DEFAULT,
  LINEA_CHAIN_ID,
  LINEA_EXPLORER_API_DEFAULT,
  LINEA_EXPLORER_CHAIN_ID_DEFAULT,
  MANTLE_CHAIN_ID,
  MANTLE_EXPLORER_API_DEFAULT,
  MANTLE_EXPLORER_CHAIN_ID_DEFAULT,
  MONAD_CHAIN_ID,
  MONAD_EXPLORER_API_DEFAULT,
  MONAD_EXPLORER_CHAIN_ID_DEFAULT,
  MOONBEAM_CHAIN_ID,
  MOONBEAM_EXPLORER_API_DEFAULT,
  MOONBEAM_EXPLORER_CHAIN_ID_DEFAULT,
  OPBNB_CHAIN_ID,
  OPBNB_EXPLORER_API_DEFAULT,
  OPBNB_EXPLORER_CHAIN_ID_DEFAULT,
  PLASMA_CHAIN_ID,
  PLASMA_EXPLORER_API_DEFAULT,
  PLASMA_EXPLORER_CHAIN_ID_DEFAULT,
  POLYGON_CHAIN_ID,
  POLYGON_EXPLORER_API_DEFAULT,
  POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
  PULSECHAIN_CHAIN_ID,
  PULSECHAIN_EXPLORER_API_DEFAULT,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER_API_DEFAULT,
  SEI_CHAIN_ID,
  SEI_EXPLORER_API_DEFAULT,
  SEI_EXPLORER_CHAIN_ID_DEFAULT,
  SONIC_CHAIN_ID,
  SONIC_EXPLORER_API_DEFAULT,
  SONIC_EXPLORER_CHAIN_ID_DEFAULT,
  TAIKO_CHAIN_ID,
  TAIKO_EXPLORER_API_DEFAULT,
  TAIKO_EXPLORER_CHAIN_ID_DEFAULT,
  UNICHAIN_CHAIN_ID,
  UNICHAIN_EXPLORER_API_DEFAULT,
  UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT,
  WORLDCHAIN_CHAIN_ID,
  WORLDCHAIN_EXPLORER_API_DEFAULT,
  WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT,
  XDC_CHAIN_ID,
  XDC_EXPLORER_API_DEFAULT,
  XDC_EXPLORER_CHAIN_ID_DEFAULT,
  type DiscoverySourceConfig,
} from "@/lib/chains";
import {
  serializeDiscoveryResult,
  serializeNftDiscoveryResult,
  serializePermit2DiscoveryResult,
  type ServerApprovalDiscoveryResponse,
  type ServerNftDiscoveryResponse,
} from "@/lib/approval-discovery-api";
import {
  createBlockscoutDiscoverySource,
  createOtterscanTransactionDiscoverySource,
  createRpcLogDiscoverySource,
  type DiscoveryResult,
  type DiscoverySource,
  type NftDiscoveryResult,
  type Permit2DiscoveryResult,
} from "@/lib/discovery";

const SERVER_DISCOVERY_REQUEST_TIMEOUT_MS = 55_000;
const SERVER_DISCOVERY_PRIMARY_ATTEMPT_TIMEOUT_MS = 12_000;
const MANAGED_RPC_FALLBACK_ATTEMPT_TIMEOUT_MS = 6_000;
const OTTERSCAN_TRANSACTION_FALLBACK_ATTEMPT_TIMEOUT_MS = 20_000;
const SMALL_RPC_FALLBACK_ATTEMPT_TIMEOUT_MS = 8_000;
const SERVER_DISCOVERY_EXPLORER_MIN_INTERVAL_MS = 350;
const PULSECHAIN_PUBLIC_RPC_URL = "https://rpc.pulsechain.com";
const PULSECHAIN_OTHERSCAN_RPC_URL = "https://rpc.pulsechain.box";
const SERVER_DISCOVERY_LIMITS = {
  maxRequests: 40,
  maxRawLogs: 20_000,
  requestTimeoutMs: 8_000,
  pageCap: 1000,
  minSplitSpan: 64,
  maxInitialBlockSpan: 2_000_000,
  retryAttempts: 1,
  retryDelayMs: 500,
  minRequestIntervalMs: SERVER_DISCOVERY_EXPLORER_MIN_INTERVAL_MS,
} as const;
const PULSECHAIN_MANAGED_RPC_DISCOVERY_LIMITS = {
  ...SERVER_DISCOVERY_LIMITS,
  maxRequests: 20,
  requestTimeoutMs: 5_000,
  retryAttempts: 0,
} as const;
const PULSECHAIN_SMALL_RPC_DISCOVERY_LIMITS = {
  ...SERVER_DISCOVERY_LIMITS,
  maxRequests: 4,
  requestTimeoutMs: 5_000,
  maxInitialBlockSpan: 10_000,
  retryAttempts: 0,
} as const;
const PULSECHAIN_OTTERSCAN_TRANSACTION_DISCOVERY_LIMITS = {
  ...SERVER_DISCOVERY_LIMITS,
  maxRequests: 18,
  requestTimeoutMs: 5_000,
  pageCap: 500,
  maxInitialBlockSpan: undefined,
  retryAttempts: 0,
  minRequestIntervalMs: 0,
} as const;

const CHAIN_CONFIGS = {
  [PULSECHAIN_CHAIN_ID]: {
    displayName: "PulseChain",
    explorerBaseUrl: "https://scan.pulsechain.com",
    apiUrlDefault: PULSECHAIN_EXPLORER_API_DEFAULT,
    apiUrlEnvNames: [
      "PULSECHAIN_EXPLORER_API_URL",
      "NEXT_PUBLIC_PULSECHAIN_EXPLORER_API",
    ],
    apiKeyEnvNames: [],
    apiChainIdDefault: undefined,
    apiChainIdEnvNames: [],
    apiProviderKind: "blockscout-compatible",
    apiProviderName: "PulseScan",
    requiresApiKey: false,
    fallbackRpcEnvNames: [
      "PULSECHAIN_DISCOVERY_RPC_URL",
      "PULSECHAIN_RPC_URL",
      "PULSECHAIN_MAINNET_RPC_URL",
    ],
    otherScanRpcUrlDefault: PULSECHAIN_OTHERSCAN_RPC_URL,
    otherScanRpcEnvNames: ["PULSECHAIN_OTHERSCAN_RPC_URL"],
  },
  [BSC_CHAIN_ID]: {
    displayName: "BSC",
    explorerBaseUrl: "https://bscscan.com",
    apiUrlDefault: BSC_EXPLORER_API_DEFAULT,
    apiChainIdDefault: BSC_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["BSC_EXPLORER_API_URL"],
    apiKeyEnvNames: ["BSC_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["BSC_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [BASE_CHAIN_ID]: {
    displayName: "Base",
    explorerBaseUrl: "https://basescan.org",
    apiUrlDefault: BASE_EXPLORER_API_DEFAULT,
    apiChainIdDefault: BASE_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["BASE_EXPLORER_API_URL"],
    apiKeyEnvNames: ["BASE_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["BASE_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [POLYGON_CHAIN_ID]: {
    displayName: "Polygon",
    explorerBaseUrl: "https://polygonscan.com",
    apiUrlDefault: POLYGON_EXPLORER_API_DEFAULT,
    apiChainIdDefault: POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["POLYGON_EXPLORER_API_URL"],
    apiKeyEnvNames: ["POLYGON_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["POLYGON_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [SONIC_CHAIN_ID]: {
    displayName: "Sonic",
    explorerBaseUrl: "https://sonicscan.org",
    apiUrlDefault: SONIC_EXPLORER_API_DEFAULT,
    apiChainIdDefault: SONIC_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["SONIC_EXPLORER_API_URL"],
    apiKeyEnvNames: ["SONIC_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["SONIC_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [AVALANCHE_CHAIN_ID]: {
    displayName: "Avalanche",
    explorerBaseUrl: "https://snowscan.xyz",
    apiUrlDefault: AVALANCHE_EXPLORER_API_DEFAULT,
    apiChainIdDefault: AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["AVALANCHE_EXPLORER_API_URL"],
    apiKeyEnvNames: ["AVALANCHE_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["AVALANCHE_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [MANTLE_CHAIN_ID]: {
    displayName: "Mantle",
    explorerBaseUrl: "https://explorer.mantle.xyz",
    apiUrlDefault: MANTLE_EXPLORER_API_DEFAULT,
    apiChainIdDefault: MANTLE_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["MANTLE_EXPLORER_API_URL"],
    apiKeyEnvNames: ["MANTLE_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["MANTLE_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [LINEA_CHAIN_ID]: {
    displayName: "Linea",
    explorerBaseUrl: "https://lineascan.build",
    apiUrlDefault: LINEA_EXPLORER_API_DEFAULT,
    apiChainIdDefault: LINEA_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["LINEA_EXPLORER_API_URL"],
    apiKeyEnvNames: ["LINEA_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["LINEA_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [BLAST_CHAIN_ID]: {
    displayName: "Blast",
    explorerBaseUrl: "https://blastscan.io",
    apiUrlDefault: BLAST_EXPLORER_API_DEFAULT,
    apiChainIdDefault: BLAST_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["BLAST_EXPLORER_API_URL"],
    apiKeyEnvNames: ["BLAST_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["BLAST_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [BERACHAIN_CHAIN_ID]: {
    displayName: "Berachain",
    explorerBaseUrl: "https://berascan.com",
    apiUrlDefault: BERACHAIN_EXPLORER_API_DEFAULT,
    apiChainIdDefault: BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["BERACHAIN_EXPLORER_API_URL"],
    apiKeyEnvNames: ["BERACHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["BERACHAIN_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [CELO_CHAIN_ID]: {
    displayName: "Celo",
    explorerBaseUrl: "https://celoscan.io",
    apiUrlDefault: CELO_EXPLORER_API_DEFAULT,
    apiChainIdDefault: CELO_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["CELO_EXPLORER_API_URL"],
    apiKeyEnvNames: ["CELO_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["CELO_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [GNOSIS_CHAIN_ID]: {
    displayName: "Gnosis",
    explorerBaseUrl: "https://gnosisscan.io",
    apiUrlDefault: GNOSIS_EXPLORER_API_DEFAULT,
    apiChainIdDefault: GNOSIS_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["GNOSIS_EXPLORER_API_URL"],
    apiKeyEnvNames: ["GNOSIS_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["GNOSIS_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [UNICHAIN_CHAIN_ID]: {
    displayName: "Unichain",
    explorerBaseUrl: "https://uniscan.xyz",
    apiUrlDefault: UNICHAIN_EXPLORER_API_DEFAULT,
    apiChainIdDefault: UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["UNICHAIN_EXPLORER_API_URL"],
    apiKeyEnvNames: ["UNICHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["UNICHAIN_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [WORLDCHAIN_CHAIN_ID]: {
    displayName: "World Chain",
    explorerBaseUrl: "https://worldscan.org",
    apiUrlDefault: WORLDCHAIN_EXPLORER_API_DEFAULT,
    apiChainIdDefault: WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["WORLDCHAIN_EXPLORER_API_URL"],
    apiKeyEnvNames: ["WORLDCHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["WORLDCHAIN_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [ROBINHOOD_CHAIN_ID]: {
    displayName: "Robinhood Chain",
    explorerBaseUrl: "https://robinhoodchain.blockscout.com",
    apiUrlDefault: ROBINHOOD_EXPLORER_API_DEFAULT,
    apiUrlEnvNames: [
      "ROBINHOOD_EXPLORER_API_URL",
      "NEXT_PUBLIC_ROBINHOOD_EXPLORER_API_URL",
    ],
    apiKeyEnvNames: [],
    apiChainIdDefault: undefined,
    apiChainIdEnvNames: [],
    apiProviderKind: "blockscout-compatible",
    apiProviderName: "Robinhood Blockscout",
    requiresApiKey: false,
  },
  [MONAD_CHAIN_ID]: {
    displayName: "Monad",
    explorerBaseUrl: "https://monadscan.com",
    apiUrlDefault: MONAD_EXPLORER_API_DEFAULT,
    apiChainIdDefault: MONAD_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["MONAD_EXPLORER_API_URL"],
    apiKeyEnvNames: ["MONAD_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["MONAD_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [KATANA_CHAIN_ID]: {
    displayName: "Katana",
    explorerBaseUrl: "https://katanascan.com",
    apiUrlDefault: KATANA_EXPLORER_API_DEFAULT,
    apiChainIdDefault: KATANA_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["KATANA_EXPLORER_API_URL"],
    apiKeyEnvNames: ["KATANA_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["KATANA_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [SEI_CHAIN_ID]: {
    displayName: "Sei",
    explorerBaseUrl: "https://seiscan.io",
    apiUrlDefault: SEI_EXPLORER_API_DEFAULT,
    apiChainIdDefault: SEI_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["SEI_EXPLORER_API_URL"],
    apiKeyEnvNames: ["SEI_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["SEI_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [PLASMA_CHAIN_ID]: {
    displayName: "Plasma",
    explorerBaseUrl: "https://plasmascan.to",
    apiUrlDefault: PLASMA_EXPLORER_API_DEFAULT,
    apiChainIdDefault: PLASMA_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["PLASMA_EXPLORER_API_URL"],
    apiKeyEnvNames: ["PLASMA_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["PLASMA_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [ABSTRACT_CHAIN_ID]: {
    displayName: "Abstract",
    explorerBaseUrl: "https://abscan.org",
    apiUrlDefault: ABSTRACT_EXPLORER_API_DEFAULT,
    apiChainIdDefault: ABSTRACT_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["ABSTRACT_EXPLORER_API_URL"],
    apiKeyEnvNames: ["ABSTRACT_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["ABSTRACT_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [FRAXTAL_CHAIN_ID]: {
    displayName: "Fraxtal",
    explorerBaseUrl: "https://fraxscan.com",
    apiUrlDefault: FRAXTAL_EXPLORER_API_DEFAULT,
    apiChainIdDefault: FRAXTAL_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["FRAXTAL_EXPLORER_API_URL"],
    apiKeyEnvNames: ["FRAXTAL_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["FRAXTAL_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [TAIKO_CHAIN_ID]: {
    displayName: "Taiko Mainnet",
    explorerBaseUrl: "https://taikoscan.io",
    apiUrlDefault: TAIKO_EXPLORER_API_DEFAULT,
    apiChainIdDefault: TAIKO_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["TAIKO_EXPLORER_API_URL"],
    apiKeyEnvNames: ["TAIKO_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["TAIKO_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [OPBNB_CHAIN_ID]: {
    displayName: "opBNB",
    explorerBaseUrl: "https://opbnb.bscscan.com",
    apiUrlDefault: OPBNB_EXPLORER_API_DEFAULT,
    apiChainIdDefault: OPBNB_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["OPBNB_EXPLORER_API_URL"],
    apiKeyEnvNames: ["OPBNB_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["OPBNB_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [MOONBEAM_CHAIN_ID]: {
    displayName: "Moonbeam",
    explorerBaseUrl: "https://moonbeam.moonscan.io",
    apiUrlDefault: MOONBEAM_EXPLORER_API_DEFAULT,
    apiChainIdDefault: MOONBEAM_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["MOONBEAM_EXPLORER_API_URL"],
    apiKeyEnvNames: ["MOONBEAM_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["MOONBEAM_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [APECHAIN_CHAIN_ID]: {
    displayName: "ApeChain",
    explorerBaseUrl: "https://apescan.io",
    apiUrlDefault: APECHAIN_EXPLORER_API_DEFAULT,
    apiChainIdDefault: APECHAIN_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["APECHAIN_EXPLORER_API_URL"],
    apiKeyEnvNames: ["APECHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["APECHAIN_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
  [XDC_CHAIN_ID]: {
    displayName: "XDC Network",
    explorerBaseUrl: "https://xdcscan.com",
    apiUrlDefault: XDC_EXPLORER_API_DEFAULT,
    apiChainIdDefault: XDC_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["XDC_EXPLORER_API_URL"],
    apiKeyEnvNames: ["XDC_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["XDC_EXPLORER_CHAIN_ID"],
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    requiresApiKey: true,
  },
} as const;

type ServerDiscoveryChainId = keyof typeof CHAIN_CONFIGS;

export function normalizeServerDiscoveryOwner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function isServerDiscoveryChainId(
  value: number,
): value is ServerDiscoveryChainId {
  return value in CHAIN_CONFIGS;
}

function slugifyServerSource(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function serverDiscoveryProviderName(
  settings: (typeof CHAIN_CONFIGS)[ServerDiscoveryChainId],
): string {
  if (settings.apiProviderKind === "etherscan-v2") return "Etherscan API V2";
  return settings.apiProviderName ?? "Blockscout";
}

function serverDiscoverySourceId(
  settings: (typeof CHAIN_CONFIGS)[ServerDiscoveryChainId],
): string {
  if (settings.apiProviderKind === "etherscan-v2") {
    return `server-etherscan-v2-${settings.displayName.toLowerCase()}`;
  }
  if (settings.apiProviderName === "PulseScan") {
    return `server-pulsescan-${settings.displayName.toLowerCase()}`;
  }
  return `server-blockscout-${slugifyServerSource(settings.displayName)}`;
}

function serverDiscoverySourceName(
  settings: (typeof CHAIN_CONFIGS)[ServerDiscoveryChainId],
): string {
  return `Server-side ${serverDiscoveryProviderName(settings)} (${settings.displayName} logs)`;
}

export async function discoverServerErc20Approvals({
  chainId,
  owner,
  signal,
  env = process.env,
}: {
  chainId: ServerDiscoveryChainId;
  owner: Address;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
}): Promise<ServerApprovalDiscoveryResponse> {
  const config = resolveServerDiscoveryConfig(chainId, env);
  if (config.missingConfig.length > 0) {
    return emptyApprovalResponse(chainId, "config-missing", {
      errors: [
        `${CHAIN_CONFIGS[chainId].displayName} approval discovery is not configured.`,
      ],
      missingConfig: config.missingConfig,
    });
  }

  const discovery = await discoverServerErc20WithFallback({
    chainId,
    owner,
    signal,
    config,
  });
  if ("response" in discovery) return discovery.response;

  const { erc20, permit2 } = discovery;
  const serializedErc20 = serializeDiscoveryResult(erc20);
  const serializedPermit2 = serializePermit2DiscoveryResult(permit2);
  const verificationIncomplete =
    serializedErc20.truncated || serializedPermit2.truncated;

  return {
    ok: true,
    status: verificationIncomplete ? "verification-incomplete" : "complete",
    chainId,
    erc20: serializedErc20,
    permit2: serializedPermit2,
    warnings: verificationIncomplete
      ? [
          `${CHAIN_CONFIGS[chainId].displayName} approval discovery was truncated. Do not treat this wallet as clear.`,
        ]
      : [],
    errors: [],
    missingConfig: [],
  };
}

export async function discoverServerNftApprovals({
  chainId,
  owner,
  signal,
  env = process.env,
}: {
  chainId: ServerDiscoveryChainId;
  owner: Address;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
}): Promise<ServerNftDiscoveryResponse> {
  const config = resolveServerDiscoveryConfig(chainId, env);
  if (config.missingConfig.length > 0) {
    return emptyNftResponse(chainId, "config-missing", {
      errors: [
        `${CHAIN_CONFIGS[chainId].displayName} NFT approval discovery is not configured.`,
      ],
      missingConfig: config.missingConfig,
    });
  }

  const discovery = await discoverServerNftWithFallback({
    chainId,
    owner,
    signal,
    config,
  });
  if ("response" in discovery) return discovery.response;

  const { nft } = discovery;
  const serializedNft = serializeNftDiscoveryResult(nft);
  const verificationIncomplete = serializedNft.truncated;

  return {
    ok: true,
    status: verificationIncomplete ? "verification-incomplete" : "complete",
    chainId,
    nft: serializedNft,
    warnings: verificationIncomplete
      ? [
          `${CHAIN_CONFIGS[chainId].displayName} NFT approval discovery was truncated. Do not treat this wallet as clear.`,
        ]
      : [],
    errors: [],
    missingConfig: [],
  };
}

function resolveServerDiscoveryConfig(
  chainId: ServerDiscoveryChainId,
  env: NodeJS.ProcessEnv,
) {
  const settings = CHAIN_CONFIGS[chainId];
  const apiUrl = validHttpUrl(firstEnv(env, settings.apiUrlEnvNames)) ??
    settings.apiUrlDefault;
  const apiKey =
    settings.apiKeyEnvNames.length > 0
      ? cleanEnv(firstEnv(env, settings.apiKeyEnvNames))
      : undefined;
  const apiChainId =
    settings.apiChainIdEnvNames.length > 0
      ? cleanEnv(firstEnv(env, settings.apiChainIdEnvNames)) ??
        settings.apiChainIdDefault
      : undefined;
  const fallbackRpcUrl =
    "fallbackRpcEnvNames" in settings
      ? validHttpUrl(firstEnv(env, settings.fallbackRpcEnvNames))
      : undefined;
  const otherScanRpcUrl =
    "otherScanRpcEnvNames" in settings
      ? validHttpUrl(firstEnv(env, settings.otherScanRpcEnvNames)) ??
        settings.otherScanRpcUrlDefault
      : undefined;
  const missingConfig: string[] = [];

  if (!apiUrl) missingConfig.push(settings.apiUrlEnvNames.join(" or "));
  if (settings.requiresApiKey && !apiKey) {
    missingConfig.push(settings.apiKeyEnvNames.join(" or "));
  }
  if (
    settings.apiChainIdEnvNames.length > 0 &&
    apiChainId !== settings.apiChainIdDefault
  ) {
    missingConfig.push(settings.apiChainIdEnvNames.join(" or "));
  }

  return {
    apiUrl,
    apiKey,
    apiChainId,
    fallbackRpcUrl,
    otherScanRpcUrl,
    missingConfig,
  };
}

function createServerDiscoverySource(
  chainId: ServerDiscoveryChainId,
  config: ReturnType<typeof resolveServerDiscoveryConfig>,
) {
  const settings = CHAIN_CONFIGS[chainId];
  const source: DiscoverySourceConfig = {
    id: serverDiscoverySourceId(settings),
    name: serverDiscoverySourceName(settings),
    apiProviderKind: settings.apiProviderKind,
    apiProviderName: settings.apiProviderName,
    url: settings.explorerBaseUrl,
    apiUrl: config.apiUrl,
    apiUrlEnvVar: settings.apiUrlEnvNames.join(" / "),
    apiChainId: settings.apiChainIdDefault,
    apiChainIdEnvVar:
      settings.apiChainIdEnvNames.length > 0
        ? settings.apiChainIdEnvNames.join(" / ")
        : undefined,
    apiKey: config.apiKey,
    apiKeyEnvVar:
      settings.apiKeyEnvNames.length > 0
        ? settings.apiKeyEnvNames.join(" / ")
        : undefined,
    apiKeyEnvVars:
      settings.apiKeyEnvNames.length > 0 ? settings.apiKeyEnvNames : undefined,
    requiresApiKey: settings.requiresApiKey,
    hasApiKey: Boolean(config.apiKey),
    hasApiUrl: Boolean(config.apiUrl),
    usesDefaultApiUrl: config.apiUrl === settings.apiUrlDefault,
    queryParams:
      settings.apiProviderKind === "etherscan-v2" &&
      settings.apiChainIdDefault
        ? { chainid: settings.apiChainIdDefault }
        : undefined,
    limitations:
      settings.apiProviderKind === "etherscan-v2"
        ? "Server-side Etherscan API V2 discovery is capped and timeout-bounded."
        : `Server-side ${serverDiscoveryProviderName(settings)} discovery is capped and timeout-bounded.`,
    missingApiKeyMessage: settings.requiresApiKey
      ? `${settings.displayName} discovery requires a server-side Etherscan API key.`
      : undefined,
  };

  return createBlockscoutDiscoverySource({
    chainId,
    source,
    limits: SERVER_DISCOVERY_LIMITS,
  });
}

async function discoverServerErc20WithFallback({
  chainId,
  owner,
  signal,
  config,
}: {
  chainId: ServerDiscoveryChainId;
  owner: Address;
  signal?: AbortSignal;
  config: ReturnType<typeof resolveServerDiscoveryConfig>;
}): Promise<
  | { erc20: DiscoveryResult; permit2: Permit2DiscoveryResult }
  | { response: ServerApprovalDiscoveryResponse }
> {
  const source = createServerDiscoverySource(chainId, config);
  const primarySignal = attemptTimeoutSignal(
    signal,
    SERVER_DISCOVERY_PRIMARY_ATTEMPT_TIMEOUT_MS,
  );
  try {
    const [erc20, permit2] = await Promise.all([
      source.discover(owner, { signal: primarySignal.signal }),
      source.discoverPermit2Allowances?.(owner, {
        signal: primarySignal.signal,
      }) ??
        Promise.resolve({
          allowances: [],
          source: source.meta,
          rawCount: 0,
          truncated: false,
          windows: 0,
          requests: 0,
        }),
    ]);
    if (
      chainId === PULSECHAIN_CHAIN_ID &&
      isEmptyErc20Discovery(erc20, permit2)
    ) {
      return await confirmEmptyPulseChainErc20Discovery({
        chainId,
        owner,
        signal,
        config,
        primary: { erc20, permit2 },
      });
    }
    return { erc20, permit2 };
  } catch (error) {
    if (chainId !== PULSECHAIN_CHAIN_ID) throw error;
    const fallback = await runPulseChainErc20Fallbacks({
      chainId,
      owner,
      signal,
      config,
    });
    if (fallback.kind === "complete" || fallback.kind === "incomplete") {
      return { erc20: fallback.erc20, permit2: fallback.permit2 };
    }

    if (fallback.missingConfig.length > 0) {
      return {
        response: emptyApprovalResponse(chainId, "upstream-failure", {
          errors: [
            `PulseChain PulseScan discovery failed and no RPC fallback is configured: ${redactSensitiveErrorText(errorMessage(error))}`,
          ],
          missingConfig: fallback.missingConfig,
        }),
      };
    }

    return {
      response: emptyApprovalResponse(chainId, "upstream-failure", {
        errors: [
          `PulseChain PulseScan discovery failed and all RPC fallbacks failed: ${fallback.errors.join("; ")}`,
        ],
        missingConfig: [],
      }),
    };
  } finally {
    primarySignal.cleanup();
  }
}

async function discoverServerNftWithFallback({
  chainId,
  owner,
  signal,
  config,
}: {
  chainId: ServerDiscoveryChainId;
  owner: Address;
  signal?: AbortSignal;
  config: ReturnType<typeof resolveServerDiscoveryConfig>;
}): Promise<
  | { nft: NftDiscoveryResult }
  | { response: ServerNftDiscoveryResponse }
> {
  const source = createServerDiscoverySource(chainId, config);
  const primarySignal = attemptTimeoutSignal(
    signal,
    SERVER_DISCOVERY_PRIMARY_ATTEMPT_TIMEOUT_MS,
  );
  try {
    const nft = await source.discoverNftApprovals(owner, {
      signal: primarySignal.signal,
    });
    if (chainId === PULSECHAIN_CHAIN_ID && isEmptyNftDiscovery(nft)) {
      return await confirmEmptyPulseChainNftDiscovery({
        chainId,
        owner,
        signal,
        config,
        primary: { nft },
      });
    }
    return { nft };
  } catch (error) {
    if (chainId !== PULSECHAIN_CHAIN_ID) throw error;
    const fallback = await runPulseChainNftFallbacks({
      chainId,
      owner,
      signal,
      config,
    });
    if (fallback.kind === "complete" || fallback.kind === "incomplete") {
      return { nft: fallback.nft };
    }

    if (fallback.missingConfig.length > 0) {
      return {
        response: emptyNftResponse(chainId, "upstream-failure", {
          errors: [
            `PulseChain PulseScan NFT discovery failed and no RPC fallback is configured: ${redactSensitiveErrorText(errorMessage(error))}`,
          ],
          missingConfig: fallback.missingConfig,
        }),
      };
    }

    return {
      response: emptyNftResponse(chainId, "upstream-failure", {
        errors: [
          `PulseChain PulseScan NFT discovery failed and all RPC fallbacks failed: ${fallback.errors.join("; ")}`,
        ],
        missingConfig: [],
      }),
    };
  } finally {
    primarySignal.cleanup();
  }
}

type PulseChainErc20FallbackResult =
  | {
      kind: "complete" | "incomplete";
      erc20: DiscoveryResult;
      permit2: Permit2DiscoveryResult;
      errors: string[];
      missingConfig: string[];
    }
  | { kind: "failed"; errors: string[]; missingConfig: string[] };

type PulseChainNftFallbackResult =
  | {
      kind: "complete" | "incomplete";
      nft: NftDiscoveryResult;
      errors: string[];
      missingConfig: string[];
    }
  | { kind: "failed"; errors: string[]; missingConfig: string[] };

async function confirmEmptyPulseChainErc20Discovery({
  chainId,
  owner,
  signal,
  config,
  primary,
}: {
  chainId: ServerDiscoveryChainId;
  owner: Address;
  signal?: AbortSignal;
  config: ReturnType<typeof resolveServerDiscoveryConfig>;
  primary: { erc20: DiscoveryResult; permit2: Permit2DiscoveryResult };
}): Promise<{ erc20: DiscoveryResult; permit2: Permit2DiscoveryResult }> {
  const fallback = await runPulseChainErc20Fallbacks({
    chainId,
    owner,
    signal,
    config,
  });

  if (fallback.kind === "complete") {
    return { erc20: fallback.erc20, permit2: fallback.permit2 };
  }
  if (fallback.kind === "incomplete" && hasErc20DiscoveryCandidates(fallback)) {
    return { erc20: fallback.erc20, permit2: fallback.permit2 };
  }

  return markErc20DiscoveryIncomplete(primary);
}

async function confirmEmptyPulseChainNftDiscovery({
  chainId,
  owner,
  signal,
  config,
  primary,
}: {
  chainId: ServerDiscoveryChainId;
  owner: Address;
  signal?: AbortSignal;
  config: ReturnType<typeof resolveServerDiscoveryConfig>;
  primary: { nft: NftDiscoveryResult };
}): Promise<{ nft: NftDiscoveryResult }> {
  const fallback = await runPulseChainNftFallbacks({
    chainId,
    owner,
    signal,
    config,
  });

  if (fallback.kind === "complete") return { nft: fallback.nft };
  if (fallback.kind === "incomplete" && fallback.nft.approvals.length > 0) {
    return { nft: fallback.nft };
  }

  return markNftDiscoveryIncomplete(primary);
}

async function runPulseChainErc20Fallbacks({
  chainId,
  owner,
  signal,
  config,
}: {
  chainId: ServerDiscoveryChainId;
  owner: Address;
  signal?: AbortSignal;
  config: ReturnType<typeof resolveServerDiscoveryConfig>;
}): Promise<PulseChainErc20FallbackResult> {
  const fallbacks = createPulseChainRpcFallbackSources(chainId, config);
  if (fallbacks.length === 0) {
    return {
      kind: "failed",
      errors: [],
      missingConfig: pulseChainFallbackRpcEnvNames(),
    };
  }

  const fallbackErrors: string[] = [];
  let incompleteFallback:
    | { erc20: DiscoveryResult; permit2: Permit2DiscoveryResult }
    | undefined;
  for (const fallback of fallbacks) {
    const fallbackTimeoutMs = pulseChainRpcFallbackAttemptTimeoutMs(fallback);
    const fallbackSignal = attemptTimeoutSignal(signal, fallbackTimeoutMs);
    try {
      const [erc20, permit2] = await Promise.all([
        fallback.discover(owner, { signal: fallbackSignal.signal }),
        fallback.discoverPermit2Allowances?.(owner, {
          signal: fallbackSignal.signal,
        }) ??
          Promise.resolve({
            allowances: [],
            source: fallback.meta,
            rawCount: 0,
            truncated: false,
            windows: 0,
            requests: 0,
          }),
      ]);
      if (!erc20.truncated && !permit2.truncated) {
        return {
          kind: "complete",
          erc20,
          permit2,
          errors: fallbackErrors,
          missingConfig: [],
        };
      }
      incompleteFallback ??= { erc20, permit2 };
      fallbackErrors.push(`${fallback.meta.name}: discovery was truncated`);
    } catch (fallbackError) {
      fallbackErrors.push(
        `${fallback.meta.name}: ${fallbackErrorMessage(
          fallbackError,
          fallbackSignal.timedOut,
          fallbackTimeoutMs,
        )}`,
      );
    } finally {
      fallbackSignal.cleanup();
    }
  }

  if (incompleteFallback) {
    return {
      kind: "incomplete",
      ...incompleteFallback,
      errors: fallbackErrors,
      missingConfig: [],
    };
  }

  return { kind: "failed", errors: fallbackErrors, missingConfig: [] };
}

async function runPulseChainNftFallbacks({
  chainId,
  owner,
  signal,
  config,
}: {
  chainId: ServerDiscoveryChainId;
  owner: Address;
  signal?: AbortSignal;
  config: ReturnType<typeof resolveServerDiscoveryConfig>;
}): Promise<PulseChainNftFallbackResult> {
  const fallbacks = createPulseChainRpcFallbackSources(chainId, config);
  if (fallbacks.length === 0) {
    return {
      kind: "failed",
      errors: [],
      missingConfig: pulseChainFallbackRpcEnvNames(),
    };
  }

  const fallbackErrors: string[] = [];
  let incompleteFallback: { nft: NftDiscoveryResult } | undefined;
  for (const fallback of fallbacks) {
    const fallbackTimeoutMs = pulseChainRpcFallbackAttemptTimeoutMs(fallback);
    const fallbackSignal = attemptTimeoutSignal(signal, fallbackTimeoutMs);
    try {
      const nft = await fallback.discoverNftApprovals(owner, {
        signal: fallbackSignal.signal,
      });
      if (!nft.truncated) {
        return {
          kind: "complete",
          nft,
          errors: fallbackErrors,
          missingConfig: [],
        };
      }
      incompleteFallback ??= { nft };
      fallbackErrors.push(`${fallback.meta.name}: discovery was truncated`);
    } catch (fallbackError) {
      fallbackErrors.push(
        `${fallback.meta.name}: ${fallbackErrorMessage(
          fallbackError,
          fallbackSignal.timedOut,
          fallbackTimeoutMs,
        )}`,
      );
    } finally {
      fallbackSignal.cleanup();
    }
  }

  if (incompleteFallback) {
    return {
      kind: "incomplete",
      ...incompleteFallback,
      errors: fallbackErrors,
      missingConfig: [],
    };
  }

  return { kind: "failed", errors: fallbackErrors, missingConfig: [] };
}

function isEmptyErc20Discovery(
  erc20: DiscoveryResult,
  permit2: Permit2DiscoveryResult,
): boolean {
  return (
    !erc20.truncated &&
    !permit2.truncated &&
    erc20.pairs.length === 0 &&
    permit2.allowances.length === 0
  );
}

function hasErc20DiscoveryCandidates({
  erc20,
  permit2,
}: {
  erc20: DiscoveryResult;
  permit2: Permit2DiscoveryResult;
}): boolean {
  return erc20.pairs.length > 0 || permit2.allowances.length > 0;
}

function isEmptyNftDiscovery(nft: NftDiscoveryResult): boolean {
  return !nft.truncated && nft.approvals.length === 0;
}

function markErc20DiscoveryIncomplete({
  erc20,
  permit2,
}: {
  erc20: DiscoveryResult;
  permit2: Permit2DiscoveryResult;
}): { erc20: DiscoveryResult; permit2: Permit2DiscoveryResult } {
  return {
    erc20: { ...erc20, truncated: true },
    permit2: { ...permit2, truncated: true },
  };
}

function markNftDiscoveryIncomplete({
  nft,
}: {
  nft: NftDiscoveryResult;
}): { nft: NftDiscoveryResult } {
  return { nft: { ...nft, truncated: true } };
}

function createPulseChainRpcFallbackSources(
  chainId: ServerDiscoveryChainId,
  config: ReturnType<typeof resolveServerDiscoveryConfig>,
) {
  if (chainId !== PULSECHAIN_CHAIN_ID) return [];

  const fallbacks: DiscoverySource[] = [];
  if (config.fallbackRpcUrl) {
    fallbacks.push(
      createRpcLogDiscoverySource({
        chainId,
        source: {
          id: "server-dwellir-pulsechain-rpc",
          name: "Server-side Dwellir PulseChain RPC",
          url: "https://www.dwellir.com/docs/pulsechain",
          rpcUrl: config.fallbackRpcUrl,
          rpcUrlEnvVar: pulseChainFallbackRpcEnvNames().join(" / "),
        },
        limits: PULSECHAIN_MANAGED_RPC_DISCOVERY_LIMITS,
      }),
    );
  }

  if (config.otherScanRpcUrl) {
    fallbacks.push(
      createOtterscanTransactionDiscoverySource({
        chainId,
        source: {
          id: "server-otherscan-pulsechain-ots",
          name: "Server-side OtherScan PulseChain transactions",
          url: "https://otherscan.pulsechain.box",
          rpcUrl: config.otherScanRpcUrl,
          rpcUrlEnvVar: pulseChainOtherScanRpcEnvNames().join(" / "),
        },
        limits: PULSECHAIN_OTTERSCAN_TRANSACTION_DISCOVERY_LIMITS,
      }),
    );
  }

  if (!sameUrl(config.fallbackRpcUrl, PULSECHAIN_PUBLIC_RPC_URL)) {
    fallbacks.push(
      createRpcLogDiscoverySource({
        chainId,
        source: {
          id: "server-public-pulsechain-rpc",
          name: "Server-side public PulseChain RPC",
          url: PULSECHAIN_PUBLIC_RPC_URL,
          rpcUrl: PULSECHAIN_PUBLIC_RPC_URL,
        },
        limits: PULSECHAIN_SMALL_RPC_DISCOVERY_LIMITS,
      }),
    );
  }

  if (config.otherScanRpcUrl) {
    fallbacks.push(
      createRpcLogDiscoverySource({
        chainId,
        source: {
          id: "server-otherscan-pulsechain-rpc",
          name: "Server-side OtherScan PulseChain RPC",
          url: "https://otherscan.pulsechain.box",
          rpcUrl: config.otherScanRpcUrl,
          rpcUrlEnvVar: pulseChainOtherScanRpcEnvNames().join(" / "),
        },
        limits: PULSECHAIN_SMALL_RPC_DISCOVERY_LIMITS,
      }),
    );
  }

  return fallbacks;
}

function pulseChainRpcFallbackAttemptTimeoutMs(source: DiscoverySource): number {
  if (source.meta.id === "server-dwellir-pulsechain-rpc") {
    return MANAGED_RPC_FALLBACK_ATTEMPT_TIMEOUT_MS;
  }
  if (source.meta.id === "server-otherscan-pulsechain-ots") {
    return OTTERSCAN_TRANSACTION_FALLBACK_ATTEMPT_TIMEOUT_MS;
  }
  return SMALL_RPC_FALLBACK_ATTEMPT_TIMEOUT_MS;
}

function sameUrl(a: string | undefined, b: string): boolean {
  if (!a) return false;
  try {
    return new URL(a).toString() === new URL(b).toString();
  } catch {
    return a === b;
  }
}

export function serverDiscoveryTimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SERVER_DISCOVERY_REQUEST_TIMEOUT_MS,
  );

  const abort = () => controller.abort();
  if (requestSignal) {
    if (requestSignal.aborted) controller.abort();
    else requestSignal.addEventListener("abort", abort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      requestSignal?.removeEventListener("abort", abort);
    },
  };
}

function emptyApprovalResponse(
  chainId: ServerDiscoveryChainId,
  status: Exclude<ServerApprovalDiscoveryResponse["status"], "complete">,
  overrides: {
    errors?: string[];
    missingConfig?: string[];
  } = {},
): ServerApprovalDiscoveryResponse {
  const source = emptySource(chainId);
  return {
    ok: false,
    status,
    chainId,
    erc20: {
      pairs: [],
      source,
      erc20Parse: {
        rawLogs: 0,
        decodeAttempts: 0,
        erc20TopicShape: 0,
        erc721TokenApprovalShape: 0,
        unsupportedTopicShape: 0,
        missingTopics: 0,
        missingTokenAddress: 0,
        invalidTokenAddress: 0,
        missingSpenderTopic: 0,
        invalidSpenderTopic: 0,
        decodedPairs: 0,
        uniquePairs: 0,
        samplePairs: [],
      },
      rawCount: 0,
      truncated: false,
      windows: 0,
      requests: 0,
    },
    permit2: {
      allowances: [],
      source,
      rawCount: 0,
      truncated: false,
      windows: 0,
      requests: 0,
    },
    warnings: [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
  };
}

function emptyNftResponse(
  chainId: ServerDiscoveryChainId,
  status: Exclude<ServerNftDiscoveryResponse["status"], "complete">,
  overrides: {
    errors?: string[];
    missingConfig?: string[];
  } = {},
): ServerNftDiscoveryResponse {
  return {
    ok: false,
    status,
    chainId,
    nft: {
      approvals: [],
      source: emptySource(chainId),
      rawCount: 0,
      truncated: false,
      windows: 0,
      requests: 0,
    },
    warnings: [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
  };
}

function emptySource(chainId: ServerDiscoveryChainId) {
  const settings = CHAIN_CONFIGS[chainId];
  return {
    id: serverDiscoverySourceId(settings),
    name: serverDiscoverySourceName(settings),
    url: settings.explorerBaseUrl,
    chainId,
  };
}

function attemptTimeoutSignal(parentSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener("abort", abort, { once: true });
  }

  return {
    signal: controller.signal,
    get timedOut() {
      return timedOut;
    },
    cleanup() {
      clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", abort);
    },
  };
}

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function firstEnv(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = cleanEnv(env[name]);
    if (value) return value;
  }
  return undefined;
}

function validHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function pulseChainFallbackRpcEnvNames(): string[] {
  const settings = CHAIN_CONFIGS[PULSECHAIN_CHAIN_ID];
  return [...settings.fallbackRpcEnvNames];
}

function pulseChainOtherScanRpcEnvNames(): string[] {
  const settings = CHAIN_CONFIGS[PULSECHAIN_CHAIN_ID];
  return [...settings.otherScanRpcEnvNames];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function fallbackErrorMessage(
  error: unknown,
  timedOut: boolean,
  timeoutMs: number,
): string {
  if (timedOut) {
    return `discovery attempt timed out after ${Math.round(timeoutMs / 1000)}s`;
  }
  return redactSensitiveErrorText(errorMessage(error));
}

function redactSensitiveErrorText(value: string): string {
  return value
    .replace(
      /(https?:\/\/api-[\w.-]+\.dwellir\.com\/)[^/\s"'?)]+/gi,
      "$1[redacted]",
    )
    .replace(/([?&]apikey=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]api_key=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]key=)[^&\s)]+/gi, "$1[redacted]");
}
