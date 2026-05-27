import {
  PULSECHAIN_GAS_CHAIN_ID,
  PULSECHAIN_GAS_CHAIN_NAME,
  PULSECHAIN_GAS_NATIVE_CURRENCY,
  type GasApiResponse,
  type GasDataSource,
} from "@/lib/gas/gas-types";
import { buildTypicalGasTransactions, weiToGweiString } from "@/lib/gas/gas-format";
import { classifyGasStatus } from "@/lib/gas/gas-status";

const PULSECHAIN_RPC_DEFAULT = "https://rpc.pulsechain.com";
const PULSECHAIN_GAS_REQUEST_TIMEOUT_MS = 4_000;

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

interface PulseChainGasSample {
  blockNumber: bigint;
  gasPriceWei: bigint;
  baseFeeWei?: bigint;
  priorityFeeWei?: bigint;
  source: Exclude<GasDataSource, "unavailable">;
}

interface RpcOptions {
  rpcUrl?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export async function fetchPulseChainGasData(
  options: RpcOptions = {},
): Promise<GasApiResponse> {
  const updatedAt = new Date().toISOString();
  const rpcUrl = options.rpcUrl ?? resolvePulseChainGasRpcUrl();

  try {
    const sample = await fetchPulseChainGasSample({
      ...options,
      rpcUrl,
    });
    return buildGasApiResponse(sample, updatedAt);
  } catch {
    return unavailableGasResponse(updatedAt, [
      "PulseChain gas data is unavailable from the configured RPC right now.",
    ]);
  }
}

export function resolvePulseChainGasRpcUrl(): string {
  return (
    cleanEnv(process.env.PULSECHAIN_RPC_URL) ??
    cleanEnv(process.env.PULSECHAIN_MAINNET_RPC_URL) ??
    cleanEnv(process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL) ??
    PULSECHAIN_RPC_DEFAULT
  );
}

export async function fetchPulseChainGasSample(
  options: RpcOptions = {},
): Promise<PulseChainGasSample> {
  const rpcUrl = options.rpcUrl ?? resolvePulseChainGasRpcUrl();

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
      return {
        blockNumber,
        gasPriceWei: baseFeeWei + (priorityFeeWei ?? 0n),
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

function buildGasApiResponse(
  sample: PulseChainGasSample,
  updatedAt: string,
): GasApiResponse {
  const gasPriceGwei = weiToGweiString(sample.gasPriceWei);
  const gasPriceGweiNumber = Number(gasPriceGwei);

  return {
    chainId: PULSECHAIN_GAS_CHAIN_ID,
    chainName: PULSECHAIN_GAS_CHAIN_NAME,
    nativeCurrency: PULSECHAIN_GAS_NATIVE_CURRENCY,
    blockNumber: sample.blockNumber.toString(),
    source: sample.source,
    status: classifyGasStatus({ gasPriceGwei: gasPriceGweiNumber }),
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
      nativeCurrency: PULSECHAIN_GAS_NATIVE_CURRENCY,
    }),
  };
}

export function unavailableGasResponse(
  updatedAt = new Date().toISOString(),
  errors: string[] = ["PulseChain gas data is unavailable."],
): GasApiResponse {
  return {
    chainId: PULSECHAIN_GAS_CHAIN_ID,
    chainName: PULSECHAIN_GAS_CHAIN_NAME,
    nativeCurrency: PULSECHAIN_GAS_NATIVE_CURRENCY,
    blockNumber: null,
    source: "unavailable",
    status: "unavailable",
    updatedAt,
    available: false,
    gasPriceGwei: null,
    baseFeeGwei: null,
    priorityFeeGwei: null,
    typicalTransactions: [],
    errors,
  };
}

async function rpcRequest<T>(
  method: string,
  params: unknown[],
  options: Required<Pick<RpcOptions, "rpcUrl">> & RpcOptions,
): Promise<T> {
  const fetchFn = options.fetchFn ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? PULSECHAIN_GAS_REQUEST_TIMEOUT_MS,
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
      throw new Error(`PulseChain RPC returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as JsonRpcSuccess<T> | JsonRpcFailure;
    if ("error" in payload) {
      throw new Error(payload.error.message ?? "PulseChain RPC error");
    }
    return payload.result;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
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
