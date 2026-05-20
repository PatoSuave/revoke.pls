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
  buildHybridTokenAddressSet,
  buildPermit2AllowanceContracts,
  collectDiscoveryReadFailures,
  collectPermit2ReadFailures,
  parseDiscoveryResults,
  parsePermit2AllowanceResults,
  type Approval,
  type ReadResult,
} from "@/lib/approvals";
import type { DiscoverySourceConfig } from "@/lib/chains";
import {
  createBlockscoutDiscoverySource,
  type DiscoveryLimits,
  type DiscoveryResult,
  type DiscoverySource,
  type NftDiscoveryResult,
  type Permit2DiscoveryResult,
} from "@/lib/discovery";
import {
  OPTIMISM_APPROVAL_API_DISCOVERY_LIMITS,
  OPTIMISM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
  OPTIMISM_APPROVAL_API_RPC_READ_CONCURRENCY,
} from "@/lib/optimism-approval-api-controls";
import {
  buildNftValidationContracts,
  parseNftValidationResults,
  type NftApproval,
} from "@/lib/nft-approvals";

export const OPTIMISM_CHAIN_ID = 10;
export const OPTIMISM_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT =
  OPTIMISM_CHAIN_ID.toString();
export const OPTIMISM_EXPLORER_BASE_URL = "https://optimistic.etherscan.io";

const RPC_ENV_NAMES = [
  "OPTIMISM_RPC_URL",
  "OPTIMISM_MAINNET_RPC_URL",
  "OP_MAINNET_RPC_URL",
] as const;
const API_KEY_ENV_NAMES = [
  "OPTIMISM_EXPLORER_API_KEY",
  "OPTIMISTIC_ETHERSCAN_API_KEY",
  "ETHERSCAN_API_KEY",
] as const;
const API_URL_ENV_NAMES = ["OPTIMISM_EXPLORER_API_URL"] as const;
const API_CHAIN_ID_ENV_NAME = "OPTIMISM_EXPLORER_CHAIN_ID";

export type OptimismApprovalApiStatus =
  | "active-approvals-found"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface OptimismApprovalApiDiagnostics {
  chainId: typeof OPTIMISM_CHAIN_ID;
  rpcConfigured: boolean;
  explorerConfigured: boolean;
  rawApprovalLogCount: number;
  decodedErc20ApprovalCount: number;
  decodedPermit2ApprovalCount: number;
  decodedNftApprovalCount: number;
  liveReadSuccessCount: number;
  liveReadFailureCount: number;
  incompleteVerificationCount: number;
  skippedApprovalCount: number;
  skippedReasons: Record<string, number>;
  discoveryTruncated: boolean;
  requestTimedOut: boolean;
  rateLimited: boolean;
  candidateCapHit: boolean;
  liveReadCandidateCap: number;
  liveReadCandidatesTotal: number;
  liveReadCandidatesProcessed: number;
  rpcReadConcurrency: number;
  upstreamRetryCount: number;
  incompleteReasons: string[];
}

export type OptimismErc20ApprovalApi = Omit<Approval, "rawAllowance"> & {
  rawAllowance: string;
};

export type OptimismNftApprovalApi = Omit<NftApproval, "tokenId"> & {
  tokenId?: string;
};

export interface OptimismApprovalApiResponse {
  ok: boolean;
  status: OptimismApprovalApiStatus;
  chainId: typeof OPTIMISM_CHAIN_ID;
  approvals: {
    erc20: OptimismErc20ApprovalApi[];
    nft: OptimismNftApprovalApi[];
  };
  diagnostics: OptimismApprovalApiDiagnostics;
  errors: string[];
  warnings: string[];
  missingConfig: string[];
}

export interface OptimismApprovalApiOptions {
  env?: NodeJS.ProcessEnv;
  discoverySource?: DiscoverySource;
  reader?: ContractReader;
  signal?: AbortSignal;
  discoveryLimits?: DiscoveryLimits;
  liveReadCandidateCap?: number;
  rpcReadConcurrency?: number;
}

