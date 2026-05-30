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
  analyzeSpenderRisk,
  emptySpenderRiskSummary,
  registryContextFromEntry,
  type LifeboatSpenderRiskApiResponse,
  type SpenderContractSignal,
  type SpenderVerifiedSourceStatus,
} from "@/lib/lifeboat/spender-risk";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_API_DEFAULT,
  OPTIMISM_EXPLORER_BASE_URL,
  OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT,
} from "@/lib/optimism-approval-api";
import { getSpenderMetadataEntry } from "@/lib/registry";

const SPENDER_RISK_REQUEST_TIMEOUT_MS = 20_000;

type SpenderRiskChainId =
  | typeof ETHEREUM_MAINNET_CHAIN_ID
  | typeof ARBITRUM_ONE_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof HYPEREVM_CHAIN_ID
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID;

type SpenderRiskExplorerKind = "etherscan-v2" | "blockscout-compatible";

interface SpenderRiskChainConfig {
  chainId: SpenderRiskChainId;
  chainName: string;
  rpcUrl: string;
  rpcEnvNames: readonly string[];
  explorerBaseUrl: string;
  apiUrl: string;
  apiKind: SpenderRiskExplorerKind;
  apiChainId?: string;
  apiKeyEnvNames: readonly string[];
  apiUrlEnvNames: readonly string[];
}

interface ResolvedSpenderRiskConfig extends SpenderRiskChainConfig {
  apiKey: string | undefined;
  missingConfig: string[];
}

interface JsonRpcResponse {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
}

interface ExplorerSourceResponse {
  status?: string;
  message?: string;
  result?: unknown;
}

interface ExplorerSourceRow {
  SourceCode?: string;
  ABI?: string;
  ContractName?: string;
  Proxy?: string;
  Implementation?: string;
}

interface SourceMetadata {
  verifiedSource: SpenderVerifiedSourceStatus;
  contractName: string | null;
  isProxy: boolean | null;
  implementationAddress: Address | null;
  warnings: string[];
}

const CHAIN_CONFIGS: Record<SpenderRiskChainId, SpenderRiskChainConfig> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    chainName: "Ethereum Mainnet",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    rpcEnvNames: ["MAINNET_RPC_URL", "ETHEREUM_RPC_URL"],
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
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    rpcEnvNames: ["ARBITRUM_ONE_RPC_URL", "ARBITRUM_RPC_URL"],
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
    rpcUrl: "https://mainnet.optimism.io",
    rpcEnvNames: [
      "OPTIMISM_RPC_URL",
      "OPTIMISM_MAINNET_RPC_URL",
      "OP_MAINNET_RPC_URL",
    ],
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
    rpcUrl: "https://rpc.hyperliquid.xyz/evm",
    rpcEnvNames: [
      "HYPEREVM_RPC_URL",
      "HYPEREVM_MAINNET_RPC_URL",
      "HYPERLIQUID_EVM_RPC_URL",
    ],
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
    rpcUrl: "https://rpc.pulsechain.com",
    rpcEnvNames: ["PULSECHAIN_RPC_URL", "NEXT_PUBLIC_PULSECHAIN_RPC_URL"],
    explorerBaseUrl: "https://scan.pulsechain.com",
    apiUrl: PULSECHAIN_EXPLORER_API_DEFAULT,
    apiKind: "blockscout-compatible",
    apiKeyEnvNames: [],
    apiUrlEnvNames: ["PULSECHAIN_EXPLORER_API_URL"],
  },
  [BSC_CHAIN_ID]: {
    chainId: BSC_CHAIN_ID,
    chainName: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.bnbchain.org",
    rpcEnvNames: ["BSC_RPC_URL", "NEXT_PUBLIC_BSC_RPC_URL"],
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
    rpcUrl: "https://mainnet.base.org",
    rpcEnvNames: ["BASE_RPC_URL", "NEXT_PUBLIC_BASE_RPC_URL"],
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
    rpcUrl: "https://polygon.drpc.org",
    rpcEnvNames: ["POLYGON_RPC_URL", "NEXT_PUBLIC_POLYGON_RPC_URL"],
    explorerBaseUrl: "https://polygonscan.com",
    apiUrl: POLYGON_EXPLORER_API_DEFAULT,
    apiKind: "etherscan-v2",
    apiChainId: POLYGON_EXPLORER_CHAIN_ID_DEFAULT,
    apiKeyEnvNames: ["POLYGON_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    apiUrlEnvNames: ["POLYGON_EXPLORER_API_URL"],
  },
};

