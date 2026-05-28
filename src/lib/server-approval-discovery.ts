import "server-only";

import { getAddress, isAddress, type Address } from "viem";

import {
  BASE_CHAIN_ID,
  BASE_EXPLORER_API_DEFAULT,
  BASE_EXPLORER_CHAIN_ID_DEFAULT,
  BSC_CHAIN_ID,
  BSC_EXPLORER_API_DEFAULT,
  BSC_EXPLORER_CHAIN_ID_DEFAULT,
  POLYGON_CHAIN_ID,
  POLYGON_EXPLORER_API_DEFAULT,
  POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
  type DiscoverySourceConfig,
} from "@/lib/chains";
import {
  serializeDiscoveryResult,
  serializeNftDiscoveryResult,
  serializePermit2DiscoveryResult,
  type ServerApprovalDiscoveryResponse,
  type ServerNftDiscoveryResponse,
} from "@/lib/approval-discovery-api";
import { createBlockscoutDiscoverySource } from "@/lib/discovery";

const SERVER_DISCOVERY_REQUEST_TIMEOUT_MS = 25_000;
const SERVER_DISCOVERY_EXPLORER_MIN_INTERVAL_MS = 350;
const SERVER_DISCOVERY_LIMITS = {
  maxRequests: 40,
  maxRawLogs: 20_000,
  requestTimeoutMs: 8_000,
  pageCap: 1000,
  minSplitSpan: 64,
  retryAttempts: 1,
  retryDelayMs: 500,
  minRequestIntervalMs: SERVER_DISCOVERY_EXPLORER_MIN_INTERVAL_MS,
} as const;

const CHAIN_CONFIGS = {
  [BSC_CHAIN_ID]: {
    displayName: "BSC",
    explorerBaseUrl: "https://bscscan.com",
    apiUrlDefault: BSC_EXPLORER_API_DEFAULT,
    apiChainIdDefault: BSC_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["BSC_EXPLORER_API_URL"],
    apiKeyEnvNames: ["BSC_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["BSC_EXPLORER_CHAIN_ID"],
  },
  [BASE_CHAIN_ID]: {
    displayName: "Base",
    explorerBaseUrl: "https://basescan.org",
    apiUrlDefault: BASE_EXPLORER_API_DEFAULT,
    apiChainIdDefault: BASE_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["BASE_EXPLORER_API_URL"],
    apiKeyEnvNames: ["BASE_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["BASE_EXPLORER_CHAIN_ID"],
  },
  [POLYGON_CHAIN_ID]: {
    displayName: "Polygon",
    explorerBaseUrl: "https://polygonscan.com",
    apiUrlDefault: POLYGON_EXPLORER_API_DEFAULT,
    apiChainIdDefault: POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
    apiUrlEnvNames: ["POLYGON_EXPLORER_API_URL"],
    apiKeyEnvNames: ["POLYGON_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiChainIdEnvNames: ["POLYGON_EXPLORER_CHAIN_ID"],
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

  const source = createServerDiscoverySource(chainId, config);
  const [erc20, permit2] = await Promise.all([
    source.discover(owner, { signal }),
    source.discoverPermit2Allowances?.(owner, { signal }) ??
      Promise.resolve({
        allowances: [],
        source: source.meta,
        rawCount: 0,
        truncated: false,
        windows: 0,
        requests: 0,
      }),
  ]);

  return {
    ok: true,
    status: "complete",
    chainId,
    erc20: serializeDiscoveryResult(erc20),
    permit2: serializePermit2DiscoveryResult(permit2),
    warnings: [],
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

  const source = createServerDiscoverySource(chainId, config);
  const nft = await source.discoverNftApprovals(owner, { signal });

  return {
    ok: true,
    status: "complete",
    chainId,
    nft: serializeNftDiscoveryResult(nft),
    warnings: [],
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
  const apiKey = cleanEnv(firstEnv(env, settings.apiKeyEnvNames));
  const apiChainId =
    cleanEnv(firstEnv(env, settings.apiChainIdEnvNames)) ??
    settings.apiChainIdDefault;
  const missingConfig: string[] = [];

  if (!apiUrl) missingConfig.push(settings.apiUrlEnvNames.join(" or "));
  if (!apiKey) missingConfig.push(settings.apiKeyEnvNames.join(" or "));
  if (apiChainId !== settings.apiChainIdDefault) {
    missingConfig.push(settings.apiChainIdEnvNames.join(" or "));
  }

  return { apiUrl, apiKey, apiChainId, missingConfig };
}

function createServerDiscoverySource(
  chainId: ServerDiscoveryChainId,
  config: ReturnType<typeof resolveServerDiscoveryConfig>,
) {
  const settings = CHAIN_CONFIGS[chainId];
  const source: DiscoverySourceConfig = {
    id: `server-etherscan-v2-${settings.displayName.toLowerCase()}`,
    name: `Server-side Etherscan API V2 (${settings.displayName} logs)`,
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    url: settings.explorerBaseUrl,
    apiUrl: config.apiUrl,
    apiUrlEnvVar: settings.apiUrlEnvNames.join(" / "),
    apiChainId: settings.apiChainIdDefault,
    apiChainIdEnvVar: settings.apiChainIdEnvNames.join(" / "),
    apiKey: config.apiKey,
    apiKeyEnvVar: settings.apiKeyEnvNames.join(" / "),
    apiKeyEnvVars: settings.apiKeyEnvNames,
    requiresApiKey: true,
    hasApiKey: Boolean(config.apiKey),
    hasApiUrl: Boolean(config.apiUrl),
    usesDefaultApiUrl: config.apiUrl === settings.apiUrlDefault,
    queryParams: { chainid: settings.apiChainIdDefault },
    limitations:
      "Server-side Etherscan API V2 discovery is capped and timeout-bounded.",
    missingApiKeyMessage: `${settings.displayName} discovery requires a server-side Etherscan API key.`,
  };

  return createBlockscoutDiscoverySource({
    chainId,
    source,
    limits: SERVER_DISCOVERY_LIMITS,
  });
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
    id: `server-etherscan-v2-${settings.displayName.toLowerCase()}`,
    name: `Server-side Etherscan API V2 (${settings.displayName} logs)`,
    url: settings.explorerBaseUrl,
    chainId,
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