interface OptimismApiConfig {
  rpcUrl: string | undefined;
  apiUrl: string | undefined;
  apiKey: string | undefined;
  apiChainId: string;
  missingConfig: string[];
  warnings: string[];
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

export function resolveOptimismApiConfig(
  env: NodeJS.ProcessEnv = process.env,
): OptimismApiConfig {
  const rpcUrl = validHttpUrl(firstEnv(env, RPC_ENV_NAMES));
  const configuredApiUrl = validHttpUrl(firstEnv(env, API_URL_ENV_NAMES));
  const apiUrl = configuredApiUrl ?? OPTIMISM_EXPLORER_API_DEFAULT;
  const apiKey = cleanEnv(firstEnv(env, API_KEY_ENV_NAMES));
  const configuredChainId = cleanEnv(env[API_CHAIN_ID_ENV_NAME]);
  const apiChainId =
    configuredChainId === OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT
      ? configuredChainId
      : OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT;
  const missingConfig: string[] = [];
  const warnings: string[] = [];

  if (!rpcUrl) missingConfig.push(RPC_ENV_NAMES.join(" or "));
  if (!apiUrl) missingConfig.push(API_URL_ENV_NAMES.join(" or "));
  if (!apiKey) missingConfig.push(API_KEY_ENV_NAMES.join(" or "));
  if (
    configuredChainId &&
    configuredChainId !== OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT
  ) {
    warnings.push(
      `${API_CHAIN_ID_ENV_NAME} must be ${OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT} for OP Mainnet. The app is using chainid=${OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT}.`,
    );
  }

  return { rpcUrl, apiUrl, apiKey, apiChainId, missingConfig, warnings };
}

export function createOptimismDiscoverySource(
  config: Pick<OptimismApiConfig, "apiUrl" | "apiKey" | "apiChainId">,
  limits: DiscoveryLimits = OPTIMISM_APPROVAL_API_DISCOVERY_LIMITS,
): DiscoverySource {
  const source: DiscoverySourceConfig = {
    id: "op-mainnet-etherscan-v2",
    name: "OP Mainnet Etherscan API V2",
    apiProviderKind: "etherscan-v2",
    apiProviderName: "Etherscan API V2",
    url: OPTIMISM_EXPLORER_BASE_URL,
    apiUrl: config.apiUrl ?? OPTIMISM_EXPLORER_API_DEFAULT,
    apiUrlEnvVar: API_URL_ENV_NAMES.join(" / "),
    apiChainId: config.apiChainId,
    apiChainIdEnvVar: API_CHAIN_ID_ENV_NAME,
    apiKey: config.apiKey,
    apiKeyEnvVar: API_KEY_ENV_NAMES.join(" / "),
    apiKeyEnvVars: [...API_KEY_ENV_NAMES],
    requiresApiKey: true,
    hasApiKey: Boolean(config.apiKey),
    hasApiUrl: Boolean(config.apiUrl),
    usesDefaultApiUrl: config.apiUrl === OPTIMISM_EXPLORER_API_DEFAULT,
    queryParams: { chainid: config.apiChainId },
    limitations:
      "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for OP Mainnet logs.",
    missingApiKeyMessage:
      "Optimism discovery requires an Etherscan API V2 key. Set OPTIMISM_EXPLORER_API_KEY, OPTIMISTIC_ETHERSCAN_API_KEY, or ETHERSCAN_API_KEY.",
  };

  return createBlockscoutDiscoverySource({
    chainId: OPTIMISM_CHAIN_ID,
    source,
    limits,
  });
}

function createOptimismReader(rpcUrl: string): ContractReader {
  const chain = defineChain({
    id: OPTIMISM_CHAIN_ID,
    name: "OP Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: {
      default: { name: "Optimistic Etherscan", url: OPTIMISM_EXPLORER_BASE_URL },
    },
  });

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

interface ContractReadOutput {
  results: ReadResult[];
  requestTimedOut: boolean;
}

async function readContracts(
  reader: ContractReader,
  contracts: readonly unknown[],
  options: {
    concurrency: number;
    signal?: AbortSignal;
  },
): Promise<ContractReadOutput> {
  const results: ReadResult[] = [];
  const concurrency = Math.max(1, Math.floor(options.concurrency));
  let requestTimedOut = Boolean(options.signal?.aborted);

  for (let i = 0; i < contracts.length; i += concurrency) {
    if (options.signal?.aborted) {
      requestTimedOut = true;
      appendTimedOutReads(results, contracts.length - results.length);
      break;
    }

    const chunk = contracts.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((contract) =>
        readContractWithAbort(reader, contract, options.signal),
      ),
    );
    results.push(...chunkResults);
    requestTimedOut ||= Boolean(options.signal?.aborted);
  }

