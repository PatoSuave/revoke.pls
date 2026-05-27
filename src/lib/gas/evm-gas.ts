import type { GasTrackerChainConfig } from "@/lib/gas/gas-chains";
import {
  getGasTrackerChainConfig,
  type GasTrackerChainId,
} from "@/lib/gas/gas-chains";
import { buildTypicalGasTransactions, weiToGweiString } from "@/lib/gas/gas-format";
import { classifyGasStatus } from "@/lib/gas/gas-status";
import type { GasApiResponse, GasDataSource } from "@/lib/gas/gas-types";
import { fetchOwlraclePulsechainAdvisory } from "@/lib/gas/owlracle-gas";

const GAS_REQUEST_TIMEOUT_MS = 4_000;

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: number;
  result: T;
}

interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: number;
  error: {
    code?: number;
    message?: string;
  };
}

interface FeeHistoryResult {
  oldestBlock: string;
  baseFeePerGas?: string[];
  reward?: string[][];
}

export interface EvmGasSample {
  blockNumber: bigint;
  gasPriceWei: bigint;
  baseFeeWei?: bigint;
  priorityFeeWei?: bigint;
  source: Exclude<GasDataSource, "unavailable">;
}

export interface GasRpcOptions {
  rpcUrl?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  includeAdvisory?: boolean;
  advisoryFetchFn?: typeof fetch;
}

export async function fetchGasDataForChain(
  chainId: GasTrackerChainId,
  options: GasRpcOptions = {},
): Promise<GasApiResponse> {
  const chain = getGasTrackerChainConfig(chainId);
  if (!chain) {
    return unavailableGasResponseForChain(
      fallbackUnsupportedChainConfig(chainId),
      new Date().toISOString(),
      ["Gas tracker chain is unsupported."],
    );
  }
  return fetchGasData(chain, options);
}

export async function fetchGasData(
  chain: GasTrackerChainConfig,
  options: GasRpcOptions = {},
): Promise<GasApiResponse> {
  const updatedAt = new Date().toISOString();
  const rpcUrl = options.rpcUrl ?? resolveGasRpcUrl(chain);

  try {
    const [sample, advisory] = await Promise.all([
      fetchEvmGasSample(chain, {
        ...options,
        rpcUrl,
      }),
      options.includeAdvisory && chain.advisoryProvider === "owlracle-pulse"
        ? fetchOwlraclePulsechainAdvisory({
            signal: options.signal,
            fetchFn: options.advisoryFetchFn,
          })
        : Promise.resolve(null),
    ]);
    return buildGasApiResponse(chain, sample, updatedAt, advisory ?? undefined);
  } catch {
    return unavailableGasResponseForChain(chain, updatedAt, [
      `${chain.chainName} gas data is unavailable from the configured RPC right now.`,
    ]);
  }
}

export function resolveGasRpcUrl(chain: GasTrackerChainConfig): string {
  for (const envName of chain.serverRpcEnvNames) {
    const value = cleanEnv(process.env[envName]);
    if (value) return value;
  }
  for (const envName of chain.publicRpcEnvNames) {
    const value = cleanEnv(process.env[envName]);
    if (value) return value;
  }
  return chain.defaultRpcUrl;
}

export async function fetchEvmGasSample(
  chain: GasTrackerChainConfig,
  options: GasRpcOptions = {},
): Promise<EvmGasSample> {
  const rpcUrl = options.rpcUrl ?? resolveGasRpcUrl(chain);

  try {
    const [blockNumberHex, feeHistory] = await Promise.all([
      rpcRequest<string>("eth_blockNumber", [], { ...options, rpcUrl }),
      rpcRequest<FeeHistoryResult>(
        "eth_feeHistory",
        ["0x1", "latest", [50]],
        { ...options, rpcUrl },
      ),
    ]);
    const blockNumber = hexToBigInt(blockNumberHex);
    const baseFeeWei = lastHexValue(feeHistory.baseFeePerGas);
    const priorityFeeWei = lastHexValue(feeHistory.reward?.at(-1));

    if (baseFeeWei !== undefined) {
      const gasPriceWei = baseFeeWei + (priorityFeeWei ?? 0n);
      if (gasPriceWei === 0n) {
        throw new Error("Fee history returned a zero gas price");
      }
      return {
        blockNumber,
        gasPriceWei,
        baseFeeWei,
        priorityFeeWei,
        source: "rpc-fee-history",
      };
    }
  } catch {
    // Fall through to eth_gasPrice below. Some RPCs do not expose fee history.
  }

  const [blockNumberHex, gasPriceHex] = await Promise.all([
    rpcRequest<string>("eth_blockNumber", [], { ...options, rpcUrl }),
    rpcRequest<string>("eth_gasPrice", [], { ...options, rpcUrl }),
  ]);

  return {
    blockNumber: hexToBigInt(blockNumberHex),
    gasPriceWei: hexToBigInt(gasPriceHex),
    source: "rpc-gas-price",
  };
}

