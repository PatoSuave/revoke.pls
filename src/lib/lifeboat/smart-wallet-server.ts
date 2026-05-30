import "server-only";

import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  isAddress,
  parseAbi,
  type Address,
} from "viem";

import {
  ARBITRUM_EXPLORER_BASE_URL,
  ARBITRUM_ONE_CHAIN_ID,
} from "@/lib/arbitrum-approval-api";
import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  getChainConfig,
} from "@/lib/chains";
import {
  ETHEREUM_EXPLORER_BASE_URL,
  ETHEREUM_MAINNET_CHAIN_ID,
} from "@/lib/ethereum-approval-api";
import {
  HYPEREVM_CHAIN_ID,
  HYPEREVM_EXPLORER_BASE_URL,
} from "@/lib/hyperevm-approval-api";
import {
  analyzeSmartWallet,
  emptySmartWalletSummary,
  type LifeboatSmartWalletApiResponse,
  type SmartWalletSafeConfig,
} from "@/lib/lifeboat/smart-wallet";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_BASE_URL,
} from "@/lib/optimism-approval-api";

const SMART_WALLET_REQUEST_TIMEOUT_MS = 12_000;
const SAFE_SENTINEL_ADDRESS =
  "0x0000000000000000000000000000000000000001" as const;
const SAFE_MODULE_PAGE_SIZE = 10n;
const SAFE_ABI = parseAbi([
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
  "function getModulesPaginated(address start, uint256 pageSize) view returns (address[] array, address next)",
  "function nonce() view returns (uint256)",
]);

type SmartWalletDiagnosticChainId =
  | typeof ETHEREUM_MAINNET_CHAIN_ID
  | typeof ARBITRUM_ONE_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof HYPEREVM_CHAIN_ID;

interface SmartWalletChainConfig {
  chainId: SmartWalletDiagnosticChainId;
  chainName: string;
  explorerBaseUrl: string;
  rpcUrl: string;
  rpcEnvNames: readonly string[];
  supported: boolean;
  supportNotes: string[];
}

interface ResolvedSmartWalletConfig extends SmartWalletChainConfig {
  missingConfig: string[];
}

interface JsonRpcResponse {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
}

const CHAIN_CONFIGS: Record<
  SmartWalletDiagnosticChainId,
  SmartWalletChainConfig
> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    chainName: "Ethereum Mainnet",
    explorerBaseUrl: ETHEREUM_EXPLORER_BASE_URL,
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    rpcEnvNames: ["MAINNET_RPC_URL", "ETHEREUM_RPC_URL"],
    supported: true,
    supportNotes: [
      "Ethereum mainnet is marked supported for latest account-code and Safe-compatible configuration reads.",
    ],
  },
  [ARBITRUM_ONE_CHAIN_ID]: {
    chainId: ARBITRUM_ONE_CHAIN_ID,
    chainName: "Arbitrum One",
    explorerBaseUrl: ARBITRUM_EXPLORER_BASE_URL,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    rpcEnvNames: ["ARBITRUM_ONE_RPC_URL", "ARBITRUM_RPC_URL"],
    supported: true,
    supportNotes: [
      "Arbitrum is marked supported for latest account-code and Safe-compatible configuration reads.",
    ],
  },
  [OPTIMISM_CHAIN_ID]: {
    chainId: OPTIMISM_CHAIN_ID,
    chainName: "Optimism",
    explorerBaseUrl: OPTIMISM_EXPLORER_BASE_URL,
    rpcUrl: "https://mainnet.optimism.io",
    rpcEnvNames: [
      "OPTIMISM_RPC_URL",
      "OPTIMISM_MAINNET_RPC_URL",
      "OP_MAINNET_RPC_URL",
    ],
    supported: true,
    supportNotes: [
      "Optimism is marked supported for latest account-code and Safe-compatible configuration reads.",
    ],
  },
  [BASE_CHAIN_ID]: {
    chainId: BASE_CHAIN_ID,
    chainName: "Base",
    explorerBaseUrl: "https://basescan.org",
    rpcUrl: "https://mainnet.base.org",
    rpcEnvNames: ["BASE_RPC_URL", "NEXT_PUBLIC_BASE_RPC_URL"],
    supported: true,
    supportNotes: [
      "Base is marked supported for latest account-code and Safe-compatible configuration reads.",
    ],
  },
  [POLYGON_CHAIN_ID]: {
    chainId: POLYGON_CHAIN_ID,
    chainName: "Polygon",
    explorerBaseUrl: "https://polygonscan.com",
    rpcUrl: "https://polygon.drpc.org",
    rpcEnvNames: ["POLYGON_RPC_URL", "NEXT_PUBLIC_POLYGON_RPC_URL"],
    supported: true,
    supportNotes: [
      "Polygon is marked supported for latest account-code and Safe-compatible configuration reads.",
    ],
  },
  [PULSECHAIN_CHAIN_ID]: {
    chainId: PULSECHAIN_CHAIN_ID,
    chainName: "PulseChain",
    explorerBaseUrl: "https://scan.pulsechain.com",
    rpcUrl: "https://rpc.pulsechain.com",
    rpcEnvNames: ["PULSECHAIN_RPC_URL", "NEXT_PUBLIC_PULSECHAIN_RPC_URL"],
    supported: true,
    supportNotes: [
      "PulseChain is marked supported for latest account-code and Safe-compatible configuration reads.",
    ],
  },
  [BSC_CHAIN_ID]: {
    chainId: BSC_CHAIN_ID,
    chainName: "BNB Smart Chain",
    explorerBaseUrl: "https://bscscan.com",
    rpcUrl: "https://bsc-dataseed.bnbchain.org",
    rpcEnvNames: ["BSC_RPC_URL", "NEXT_PUBLIC_BSC_RPC_URL"],
    supported: true,
    supportNotes: [
      "BNB Smart Chain is marked supported for latest account-code and Safe-compatible configuration reads.",
    ],
  },
  [HYPEREVM_CHAIN_ID]: {
    chainId: HYPEREVM_CHAIN_ID,
    chainName: "HyperEVM",
    explorerBaseUrl: HYPEREVM_EXPLORER_BASE_URL,
    rpcUrl: "https://rpc.hyperliquid.xyz/evm",
    rpcEnvNames: [
      "HYPEREVM_RPC_URL",
      "HYPEREVM_MAINNET_RPC_URL",
      "HYPERLIQUID_EVM_RPC_URL",
    ],
    supported: true,
    supportNotes: [
      "HyperEVM is marked supported for latest account-code and Safe-compatible configuration reads.",
    ],
  },
};

export function isSmartWalletDiagnosticChainId(
  value: number,
): value is SmartWalletDiagnosticChainId {
  return Object.prototype.hasOwnProperty.call(CHAIN_CONFIGS, value.toString());
}

