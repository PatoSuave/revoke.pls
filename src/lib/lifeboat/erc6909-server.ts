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
  analyzeErc6909Events,
  emptyErc6909Summary,
  isErc6909BroadLogAddressFilterRequiredError,
  isErc6909UnlimitedAmount,
  type Erc6909PermissionEvent,
  type LifeboatErc6909ApiResponse,
} from "@/lib/lifeboat/erc6909";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_BASE_URL,
} from "@/lib/optimism-approval-api";

const ERC6909_REQUEST_TIMEOUT_MS = 12_000;
const ERC6909_BLOCK_RANGE = 10_000;
const ERC6909_APPROVAL_EVENT = parseAbiItem(
  "event Approval(address indexed owner, address indexed spender, uint256 indexed id, uint256 amount)",
);
const ERC6909_OPERATOR_SET_EVENT = parseAbiItem(
  "event OperatorSet(address indexed owner, address indexed spender, bool approved)",
);
const ERC6909_APPROVAL_TOPIC = toEventHash(ERC6909_APPROVAL_EVENT);
const ERC6909_OPERATOR_SET_TOPIC = toEventHash(ERC6909_OPERATOR_SET_EVENT);

type Erc6909DiagnosticChainId =
  | typeof ETHEREUM_MAINNET_CHAIN_ID
  | typeof ARBITRUM_ONE_CHAIN_ID
  | typeof OPTIMISM_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof HYPEREVM_CHAIN_ID;

interface Erc6909ChainConfig {
  chainId: Erc6909DiagnosticChainId;
  chainName: string;
  explorerBaseUrl: string;
  rpcUrl: string;
  rpcEnvNames: readonly string[];
  supported: boolean;
  supportNotes: string[];
}

