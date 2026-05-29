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
  analyzeAddressPoisoning,
  emptyAddressPoisoningSummary,
  formatPoisoningNativeAmount,
  formatPoisoningTokenAmount,
  type AddressPoisoningHistoryEvent,
  type LifeboatAddressPoisoningApiResponse,
} from "@/lib/lifeboat/address-poisoning";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_API_DEFAULT,
  OPTIMISM_EXPLORER_BASE_URL,
  OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT,
} from "@/lib/optimism-approval-api";

const POISONING_REQUEST_TIMEOUT_MS = 20_000;
const POISONING_HISTORY_OFFSET = 75;

type AddressPoisoningChainId =
  | typeof ETHEREUM_MAINNET_CHAIN_ID
  | typeof ARBITRUM_ONE_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof HYPEREVM_CHAIN_ID
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID;

type AddressPoisoningExplorerKind = "etherscan-v2" | "blockscout-compatible";

interface AddressPoisoningChainConfig {
  chainId: AddressPoisoningChainId;
  chainName: string;
  nativeSymbol: string;
  explorerBaseUrl: string;
  apiUrl: string;
  apiKind: AddressPoisoningExplorerKind;
  apiChainId?: string;
  apiKeyEnvNames: readonly string[];
  apiUrlEnvNames: readonly string[];
}

interface ResolvedAddressPoisoningConfig extends AddressPoisoningChainConfig {
  apiKey: string | undefined;
  missingConfig: string[];
}

interface ExplorerListResponse {
  status?: string;
  message?: string;
  result?: unknown;
}

interface ExplorerNormalTx {
  blockNumber?: string;
  hash?: string;
  timeStamp?: string;
  from?: string;
  to?: string;
  value?: string;
  isError?: string;
  txreceipt_status?: string;
}

interface ExplorerTokenTx {
  blockNumber?: string;
  hash?: string;
  timeStamp?: string;
  from?: string;
  to?: string;
  value?: string;
  contractAddress?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
}

const CHAIN_CONFIGS: Record<
  AddressPoisoningChainId,
  AddressPoisoningChainConfig
