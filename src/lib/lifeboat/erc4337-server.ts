import "server-only";

import {
  decodeEventLog,
  getAddress,
  isAddress,
  parseAbiItem,
  toEventHash,
  type Address,
  type Hex,
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
  analyzeErc4337Activity,
  emptyErc4337Summary,
  type Erc4337UserOperationEvent,
  type LifeboatErc4337ApiResponse,
} from "@/lib/lifeboat/erc4337";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_BASE_URL,
} from "@/lib/optimism-approval-api";

const ERC4337_REQUEST_TIMEOUT_MS = 12_000;
const ERC4337_BLOCK_RANGE = 50_000;
const USER_OPERATION_EVENT = parseAbiItem(
  "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
);
const USER_OPERATION_EVENT_TOPIC = toEventHash(USER_OPERATION_EVENT);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type Erc4337DiagnosticChainId =
  | typeof ETHEREUM_MAINNET_CHAIN_ID
  | typeof ARBITRUM_ONE_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof HYPEREVM_CHAIN_ID;

interface EntryPointTarget {
  version: "v0.6" | "v0.7" | "v0.8";
  address: Address;
  source: string;
}

interface Erc4337ChainConfig {
  chainId: Erc4337DiagnosticChainId;
  chainName: string;
  explorerBaseUrl: string;
  rpcUrl: string;
  rpcEnvNames: readonly string[];
  supported: boolean;
  supportNotes: string[];
}

interface ResolvedErc4337Config extends Erc4337ChainConfig {
  missingConfig: string[];
}

interface JsonRpcResponse {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
}

interface RpcLog {
  address?: string;
  blockNumber?: string;
  transactionHash?: string;
  data?: string;
  topics?: string[];
}

// Sources:
// - ERC-4337 docs describe the singleton EntryPoint role.
// - Alchemy account-abstraction docs list the v0.6, v0.7, and v0.8 EntryPoint addresses.
const ENTRY_POINTS: readonly EntryPointTarget[] = [
  {
    version: "v0.6",
    address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    source: "https://docs.erc4337.io/smart-accounts/entrypoint-explainer.html",
  },
  {
    version: "v0.7",
    address: "0x0000000071727de22E5E9d8BAf0edAc6f37da032",
    source: "https://www.alchemy.com/docs/wallets/reference/entrypoint-addresses",
  },
  {
    version: "v0.8",
    address: "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff1083",
    source: "https://www.alchemy.com/docs/wallets/reference/entrypoint-addresses",
  },
];

const CHAIN_CONFIGS: Record<Erc4337DiagnosticChainId, Erc4337ChainConfig> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    chainName: "Ethereum Mainnet",
    explorerBaseUrl: ETHEREUM_EXPLORER_BASE_URL,
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    rpcEnvNames: ["MAINNET_RPC_URL", "ETHEREUM_RPC_URL"],
    supported: true,
    supportNotes: [
      "Ethereum mainnet is checked for recent EntryPoint UserOperationEvent logs.",
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
      "Arbitrum is checked for recent EntryPoint UserOperationEvent logs.",
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
      "Optimism is checked for recent EntryPoint UserOperationEvent logs.",
    ],
  },
  [BASE_CHAIN_ID]: {
    chainId: BASE_CHAIN_ID,
    chainName: "Base",
    explorerBaseUrl: "https://basescan.org",
    rpcUrl: "https://mainnet.base.org",
    rpcEnvNames: ["BASE_RPC_URL", "NEXT_PUBLIC_BASE_RPC_URL"],
    supported: true,
    supportNotes: ["Base is checked for recent EntryPoint UserOperationEvent logs."],
  },
  [POLYGON_CHAIN_ID]: {
    chainId: POLYGON_CHAIN_ID,
    chainName: "Polygon",
    explorerBaseUrl: "https://polygonscan.com",
    rpcUrl: "https://polygon.drpc.org",
    rpcEnvNames: ["POLYGON_RPC_URL", "NEXT_PUBLIC_POLYGON_RPC_URL"],
    supported: true,
    supportNotes: [
      "Polygon is checked for recent EntryPoint UserOperationEvent logs.",
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
      "PulseChain is checked for recent EntryPoint UserOperationEvent logs, but absence of logs is not an account-abstraction all-clear.",
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
      "BNB Smart Chain is checked for recent EntryPoint UserOperationEvent logs.",
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
      "HyperEVM is checked for recent EntryPoint UserOperationEvent logs where RPC log support is available.",
    ],
  },
};

export function isErc4337DiagnosticChainId(
  value: number,
): value is Erc4337DiagnosticChainId {
  return Object.prototype.hasOwnProperty.call(CHAIN_CONFIGS, value.toString());
}

