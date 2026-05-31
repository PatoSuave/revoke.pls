import "server-only";

import {
  decodeFunctionResult,
  encodeFunctionData,
  type Address,
  type Hex,
} from "viem";

import { PULSECHAIN_CHAIN_ID, getChainConfig } from "@/lib/chains";
import {
  HEX_TOKEN_ADDRESS,
  analyzeHexStakes,
  emptyHexStakeSummary,
  type HexStakeContractRow,
  type HexStakeScanStatus,
  type LifeboatHexStakeApiResponse,
} from "@/lib/lifeboat/hex-stake";

const HEX_STAKE_REQUEST_TIMEOUT_MS = 12_000;
const MAX_HEX_STAKE_ROWS = 64;

type HexStakeDiagnosticChainId = typeof PULSECHAIN_CHAIN_ID;

interface HexStakeChainConfig {
  chainId: HexStakeDiagnosticChainId;
  chainName: string;
  explorerBaseUrl: string;
  rpcUrl: string;
  rpcEnvNames: readonly string[];
  supported: boolean;
  supportNotes: string[];
}

interface ResolvedHexStakeConfig extends HexStakeChainConfig {
  missingConfig: string[];
}

interface JsonRpcResponse {
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
}

type HexFunctionName = "currentDay" | "stakeCount" | "stakeLists";

