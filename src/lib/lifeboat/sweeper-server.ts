import "server-only";

import { getAddress, isAddress, type Address } from "viem";

import {
  ARBITRUM_EXPLORER_API_DEFAULT,
  ARBITRUM_EXPLORER_BASE_URL,
  ARBITRUM_EXPLORER_CHAIN_ID_DEFAULT,
  ARBITRUM_ONE_CHAIN_ID,
} from "@/lib/arbitrum-approval-api";
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
  PULSECHAIN_CHAIN_ID,
  PULSECHAIN_EXPLORER_API_DEFAULT,
  getChainConfig,
} from "@/lib/chains";
import {
  ETHEREUM_EXPLORER_API_DEFAULT,
  ETHEREUM_EXPLORER_BASE_URL,
  ETHEREUM_MAINNET_CHAIN_ID,
} from "@/lib/ethereum-approval-api";
import {
  HYPEREVM_CHAIN_ID,
  HYPEREVM_EXPLORER_API_DEFAULT,
  HYPEREVM_EXPLORER_BASE_URL,
  HYPEREVM_EXPLORER_CHAIN_ID_DEFAULT,
} from "@/lib/hyperevm-approval-api";
import {
  analyzeSweeperPattern,
  emptySweeperSummary,
  type LifeboatSweeperApiResponse,
  type SweeperHistoryTransaction,
} from "@/lib/lifeboat/sweeper";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_API_DEFAULT,
  OPTIMISM_EXPLORER_BASE_URL,
  OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT,
} from "@/lib/optimism-approval-api";

const SWEEPER_REQUEST_TIMEOUT_MS = 20_000;
const SWEEPER_HISTORY_OFFSET = 50;

type SweeperChainId =
  | typeof ETHEREUM_MAINNET_CHAIN_ID
  | typeof ARBITRUM_ONE_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof HYPEREVM_CHAIN_ID
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID;

type SweeperExplorerKind = "etherscan-v2" | "blockscout-compatible";

interface SweeperChainConfig {
  chainId: SweeperChainId;
  chainName: string;
  nativeSymbol: string;
  explorerBaseUrl: string;
  apiUrl: string;
  apiKind: SweeperExplorerKind;
  apiChainId?: string;
  apiKeyEnvNames: readonly string[];
  apiUrlEnvNames: readonly string[];
}

interface ResolvedSweeperConfig extends SweeperChainConfig {
  apiKey: string | undefined;
  missingConfig: string[];
}

interface EtherscanTxListResponse {
  status?: string;
  message?: string;
  result?: unknown;
}

interface EtherscanTx {
  hash?: string;
  timeStamp?: string;
  from?: string;
  to?: string;
  value?: string;
  isError?: string;
  txreceipt_status?: string;
}