> = {
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

export function isAddressPoisoningChainId(
  value: number,
): value is AddressPoisoningChainId {
  return value in CHAIN_CONFIGS;
}

export async function discoverAddressPoisoningSignals({
  owner,
  chainId,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  owner: Address;
  chainId: AddressPoisoningChainId;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatAddressPoisoningApiResponse> {
  const config = resolveAddressPoisoningConfig(chainId, env);
  if (config.missingConfig.length > 0) {
    return emptyAddressPoisoningResponse(config, owner, "config-missing", {
      errors: [`${config.chainName} address poisoning diagnostic is not configured.`],
      missingConfig: config.missingConfig,
    });
  }

  const errors: string[] = [];
  const eventGroups = await Promise.all([
    fetchNativeEvents({ owner, config, signal, fetcher }).catch(
      (error: unknown) => {
        errors.push(
          `Native transaction history failed: ${redactSensitiveErrorText(
            error instanceof Error ? error.message : String(error),
          )}`,
        );
        return [];
      },
    ),
    fetchTokenEvents({ owner, config, signal, fetcher }).catch(
      (error: unknown) => {
        errors.push(
          `Token transfer history failed: ${redactSensitiveErrorText(
            error instanceof Error ? error.message : String(error),
          )}`,
        );
        return [];
      },
    ),
  ]);

  const events = eventGroups.flat();
  if (events.length === 0 && errors.length > 0) {
    return emptyAddressPoisoningResponse(config, owner, "upstream-failure", {
      errors: [`Address poisoning diagnostic failed: ${errors.join(" ")}`],
      warnings: [
        "The address poisoning diagnostic is incomplete. Do not treat this as proof that the wallet has no lookalike-address risk.",
      ],
    });
  }

  const analysis = analyzeAddressPoisoning({ owner, events });
  const partial = errors.length > 0;
  return {
    ok: !partial,
    status: partial ? "partial" : "complete",
    chainId,
    chainName: config.chainName,
    owner,
    riskLevel:
      partial && analysis.riskLevel === "none_detected"
        ? "insufficient_data"
        : analysis.riskLevel,
    evidence: analysis.evidence,
    events: analysis.events,
    summary: analysis.summary,
    warnings: [
      ...analysis.warnings,
      ...(partial
        ? [
            "One address poisoning data source failed, so missing lookalike events must be treated as incomplete.",
          ]
        : []),
    ],
    errors,
    missingConfig: [],
  };
}

export function addressPoisoningTimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    POISONING_REQUEST_TIMEOUT_MS,
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

function resolveAddressPoisoningConfig(
  chainId: AddressPoisoningChainId,
  env: NodeJS.ProcessEnv,
): ResolvedAddressPoisoningConfig {
  const settings = CHAIN_CONFIGS[chainId];
  const apiUrl =
    validHttpUrl(firstEnv(env, settings.apiUrlEnvNames)) ?? settings.apiUrl;
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

async function fetchNativeEvents({
  owner,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedAddressPoisoningConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<AddressPoisoningHistoryEvent[]> {
  const rows = await fetchExplorerRows({
    owner,
    config,
    action: "txlist",
    signal,
    fetcher,
  });
  return rows
    .map((row) => parseNativeEvent(row, owner, config))
    .filter((event): event is AddressPoisoningHistoryEvent => Boolean(event));
}

async function fetchTokenEvents({
  owner,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedAddressPoisoningConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<AddressPoisoningHistoryEvent[]> {
  const rows = await fetchExplorerRows({
    owner,
    config,
    action: "tokentx",
    signal,
    fetcher,
  });
  return rows
    .map((row) => parseTokenEvent(row, owner, config))
    .filter((event): event is AddressPoisoningHistoryEvent => Boolean(event));
}

async function fetchExplorerRows({
  owner,
  config,
  action,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedAddressPoisoningConfig;
  action: "txlist" | "tokentx";
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<unknown[]> {
  const url = buildAccountHistoryUrl(owner, config, action);
  const response = await fetcher(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`${config.chainName} explorer returned HTTP ${response.status}.`);
  }

  const body = (await response.json()) as ExplorerListResponse;
  if (!Array.isArray(body.result)) {
    const message = `${body.message ?? ""} ${String(body.result ?? "")}`.trim();
    if (/no transactions found/i.test(message)) return [];
    throw new Error(
      `${config.chainName} explorer returned an invalid ${action} result: ${
        message || "unknown error"
      }`,
    );
  }
  return body.result;
}

function buildAccountHistoryUrl(
  owner: Address,
  config: ResolvedAddressPoisoningConfig,
  action: "txlist" | "tokentx",
): string {
  const url = new URL(config.apiUrl);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", action);
  url.searchParams.set("address", owner);
  url.searchParams.set("startblock", "0");
  url.searchParams.set("endblock", "99999999");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", POISONING_HISTORY_OFFSET.toString());
  url.searchParams.set("sort", "desc");
  if (config.apiKind === "etherscan-v2" && config.apiChainId) {
    url.searchParams.set("chainid", config.apiChainId);
  }
  if (config.apiKey) url.searchParams.set("apikey", config.apiKey);
  return url.toString();
}

function parseNativeEvent(
  value: unknown,
  owner: Address,
  config: ResolvedAddressPoisoningConfig,
): AddressPoisoningHistoryEvent | null {
  const tx = value as ExplorerNormalTx;
  if (!tx.hash || !tx.from || !tx.to) return null;
  if (!isAddress(tx.from) || !isAddress(tx.to)) return null;
  if (tx.isError === "1" || tx.txreceipt_status === "0") return null;

  const valueWei = parseBigInt(tx.value);
  if (!valueWei || valueWei <= 0n) return null;

  const timestamp = parseTimestamp(tx.timeStamp);
  if (timestamp === null) return null;

  const from = getAddress(tx.from);
  const to = getAddress(tx.to);
  const normalizedOwner = owner.toLowerCase();
  const fromOwner = from.toLowerCase() === normalizedOwner;
  const toOwner = to.toLowerCase() === normalizedOwner;
  if (!fromOwner && !toOwner) return null;

  const direction = fromOwner ? "outbound" : "inbound";
  const counterparty = fromOwner ? to : from;
  return {
    id: `${direction}:native:${tx.hash}`,
    txHash: tx.hash,
    timestamp,
    occurredAt: new Date(timestamp * 1000).toISOString(),
    blockNumber: parseBlockNumber(tx.blockNumber),
    direction,
    assetType: "native",
    from,
    to,
    counterparty,
    contractAddress: null,
    amount: formatPoisoningNativeAmount(valueWei, config.nativeSymbol),
    tokenSymbol: config.nativeSymbol,
    explorerUrl: txExplorerUrl(config, tx.hash),
  };
}

function parseTokenEvent(
  value: unknown,
  owner: Address,
  config: ResolvedAddressPoisoningConfig,
): AddressPoisoningHistoryEvent | null {
  const tx = value as ExplorerTokenTx;
  if (!tx.hash || !tx.from || !tx.to) return null;
  if (!isAddress(tx.from) || !isAddress(tx.to)) return null;

  const tokenValue = parseBigInt(tx.value);
  if (tokenValue === null || tokenValue < 0n) return null;

  const timestamp = parseTimestamp(tx.timeStamp);
  if (timestamp === null) return null;

  const from = getAddress(tx.from);
  const to = getAddress(tx.to);
  const normalizedOwner = owner.toLowerCase();
  const fromOwner = from.toLowerCase() === normalizedOwner;
  const toOwner = to.toLowerCase() === normalizedOwner;
  if (!fromOwner && !toOwner) return null;

  const direction = fromOwner ? "outbound" : "inbound";
  const counterparty = fromOwner ? to : from;
  const contractAddress =
    tx.contractAddress && isAddress(tx.contractAddress)
      ? getAddress(tx.contractAddress)
      : null;
  const tokenSymbol = sanitizeTokenText(tx.tokenSymbol);
  const decimals = parseTokenDecimals(tx.tokenDecimal);

  return {
    id: `${direction}:token:${tx.hash}:${contractAddress?.toLowerCase() ?? "token"}`,
    txHash: tx.hash,
    timestamp,
    occurredAt: new Date(timestamp * 1000).toISOString(),
    blockNumber: parseBlockNumber(tx.blockNumber),
    direction,
    assetType: "token",
    from,
    to,
    counterparty,
    contractAddress,
    amount: formatPoisoningTokenAmount({
      value: tokenValue,
      decimals,
      symbol: tokenSymbol,
    }),
    tokenSymbol,
    explorerUrl: txExplorerUrl(config, tx.hash),
  };
}

function emptyAddressPoisoningResponse(
  config: AddressPoisoningChainConfig,
  owner: Address | null,
  status: LifeboatAddressPoisoningApiResponse["status"],
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
  } = {},
): LifeboatAddressPoisoningApiResponse {
  return {
    ok: false,
    status,
    chainId: config.chainId,
    chainName: config.chainName,
    owner,
    riskLevel:
      status === "unsupported" ? "unsupported" : "upstream_unavailable",
    evidence: [],
    events: [],
    summary: emptyAddressPoisoningSummary(),
    warnings: overrides.warnings ?? [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
  };
}

function txExplorerUrl(
  config: ResolvedAddressPoisoningConfig,
  hash: string,
): string {
  return `${config.explorerBaseUrl.replace(/\/$/, "")}/tx/${hash}`;
}

function parseTimestamp(value: string | undefined): number | null {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function parseBlockNumber(value: string | undefined): number | null {
  const blockNumber = Number(value);
  return Number.isFinite(blockNumber) && blockNumber >= 0 ? blockNumber : null;
}

function parseBigInt(value: string | undefined): bigint | null {
  try {
    return BigInt(value ?? "0");
  } catch {
    return null;
  }
}

function parseTokenDecimals(value: string | undefined): number {
  const decimals = Number(value);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return 0;
  return decimals;
}

function sanitizeTokenText(value: string | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 24);
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
