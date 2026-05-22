import { getAddress, isAddress, type Address } from "viem";

import {
  createPulseChainContractReader,
  type TokenChairContractReader,
} from "@/lib/token-chair-sniffer-contract";
import type { TokenChairPairContractData } from "@/lib/token-chair-sniffer";

const pairAddressAbi = (name: "token0" | "token1") => [
  {
    type: "function",
    name,
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

const getReservesAbi = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { type: "uint112", name: "_reserve0" },
      { type: "uint112", name: "_reserve1" },
      { type: "uint32", name: "_blockTimestampLast" },
    ],
  },
] as const;

const totalSupplyAbi = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

export interface FetchTokenChairPairContractOptions {
  reader?: TokenChairContractReader;
  signal?: AbortSignal;
}

interface ReadAttempt<T> {
  ok: boolean;
  value: T | null;
  error: string | null;
}

export async function fetchTokenChairPairContractData(
  tokenAddress: Address,
  pairAddress: string | null | undefined,
  options: FetchTokenChairPairContractOptions = {},
): Promise<TokenChairPairContractData> {
  const normalizedPair = normalizeAddress(pairAddress);
  if (!normalizedPair) {
    return unablePairContractData(null, [
      "No selected pair address was available for native pair checks.",
    ]);
  }

  const reader = options.reader ?? createPulseChainContractReader();
  const codeRead = await readWithAbort(
    () => reader.getCode({ address: normalizedPair }),
    options.signal,
  );

  if (!codeRead.ok || !hasContractCode(codeRead.value)) {
    return unablePairContractData(normalizedPair, [
      codeRead.error ?? "No pair contract bytecode was found at the selected pair address.",
    ]);
  }

  const [token0Read, token1Read, reservesRead, totalSupplyRead] =
    await Promise.all([
      readAddress(reader, normalizedPair, "token0", options.signal),
      readAddress(reader, normalizedPair, "token1", options.signal),
      readReserves(reader, normalizedPair, options.signal),
      readUint(reader, normalizedPair, totalSupplyAbi, "totalSupply", options.signal),
    ]);

  const token0 = token0Read.value;
  const token1 = token1Read.value;
  const containsScannedToken =
    token0 && token1
      ? addressesMatch(tokenAddress, token0) || addressesMatch(tokenAddress, token1)
      : null;
  const reserves = reservesRead.value;
  const scannedTokenReserveRaw =
    reserves && containsScannedToken === true
      ? addressesMatch(tokenAddress, token0)
        ? reserves.reserve0Raw
        : reserves.reserve1Raw
      : null;
  const quoteTokenReserveRaw =
    reserves && containsScannedToken === true
      ? addressesMatch(tokenAddress, token0)
        ? reserves.reserve1Raw
        : reserves.reserve0Raw
      : null;

  const warnings = [
    token0Read.ok ? null : "Selected pair token0() could not be read.",
    token1Read.ok ? null : "Selected pair token1() could not be read.",
    reservesRead.ok ? null : "Selected pair getReserves() could not be read.",
    totalSupplyRead.ok ? null : "Selected pair totalSupply() could not be read.",
    containsScannedToken === false
      ? "Selected pair token0/token1 did not include the scanned token address."
      : null,
  ].filter((warning): warning is string => Boolean(warning));

  return {
    status: warnings.length > 0 ? "partial" : "success",
    pairAddress: normalizedPair,
    token0,
    token1,
    containsScannedToken,
    reserve0Raw: reserves?.reserve0Raw ?? null,
    reserve1Raw: reserves?.reserve1Raw ?? null,
    scannedTokenReserveRaw,
    quoteTokenReserveRaw,
    totalSupplyRaw: totalSupplyRead.value,
    warnings,
    errors: [],
  };
}

function unablePairContractData(
  pairAddress: Address | null,
  errors: string[],
): TokenChairPairContractData {
  return {
    status: "unable-to-verify",
    pairAddress,
    token0: null,
    token1: null,
    containsScannedToken: null,
    reserve0Raw: null,
    reserve1Raw: null,
    scannedTokenReserveRaw: null,
    quoteTokenReserveRaw: null,
    totalSupplyRaw: null,
    warnings: [],
    errors,
  };
}

async function readAddress(
  reader: TokenChairContractReader,
  pairAddress: Address,
  functionName: "token0" | "token1",
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<Address>> {
  const result = await readWithAbort(
    () =>
      reader.readContract({
        address: pairAddress,
        abi: pairAddressAbi(functionName),
        functionName,
      }),
    signal,
  );
  const value = normalizeAddress(result.value);
  return {
    ok: result.ok && value !== null,
    value,
    error: result.ok ? null : result.error,
  };
}

async function readReserves(
  reader: TokenChairContractReader,
  pairAddress: Address,
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<{ reserve0Raw: string; reserve1Raw: string }>> {
  const result = await readWithAbort(
    () =>
      reader.readContract({
        address: pairAddress,
        abi: getReservesAbi,
        functionName: "getReserves",
      }),
    signal,
  );
  const reserves = normalizeReserves(result.value);
  return {
    ok: result.ok && reserves !== null,
    value: reserves,
    error: result.ok ? null : result.error,
  };
}

async function readUint(
  reader: TokenChairContractReader,
  pairAddress: Address,
  abi: readonly unknown[],
  functionName: string,
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<string>> {
  const result = await readWithAbort(
    () => reader.readContract({ address: pairAddress, abi, functionName }),
    signal,
  );
  const value = normalizeIntegerString(result.value);
  return {
    ok: result.ok && value !== null,
    value,
    error: result.ok ? null : result.error,
  };
}

async function readWithAbort<T>(
  task: () => Promise<T>,
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<T>> {
  if (signal?.aborted) {
    return {
      ok: false,
      value: null,
      error: "PulseChain pair contract read timed out.",
    };
  }

  const read = task()
    .then<ReadAttempt<T>>((value) => ({ ok: true, value, error: null }))
    .catch<ReadAttempt<T>>((error) => ({
      ok: false,
      value: null,
      error: error instanceof Error ? error.message : String(error),
    }));

  if (!signal) return read;

  let abort: (() => void) | undefined;
  const aborted = new Promise<ReadAttempt<T>>((resolve) => {
    abort = () =>
      resolve({
        ok: false,
        value: null,
        error: "PulseChain pair contract read timed out.",
      });
    signal.addEventListener("abort", abort, { once: true });
  });

  try {
    return await Promise.race([read, aborted]);
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
  }
}

function normalizeReserves(
  value: unknown,
): { reserve0Raw: string; reserve1Raw: string } | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const reserve0Raw = normalizeIntegerString(value[0]);
  const reserve1Raw = normalizeIntegerString(value[1]);
  if (reserve0Raw === null || reserve1Raw === null) return null;
  return { reserve0Raw, reserve1Raw };
}

function normalizeIntegerString(value: unknown): string | null {
  if (typeof value === "bigint" && value >= 0n) return value.toString();
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value.toString();
  }
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  return null;
}

function normalizeAddress(value: unknown): Address | null {
  if (typeof value !== "string" || !isAddress(value)) return null;
  return getAddress(value);
}

function hasContractCode(value: string | null | undefined): boolean {
  return Boolean(value && value !== "0x");
}

function addressesMatch(
  left: Address | string | null | undefined,
  right: Address | string | null | undefined,
): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}