const CHAIN_CONFIGS: Record<SweeperChainId, SweeperChainConfig> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    chainName: "Ethereum Mainnet",
    nativeSymbol: "ETH",
    explorerBaseUrl: ETHEREUM_EXPLORER_BASE_URL,
    apiUrl: ETHEREUM_EXPLORER_API_DEFAULT,
    apiKind: "etherscan-v2",
    apiChainId: ETHEREUM_MAINNET_CHAIN_ID.toString(),
    apiKeyEnvNames: ["ETHERSCAN_API_KEY"],
    apiUrlEnvNames: ["ETHEREUM_EXPLORER_API_URL", "MAINNET_EXPLORER_API_URL"],
  },
  [ARBITRUM_ONE_CHAIN_ID]: {
    chainId: ARBITRUM_ONE_CHAIN_ID,
    chainName: "Arbitrum One",
    nativeSymbol: "ETH",
    explorerBaseUrl: ARBITRUM_EXPLORER_BASE_URL,
    apiUrl: ARBITRUM_EXPLORER_API_DEFAULT,
    apiKind: "etherscan-v2",
    apiChainId: ARBITRUM_EXPLORER_CHAIN_ID_DEFAULT,
    apiKeyEnvNames: ["ARBISCAN_API_KEY"],
    apiUrlEnvNames: ["ARBITRUM_EXPLORER_API_URL"],
  },
  [OPTIMISM_CHAIN_ID]: {
    chainId: OPTIMISM_CHAIN_ID,
    chainName: "Optimism",
    nativeSymbol: "ETH",
    explorerBaseUrl: OPTIMISM_EXPLORER_BASE_URL,
    apiUrl: OPTIMISM_EXPLORER_API_DEFAULT,
    apiKind: "etherscan-v2",
    apiChainId: OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT,
    apiKeyEnvNames: [
      "OPTIMISM_EXPLORER_API_KEY",
      "OPTIMISTIC_ETHERSCAN_API_KEY",
      "ETHERSCAN_API_KEY",
    ],
    apiUrlEnvNames: ["OPTIMISM_EXPLORER_API_URL"],
  },
  [HYPEREVM_CHAIN_ID]: {
    chainId: HYPEREVM_CHAIN_ID,
    chainName: "HyperEVM",
    nativeSymbol: "HYPE",
    explorerBaseUrl: HYPEREVM_EXPLORER_BASE_URL,
    apiUrl: HYPEREVM_EXPLORER_API_DEFAULT,
    apiKind: "etherscan-v2",
    apiChainId: HYPEREVM_EXPLORER_CHAIN_ID_DEFAULT,
    apiKeyEnvNames: [
      "HYPEREVM_EXPLORER_API_KEY",
      "HYPEREVM_ETHERSCAN_API_KEY",
      "ETHERSCAN_API_KEY",
      "BSC_EXPLORER_API_KEY",
    ],
    apiUrlEnvNames: ["HYPEREVM_EXPLORER_API_URL"],
  },
  [PULSECHAIN_CHAIN_ID]: {
    chainId: PULSECHAIN_CHAIN_ID,
    chainName: "PulseChain",
    nativeSymbol: "PLS",
    explorerBaseUrl: "https://scan.pulsechain.com",
    apiUrl: PULSECHAIN_EXPLORER_API_DEFAULT,
    apiKind: "blockscout-compatible",
    apiKeyEnvNames: [],
    apiUrlEnvNames: ["PULSECHAIN_EXPLORER_API_URL"],
  },
  [BSC_CHAIN_ID]: {
    chainId: BSC_CHAIN_ID,
    chainName: "BNB Smart Chain",
    nativeSymbol: "BNB",
    explorerBaseUrl: "https://bscscan.com",
    apiUrl: BSC_EXPLORER_API_DEFAULT,
    apiKind: "etherscan-v2",
    apiChainId: BSC_EXPLORER_CHAIN_ID_DEFAULT,
    apiKeyEnvNames: ["BSC_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiUrlEnvNames: ["BSC_EXPLORER_API_URL"],
  },
  [BASE_CHAIN_ID]: {
    chainId: BASE_CHAIN_ID,
    chainName: "Base",
    nativeSymbol: "ETH",
    explorerBaseUrl: "https://basescan.org",
    apiUrl: BASE_EXPLORER_API_DEFAULT,
    apiKind: "etherscan-v2",
    apiChainId: BASE_EXPLORER_CHAIN_ID_DEFAULT,
    apiKeyEnvNames: ["BASE_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiUrlEnvNames: ["BASE_EXPLORER_API_URL"],
  },
  [POLYGON_CHAIN_ID]: {
    chainId: POLYGON_CHAIN_ID,
    chainName: "Polygon",
    nativeSymbol: "POL",
    explorerBaseUrl: "https://polygonscan.com",
    apiUrl: POLYGON_EXPLORER_API_DEFAULT,
    apiKind: "etherscan-v2",
    apiChainId: POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
    apiKeyEnvNames: ["POLYGON_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiUrlEnvNames: ["POLYGON_EXPLORER_API_URL"],
  },
};

export function isSweeperChainId(value: number): value is SweeperChainId {
  return value in CHAIN_CONFIGS;
}

export async function discoverSweeperActivity({
  owner,
  chainId,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  owner: Address;
  chainId: SweeperChainId;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatSweeperApiResponse> {
  const config = resolveSweeperConfig(chainId, env);
  if (config.missingConfig.length > 0) {
    return emptySweeperResponse(config, owner, "config-missing", {
      errors: [`${config.chainName} sweeper diagnostic is not configured.`],
      missingConfig: config.missingConfig,
    });
  }

  try {
    const transactions = await fetchNativeTransactions({
      owner,
      config,
      signal,
      fetcher,
    });
    const analysis = analyzeSweeperPattern({
      owner,
      chainNativeSymbol: config.nativeSymbol,
      transactions,
    });

    return {
      ok: true,
      status: "complete",
      chainId,
      chainName: config.chainName,
      owner,
      riskLevel: analysis.riskLevel,
      evidence: analysis.evidence,
      summary: analysis.summary,
      warnings: analysis.warnings,
      errors: [],
      missingConfig: [],
    };
  } catch (error) {
    return emptySweeperResponse(config, owner, "upstream-failure", {
      errors: [
        `Sweeper diagnostic failed: ${redactSensitiveErrorText(
          error instanceof Error ? error.message : String(error),
        )}`,
      ],
      warnings: [
        "The sweeper diagnostic is incomplete. Do not treat this as proof that the wallet is free of sweeper-like activity.",
      ],
    });
  }
}

export function sweeperTimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SWEEPER_REQUEST_TIMEOUT_MS,
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

function resolveSweeperConfig(
  chainId: SweeperChainId,
  env: NodeJS.ProcessEnv,
): ResolvedSweeperConfig {
  const settings = CHAIN_CONFIGS[chainId];
  const apiUrl = validHttpUrl(firstEnv(env, settings.apiUrlEnvNames)) ??
    settings.apiUrl;
  const apiKey = cleanEnv(firstEnv(env, settings.apiKeyEnvNames));
  const missingConfig: string[] = [];

  if (!apiUrl) missingConfig.push(settings.apiUrlEnvNames.join(" or "));
  if (settings.apiKeyEnvNames.length > 0 && !apiKey) {
    missingConfig.push(settings.apiKeyEnvNames.join(" or "));
  }

  const genericConfig = getChainConfig(chainId);
  return {
    ...settings,
    chainName: genericConfig?.displayName ?? settings.chainName,
    nativeSymbol: genericConfig?.nativeSymbol ?? settings.nativeSymbol,
    apiUrl,
    apiKey,
    missingConfig,
  };
}

async function fetchNativeTransactions({
  owner,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedSweeperConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<SweeperHistoryTransaction[]> {
  const url = buildTxListUrl(owner, config);
  const response = await fetcher(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`${config.chainName} explorer returned HTTP ${response.status}.`);
  }

  const body = (await response.json()) as EtherscanTxListResponse;
  if (!Array.isArray(body.result)) {
    const message = `${body.message ?? ""} ${String(body.result ?? "")}`.trim();
    if (/no transactions found/i.test(message)) return [];
    throw new Error(
      `${config.chainName} explorer returned an invalid transaction list: ${
        message || "unknown error"
      }`,
    );
  }

  return body.result
    .map(parseNativeTransaction)
    .filter((tx): tx is SweeperHistoryTransaction => Boolean(tx));
}

function buildTxListUrl(owner: Address, config: ResolvedSweeperConfig): string {
  const url = new URL(config.apiUrl);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", owner);
  url.searchParams.set("startblock", "0");
  url.searchParams.set("endblock", "99999999");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", SWEEPER_HISTORY_OFFSET.toString());
  url.searchParams.set("sort", "desc");
  if (config.apiKind === "etherscan-v2" && config.apiChainId) {
    url.searchParams.set("chainid", config.apiChainId);
  }
  if (config.apiKey) url.searchParams.set("apikey", config.apiKey);
  return url.toString();
}

function parseNativeTransaction(
  value: unknown,
): SweeperHistoryTransaction | null {
  const tx = value as EtherscanTx;
  if (!tx.hash || !tx.from || !isAddress(tx.from)) return null;
  if (tx.isError === "1" || tx.txreceipt_status === "0") return null;

  const timestamp = Number(tx.timeStamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

  let valueWei: bigint;
  try {
    valueWei = BigInt(tx.value ?? "0");
  } catch {
    return null;
  }

  return {
    hash: tx.hash,
    from: getAddress(tx.from),
    to: tx.to && isAddress(tx.to) ? getAddress(tx.to) : null,
    valueWei,
    timestamp,
  };
}

function emptySweeperResponse(
  config: SweeperChainConfig,
  owner: Address | null,
  status: LifeboatSweeperApiResponse["status"],
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
  } = {},
): LifeboatSweeperApiResponse {
  return {
    ok: false,
    status,
    chainId: config.chainId,
    chainName: config.chainName,
    owner,
    riskLevel:
      status === "unsupported" ? "unsupported" : "upstream_unavailable",
    evidence: [],
    summary: emptySweeperSummary(),
    warnings: overrides.warnings ?? [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
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

function redactSensitiveErrorText(value: string): string {
  return value
    .replace(/([?&]apikey=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]api_key=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]key=)[^&\s)]+/gi, "$1[redacted]");
}
