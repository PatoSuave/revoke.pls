import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
  isAddress,
  type Address,
} from "viem";

import {
  buildDiscoveryContracts,
  collectDiscoveryReadFailures,
  parseDiscoveryResults,
  type Approval,
  type ReadResult,
} from "@/lib/approvals";
import {
  createBlockscoutDiscoverySource,
  type DiscoveryResult,
  type DiscoverySource,
  type NftDiscoveryResult,
} from "@/lib/discovery";
import {
  buildNftValidationContracts,
  parseNftValidationResults,
  type NftApproval,
} from "@/lib/nft-approvals";
import type { DiscoverySourceConfig } from "@/lib/chains";

export const ETHEREUM_MAINNET_CHAIN_ID = 1;
export const ETHEREUM_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const ETHEREUM_EXPLORER_CHAIN_ID_DEFAULT = "1";
export const ETHEREUM_EXPLORER_BASE_URL = "https://etherscan.io";

const RPC_ENV_NAMES = [
  "MAINNET_RPC_URL",
  "ETHEREUM_RPC_URL",
] as const;
const API_KEY_ENV_NAMES = [
  "ETHERSCAN_API_KEY",
] as const;
const API_URL_ENV_NAMES = [
  "ETHEREUM_EXPLORER_API_URL",
  "MAINNET_EXPLORER_API_URL",
] as const;

export type EthereumApprovalApiStatus =
  | "active-approvals-found"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface EthereumApprovalApiDiagnostics {
  chainId: typeof ETHEREUM_MAINNET_CHAIN_ID;
  rpcConfigured: boolean;
  explorerConfigured: boolean;
  rawApprovalLogCount: number;
  decodedErc20ApprovalCount: number;
  decodedNftApprovalCount: number;
  liveReadSuccessCount: number;
  liveReadFailureCount: number;
  incompleteVerificationCount: number;
  skippedApprovalCount: number;
  skippedReasons: Record<string, number>;
  discoveryTruncated: boolean;
}

export type EthereumErc20ApprovalApi = Omit<Approval, "rawAllowance"> & {
  rawAllowance: string;
};

export type EthereumNftApprovalApi = Omit<NftApproval, "tokenId"> & {
  tokenId?: string;
};

export interface EthereumApprovalApiResponse {
  ok: boolean;
  status: EthereumApprovalApiStatus;
  chainId: typeof ETHEREUM_MAINNET_CHAIN_ID;
  approvals: {
    erc20: EthereumErc20ApprovalApi[];
    nft: EthereumNftApprovalApi[];
  };
  diagnostics: EthereumApprovalApiDiagnostics;
  errors: string[];
  warnings: string[];
  missingConfig: string[];
}

export interface EthereumApprovalApiOptions {
  env?: NodeJS.ProcessEnv;
  discoverySource?: DiscoverySource;
  reader?: ContractReader;
}

interface EthereumApiConfig {
  rpcUrl: string | undefined;
  apiUrl: string | undefined;
  apiKey: string | undefined;
  missingConfig: string[];
}

interface ContractReader {
  readContract(args: unknown): Promise<unknown>;
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

export function resolveEthereumApiConfig(
  env: NodeJS.ProcessEnv = process.env,
): EthereumApiConfig {
  const rpcUrl = validHttpUrl(firstEnv(env, RPC_ENV_NAMES));
  const configuredApiUrl = validHttpUrl(firstEnv(env, API_URL_ENV_NAMES));
  const apiUrl = configuredApiUrl ?? ETHEREUM_EXPLORER_API_DEFAULT;
  const apiKey = cleanEnv(firstEnv(env, API_KEY_ENV_NAMES));
  const missingConfig: string[] = [];

  if (!rpcUrl) missingConfig.push(RPC_ENV_NAMES.join(" or "));
  if (!apiUrl) missingConfig.push(API_URL_ENV_NAMES.join(" or "));
  if (!apiKey) missingConfig.push(API_KEY_ENV_NAMES.join(" or "));

  return { rpcUrl, apiUrl, apiKey, missingConfig };
}

export function createEthereumDiscoverySource(
  config: Pick<EthereumApiConfig, "apiUrl" | "apiKey">,
): DiscoverySource {
  const source: DiscoverySourceConfig = {
    id: "ethereum-mainnet-etherscan-v2",
    name: "Ethereum Mainnet Etherscan API V2",
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    url: ETHEREUM_EXPLORER_BASE_URL,
    apiUrl: config.apiUrl ?? ETHEREUM_EXPLORER_API_DEFAULT,
    apiUrlEnvVar: API_URL_ENV_NAMES.join(" / "),
    apiChainId: ETHEREUM_EXPLORER_CHAIN_ID_DEFAULT,
    apiChainIdEnvVar: "ETHEREUM_EXPLORER_CHAIN_ID",
    apiKey: config.apiKey,
    apiKeyEnvVar: API_KEY_ENV_NAMES.join(" / "),
    apiKeyEnvVars: [...API_KEY_ENV_NAMES],
    requiresApiKey: true,
    hasApiKey: Boolean(config.apiKey),
    hasApiUrl: Boolean(config.apiUrl),
    usesDefaultApiUrl: config.apiUrl === ETHEREUM_EXPLORER_API_DEFAULT,
    queryParams: { chainid: ETHEREUM_EXPLORER_CHAIN_ID_DEFAULT },
    limitations:
      "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Ethereum logs.",
    missingApiKeyMessage:
      "Ethereum discovery requires an Etherscan API key. Set ETHERSCAN_API_KEY.",
  };

  return createBlockscoutDiscoverySource({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    source,
  });
}

function createEthereumReader(rpcUrl: string): ContractReader {
  const chain = defineChain({
    id: ETHEREUM_MAINNET_CHAIN_ID,
    name: "Ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: {
      default: { name: "Etherscan", url: ETHEREUM_EXPLORER_BASE_URL },
    },
  });

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

async function readContracts(
  reader: ContractReader,
  contracts: readonly unknown[],
): Promise<ReadResult[]> {
  const settled = await Promise.allSettled(
    contracts.map((contract) => reader.readContract(contract)),
  );

  return settled.map((result) =>
    result.status === "fulfilled"
      ? { status: "success", result: result.value }
      : {
          status: "failure",
          error:
            result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason)),
        },
  );
}