  if (results.length < contracts.length) {
    appendTimedOutReads(results, contracts.length - results.length);
    requestTimedOut = true;
  }

  return { results, requestTimedOut };
}

async function readContractWithAbort(
  reader: ContractReader,
  contract: unknown,
  signal: AbortSignal | undefined,
): Promise<ReadResult> {
  if (signal?.aborted) return requestTimedOutReadFailure();

  const read = reader
    .readContract(contract)
    .then<ReadResult>((result) => ({ status: "success", result }))
    .catch<ReadResult>((error) => ({
      status: "failure",
      error: error instanceof Error ? error : new Error(String(error)),
    }));

  if (!signal) return read;

  let abort: (() => void) | undefined;
  const aborted = new Promise<ReadResult>((resolve) => {
    abort = () => resolve(requestTimedOutReadFailure());
    signal.addEventListener("abort", abort, { once: true });
  });

  try {
    return await Promise.race([read, aborted]);
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
  }
}

function appendTimedOutReads(results: ReadResult[], count: number) {
  for (let i = 0; i < count; i += 1) {
    results.push(requestTimedOutReadFailure());
  }
}

function requestTimedOutReadFailure(): ReadResult {
  return {
    status: "failure",
    error: new Error("Optimism approval request timed out."),
  };
}

function emptyDiagnostics(
  config: Pick<OptimismApiConfig, "rpcUrl" | "apiUrl" | "apiKey">,
  overrides: Partial<OptimismApprovalApiDiagnostics> = {},
): OptimismApprovalApiDiagnostics {
  return {
    chainId: OPTIMISM_CHAIN_ID,
    rpcConfigured: Boolean(config.rpcUrl),
    explorerConfigured: Boolean(config.apiUrl && config.apiKey),
    rawApprovalLogCount: 0,
    decodedErc20ApprovalCount: 0,
    decodedPermit2ApprovalCount: 0,
    decodedNftApprovalCount: 0,
    liveReadSuccessCount: 0,
    liveReadFailureCount: 0,
    incompleteVerificationCount: 0,
    skippedApprovalCount: 0,
    skippedReasons: {},
    discoveryTruncated: false,
    requestTimedOut: false,
    rateLimited: false,
    candidateCapHit: false,
    liveReadCandidateCap: OPTIMISM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP,
    liveReadCandidatesTotal: 0,
    liveReadCandidatesProcessed: 0,
    rpcReadConcurrency: OPTIMISM_APPROVAL_API_RPC_READ_CONCURRENCY,
    upstreamRetryCount: 0,
    incompleteReasons: [],
    ...overrides,
  };
}