interface ResolvedErc6909Config extends Erc6909ChainConfig {
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

const CHAIN_CONFIGS: Record<Erc6909DiagnosticChainId, Erc6909ChainConfig> = {
  [ETHEREUM_MAINNET_CHAIN_ID]: {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    chainName: "Ethereum Mainnet",
    explorerBaseUrl: ETHEREUM_EXPLORER_BASE_URL,
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    rpcEnvNames: ["MAINNET_RPC_URL", "ETHEREUM_RPC_URL"],
    supported: true,
    supportNotes: [
      "Ethereum mainnet is checked for recent ERC-6909 Approval and OperatorSet events.",
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
      "Arbitrum is checked for recent ERC-6909 Approval and OperatorSet events.",
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
      "Optimism is checked for recent ERC-6909 Approval and OperatorSet events.",
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
      "Base is checked for recent ERC-6909 Approval and OperatorSet events.",
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
      "Polygon is checked for recent ERC-6909 Approval and OperatorSet events.",
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
      "PulseChain is checked for recent ERC-6909 Approval and OperatorSet events where RPC log support is available.",
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
      "BNB Smart Chain is checked for recent ERC-6909 Approval and OperatorSet events.",
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
      "HyperEVM is checked for recent ERC-6909 Approval and OperatorSet events where RPC log support is available.",
    ],
  },
};

export function isErc6909DiagnosticChainId(
  value: number,
): value is Erc6909DiagnosticChainId {
  return Object.prototype.hasOwnProperty.call(CHAIN_CONFIGS, value.toString());
}

export async function discoverErc6909Approvals({
  owner,
  chainId,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  owner: Address;
  chainId: Erc6909DiagnosticChainId;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatErc6909ApiResponse> {
  const config = resolveErc6909Config(chainId, env);
  if (!config.supported) {
    return emptyErc6909Response(config, owner, "unsupported", {
      warnings: [
        "This network is not marked supported for ERC-6909 diagnostics.",
      ],
    });
  }
  if (config.missingConfig.length > 0) {
    return emptyErc6909Response(config, owner, "config-missing", {
      errors: [`${config.chainName} ERC-6909 diagnostic is not configured.`],
      missingConfig: config.missingConfig,
    });
  }

  try {
    const latestBlock = await readBlockNumber({ config, signal, fetcher });
    const fromBlock = Math.max(0, latestBlock - ERC6909_BLOCK_RANGE);
    const [approvalEvents, operatorEvents] = await Promise.all([
      readApprovalLogs({ owner, config, fromBlock, toBlock: latestBlock, signal, fetcher }),
      readOperatorLogs({ owner, config, fromBlock, toBlock: latestBlock, signal, fetcher }),
    ]);
    const events = [...approvalEvents, ...operatorEvents];
    const analysis = analyzeErc6909Events({
      events,
      checkedBlockRange: latestBlock - fromBlock,
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
        "This first pass uses recent owner-topic log discovery only; current allowance state must be reviewed manually on the relevant contract.",
      ],
    };
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    if (isErc6909BroadLogAddressFilterRequiredError(errorText)) {
      return emptyErc6909Response(config, owner, "unsupported", {
        supported: false,
        errors: [
          `${config.chainName} ERC-6909 diagnostic could not run because the configured RPC requires a contract address filter for broad log searches.`,
        ],
        warnings: [
          "The ERC-6909 diagnostic is unsupported by the configured RPC for this network. Do not treat this as proof that no multi-token allowance or operator risk exists.",
        ],
        supportNotes: [
          ...config.supportNotes,
          "The configured RPC rejected broad owner-topic ERC-6909 log discovery without a contract address filter.",
        ],
      });
    }

    return emptyErc6909Response(config, owner, "upstream-failure", {
      errors: [
        `ERC-6909 diagnostic failed: ${redactSensitiveErrorText(
          errorText,
        )}`,
      ],
      warnings: [
        "The ERC-6909 diagnostic is incomplete. Do not treat this as proof that no multi-token approval or operator risk exists.",
      ],
    });
  }
}

export function erc6909TimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ERC6909_REQUEST_TIMEOUT_MS,
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
  config: ResolvedErc6909Config;
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

async function readApprovalLogs({
  owner,
  config,
  fromBlock,
  toBlock,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedErc6909Config;
  fromBlock: number;
  toBlock: number;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<Erc6909PermissionEvent[]> {
  const logs = await rpcCall<RpcLog[]>({
    config,
    method: "eth_getLogs",
    params: [
      {
        fromBlock: toHexQuantity(fromBlock),
        toBlock: toHexQuantity(toBlock),
        topics: [ERC6909_APPROVAL_TOPIC, topicForAddress(owner)],
      },
    ],
    signal,
    fetcher,
  });

  return logs
    .map((log) => parseApprovalLog(log, config))
    .filter((event): event is Erc6909PermissionEvent => Boolean(event));
}

async function readOperatorLogs({
  owner,
  config,
  fromBlock,
  toBlock,
  signal,
  fetcher,
}: {
  owner: Address;
  config: ResolvedErc6909Config;
  fromBlock: number;
  toBlock: number;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<Erc6909PermissionEvent[]> {
  const logs = await rpcCall<RpcLog[]>({
    config,
    method: "eth_getLogs",
    params: [
      {
        fromBlock: toHexQuantity(fromBlock),
        toBlock: toHexQuantity(toBlock),
        topics: [ERC6909_OPERATOR_SET_TOPIC, topicForAddress(owner)],
      },
    ],
    signal,
    fetcher,
  });

  return logs
    .map((log) => parseOperatorLog(log, config))
    .filter((event): event is Erc6909PermissionEvent => Boolean(event));
}

function parseApprovalLog(
  log: RpcLog,
  config: ResolvedErc6909Config,
): Erc6909PermissionEvent | null {
  if (
    !log.address ||
    !log.data ||
    !log.topics ||
    !log.transactionHash ||
    !log.blockNumber
  ) {
    return null;
  }

  try {
    const decoded = decodeEventLog({
      abi: [ERC6909_APPROVAL_EVENT],
      data: log.data as Hex,
      topics: log.topics as [Hex, ...Hex[]],
    });
    const args = decoded.args as {
      owner: Address;
      spender: Address;
      id: bigint;
      amount: bigint;
    };
    const contractAddress = getAddress(log.address);
    const amount = args.amount.toString();

    return {
      kind: "approval",
      contractAddress,
      owner: getAddress(args.owner),
      spender: getAddress(args.spender),
      tokenId: args.id.toString(),
      amount,
      unlimited: isErc6909UnlimitedAmount(amount),
      blockNumber: Number.parseInt(log.blockNumber, 16),
      transactionHash: log.transactionHash,
      explorerUrl: txUrl(config, log.transactionHash),
      contractExplorerUrl: addressUrl(config, contractAddress),
    };
  } catch {
    return null;
  }
}

function parseOperatorLog(
  log: RpcLog,
  config: ResolvedErc6909Config,
): Erc6909PermissionEvent | null {
  if (
    !log.address ||
    !log.data ||
    !log.topics ||
    !log.transactionHash ||
    !log.blockNumber
  ) {
    return null;
  }

  try {
    const decoded = decodeEventLog({
      abi: [ERC6909_OPERATOR_SET_EVENT],
      data: log.data as Hex,
      topics: log.topics as [Hex, ...Hex[]],
    });
    const args = decoded.args as {
      owner: Address;
      spender: Address;
      approved: boolean;
    };
    const contractAddress = getAddress(log.address);

    return {
      kind: "operator",
      contractAddress,
      owner: getAddress(args.owner),
      spender: getAddress(args.spender),
      approved: args.approved,
      blockNumber: Number.parseInt(log.blockNumber, 16),
      transactionHash: log.transactionHash,
      explorerUrl: txUrl(config, log.transactionHash),
      contractExplorerUrl: addressUrl(config, contractAddress),
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
  config: ResolvedErc6909Config;
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

function resolveErc6909Config(
  chainId: Erc6909DiagnosticChainId,
  env: NodeJS.ProcessEnv,
): ResolvedErc6909Config {
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

function emptyErc6909Response(
  config: Erc6909ChainConfig,
  owner: Address | null,
  status: LifeboatErc6909ApiResponse["status"],
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
    supported?: boolean;
    supportNotes?: string[];
  } = {},
): LifeboatErc6909ApiResponse {
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
    summary: emptyErc6909Summary(),
    warnings: overrides.warnings ?? [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
    supported: overrides.supported ?? config.supported,
    supportNotes: overrides.supportNotes ?? config.supportNotes,
  };
}

function txUrl(config: Erc6909ChainConfig, txHash: string): string {
  return `${config.explorerBaseUrl}/tx/${txHash}`;
}

function addressUrl(config: Erc6909ChainConfig, address: Address): string {
  return `${config.explorerBaseUrl}/address/${address}`;
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