function emptyDiagnostics(
  config: Pick<EthereumApiConfig, "rpcUrl" | "apiUrl" | "apiKey">,
): EthereumApprovalApiDiagnostics {
  return {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    rpcConfigured: Boolean(config.rpcUrl),
    explorerConfigured: Boolean(config.apiUrl && config.apiKey),
    rawApprovalLogCount: 0,
    decodedErc20ApprovalCount: 0,
    decodedNftApprovalCount: 0,
    liveReadSuccessCount: 0,
    liveReadFailureCount: 0,
    incompleteVerificationCount: 0,
    skippedApprovalCount: 0,
    skippedReasons: {},
    discoveryTruncated: false,
  };
}

function addReason(
  reasons: Record<string, number>,
  reason: string,
  count: number,
) {
  if (count <= 0) return;
  reasons[reason] = (reasons[reason] ?? 0) + count;
}

function formatApprovalCandidateCount(count: number): string {
  return `${count} approval candidate${count === 1 ? "" : "s"}`;
}

function countNftLiveReads(
  results: readonly ReadResult[],
  candidates: number,
  uniqueCollections: number,
) {
  const offset = uniqueCollections * 3;
  let success = 0;
  let failure = 0;

  for (let i = 0; i < candidates; i += 1) {
    const result = results[offset + i];
    if (result?.status === "success") success += 1;
    else failure += 1;
  }

  return { success, failure };
}

function classifyStatus(input: {
  activeCount: number;
  liveReadSuccessCount: number;
  liveReadFailureCount: number;
  discoveryTruncated: boolean;
}): EthereumApprovalApiStatus {
  if (input.liveReadFailureCount > 0 || input.discoveryTruncated) {
    return "verification-incomplete";
  }
  if (input.activeCount > 0) return "active-approvals-found";
  return "complete-clear";
}

function failureMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return redactSensitiveErrorText(raw);
}

function redactSensitiveErrorText(value: string): string {
  return value
    .replace(/([?&]apikey=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]api_key=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]key=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/https?:\/\/[^\s)]+/gi, (match) => {
      try {
        const url = new URL(match);
        return `${url.protocol}//${url.host}${url.pathname}${
          url.search ? "?[redacted]" : ""
        }`;
      } catch {
        return "[url redacted]";
      }
    });
}

function serializeErc20Approval(approval: Approval): EthereumErc20ApprovalApi {
  return {
    ...approval,
    rawAllowance: approval.rawAllowance.toString(),
  };
}

function serializeNftApproval(approval: NftApproval): EthereumNftApprovalApi {
  const { tokenId, ...rest } = approval;
  return {
    ...rest,
    ...(tokenId !== undefined ? { tokenId: tokenId.toString() } : {}),
  };
}