export function isSpenderRiskChainId(
  value: number,
): value is SpenderRiskChainId {
  return value in CHAIN_CONFIGS;
}

export async function discoverSpenderContractRisk({
  chainId,
  spenders,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  chainId: SpenderRiskChainId;
  spenders: readonly Address[];
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatSpenderRiskApiResponse> {
  const config = resolveSpenderRiskConfig(chainId, env);
  if (spenders.length === 0) {
    return emptySpenderRiskResponse(config, "complete", {
      warnings: [
        "No active approval spenders were provided to the spender contract diagnostic.",
      ],
    });
  }

  const errors: string[] = [];
  const signals = await Promise.all(
    spenders.map((spender) =>
      inspectSpender({ spender, config, signal, fetcher }).catch(
        (error: unknown) => {
          errors.push(
            `${spender}: ${redactSensitiveErrorText(
              error instanceof Error ? error.message : String(error),
            )}`,
          );
          return failedSpenderSignal(spender, config);
        },
      ),
    ),
  );

  if (signals.every((item) => item.hasBytecode === null)) {
    return emptySpenderRiskResponse(config, "upstream-failure", {
      errors: [`Spender contract diagnostic failed: ${errors.join(" ")}`],
      warnings: [
        "The spender contract diagnostic is incomplete. Do not treat this as proof that approval spenders are safe.",
      ],
    });
  }

  const analysis = analyzeSpenderRisk({ spenders: signals });
  const partial =
    errors.length > 0 ||
    config.missingConfig.length > 0 ||
    signals.some((item) => item.verifiedSource === "unknown");

  return {
    ok: !partial,
    status: partial ? "partial" : "complete",
    chainId,
    chainName: config.chainName,
    riskLevel:
      partial && analysis.riskLevel === "none_detected"
        ? "insufficient_data"
        : analysis.riskLevel,
    evidence: analysis.evidence,
    spenders: analysis.spenders,
    summary: analysis.summary,
    warnings: [
      ...analysis.warnings,
      ...(config.missingConfig.length > 0
        ? [
            "Verified-source checks are incomplete because explorer source-code lookup is not fully configured.",
          ]
        : []),
      ...(errors.length > 0
        ? [
            "One or more spender contract checks failed, so missing spender warnings must be treated as incomplete.",
          ]
        : []),
    ],
    errors,
    missingConfig: config.missingConfig,
  };
}

export function spenderRiskTimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SPENDER_RISK_REQUEST_TIMEOUT_MS,
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

function resolveSpenderRiskConfig(
  chainId: SpenderRiskChainId,
  env: NodeJS.ProcessEnv,
): ResolvedSpenderRiskConfig {
  const settings = CHAIN_CONFIGS[chainId];
  const configuredRpcUrl = validHttpUrl(firstEnv(env, settings.rpcEnvNames));
  const rpcUrl = configuredRpcUrl ?? settings.rpcUrl;
  const apiUrl =
    validHttpUrl(firstEnv(env, settings.apiUrlEnvNames)) ?? settings.apiUrl;
  const apiKey = cleanEnv(firstEnv(env, settings.apiKeyEnvNames));
  const missingConfig: string[] = [];

  if (!rpcUrl) missingConfig.push(settings.rpcEnvNames.join(" or "));
  if (!apiUrl) missingConfig.push(settings.apiUrlEnvNames.join(" or "));
  if (settings.apiKeyEnvNames.length > 0 && !apiKey) {
    missingConfig.push(settings.apiKeyEnvNames.join(" or "));
  }

  const genericConfig = getChainConfig(chainId);
  return {
    ...settings,
    chainName: genericConfig?.displayName ?? settings.chainName,
    rpcUrl,
    apiUrl,
    apiKey,
    missingConfig,
  };
}

async function inspectSpender({
  spender,
  config,
  signal,
  fetcher,
}: {
  spender: Address;
  config: ResolvedSpenderRiskConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<SpenderContractSignal> {
  const bytecode = await readCode({ spender, config, signal, fetcher });
  const hasBytecode = bytecode !== "0x";
  const source = hasBytecode
    ? await fetchSourceMetadata({ spender, config, signal, fetcher })
    : emptySourceMetadata();
  const registryContext = registryContextFromEntry(
    getSpenderMetadataEntry(config.chainId, spender),
  );

  return {
    address: spender,
    hasBytecode,
    verifiedSource: source.verifiedSource,
    contractName: source.contractName,
    isProxy: source.isProxy,
    implementationAddress: source.implementationAddress,
    registryContext,
    explorerUrl: addressExplorerUrl(config, spender),
    warnings: source.warnings,
  };
}

async function readCode({
  spender,
  config,
  signal,
  fetcher,
}: {
  spender: Address;
  config: ResolvedSpenderRiskConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<string> {
  const response = await fetcher(config.rpcUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getCode",
      params: [spender, "latest"],
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`${config.chainName} RPC returned HTTP ${response.status}.`);
  }

  const body = (await response.json()) as JsonRpcResponse;
  if (body.error) {
    throw new Error(
      `${config.chainName} RPC error ${
        body.error.code ?? "unknown"
      }: ${body.error.message ?? "unknown error"}`,
    );
  }
  if (typeof body.result !== "string" || !/^0x[0-9a-f]*$/i.test(body.result)) {
    throw new Error(`${config.chainName} RPC returned invalid bytecode.`);
  }
  return body.result.toLowerCase();
}

async function fetchSourceMetadata({
  spender,
  config,
  signal,
  fetcher,
}: {
  spender: Address;
  config: ResolvedSpenderRiskConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<SourceMetadata> {
  if (config.apiKind === "etherscan-v2" && !config.apiKey) {
    return {
      ...emptySourceMetadata(),
      warnings: [
        `${config.chainName} explorer source-code lookup requires a server-side API key.`,
      ],
    };
  }

  const response = await fetcher(buildSourceCodeUrl(spender, config), {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `${config.chainName} explorer returned HTTP ${response.status}.`,
    );
  }

  const body = (await response.json()) as ExplorerSourceResponse;
  const rows = Array.isArray(body.result) ? body.result : [];
  const row = rows[0] as ExplorerSourceRow | undefined;
  if (!row) {
    throw new Error(
      `${config.chainName} explorer returned invalid source-code metadata.`,
    );
  }

  const sourceCode = cleanEnv(row.SourceCode);
  const abi = cleanEnv(row.ABI);
  const contractName = cleanEnv(row.ContractName)?.slice(0, 80) ?? null;
  const proxyFlag = cleanEnv(row.Proxy);
  const implementation = cleanEnv(row.Implementation);
  const implementationAddress =
    implementation && isAddress(implementation) ? getAddress(implementation) : null;
  const verifiedSource =
    sourceCode || (abi && !/not verified/i.test(abi))
      ? "verified"
      : "unverified";

  return {
    verifiedSource,
    contractName,
    isProxy: proxyFlag === "1" ? true : proxyFlag === "0" ? false : null,
    implementationAddress,
    warnings: [],
  };
}

function buildSourceCodeUrl(
  spender: Address,
  config: ResolvedSpenderRiskConfig,
): string {
  const url = new URL(config.apiUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", spender);
  if (config.apiKind === "etherscan-v2" && config.apiChainId) {
    url.searchParams.set("chainid", config.apiChainId);
  }
  if (config.apiKey) url.searchParams.set("apikey", config.apiKey);
  return url.toString();
}

function emptySourceMetadata(): SourceMetadata {
  return {
    verifiedSource: "unknown",
    contractName: null,
    isProxy: null,
    implementationAddress: null,
    warnings: [],
  };
}

function failedSpenderSignal(
  spender: Address,
  config: ResolvedSpenderRiskConfig,
): SpenderContractSignal {
  return {
    address: spender,
    hasBytecode: null,
    verifiedSource: "unknown",
    contractName: null,
    isProxy: null,
    implementationAddress: null,
    registryContext: registryContextFromEntry(
      getSpenderMetadataEntry(config.chainId, spender),
    ),
    explorerUrl: addressExplorerUrl(config, spender),
    warnings: [
      "Spender contract context could not be read from the selected chain.",
    ],
  };
}

function emptySpenderRiskResponse(
  config: SpenderRiskChainConfig,
  status: LifeboatSpenderRiskApiResponse["status"],
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
  } = {},
): LifeboatSpenderRiskApiResponse {
  return {
    ok: status === "complete",
    status,
    chainId: config.chainId,
    chainName: config.chainName,
    riskLevel:
      status === "complete"
        ? "insufficient_data"
        : status === "unsupported"
          ? "unsupported"
          : "upstream_unavailable",
    evidence: [],
    spenders: [],
    summary: emptySpenderRiskSummary(),
    warnings: overrides.warnings ?? [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
  };
}

function addressExplorerUrl(
  config: SpenderRiskChainConfig,
  address: Address,
): string {
  return `${config.explorerBaseUrl.replace(/\/$/, "")}/address/${address}`;
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