export async function discoverSmartWalletConfig({
  owner,
  chainId,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  owner: Address;
  chainId: SmartWalletDiagnosticChainId;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatSmartWalletApiResponse> {
  const config = resolveSmartWalletConfig(chainId, env);
  if (!config.supported) {
    return emptySmartWalletResponse(config, owner, "unsupported", {
      warnings: [
        "This network is not marked supported for smart-wallet configuration diagnostics.",
      ],
    });
  }
  if (config.missingConfig.length > 0) {
    return emptySmartWalletResponse(config, owner, "config-missing", {
      errors: [
        `${config.chainName} smart-wallet diagnostic is not configured.`,
      ],
      missingConfig: config.missingConfig,
    });
  }

  try {
    const code = await rpcCall<string>({
      config,
      method: "eth_getCode",
      params: [owner, "latest"],
      signal,
      fetcher,
    });
    const safeConfig = code && code !== "0x"
      ? await readSafeConfig({ owner, config, signal, fetcher })
      : null;
    const analysis = analyzeSmartWallet({
      owner,
      code: code ?? "0x",
      safeConfig,
      explorerUrl: addressUrl(config, owner),
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
      supported: true,
      supportNotes: config.supportNotes,
    };
  } catch (error) {
    return emptySmartWalletResponse(config, owner, "upstream-failure", {
      errors: [
        `Smart-wallet diagnostic failed: ${redactSensitiveErrorText(
          error instanceof Error ? error.message : String(error),
        )}`,
      ],
      warnings: [
        "The smart-wallet diagnostic is incomplete. Do not treat this as proof that no smart-wallet, Safe, module, guard, or session-key risk exists.",
      ],
    });
  }
}

export function smartWalletTimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    SMART_WALLET_REQUEST_TIMEOUT_MS,
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

async function readSafeConfig({
  owner,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedSmartWalletConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<SmartWalletSafeConfig | null> {
  try {
    const [owners, threshold, modules, nonce] = await Promise.all([
      safeRead<Address[]>({ owner, config, functionName: "getOwners", args: [], signal, fetcher }),
      safeRead<bigint>({ owner, config, functionName: "getThreshold", args: [], signal, fetcher }),
      safeRead<readonly [Address[], Address]>({
        owner,
        config,
        functionName: "getModulesPaginated",
        args: [SAFE_SENTINEL_ADDRESS, SAFE_MODULE_PAGE_SIZE],
        signal,
        fetcher,
      }),
      safeRead<bigint>({ owner, config, functionName: "nonce", args: [], signal, fetcher }),
    ]);

    return {
      owners: owners.map((address) => getAddress(address)),
      threshold: Number(threshold),
      modules: modules[0].filter((address) => isAddress(address)).map(getAddress),
      nonce: nonce.toString(),
    };
  } catch {
    return null;
  }
}

async function safeRead<TResult>({
  owner,
  config,
  functionName,
  args,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedSmartWalletConfig;
  functionName:
    | "getOwners"
    | "getThreshold"
    | "getModulesPaginated"
    | "nonce";
  args: [] | [Address, bigint];
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<TResult> {
  const data =
    functionName === "getModulesPaginated"
      ? encodeFunctionData({
          abi: SAFE_ABI,
          functionName: "getModulesPaginated",
          args: args as [Address, bigint],
        })
      : functionName === "getOwners"
        ? encodeFunctionData({
            abi: SAFE_ABI,
            functionName: "getOwners",
          })
        : functionName === "getThreshold"
          ? encodeFunctionData({
              abi: SAFE_ABI,
              functionName: "getThreshold",
            })
          : encodeFunctionData({
              abi: SAFE_ABI,
              functionName: "nonce",
            });
  const result = await rpcCall<`0x${string}`>({
    config,
    method: "eth_call",
    params: [{ to: owner, data }, "latest"],
    signal,
    fetcher,
  });
  return decodeFunctionResult({
    abi: SAFE_ABI,
    functionName,
    data: result,
  }) as TResult;
}

async function rpcCall<TResult>({
  config,
  method,
  params,
  signal,
  fetcher,
}: {
  config: ResolvedSmartWalletConfig;
  method: string;
  params: unknown[];
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<TResult> {
  const response = await fetcher(config.rpcUrl, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`${config.chainName} RPC returned HTTP ${response.status}.`);
  }

  const body = (await response.json()) as JsonRpcResponse;
  if (body.error) {
    throw new Error(
      `${config.chainName} RPC error ${body.error.code ?? ""}: ${
        body.error.message ?? "unknown error"
      }`,
    );
  }
  return body.result as TResult;
}

function resolveSmartWalletConfig(
  chainId: SmartWalletDiagnosticChainId,
  env: NodeJS.ProcessEnv,
): ResolvedSmartWalletConfig {
  const settings = CHAIN_CONFIGS[chainId];
  const rpcUrl = validHttpUrl(firstEnv(env, settings.rpcEnvNames)) ??
    settings.rpcUrl;
  const missingConfig: string[] = [];

  if (!rpcUrl) missingConfig.push(settings.rpcEnvNames.join(" or "));

  const genericConfig = getChainConfig(chainId);
  return {
    ...settings,
    chainName: genericConfig?.displayName ?? settings.chainName,
    rpcUrl,
    missingConfig,
  };
}

function emptySmartWalletResponse(
  config: SmartWalletChainConfig,
  owner: Address | null,
  status: LifeboatSmartWalletApiResponse["status"],
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
  } = {},
): LifeboatSmartWalletApiResponse {
  return {
    ok: false,
    status,
    chainId: config.chainId,
    chainName: config.chainName,
    owner,
    riskLevel:
      status === "unsupported" ? "unsupported" : "upstream_unavailable",
    evidence: [],
    summary: emptySmartWalletSummary(),
    warnings: overrides.warnings ?? [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
    supported: config.supported,
    supportNotes: config.supportNotes,
  };
}

function addressUrl(config: SmartWalletChainConfig, address: Address): string {
  return `${config.explorerBaseUrl}/address/${address}`;
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

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }
    return parsed.toString();
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