export function createOptimismApprovalApiFailureResponse({
  status,
  errors,
  warnings = [],
  missingConfig = [],
  diagnostics = {},
}: {
  status: Exclude<
    OptimismApprovalApiStatus,
    "active-approvals-found" | "complete-clear"
  >;
  errors: string[];
  warnings?: string[];
  missingConfig?: string[];
  diagnostics?: Partial<OptimismApprovalApiDiagnostics>;
}): OptimismApprovalApiResponse {
  return {
    ok: false,
    status,
    chainId: OPTIMISM_CHAIN_ID,
    approvals: { erc20: [], nft: [] },
    diagnostics: emptyDiagnostics(
      { rpcUrl: undefined, apiUrl: undefined, apiKey: undefined },
      diagnostics,
    ),
    errors,
    warnings,
    missingConfig,
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

function emptyPermit2Discovery(
  source: DiscoverySource["meta"],
): Permit2DiscoveryResult {
  return {
    source,
    allowances: [],
    rawCount: 0,
    truncated: false,
    windows: 0,
    requests: 0,
  };
}

function classifyStatus(input: {
  activeCount: number;
  liveReadFailureCount: number;
  discoveryTruncated: boolean;
  candidateCapHit: boolean;
  requestTimedOut: boolean;
}): OptimismApprovalApiStatus {
  if (
    input.liveReadFailureCount > 0 ||
    input.discoveryTruncated ||
    input.candidateCapHit ||
    input.requestTimedOut
  ) {
    return "verification-incomplete";
  }
  if (input.activeCount > 0) return "active-approvals-found";
  return "complete-clear";
}

function failureMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return redactSensitiveErrorText(raw);
}

function isUpstreamRateLimit(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("http 429")
  );
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

function serializeErc20Approval(approval: Approval): OptimismErc20ApprovalApi {
  return {
    ...approval,
    rawAllowance: approval.rawAllowance.toString(),
  };
}

function serializeNftApproval(approval: NftApproval): OptimismNftApprovalApi {
  const { tokenId, ...rest } = approval;
  return {
    ...rest,
    ...(tokenId !== undefined ? { tokenId: tokenId.toString() } : {}),
  };
}

function buildIncompleteReasons(input: {
  discoveryTruncated: boolean;
  candidateCapHit: boolean;
  requestTimedOut: boolean;
  erc20LiveReadFailures: number;
  permit2LiveReadFailures: number;
  nftLiveReadFailures: number;
  liveReadCandidatesTotal: number;
  liveReadCandidatesProcessed: number;
}): string[] {
  const reasons: string[] = [];
  if (input.discoveryTruncated) reasons.push("discovery was truncated");
  if (input.candidateCapHit) {
    reasons.push(
      `candidate cap hit (${input.liveReadCandidatesProcessed}/${input.liveReadCandidatesTotal} checked)`,
    );
  }
  if (input.requestTimedOut) reasons.push("request timed out");
  if (input.erc20LiveReadFailures > 0) {
    reasons.push(`${input.erc20LiveReadFailures} ERC-20 live reads failed`);
  }
  if (input.permit2LiveReadFailures > 0) {
    reasons.push(`${input.permit2LiveReadFailures} Permit2 live reads failed`);
  }
  if (input.nftLiveReadFailures > 0) {
    reasons.push(`${input.nftLiveReadFailures} NFT live reads failed`);
  }
  return reasons;
}

export async function scanOptimismApprovals(
  owner: Address,
  options: OptimismApprovalApiOptions = {},
): Promise<OptimismApprovalApiResponse> {
  const config = resolveOptimismApiConfig(options.env);
  const warnings: string[] = [...config.warnings];
  const liveReadCandidateCap =
    options.liveReadCandidateCap ?? OPTIMISM_APPROVAL_API_LIVE_READ_CANDIDATE_CAP;
  const rpcReadConcurrency =
    options.rpcReadConcurrency ?? OPTIMISM_APPROVAL_API_RPC_READ_CONCURRENCY;
  const baseDiagnostics = {
    liveReadCandidateCap,
    rpcReadConcurrency,
  };

  if (config.missingConfig.length > 0) {
    return {
      ok: false,
      status: "config-missing",
      chainId: OPTIMISM_CHAIN_ID,
      approvals: { erc20: [], nft: [] },
      diagnostics: emptyDiagnostics(config, baseDiagnostics),
      errors: [
        "Optimism approval discovery is not configured. Set the missing server env vars.",
      ],
      warnings,
      missingConfig: config.missingConfig,
    };
  }

  const source =
    options.discoverySource ??
    createOptimismDiscoverySource(
      config,
      options.discoveryLimits ?? OPTIMISM_APPROVAL_API_DISCOVERY_LIMITS,
    );
  const reader = options.reader ?? createOptimismReader(config.rpcUrl!);

  let erc20Discovery: DiscoveryResult;
  let nftDiscovery: NftDiscoveryResult;
  let permit2Discovery: Permit2DiscoveryResult;
  try {
    [erc20Discovery, nftDiscovery, permit2Discovery] = await Promise.all([
      source.discover(owner, { signal: options.signal }),
      source.discoverNftApprovals(owner, { signal: options.signal }),
      source.discoverPermit2Allowances?.(owner, { signal: options.signal }) ??
        emptyPermit2Discovery(source.meta),
    ]);
  } catch (error) {
    const rateLimited = isUpstreamRateLimit(error);
    const requestTimedOut = Boolean(options.signal?.aborted);
    return {
      ok: false,
      status: "upstream-failure",
      chainId: OPTIMISM_CHAIN_ID,
      approvals: { erc20: [], nft: [] },
      diagnostics: emptyDiagnostics(config, {
        ...baseDiagnostics,
        requestTimedOut,
        rateLimited,
        incompleteVerificationCount: 1,
        incompleteReasons: [
          requestTimedOut
            ? "request timed out during explorer discovery"
            : rateLimited
              ? "upstream explorer rate limited discovery"
              : "upstream explorer discovery failed",
        ],
      }),
      errors: [
        requestTimedOut
          ? "Optimism approval discovery timed out before it completed."
          : `Optimism explorer discovery failed: ${failureMessage(error)}`,
      ],
      warnings,
      missingConfig: [],
    };
  }

  const liveReadCandidatesTotal =
    erc20Discovery.pairs.length +
    permit2Discovery.allowances.length +
    nftDiscovery.approvals.length;
  const normalizedCandidateCap = Math.max(0, Math.floor(liveReadCandidateCap));
  const erc20PairsForRead = erc20Discovery.pairs.slice(
    0,
    normalizedCandidateCap,
  );
  const permit2CandidateAllowance = Math.max(
    normalizedCandidateCap - erc20PairsForRead.length,
    0,
  );
  const permit2AllowancesForRead = permit2Discovery.allowances.slice(
    0,
    permit2CandidateAllowance,
  );
  const nftCandidateAllowance = Math.max(
    normalizedCandidateCap -
      erc20PairsForRead.length -
      permit2AllowancesForRead.length,
    0,
  );
  const nftApprovalsForRead = nftDiscovery.approvals.slice(
    0,
    nftCandidateAllowance,
  );
  const liveReadCandidatesProcessed =
    erc20PairsForRead.length +
    permit2AllowancesForRead.length +
    nftApprovalsForRead.length;
  const candidateCapHit =
    liveReadCandidatesTotal > liveReadCandidatesProcessed;

  const { contracts: erc20Contracts, uniqueTokens: erc20UniqueTokens } =
    buildDiscoveryContracts(owner, erc20PairsForRead, OPTIMISM_CHAIN_ID);
  const {
    contracts: permit2Contracts,
    uniqueTokens: permit2UniqueTokens,
  } = buildPermit2AllowanceContracts(
    owner,
    permit2AllowancesForRead,
    OPTIMISM_CHAIN_ID,
  );
  const { contracts: nftContracts, uniqueCollections } =
    buildNftValidationContracts(
      owner,
      nftApprovalsForRead,
      OPTIMISM_CHAIN_ID,
    );

  const [erc20ReadOutput, permit2ReadOutput, nftReadOutput] =
    await Promise.all([
    readContracts(reader, erc20Contracts, {
      concurrency: rpcReadConcurrency,
      signal: options.signal,
    }),
    readContracts(reader, permit2Contracts, {
      concurrency: rpcReadConcurrency,
      signal: options.signal,
    }),
    readContracts(reader, nftContracts, {
      concurrency: rpcReadConcurrency,
      signal: options.signal,
    }),
  ]);
  const erc20Reads = erc20ReadOutput.results;
  const permit2Reads = permit2ReadOutput.results;
  const nftReads = nftReadOutput.results;
  const requestTimedOut =
    erc20ReadOutput.requestTimedOut ||
    permit2ReadOutput.requestTimedOut ||
    nftReadOutput.requestTimedOut ||
    Boolean(options.signal?.aborted);

  const erc20ReadFailures = collectDiscoveryReadFailures(
    erc20Reads,
    erc20PairsForRead,
    erc20UniqueTokens,
  );
  const permit2ReadFailures = collectPermit2ReadFailures(
    permit2Reads,
    permit2AllowancesForRead,
    permit2UniqueTokens,
  );
  const nftLiveReads = countNftLiveReads(
    nftReads,
    nftApprovalsForRead.length,
    uniqueCollections.length,
  );
  const hybridTokenAddresses = buildHybridTokenAddressSet({
    erc20Pairs: erc20Discovery.pairs,
    permit2Allowances: permit2Discovery.allowances,
    nftApprovals: nftDiscovery.approvals,
  });

  const erc20Parsed = parseDiscoveryResults(
    erc20Reads,
    owner,
    OPTIMISM_CHAIN_ID,
    erc20PairsForRead,
    { hybridTokenAddresses },
  );
  const permit2Parsed = parsePermit2AllowanceResults(
    permit2Reads,
    owner,
    OPTIMISM_CHAIN_ID,
    permit2AllowancesForRead,
    { hybridTokenAddresses },
  );
  const nftParsed = parseNftValidationResults(
    nftReads,
    owner,
    OPTIMISM_CHAIN_ID,
    nftApprovalsForRead,
  );

  const activeCount =
    erc20Parsed.approvals.length +
    permit2Parsed.approvals.length +
    nftParsed.approvals.length;
  const decodedCount =
    erc20Discovery.pairs.length +
    permit2Discovery.allowances.length +
    nftDiscovery.approvals.length;
  const processedDecodedCount =
    erc20PairsForRead.length +
    permit2AllowancesForRead.length +
    nftApprovalsForRead.length;
  const liveReadSuccessCount =
    erc20ReadFailures.allowanceSucceeded +
    permit2ReadFailures.allowanceSucceeded +
    nftLiveReads.success;
  const liveReadFailureCount =
    erc20ReadFailures.allowanceFailed +
    permit2ReadFailures.allowanceFailed +
    nftLiveReads.failure;
  const discoveryTruncated =
    erc20Discovery.truncated ||
    permit2Discovery.truncated ||
    nftDiscovery.truncated;
  const skippedReasons: Record<string, number> = {};
  const inactiveOrRevoked = Math.max(
    processedDecodedCount - activeCount - liveReadFailureCount,
    0,
  );
  addReason(skippedReasons, "inactive-or-revoked", inactiveOrRevoked);
  addReason(
    skippedReasons,
    "erc20-live-read-failure",
    erc20ReadFailures.allowanceFailed,
  );
  addReason(
    skippedReasons,
    "permit2-live-read-failure",
    permit2ReadFailures.allowanceFailed,
  );
  addReason(skippedReasons, "nft-live-read-failure", nftLiveReads.failure);
  addReason(
    skippedReasons,
    "metadata-read-failure",
    erc20ReadFailures.metadataFailed + permit2ReadFailures.metadataFailed,
  );
  addReason(skippedReasons, "discovery-truncated", discoveryTruncated ? 1 : 0);
  addReason(
    skippedReasons,
    "candidate-cap-hit",
    candidateCapHit ? liveReadCandidatesTotal - liveReadCandidatesProcessed : 0,
  );
  addReason(skippedReasons, "request-timed-out", requestTimedOut ? 1 : 0);

  if (discoveryTruncated) {
    warnings.push(
      "Optimism discovery hit explorer pagination/windowing limits. Verification is incomplete.",
    );
  }
  if (candidateCapHit) {
    warnings.push(
      `Optimism live validation reached the public API candidate cap; checked ${liveReadCandidatesProcessed} of ${liveReadCandidatesTotal} discovered approval candidates.`,
    );
  }
  if (requestTimedOut) {
    warnings.push(
      "Optimism approval scanning timed out before every discovered approval could be verified.",
    );
  }
  if (liveReadFailureCount > 0) {
    if (erc20ReadFailures.allowanceFailed > 0) {
      warnings.push(
        `Optimism ERC-20 allowance live reads failed for ${formatApprovalCandidateCount(
          erc20ReadFailures.allowanceFailed,
        )}.`,
      );
    }
    if (permit2ReadFailures.allowanceFailed > 0) {
      warnings.push(
        `Optimism Permit2 allowance live reads failed for ${formatApprovalCandidateCount(
          permit2ReadFailures.allowanceFailed,
        )}.`,
      );
    }
    if (nftLiveReads.failure > 0) {
      warnings.push(
        `Optimism NFT approval live reads failed for ${formatApprovalCandidateCount(
          nftLiveReads.failure,
        )}.`,
      );
    }
    warnings.push(
      "Optimism live validation did not complete for every discovered approval. Do not treat this wallet as clear.",
    );
  }
  if (
    (discoveryTruncated || candidateCapHit || requestTimedOut) &&
    liveReadFailureCount === 0
  ) {
    warnings.push(
      "Optimism live validation did not complete for every discovered approval. Do not treat this wallet as clear.",
    );
  }

  const status = classifyStatus({
    activeCount,
    liveReadFailureCount,
    discoveryTruncated,
    candidateCapHit,
    requestTimedOut,
  });
  const incompleteReasons = buildIncompleteReasons({
    discoveryTruncated,
    candidateCapHit,
    requestTimedOut,
    erc20LiveReadFailures: erc20ReadFailures.allowanceFailed,
    permit2LiveReadFailures: permit2ReadFailures.allowanceFailed,
    nftLiveReadFailures: nftLiveReads.failure,
    liveReadCandidatesTotal,
    liveReadCandidatesProcessed,
  });
  const diagnostics: OptimismApprovalApiDiagnostics = {
    chainId: OPTIMISM_CHAIN_ID,
    rpcConfigured: true,
    explorerConfigured: true,
    rawApprovalLogCount:
      erc20Discovery.rawCount +
      permit2Discovery.rawCount +
      nftDiscovery.rawCount,
    decodedErc20ApprovalCount: erc20Discovery.pairs.length,
    decodedPermit2ApprovalCount: permit2Discovery.allowances.length,
    decodedNftApprovalCount: nftDiscovery.approvals.length,
    liveReadSuccessCount,
    liveReadFailureCount,
    incompleteVerificationCount:
      liveReadFailureCount +
      (discoveryTruncated ? 1 : 0) +
      (candidateCapHit
        ? liveReadCandidatesTotal - liveReadCandidatesProcessed
        : 0) +
      (requestTimedOut ? 1 : 0),
    skippedApprovalCount: Math.max(decodedCount - activeCount, 0),
    skippedReasons,
    discoveryTruncated,
    requestTimedOut,
    rateLimited: false,
    candidateCapHit,
    liveReadCandidateCap: normalizedCandidateCap,
    liveReadCandidatesTotal,
    liveReadCandidatesProcessed,
    rpcReadConcurrency,
    upstreamRetryCount: 0,
    incompleteReasons,
  };

  return {
    ok: status === "active-approvals-found" || status === "complete-clear",
    status,
    chainId: OPTIMISM_CHAIN_ID,
    approvals: {
      erc20: [...erc20Parsed.approvals, ...permit2Parsed.approvals].map(
        serializeErc20Approval,
      ),
      nft: nftParsed.approvals.map(serializeNftApproval),
    },
    diagnostics,
    errors:
      status === "upstream-failure"
        ? ["Optimism RPC live validation failed for every discovered approval."]
        : [],
    warnings,
    missingConfig: [],
  };
}

export function normalizeOptimismOwner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}
