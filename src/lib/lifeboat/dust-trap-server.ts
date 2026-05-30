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
  analyzeDustTrap,
  emptyDustTrapSummary,
  formatDustTokenAmount,
  type DustTrapTransferInput,
  type LifeboatDustTrapApiResponse,
} from "@/lib/lifeboat/dust-trap";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_API_DEFAULT,
  OPTIMISM_EXPLORER_BASE_URL,
  OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT,
} from "@/lib/optimism-approval-api";

const DUST_TRAP_REQUEST_TIMEOUT_MS = 20_000;
const DUST_TRAP_HISTORY_OFFSET = 75;

type DustTrapChainId =
  | typeof ETHEREUM_MAINNET_CHAIN_ID
  | typeof ARBITRUM_ONE_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof HYPEREVM_CHAIN_ID
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID;

type DustTrapExplorerKind = "etherscan-v2" | "blockscout-compatible";

interface DustTrapChainConfig {
  chainId: DustTrapChainId;
  chainName: string;
  explorerBaseUrl: string;
  apiUrl: string;
  apiKind: DustTrapExplorerKind;
  apiChainId?: string;
  apiKeyEnvNames: readonly string[];
  apiUrlEnvNames: readonly string[];
}

interface ResolvedDustTrapConfig extends DustTrapChainConfig {
  apiKey: string | undefined;
  missingConfig: string[];
}

interface ExplorerListResponse {
  status?: string;
  message?: string;
  result?: unknown;
}

interface ExplorerTokenTx {
  hash?: string;
  timeStamp?: string;
  from?: string;
  to?: string;
  value?: string;
  contractAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
}

interface ExplorerNftTx {
  hash?: string;
  timeStamp?: string;
  from?: string;
  to?: string;
  contractAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenID?: string;
}

const CHAIN_CONFIGS: Record<DustTrapChainId, DustTrapChainConfig> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    chainName: "Ethereum Mainnet",
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
    explorerBaseUrl: "https://scan.pulsechain.com",
    apiUrl: PULSECHAIN_EXPLORER_API_DEFAULT,
    apiKind: "blockscout-compatible",
    apiKeyEnvNames: [],
    apiUrlEnvNames: ["PULSECHAIN_EXPLORER_API_URL"],
  },
  [BSC_CHAIN_ID]: {
    chainId: BSC_CHAIN_ID,
    chainName: "BNB Smart Chain",
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
    explorerBaseUrl: "https://polygonscan.com",
    apiUrl: POLYGON_EXPLORER_API_DEFAULT,
    apiKind: "etherscan-v2",
    apiChainId: POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
    apiKeyEnvNames: ["POLYGON_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiUrlEnvNames: ["POLYGON_EXPLORER_API_URL"],
  },
};

export function isDustTrapChainId(value: number): value is DustTrapChainId {
  return Object.prototype.hasOwnProperty.call(CHAIN_CONFIGS, value.toString());
}

export async function discoverDustTrapSignals({
  owner,
  chainId,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  owner: Address;
  chainId: DustTrapChainId;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatDustTrapApiResponse> {
  const config = resolveDustTrapConfig(chainId, env);
  if (config.missingConfig.length > 0) {
    return emptyDustTrapResponse(config, owner, "config-missing", {
      errors: [`${config.chainName} dust trap diagnostic is not configured.`],
      missingConfig: config.missingConfig,
    });
  }

  const errors: string[] = [];
  const transferGroups = await Promise.all([
    fetchTokenTransfers({ owner, config, signal, fetcher }).catch(
      (error: unknown) => {
        errors.push(
          `Token transfer history failed: ${redactSensitiveErrorText(
            error instanceof Error ? error.message : String(error),
          )}`,
        );
        return [];
      },
    ),
    fetchNftTransfers({ owner, config, signal, fetcher }).catch(
      (error: unknown) => {
        errors.push(
          `NFT transfer history failed: ${redactSensitiveErrorText(
            error instanceof Error ? error.message : String(error),
          )}`,
        );
        return [];
      },
    ),
  ]);

  const transfers = transferGroups.flat();
  if (transfers.length === 0 && errors.length > 0) {
    return emptyDustTrapResponse(config, owner, "upstream-failure", {
      errors: [`Dust trap diagnostic failed: ${errors.join(" ")}`],
      warnings: [
        "The dust trap diagnostic is incomplete. Do not treat this as proof that the wallet has no suspicious token or NFT dust.",
      ],
    });
  }

  const analysis = analyzeDustTrap({ owner, chainId, transfers });
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
    transfers: analysis.transfers,
    summary: analysis.summary,
    warnings: [
      ...analysis.warnings,
      ...(partial
        ? [
            "One dust trap data source failed, so missing token or NFT dust must be treated as incomplete.",
          ]
        : []),
    ],
    errors,
    missingConfig: [],
  };
}

export function dustTrapTimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DUST_TRAP_REQUEST_TIMEOUT_MS,
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

function resolveDustTrapConfig(
  chainId: DustTrapChainId,
  env: NodeJS.ProcessEnv,
): ResolvedDustTrapConfig {
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
    apiUrl,
    apiKey,
    missingConfig,
  };
}