export async function scanEthereumApprovals(
  owner: Address,
  options: EthereumApprovalApiOptions = {},
): Promise<EthereumApprovalApiResponse> {
  const config = resolveEthereumApiConfig(options.env);
  const warnings: string[] = [];

  if (config.missingConfig.length > 0) {
    return {
      ok: false,
      status: "config-missing",
      chainId: ETHEREUM_MAINNET_CHAIN_ID,
      approvals: { erc20: [], nft: [] },
      diagnostics: emptyDiagnostics(config),
      errors: [
        "Ethereum approval discovery is not configured. Set the missing server env vars.",
      ],
      warnings,
      missingConfig: config.missingConfig,
    };
  }

  const source =
    options.discoverySource ?? createEthereumDiscoverySource(config);
  const reader = options.reader ?? createEthereumReader(config.rpcUrl!);

  let erc20Discovery: DiscoveryResult;
  let nftDiscovery: NftDiscoveryResult;
  try {
    [erc20Discovery, nftDiscovery] = await Promise.all([
      source.discover(owner),
      source.discoverNftApprovals(owner),
    ]);
  } catch (error) {
    return {
      ok: false,
      status: "upstream-failure",
      chainId: ETHEREUM_MAINNET_CHAIN_ID,
      approvals: { erc20: [], nft: [] },
      diagnostics: emptyDiagnostics(config),
      errors: [`Ethereum explorer discovery failed: ${failureMessage(error)}`],
      warnings,
      missingConfig: [],
    };
  }

  const { contracts: erc20Contracts, uniqueTokens } = buildDiscoveryContracts(
    owner,
    erc20Discovery.pairs,
    ETHEREUM_MAINNET_CHAIN_ID,
  );
  const { contracts: nftContracts, uniqueCollections } =
    buildNftValidationContracts(
      owner,
      nftDiscovery.approvals,
      ETHEREUM_MAINNET_CHAIN_ID,
    );

  const [erc20Reads, nftReads] = await Promise.all([
    readContracts(reader, erc20Contracts),
    readContracts(reader, nftContracts),
  ]);

  const erc20ReadFailures = collectDiscoveryReadFailures(
    erc20Reads,
    erc20Discovery.pairs,
    uniqueTokens,
  );
  const nftLiveReads = countNftLiveReads(
    nftReads,
    nftDiscovery.approvals.length,
    uniqueCollections.length,
  );

  const erc20Parsed = parseDiscoveryResults(
    erc20Reads,
    owner,
    ETHEREUM_MAINNET_CHAIN_ID,
    erc20Discovery.pairs,
  );
  const nftParsed = parseNftValidationResults(
    nftReads,
    owner,
    ETHEREUM_MAINNET_CHAIN_ID,
    nftDiscovery.approvals,
  );

  const activeCount =
    erc20Parsed.approvals.length + nftParsed.approvals.length;
  const decodedCount =
    erc20Discovery.pairs.length + nftDiscovery.approvals.length;
  const liveReadSuccessCount =
    erc20ReadFailures.allowanceSucceeded + nftLiveReads.success;
  const liveReadFailureCount =
    erc20ReadFailures.allowanceFailed + nftLiveReads.failure;
  const discoveryTruncated =
    erc20Discovery.truncated || nftDiscovery.truncated;
  const skippedReasons: Record<string, number> = {};
  const inactiveOrRevoked = Math.max(
    decodedCount - activeCount - liveReadFailureCount,
    0,
  );
  addReason(skippedReasons, "inactive-or-revoked", inactiveOrRevoked);
  addReason(
    skippedReasons,
    "erc20-live-read-failure",
    erc20ReadFailures.allowanceFailed,
  );
  addReason(skippedReasons, "nft-live-read-failure", nftLiveReads.failure);
  addReason(skippedReasons, "metadata-read-failure", erc20ReadFailures.metadataFailed);
  addReason(skippedReasons, "discovery-truncated", discoveryTruncated ? 1 : 0);

  if (discoveryTruncated) {
    warnings.push(
      "Ethereum discovery hit explorer pagination/windowing limits. Verification is incomplete.",
    );
  }
  if (liveReadFailureCount > 0) {
    if (erc20ReadFailures.allowanceFailed > 0) {
      warnings.push(
        `Ethereum ERC-20 allowance live reads failed for ${formatApprovalCandidateCount(
          erc20ReadFailures.allowanceFailed,
        )}.`,
      );
    }
    if (nftLiveReads.failure > 0) {
      warnings.push(
        `Ethereum NFT approval live reads failed for ${formatApprovalCandidateCount(
          nftLiveReads.failure,
        )}.`,
      );
    }
    warnings.push(
      "Ethereum live validation did not complete for every discovered approval. Do not treat this wallet as clear.",
    );
  }

  const status = classifyStatus({
    activeCount,
    liveReadSuccessCount,
    liveReadFailureCount,
    discoveryTruncated,
  });
  const diagnostics: EthereumApprovalApiDiagnostics = {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    rpcConfigured: true,
    explorerConfigured: true,
    rawApprovalLogCount: erc20Discovery.rawCount + nftDiscovery.rawCount,
    decodedErc20ApprovalCount: erc20Discovery.pairs.length,
    decodedNftApprovalCount: nftDiscovery.approvals.length,
    liveReadSuccessCount,
    liveReadFailureCount,
    incompleteVerificationCount:
      liveReadFailureCount + (discoveryTruncated ? 1 : 0),
    skippedApprovalCount: Math.max(decodedCount - activeCount, 0),
    skippedReasons,
    discoveryTruncated,
  };

  return {
    ok: status === "active-approvals-found" || status === "complete-clear",
    status,
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    approvals: {
      erc20: erc20Parsed.approvals.map(serializeErc20Approval),
      nft: nftParsed.approvals.map(serializeNftApproval),
    },
    diagnostics,
    errors:
      status === "upstream-failure"
        ? ["Ethereum RPC live validation failed for every discovered approval."]
        : [],
    warnings,
    missingConfig: [],
  };
}

export function normalizeEthereumOwner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}
