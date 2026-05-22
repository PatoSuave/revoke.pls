import { getAddress, isAddress, type Address } from "viem";

import {
  createPulseChainContractReader,
  type TokenChairContractReader,
} from "@/lib/token-chair-sniffer-contract";
import type {
  TokenChairContractReadStatus,
  TokenChairPulseXPairData,
  TokenChairPulseXPairVersion,
} from "@/lib/token-chair-sniffer";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const PULSEX_FACTORIES: readonly {
  version: TokenChairPulseXPairVersion;
  label: string;
  address: Address;
}[] = [
  {
    version: "v2",
    label: "PulseX V2",
    address: getAddress("0x29eA7545DEf87022BAdc76323F373EA1e707C523"),
  },
  {
    version: "v1",
    label: "PulseX V1",
    address: getAddress("0x1715a3E4A142d8b698131108995174F37aEBA10D"),
  },
];

const PULSEX_QUOTE_TOKENS: readonly {
  address: Address;
  symbol: string;
  name: string;
}[] = [
  {
    address: getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27"),
    symbol: "WPLS",
    name: "Wrapped Pulse",
  },
  {
    address: getAddress("0x95B303987A60C71504D99Aa1b13B4DA07b0790ab"),
    symbol: "PLSX",
    name: "PulseX",
  },
  {
    address: getAddress("0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d"),
    symbol: "INC",
    name: "Incentive",
  },
  {
    address: getAddress("0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39"),
    symbol: "HEX",
    name: "HEX",
  },
  {
    address: getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F"),
    symbol: "DAI",
    name: "Dai Stablecoin",
  },
  {
    address: getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
    symbol: "USDC",
    name: "USD Coin",
  },
  {
    address: getAddress("0xdAC17F958D2ee523a2206206994597C13D831ec7"),
    symbol: "USDT",
    name: "Tether USD",
  },
];

const factoryGetPairAbi = [
  {
    type: "function",
    name: "getPair",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }],
    outputs: [{ type: "address" }],
  },
] as const;

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

export interface FetchTokenChairPulseXPairsOptions {
  reader?: TokenChairContractReader;
  signal?: AbortSignal;
  maxPairs?: number;
}

interface ReadAttempt<T> {
  ok: boolean;
  value: T | null;
  error: string | null;
}

interface PulseXPairCandidate {
  version: TokenChairPulseXPairVersion;
  label: string;
  factoryAddress: Address;
  pairAddress: Address;
  quoteTokenAddress: Address;
  quoteTokenSymbol: string;
  quoteTokenName: string;
}

export async function fetchTokenChairPulseXPairs(
  tokenAddress: Address,
  options: FetchTokenChairPulseXPairsOptions = {},
): Promise<TokenChairPulseXPairData[]> {
  const reader = options.reader ?? createPulseChainContractReader();
  const quoteTokens = PULSEX_QUOTE_TOKENS.filter(
    (quote) => !addressesMatch(quote.address, tokenAddress),
  );

  const candidates = (
    await Promise.all(
      PULSEX_FACTORIES.flatMap((factory) =>
        quoteTokens.map(async (quote) => {
          const pairRead = await readPairAddress(
            reader,
            factory.address,
            tokenAddress,
            quote.address,
            options.signal,
          );
          if (!pairRead.ok || !pairRead.value) return null;
          return {
            version: factory.version,
            label: factory.label,
            factoryAddress: factory.address,
            pairAddress: pairRead.value,
            quoteTokenAddress: quote.address,
            quoteTokenSymbol: quote.symbol,
            quoteTokenName: quote.name,
          } satisfies PulseXPairCandidate;
        }),
      ),
    )
  ).filter((item): item is PulseXPairCandidate => Boolean(item));

  const uniqueCandidates = dedupeCandidates(candidates).slice(
    0,
    Math.max(1, options.maxPairs ?? 12),
  );

  return Promise.all(
    uniqueCandidates.map((candidate) =>
      readPulseXPairData(reader, tokenAddress, candidate, options.signal),
    ),
  );
}

async function readPulseXPairData(
  reader: TokenChairContractReader,
  tokenAddress: Address,
  candidate: PulseXPairCandidate,
  signal: AbortSignal | undefined,
): Promise<TokenChairPulseXPairData> {
  const [token0Read, token1Read, reservesRead, totalSupplyRead] =
    await Promise.all([
      readAddress(reader, candidate.pairAddress, "token0", signal),
      readAddress(reader, candidate.pairAddress, "token1", signal),
      readReserves(reader, candidate.pairAddress, signal),
      readUint(reader, candidate.pairAddress, totalSupplyAbi, "totalSupply", signal),
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
    token0Read.ok ? null : "PulseX pair token0() could not be read.",
    token1Read.ok ? null : "PulseX pair token1() could not be read.",
    reservesRead.ok ? null : "PulseX pair getReserves() could not be read.",
    totalSupplyRead.ok ? null : "PulseX pair totalSupply() could not be read.",
    containsScannedToken === false
      ? "PulseX factory returned a pair whose token0/token1 did not include the scanned token."
      : null,
  ].filter((warning): warning is string => Boolean(warning));
  const status: TokenChairContractReadStatus =
    warnings.length === 0 ? "success" : "partial";

  return {
    status,
    version: candidate.version,
    label: candidate.label,
    factoryAddress: candidate.factoryAddress,
    pairAddress: candidate.pairAddress,
    quoteTokenAddress: candidate.quoteTokenAddress,
    quoteTokenSymbol: candidate.quoteTokenSymbol,
    quoteTokenName: candidate.quoteTokenName,
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

async function readPairAddress(
  reader: TokenChairContractReader,
  factoryAddress: Address,
  tokenAddress: Address,
  quoteAddress: Address,
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<Address>> {
  const result = await readWithAbort(
    () =>
      reader.readContract({
        address: factoryAddress,
        abi: factoryGetPairAbi,
        functionName: "getPair",
        args: [tokenAddress, quoteAddress],
      }),
    signal,
  );
  const value = normalizeAddress(result.value);
  return {
    ok: result.ok,
    value: value && value !== ZERO_ADDRESS ? value : null,
    error: result.ok ? null : result.error,
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
      error: "PulseX pair discovery read timed out.",
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
        error: "PulseX pair discovery read timed out.",
      });
    signal.addEventListener("abort", abort, { once: true });
  });

  try {
    return await Promise.race([read, aborted]);
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
  }
}

function dedupeCandidates(
  candidates: readonly PulseXPairCandidate[],
): PulseXPairCandidate[] {
  const seen = new Set<string>();
  const unique: PulseXPairCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.pairAddress.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }

  return unique;
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

function addressesMatch(
  left: Address | string | null | undefined,
  right: Address | string | null | undefined,
): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}