async function fetchTokenTransfers({
  owner,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedDustTrapConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<DustTrapTransferInput[]> {
  const rows = await fetchExplorerRows({
    owner,
    config,
    action: "tokentx",
    signal,
    fetcher,
  });
  return rows
    .map((row) => parseTokenTransfer(row, owner, config))
    .filter((item): item is DustTrapTransferInput => Boolean(item));
}

async function fetchNftTransfers({
  owner,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedDustTrapConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<DustTrapTransferInput[]> {
  const rows = await fetchExplorerRows({
    owner,
    config,
    action: "tokennfttx",
    signal,
    fetcher,
  });
  return rows
    .map((row) => parseNftTransfer(row, owner, config))
    .filter((item): item is DustTrapTransferInput => Boolean(item));
}

async function fetchExplorerRows({
  owner,
  config,
  action,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedDustTrapConfig;
  action: "tokentx" | "tokennfttx";
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
  config: ResolvedDustTrapConfig,
  action: "tokentx" | "tokennfttx",
): string {
  const url = new URL(config.apiUrl);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", action);
  url.searchParams.set("address", owner);
  url.searchParams.set("startblock", "0");
  url.searchParams.set("endblock", "99999999");
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", DUST_TRAP_HISTORY_OFFSET.toString());
  url.searchParams.set("sort", "desc");
  if (config.apiKind === "etherscan-v2" && config.apiChainId) {
    url.searchParams.set("chainid", config.apiChainId);
  }
  if (config.apiKey) url.searchParams.set("apikey", config.apiKey);
  return url.toString();
}

function parseTokenTransfer(
  value: unknown,
  owner: Address,
  config: ResolvedDustTrapConfig,
): DustTrapTransferInput | null {
  const tx = value as ExplorerTokenTx;
  if (!tx.hash || !tx.from || !tx.to || !tx.contractAddress) return null;
  if (!isAddress(tx.from) || !isAddress(tx.to) || !isAddress(tx.contractAddress)) {
    return null;
  }

  const to = getAddress(tx.to);
  if (to.toLowerCase() !== owner.toLowerCase()) return null;

  const timestamp = parseTimestamp(tx.timeStamp);
  const valueRaw = parseBigInt(tx.value);
  if (timestamp === null || valueRaw === null || valueRaw <= 0n) return null;

  const contractAddress = getAddress(tx.contractAddress);
  const decimals = parseTokenDecimals(tx.tokenDecimal);
  const symbol = sanitizeRawMetadata(tx.tokenSymbol);
  return {
    id: `token:${tx.hash}:${contractAddress.toLowerCase()}`,
    assetType: "token",
    txHash: tx.hash,
    timestamp,
    occurredAt: new Date(timestamp * 1000).toISOString(),
    from: getAddress(tx.from),
    to,
    contractAddress,
    tokenId: null,
    rawValue: valueRaw,
    decimals,
    amount: formatDustTokenAmount({ value: valueRaw, decimals, symbol }),
    metadata: {
      rawName: sanitizeRawMetadata(tx.tokenName),
      rawSymbol: symbol,
    },
    tokenExplorerUrl: tokenExplorerUrl(config, contractAddress),
    txExplorerUrl: txExplorerUrl(config, tx.hash),
  };
}

function parseNftTransfer(
  value: unknown,
  owner: Address,
  config: ResolvedDustTrapConfig,
): DustTrapTransferInput | null {
  const tx = value as ExplorerNftTx;
  if (!tx.hash || !tx.from || !tx.to || !tx.contractAddress) return null;
  if (!isAddress(tx.from) || !isAddress(tx.to) || !isAddress(tx.contractAddress)) {
    return null;
  }

  const to = getAddress(tx.to);
  if (to.toLowerCase() !== owner.toLowerCase()) return null;

  const timestamp = parseTimestamp(tx.timeStamp);
  if (timestamp === null) return null;

  const contractAddress = getAddress(tx.contractAddress);
  const tokenId = sanitizeTokenId(tx.tokenID);
  return {
    id: `nft:${tx.hash}:${contractAddress.toLowerCase()}:${tokenId ?? "unknown"}`,
    assetType: "nft",
    txHash: tx.hash,
    timestamp,
    occurredAt: new Date(timestamp * 1000).toISOString(),
    from: getAddress(tx.from),
    to,
    contractAddress,
    tokenId,
    rawValue: null,
    decimals: null,
    amount: tokenId ? `NFT #${tokenId}` : "NFT",
    metadata: {
      rawName: sanitizeRawMetadata(tx.tokenName),
      rawSymbol: sanitizeRawMetadata(tx.tokenSymbol),
    },
    tokenExplorerUrl: tokenExplorerUrl(config, contractAddress),
    txExplorerUrl: txExplorerUrl(config, tx.hash),
  };
}

function emptyDustTrapResponse(
  config: DustTrapChainConfig,
  owner: Address | null,
  status: LifeboatDustTrapApiResponse["status"],
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
  } = {},
): LifeboatDustTrapApiResponse {
  return {
    ok: false,
    status,
    chainId: config.chainId,
    chainName: config.chainName,
    owner,
    riskLevel:
      status === "unsupported" ? "unsupported" : "upstream_unavailable",
    evidence: [],
    transfers: [],
    summary: emptyDustTrapSummary(),
    warnings: overrides.warnings ?? [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
  };
}

function tokenExplorerUrl(
  config: ResolvedDustTrapConfig,
  address: Address,
): string {
  return `${config.explorerBaseUrl.replace(/\/$/, "")}/token/${address}`;
}

function txExplorerUrl(config: ResolvedDustTrapConfig, hash: string): string {
  return `${config.explorerBaseUrl.replace(/\/$/, "")}/tx/${hash}`;
}

function parseTimestamp(value: string | undefined): number | null {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
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

function sanitizeRawMetadata(value: string | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 120);
}

function sanitizeTokenId(value: string | undefined): string | null {
  const trimmed = value?.replace(/[^\w.-]/g, "").trim();
  return trimmed ? trimmed.slice(0, 80) : null;
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
