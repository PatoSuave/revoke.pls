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
  analyzePendingNonce,
  emptyPendingNonceSummary,
  type LifeboatPendingNonceApiResponse,
} from "@/lib/lifeboat/pending-nonce";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_BASE_URL,
} from "@/lib/optimism-approval-api";

const PENDING_NONCE_REQUEST_TIMEOUT_MS = 10_000;

type PendingNonceChainId =
  | typeof ETHEREUM_MAINNET_CHAIN_ID
  | typeof ARBITRUM_ONE_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof HYPEREVM_CHAIN_ID
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID;

interface PendingNonceChainConfig {
  chainId: PendingNonceChainId;
  chainName: string;
  explorerBaseUrl: string;
  rpcUrl: string;
  rpcEnvNames: readonly string[];
}

interface ResolvedPendingNonceConfig extends PendingNonceChainConfig {
  missingConfig: string[];
}

interface JsonRpcResponse {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
}

const CHAIN_CONFIGS: Record<PendingNonceChainId, PendingNonceChainConfig> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    chainName: "Ethereum Mainnet",
    explorerBaseUrl: ETHEREUM_EXPLORER_BASE_URL,
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    rpcEnvNames: ["MAINNET_RPC_URL", "ETHEREUM_RPC_URL"],
  },
  [ARBITRUM_ONE_CHAIN_ID]: {
    chainId: ARBITRUM_ONE_CHAIN_ID,
    chainName: "Arbitrum One",
    explorerBaseUrl: ARBITRUM_EXPLORER_BASE_URL,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    rpcEnvNames: ["ARBITRUM_ONE_RPC_URL", "ARBITRUM_RPC_URL"],
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
  },
  [PULSECHAIN_CHAIN_ID]: {
    chainId: PULSECHAIN_CHAIN_ID,
    chainName: "PulseChain",
    explorerBaseUrl: "https://scan.pulsechain.com",
    rpcUrl: "https://rpc.pulsechain.com",
    rpcEnvNames: ["PULSECHAIN_RPC_URL", "NEXT_PUBLIC_PULSECHAIN_RPC_URL"],
  },
  [BSC_CHAIN_ID]: {
    chainId: BSC_CHAIN_ID,
    chainName: "BNB Smart Chain",
    explorerBaseUrl: "https://bscscan.com",
    rpcUrl: "https://bsc-dataseed.bnbchain.org",
    rpcEnvNames: ["BSC_RPC_URL", "NEXT_PUBLIC_BSC_RPC_URL"],
  },
  [BASE_CHAIN_ID]: {
    chainId: BASE_CHAIN_ID,
    chainName: "Base",
    explorerBaseUrl: "https://basescan.org",
    rpcUrl: "https://mainnet.base.org",
    rpcEnvNames: ["BASE_RPC_URL", "NEXT_PUBLIC_BASE_RPC_URL"],
  },
  [POLYGON_CHAIN_ID]: {
    chainId: POLYGON_CHAIN_ID,
    chainName: "Polygon",
    explorerBaseUrl: "https://polygonscan.com",
    rpcUrl: "https://polygon.drpc.org",
    rpcEnvNames: ["POLYGON_RPC_URL", "NEXT_PUBLIC_POLYGON_RPC_URL"],
  },
};

export function isPendingNonceChainId(
  value: number,
): value is PendingNonceChainId {
  return value in CHAIN_CONFIGS;
}

export async function discoverPendingNonceActivity({
  owner,
  chainId,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  owner: Address;
  chainId: PendingNonceChainId;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatPendingNonceApiResponse> {
  const config = resolvePendingNonceConfig(chainId, env);
  if (config.missingConfig.length > 0) {
    return emptyPendingNonceResponse(config, owner, "config-missing", {
      errors: [`${config.chainName} pending nonce diagnostic is not configured.`],
      missingConfig: config.missingConfig,
    });
  }

  try {
    const [latestNonce, pendingNonce] = await Promise.all([
      readTransactionCount({ owner, blockTag: "latest", config, signal, fetcher }),
      readTransactionCount({ owner, blockTag: "pending", config, signal, fetcher }),
    ]);
    if (pendingNonce < latestNonce) {
      throw new Error(
        `${config.chainName} RPC returned a pending nonce below the latest nonce.`,
      );
    }

    const analysis = analyzePendingNonce({ latestNonce, pendingNonce });
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
    return emptyPendingNonceResponse(config, owner, "upstream-failure", {
      errors: [
        `Pending nonce diagnostic failed: ${redactSensitiveErrorText(
          error instanceof Error ? error.message : String(error),
        )}`,
      ],
      warnings: [
        "The pending nonce diagnostic is incomplete. Do not treat this as proof that the wallet has no pending or private transactions.",
      ],
    });
  }
}

export function pendingNonceTimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    PENDING_NONCE_REQUEST_TIMEOUT_MS,
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

function resolvePendingNonceConfig(
  chainId: PendingNonceChainId,
  env: NodeJS.ProcessEnv,
): ResolvedPendingNonceConfig {
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

async function readTransactionCount({
  owner,
  blockTag,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  blockTag: "latest" | "pending";
  config: ResolvedPendingNonceConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<bigint> {
  const response = await fetcher(config.rpcUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: blockTag === "latest" ? 1 : 2,
      method: "eth_getTransactionCount",
      params: [owner, blockTag],
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
  if (typeof body.result !== "string" || !/^0x[0-9a-f]+$/i.test(body.result)) {
    throw new Error(`${config.chainName} RPC returned an invalid nonce.`);
  }
  return BigInt(body.result);
}

function emptyPendingNonceResponse(
  config: PendingNonceChainConfig,
  owner: Address | null,
  status: LifeboatPendingNonceApiResponse["status"],
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
  } = {},
): LifeboatPendingNonceApiResponse {
  return {
    ok: false,
    status,
    chainId: config.chainId,
    chainName: config.chainName,
    owner,
    riskLevel:
      status === "unsupported" ? "unsupported" : "upstream_unavailable",
    evidence: [],
    summary: emptyPendingNonceSummary(),
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
