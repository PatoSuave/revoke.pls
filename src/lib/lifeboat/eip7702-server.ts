import "server-only";

import type { Address } from "viem";

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
  analyzeEip7702Delegation,
  emptyEip7702Summary,
  type Eip7702ScanStatus,
  type LifeboatEip7702ApiResponse,
} from "@/lib/lifeboat/eip7702";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_BASE_URL,
} from "@/lib/optimism-approval-api";

const EIP7702_REQUEST_TIMEOUT_MS = 10_000;

type Eip7702DiagnosticChainId =
  | typeof ETHEREUM_MAINNET_CHAIN_ID
  | typeof ARBITRUM_ONE_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof HYPEREVM_CHAIN_ID;

interface Eip7702ChainConfig {
  chainId: Eip7702DiagnosticChainId;
  chainName: string;
  explorerBaseUrl: string;
  rpcUrl: string;
  rpcEnvNames: readonly string[];
  supported: boolean;
  supportNotes: string[];
}

interface ResolvedEip7702Config extends Eip7702ChainConfig {
  missingConfig: string[];
}

interface JsonRpcResponse {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
}

const CHAIN_CONFIGS: Record<Eip7702DiagnosticChainId, Eip7702ChainConfig> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    chainName: "Ethereum Mainnet",
    explorerBaseUrl: ETHEREUM_EXPLORER_BASE_URL,
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    rpcEnvNames: ["MAINNET_RPC_URL", "ETHEREUM_RPC_URL"],
    supported: true,
    supportNotes: [
      "Ethereum mainnet supports EIP-7702 after the Pectra upgrade.",
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
      "Arbitrum is marked supported for account-code reads and EIP-7702 delegation designator detection.",
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
      "Optimism is marked supported for account-code reads and EIP-7702 delegation designator detection.",
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
      "Base is marked supported for account-code reads and EIP-7702 delegation designator detection.",
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
      "Polygon is marked supported for account-code reads and EIP-7702 delegation designator detection.",
    ],
  },
  [PULSECHAIN_CHAIN_ID]: {
    chainId: PULSECHAIN_CHAIN_ID,
    chainName: "PulseChain",
    explorerBaseUrl: "https://scan.pulsechain.com",
    rpcUrl: "https://rpc.pulsechain.com",
    rpcEnvNames: ["PULSECHAIN_RPC_URL", "NEXT_PUBLIC_PULSECHAIN_RPC_URL"],
    supported: false,
    supportNotes: [
      "PulseChain is not marked as supported for this EIP-7702 diagnostic yet.",
    ],
  },
  [BSC_CHAIN_ID]: {
    chainId: BSC_CHAIN_ID,
    chainName: "BNB Smart Chain",
    explorerBaseUrl: "https://bscscan.com",
    rpcUrl: "https://bsc-dataseed.bnbchain.org",
    rpcEnvNames: ["BSC_RPC_URL", "NEXT_PUBLIC_BSC_RPC_URL"],
    supported: false,
    supportNotes: [
      "BNB Smart Chain is not marked as supported for this EIP-7702 diagnostic yet.",
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
    supported: false,
    supportNotes: [
      "HyperEVM is not marked as supported for this EIP-7702 diagnostic yet.",
    ],
  },
};

export function isEip7702DiagnosticChainId(
  value: number,
): value is Eip7702DiagnosticChainId {
  return Object.prototype.hasOwnProperty.call(CHAIN_CONFIGS, value.toString());
}

export async function discoverEip7702Delegation({
  owner,
  chainId,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  owner: Address;
  chainId: Eip7702DiagnosticChainId;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatEip7702ApiResponse> {
  const config = resolveEip7702Config(chainId, env);
  if (!config.supported) {
    return emptyEip7702Response(config, owner, "unsupported", {
      warnings: [
        "This network is not marked supported for EIP-7702 delegation detection. Do not treat this as proof that no delegation risk exists.",
      ],
    });
  }
  if (config.missingConfig.length > 0) {
    return emptyEip7702Response(config, owner, "config-missing", {
      errors: [`${config.chainName} EIP-7702 diagnostic is not configured.`],
      missingConfig: config.missingConfig,
    });
  }

  try {
    const code = await readAccountCode({ owner, config, signal, fetcher });
    const analysis = analyzeEip7702Delegation({
      owner,
      code,
      explorerUrl: addressUrl(config, owner),
      delegationExplorerUrl: (address) => addressUrl(config, address),
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
    return emptyEip7702Response(config, owner, "upstream-failure", {
      errors: [
        `EIP-7702 diagnostic failed: ${redactSensitiveErrorText(
          error instanceof Error ? error.message : String(error),
        )}`,
      ],
      warnings: [
        "The EIP-7702 delegation diagnostic is incomplete. Do not treat this as proof that the wallet has no delegation or account-code risk.",
      ],
    });
  }
}

export function eip7702TimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EIP7702_REQUEST_TIMEOUT_MS,
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

function resolveEip7702Config(
  chainId: Eip7702DiagnosticChainId,
  env: NodeJS.ProcessEnv,
): ResolvedEip7702Config {
  const settings = CHAIN_CONFIGS[chainId];
  const configuredRpcUrl = validHttpUrl(firstEnv(env, settings.rpcEnvNames));
  const rpcUrl = configuredRpcUrl ?? settings.rpcUrl;
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

async function readAccountCode({
  owner,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedEip7702Config;
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
      params: [owner, "latest"],
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
  if (
    typeof body.result !== "string" ||
    !/^0x(?:[0-9a-f]{2})*$/i.test(body.result)
  ) {
    throw new Error(`${config.chainName} RPC returned invalid account code.`);
  }
  return body.result;
}

function emptyEip7702Response(
  config: Eip7702ChainConfig,
  owner: Address | null,
  status: Eip7702ScanStatus,
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
  } = {},
): LifeboatEip7702ApiResponse {
  return {
    ok: false,
    status,
    chainId: config.chainId,
    chainName: config.chainName,
    owner,
    riskLevel:
      status === "unsupported"
        ? "unsupported"
        : status === "idle" || status === "scanning"
          ? "not_checked"
          : "upstream_unavailable",
    evidence: [],
    summary: emptyEip7702Summary(),
    warnings: overrides.warnings ?? [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
    supported: config.supported,
    supportNotes: config.supportNotes,
  };
}

function addressUrl(config: Eip7702ChainConfig, address: Address): string {
  return `${config.explorerBaseUrl}/address/${address}`;
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