export function unavailableGasResponseForChain(
  chain: {
    chainId: number;
    chainName: string;
    nativeCurrency: string;
    estimateNote?: string;
  },
  updatedAt = new Date().toISOString(),
  errors: string[] = [`${chain.chainName} gas data is unavailable.`],
): GasApiResponse {
  return {
    chainId: chain.chainId,
    chainName: chain.chainName,
    nativeCurrency: chain.nativeCurrency,
    blockNumber: null,
    source: "unavailable",
    status: "unavailable",
    updatedAt,
    available: false,
    gasPriceGwei: null,
    baseFeeGwei: null,
    priorityFeeGwei: null,
    typicalTransactions: [],
    ...(chain.estimateNote ? { estimateNote: chain.estimateNote } : {}),
    errors,
  };
}

function buildGasApiResponse(
  chain: GasTrackerChainConfig,
  sample: EvmGasSample,
  updatedAt: string,
  advisory?: GasApiResponse["advisory"],
): GasApiResponse {
  const gasPriceGwei = weiToGweiString(sample.gasPriceWei);
  const gasPriceGweiNumber = Number(gasPriceGwei);

  return {
    chainId: chain.chainId,
    chainName: chain.chainName,
    nativeCurrency: chain.nativeCurrency,
    blockNumber: sample.blockNumber.toString(),
    source: sample.source,
    status: classifyGasStatus({
      gasPriceGwei: gasPriceGweiNumber,
      thresholds: chain.statusThresholds,
    }),
    updatedAt,
    available: true,
    gasPriceGwei,
    baseFeeGwei:
      sample.baseFeeWei !== undefined ? weiToGweiString(sample.baseFeeWei) : null,
    priorityFeeGwei:
      sample.priorityFeeWei !== undefined
        ? weiToGweiString(sample.priorityFeeWei)
        : null,
    typicalTransactions: buildTypicalGasTransactions({
      gasPriceWei: sample.gasPriceWei,
      nativeCurrency: chain.nativeCurrency,
    }),
    ...(advisory ? { advisory } : {}),
    ...(chain.estimateNote ? { estimateNote: chain.estimateNote } : {}),
  };
}

async function rpcRequest<T>(
  method: string,
  params: unknown[],
  options: Required<Pick<GasRpcOptions, "rpcUrl">> & GasRpcOptions,
): Promise<T> {
  const fetchFn = options.fetchFn ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? GAS_REQUEST_TIMEOUT_MS,
  );
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetchFn(options.rpcUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${method} returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as JsonRpcSuccess<T> | JsonRpcFailure;
    if ("error" in payload) {
      throw new Error(payload.error.message ?? "RPC error");
    }
    return payload.result;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

function fallbackUnsupportedChainConfig(chainId: number) {
  return {
    chainId,
    chainName: "Unsupported chain",
    nativeCurrency: "ETH",
  };
}

function hexToBigInt(value: string): bigint {
  if (!/^0x[0-9a-f]+$/i.test(value)) {
    throw new Error("Invalid RPC hex quantity");
  }
  return BigInt(value);
}

function lastHexValue(values: string[] | undefined): bigint | undefined {
  const value = values?.at(-1);
  return value ? hexToBigInt(value) : undefined;
}

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