const HEX_STAKE_ABI = [
  {
    type: "function",
    name: "currentDay",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "stakeCount",
    stateMutability: "view",
    inputs: [{ name: "stakerAddr", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "stakeLists",
    stateMutability: "view",
    inputs: [
      { name: "stakerAddr", type: "address" },
      { name: "stakeIndex", type: "uint256" },
    ],
    outputs: [
      { name: "stakeId", type: "uint40" },
      { name: "stakedHearts", type: "uint72" },
      { name: "stakeShares", type: "uint72" },
      { name: "lockedDay", type: "uint16" },
      { name: "stakedDays", type: "uint16" },
      { name: "unlockedDay", type: "uint16" },
      { name: "isAutoStake", type: "bool" },
    ],
  },
] as const;

const CHAIN_CONFIGS: Record<HexStakeDiagnosticChainId, HexStakeChainConfig> = {
  [PULSECHAIN_CHAIN_ID]: {
    chainId: PULSECHAIN_CHAIN_ID,
    chainName: "PulseChain",
    explorerBaseUrl: "https://scan.pulsechain.com",
    rpcUrl: "https://rpc.pulsechain.com",
    rpcEnvNames: ["PULSECHAIN_RPC_URL", "NEXT_PUBLIC_PULSECHAIN_RPC_URL"],
    supported: true,
    supportNotes: [
      "PulseChain HEX stake reads use the HEX contract at the known HEX token address.",
    ],
  },
};

export function isHexStakeDiagnosticChainId(
  value: number,
): value is HexStakeDiagnosticChainId {
  return Object.prototype.hasOwnProperty.call(CHAIN_CONFIGS, value.toString());
}

export async function discoverHexStakeStatus({
  owner,
  chainId,
  signal,
  env = process.env,
  fetcher = fetch,
}: {
  owner: Address;
  chainId: HexStakeDiagnosticChainId;
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
}): Promise<LifeboatHexStakeApiResponse> {
  const config = resolveHexStakeConfig(chainId, env);
  if (!config.supported) {
    return emptyHexStakeResponse(config, owner, "unsupported", {
      warnings: [
        "This network is not marked supported for HEX stake diagnostics. Do not treat this as proof that no stake risk exists.",
      ],
    });
  }
  if (config.missingConfig.length > 0) {
    return emptyHexStakeResponse(config, owner, "config-missing", {
      errors: [`${config.chainName} HEX stake diagnostic is not configured.`],
      missingConfig: config.missingConfig,
    });
  }

  try {
    const [currentDayRaw, stakeCountRaw] = await Promise.all([
      readHexContract({
        config,
        functionName: "currentDay",
        args: [],
        signal,
        fetcher,
      }),
      readHexContract({
        config,
        functionName: "stakeCount",
        args: [owner],
        signal,
        fetcher,
      }),
    ]);
    const currentDay = safeNumber(currentDayRaw, "currentDay");
    const totalOpenStakeCount = safeNumber(stakeCountRaw, "stakeCount");
    const rowCount = Math.min(totalOpenStakeCount, MAX_HEX_STAKE_ROWS);
    const rows = await Promise.all(
      Array.from({ length: rowCount }, (_, index) =>
        readHexStakeRow({ owner, index, config, signal, fetcher }),
      ),
    );
    const analysis = analyzeHexStakes({
      currentDay,
      totalOpenStakeCount,
      rows,
      maxStakeRows: MAX_HEX_STAKE_ROWS,
      explorerUrl: tokenUrl(config),
    });

    return {
      ok: true,
      status: analysis.summary.truncated ? "partial" : "complete",
      chainId,
      chainName: config.chainName,
      owner,
      riskLevel: analysis.riskLevel,
      stakes: analysis.stakes,
      evidence: analysis.evidence,
      summary: analysis.summary,
      warnings: analysis.summary.truncated
        ? [
            ...analysis.warnings,
            `Only the first ${MAX_HEX_STAKE_ROWS} visible open HEX stake rows were checked.`,
          ]
        : analysis.warnings,
      errors: [],
      missingConfig: [],
      supported: true,
      supportNotes: config.supportNotes,
    };
  } catch (error) {
    return emptyHexStakeResponse(config, owner, "upstream-failure", {
      errors: [
        `HEX stake diagnostic failed: ${redactSensitiveErrorText(
          error instanceof Error ? error.message : String(error),
        )}`,
      ],
      warnings: [
        "The HEX stake diagnostic is incomplete. Do not treat this as proof that the wallet has no active, mature, late, or historical stakes.",
      ],
    });
  }
}

export function hexStakeTimeoutSignal(requestSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    HEX_STAKE_REQUEST_TIMEOUT_MS,
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

function resolveHexStakeConfig(
  chainId: HexStakeDiagnosticChainId,
  env: NodeJS.ProcessEnv,
): ResolvedHexStakeConfig {
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

async function readHexStakeRow({
  owner,
  index,
  config,
  signal,
  fetcher,
}: {
  owner: Address;
  index: number;
  config: ResolvedHexStakeConfig;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<HexStakeContractRow> {
  const raw = await readHexContract({
    config,
    functionName: "stakeLists",
    args: [owner, BigInt(index)],
    signal,
    fetcher,
  });
  if (!Array.isArray(raw) || raw.length !== 7) {
    throw new Error(`${config.chainName} RPC returned invalid HEX stake row.`);
  }
  return {
    stakeId: safeBigInt(raw[0], "stakeId"),
    stakedHearts: safeBigInt(raw[1], "stakedHearts"),
    stakeShares: safeBigInt(raw[2], "stakeShares"),
    lockedDay: safeNumber(raw[3], "lockedDay"),
    stakedDays: safeNumber(raw[4], "stakedDays"),
    unlockedDay: safeNumber(raw[5], "unlockedDay"),
    isAutoStake: raw[6] === true,
  };
}

async function readHexContract({
  config,
  functionName,
  args,
  signal,
  fetcher,
}: {
  config: ResolvedHexStakeConfig;
  functionName: HexFunctionName;
  args: readonly unknown[];
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<unknown> {
  const data = encodeHexFunctionData(functionName, args);
  const result = await ethCall({ config, data, signal, fetcher });
  return decodeFunctionResult({
    abi: HEX_STAKE_ABI,
    functionName,
    data: result,
  });
}

function encodeHexFunctionData(
  functionName: HexFunctionName,
  args: readonly unknown[],
): Hex {
  if (functionName === "currentDay") {
    return encodeFunctionData({
      abi: HEX_STAKE_ABI,
      functionName,
      args: [],
    });
  }
  if (functionName === "stakeCount") {
    return encodeFunctionData({
      abi: HEX_STAKE_ABI,
      functionName,
      args: [args[0] as Address],
    });
  }
  return encodeFunctionData({
    abi: HEX_STAKE_ABI,
    functionName,
    args: [args[0] as Address, args[1] as bigint],
  });
}

async function ethCall({
  config,
  data,
  signal,
  fetcher,
}: {
  config: ResolvedHexStakeConfig;
  data: Hex;
  signal: AbortSignal | undefined;
  fetcher: typeof fetch;
}): Promise<Hex> {
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
      method: "eth_call",
      params: [{ to: HEX_TOKEN_ADDRESS, data }, "latest"],
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
    !/^0x(?:[0-9a-f]{2})+$/i.test(body.result)
  ) {
    throw new Error(`${config.chainName} RPC returned invalid contract data.`);
  }
  return body.result as Hex;
}

function emptyHexStakeResponse(
  config: HexStakeChainConfig,
  owner: Address | null,
  status: HexStakeScanStatus,
  overrides: {
    errors?: string[];
    warnings?: string[];
    missingConfig?: string[];
  } = {},
): LifeboatHexStakeApiResponse {
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
    stakes: [],
    evidence: [],
    summary: emptyHexStakeSummary(),
    warnings: overrides.warnings ?? [],
    errors: overrides.errors ?? [],
    missingConfig: overrides.missingConfig ?? [],
    supported: config.supported,
    supportNotes: config.supportNotes,
  };
}

function tokenUrl(config: HexStakeChainConfig): string {
  return `${config.explorerBaseUrl}/token/${HEX_TOKEN_ADDRESS}`;
}

function safeBigInt(value: unknown, label: string): bigint {
  if (typeof value !== "bigint") {
    throw new Error(`HEX stake diagnostic returned invalid ${label}.`);
  }
  return value;
}

function safeNumber(value: unknown, label: string): number {
  const numeric = safeBigInt(value, label);
  if (numeric > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`HEX stake diagnostic returned unsafe ${label}.`);
  }
  return Number(numeric);
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