export async function discoverErc4337Activity({
  owner,
  chainId,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  owner: Address;
  chainId: Erc4337DiagnosticChainId;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatErc4337ApiResponse> {
  const config = resolveErc4337Config(chainId, env);
  if (!config.supported) {
    return emptyErc4337Response(config, owner, "unsupported", {
      warnings: [
        "This network is not marked supported for ERC-4337 diagnostics.",
      ],
    });
  }
  if (config.missingConfig.length > 0) {
    return emptyErc4337Response(config, owner, "config-missing", {
      errors: [`${config.chainName} ERC-4337 diagnostic is not configured.`],
      missingConfig: config.missingConfig,
    });
  }

  try {
    const latestBlock = await readBlockNumber({ config, signal, fetcher });
    const fromBlock = Math.max(0, latestBlock - ERC4337_BLOCK_RANGE);
    const [code, logsByEntryPoint] = await Promise.all([
      readAccountCode({ owner, config, signal, fetcher }),
      Promise.all(
        ENTRY_POINTS.map((entryPoint) =>
          readUserOperationLogs({
            owner,
            config,
            entryPoint,
            fromBlock,
            toBlock: latestBlock,
            signal,
            fetcher,
          }),
        ),
      ),
    ]);
    const events = logsByEntryPoint.flat();
    const analysis = analyzeErc4337Activity({
      events,
      checkedEntryPointCount: ENTRY_POINTS.length,
      checkedBlockRange: latestBlock - fromBlock,
      hasAccountCode: code !== "0x",
    });

    return {
      ok: true,
      status: "complete",
      chainId,
      chainName: config.chainName,
      owner,
      riskLevel: analysis.riskLevel,
      evidence: analysis.evidence,
      events: analysis.events,
      summary: analysis.summary,
      warnings: analysis.warnings,
      errors: [],
      missingConfig: [],
      supported: true,
      supportNotes: [
        ...config.supportNotes,
        `Checked EntryPoint sources: ${ENTRY_POINTS.map(
          (entryPoint) => `${entryPoint.version} ${entryPoint.address}`,
        ).join(", ")}.`,
      ],
    };
  } catch (error) {
    return emptyErc4337Response(config, owner, "upstream-failure", {
      errors: [
        `ERC-4337 diagnostic failed: ${redactSensitiveErrorText(
          error instanceof Error ? error.message : String(error),
        )}`,
      ],
      warnings: [
        "The ERC-4337 diagnostic is incomplete. Do not treat this as proof that no UserOperation, paymaster, factory, session-key, or account-abstraction risk exists.",
      ],
    });
  }
}

export function erc4337TimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ERC4337_REQUEST_TIMEOUT_MS,
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

async function readBlockNumber({
  config,
  signal,
  fetcher,
}: {
  config: ResolvedErc4337Config;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<number> {
  const result = await rpcCall<string>({
    config,
    method: "eth_blockNumber",
    params: [],
    signal,
    fetcher,
  });
  return Number.parseInt(result, 16);
}

async function readAccountCode({
  owner,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedErc4337Config;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<string> {
  return rpcCall<string>({
    config,
    method: "eth_getCode",
    params: [owner, "latest"],
    signal,
    fetcher,
  });
}

async function readUserOperationLogs({
  owner,
  config,
  entryPoint,
  fromBlock,
  toBlock,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedErc4337Config;
  entryPoint: EntryPointTarget;
  fromBlock: number;
  toBlock: number;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<Erc4337UserOperationEvent[]> {
  const logs = await rpcCall<RpcLog[]>({
    config,
    method: "eth_getLogs",
    params: [
      {
        address: entryPoint.address,
        fromBlock: toHexQuantity(fromBlock),
        toBlock: toHexQuantity(toBlock),
        topics: [
          USER_OPERATION_EVENT_TOPIC,
          null,
          topicForAddress(owner),
        ],
      },
    ],
    signal,
    fetcher,
  });

  return logs
    .map((log) => parseUserOperationLog(log, entryPoint, config))
    .filter((event): event is Erc4337UserOperationEvent => Boolean(event));
}

function parseUserOperationLog(
  log: RpcLog,
  entryPoint: EntryPointTarget,
  config: ResolvedErc4337Config,
): Erc4337UserOperationEvent | null {
  if (!log.data || !log.topics || !log.transactionHash || !log.blockNumber) {
    return null;
  }

  try {
    const decoded = decodeEventLog({
      abi: [USER_OPERATION_EVENT],
      data: log.data as Hex,
      topics: log.topics as [Hex, ...Hex[]],
    });
    const args = decoded.args as {
      userOpHash: Hex;
      sender: Address;
      paymaster: Address;
      nonce: bigint;
      success: boolean;
      actualGasCost: bigint;
      actualGasUsed: bigint;
    };
    const paymaster = args.paymaster.toLowerCase() === ZERO_ADDRESS
      ? null
      : getAddress(args.paymaster);

    return {
      entryPointVersion: entryPoint.version,
      entryPointAddress: entryPoint.address,
      userOpHash: args.userOpHash,
      sender: getAddress(args.sender),
      paymaster,
      nonce: args.nonce.toString(),
      success: args.success,
      actualGasCostWei: args.actualGasCost.toString(),
      actualGasUsed: args.actualGasUsed.toString(),
      blockNumber: Number.parseInt(log.blockNumber, 16),
      transactionHash: log.transactionHash,
      explorerUrl: txUrl(config, log.transactionHash),
    };
  } catch {
    return null;
  }
}

async function rpcCall<TResult>({
  config,
  method,
  params,
  signal,
  fetcher,
}: {
  config: ResolvedErc4337Config;
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

function resolveErc4337Config(
  chainId: Erc4337DiagnosticChainId,
  env: NodeJS.ProcessEnv,
): ResolvedErc4337Config {
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

function emptyErc4337Response(
  config: Erc4337ChainConfig,
  owner: Address | null,
  status: LifeboatErc4337ApiResponse["status"],
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
  } = {},
): LifeboatErc4337ApiResponse {
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
    summary: emptyErc4337Summary(),
    warnings: overrides.warnings ?? [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
    supported: config.supported,
    supportNotes: config.supportNotes,
  };
}

function txUrl(config: Erc4337ChainConfig, txHash: string): string {
  return `${config.explorerBaseUrl}/tx/${txHash}`;
}

function topicForAddress(address: Address): Hex {
  if (!isAddress(address)) throw new Error("Invalid topic address.");
  return `0x${"0".repeat(24)}${address.slice(2).toLowerCase()}`;
}

function toHexQuantity(value: number): Hex {
  return `0x${value.toString(16)}`;
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
