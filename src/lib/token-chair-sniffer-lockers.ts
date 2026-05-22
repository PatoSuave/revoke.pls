import {
  getAddress,
  isAddress,
  parseAbiItem,
  type Address,
  type Hex,
} from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import { getSpenderMetadataEntry } from "@/lib/registry";
import {
  createPulseChainContractReader,
  type TokenChairContractReader,
} from "@/lib/token-chair-sniffer-contract";
import type {
  TokenChairLpLockRecord,
  TokenChairLpLockerData,
} from "@/lib/token-chair-sniffer";

export interface FetchTokenChairLpLockerOptions {
  reader?: TokenChairContractReader;
  signal?: AbortSignal;
  maxLocks?: number;
  maxEventLockIds?: number;
}

interface ReadAttempt<T> {
  ok: boolean;
  value: T | null;
  error: string | null;
}

interface LockerInfo {
  tokenAddress: Address;
  ownerAddress: Address;
  amountRaw: string;
  amount: bigint;
  unlockTime: string;
  withdrawn: boolean;
  isLocked: boolean;
}

const DEFAULT_LOCKER_MAX_LOCKS = 50;
const DEFAULT_LOCKER_MAX_EVENT_LOCK_IDS = 100;
const PULSELAUNCH_LOCKER_ADDRESS = getAddress(
  "0xD6C5765295ac081cD513fF9C71586B59e83E0aA7",
);
const lockCreatedEvent = parseAbiItem(
  "event LockCreated(uint256 indexed lockId, address indexed owner, address token, uint256 amount, uint256 unlockTime)",
);

const totalLocksAbi = [
  {
    type: "function",
    name: "totalLocks",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const getLockInfoAbi = [
  {
    type: "function",
    name: "getLockInfo",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "lockId" }],
    outputs: [
      { type: "address", name: "token" },
      { type: "address", name: "owner" },
      { type: "uint256", name: "amount" },
      { type: "uint256", name: "unlockTime" },
      { type: "bool", name: "withdrawn" },
      { type: "bool", name: "isLocked" },
    ],
  },
] as const;

export async function fetchTokenChairLpLockerData(
  pairAddress: Address | string | null | undefined,
  lpHolderAddress: Address | string | null | undefined,
  pairTotalSupplyRaw: string | null | undefined,
  options: FetchTokenChairLpLockerOptions = {},
): Promise<TokenChairLpLockerData> {
  const normalizedPair = normalizeAddress(pairAddress);
  const lockerAddress = normalizeAddress(lpHolderAddress);
  const lockerEntry = lockerAddress
    ? getSpenderMetadataEntry(PULSECHAIN_CHAIN_ID, lockerAddress)
    : undefined;
  const lockerLabel = lockerEntry?.label ?? null;

  if (!normalizedPair || !lockerAddress || lockerEntry?.category !== "locker") {
    return emptyLockerData({
      status: "not-applicable",
      lockerAddress,
      lockerLabel,
      pairAddress: normalizedPair,
    });
  }

  if (!addressesMatch(lockerAddress, PULSELAUNCH_LOCKER_ADDRESS)) {
    return emptyLockerData({
      status: "unable-to-verify",
      lockerAddress,
      lockerLabel,
      pairAddress: normalizedPair,
      errors: [
        "Matched locker metadata, but no native reader is available for this locker contract yet.",
      ],
    });
  }

  const reader = options.reader ?? createPulseChainContractReader();
  const codeRead = await readWithAbort(
    () => reader.getCode({ address: lockerAddress }),
    options.signal,
  );
  if (!codeRead.ok || !hasContractCode(codeRead.value)) {
    return emptyLockerData({
      status: "unable-to-verify",
      lockerAddress,
      lockerLabel,
      pairAddress: normalizedPair,
      errors: [
        codeRead.error ??
          "No locker contract bytecode was found at the matched locker address.",
      ],
    });
  }

  const totalLocksRead = await readUint(
    reader,
    lockerAddress,
    totalLocksAbi,
    "totalLocks",
    [],
    options.signal,
  );
  if (!totalLocksRead.ok || totalLocksRead.value === null) {
    return emptyLockerData({
      status: "unable-to-verify",
      lockerAddress,
      lockerLabel,
      pairAddress: normalizedPair,
      errors: [
        totalLocksRead.error ??
          "Matched locker totalLocks() could not be read.",
      ],
    });
  }

  const totalLocks = totalLocksRead.value;
  const maxLocks = Math.max(1, options.maxLocks ?? DEFAULT_LOCKER_MAX_LOCKS);
  const readCount = Number(totalLocks > BigInt(maxLocks) ? BigInt(maxLocks) : totalLocks);
  const firstLockId = totalLocks - BigInt(readCount);
  const recentLockIds = Array.from(
    { length: readCount },
    (_, index) => firstLockId + BigInt(index),
  );
  const eventRead = await readLockCreatedLockIds(
    reader,
    lockerAddress,
    normalizedPair,
    options.maxEventLockIds ?? DEFAULT_LOCKER_MAX_EVENT_LOCK_IDS,
    options.signal,
  );
  const lockIds = uniqueBigints([
    ...(eventRead.value?.lockIds ?? []),
    ...recentLockIds,
  ]).filter((lockId) => lockId < totalLocks);
  const reads = await Promise.all(
    lockIds.map(async (lockId) => ({
      lockId,
      read: await readLockInfo(reader, lockerAddress, lockId, options.signal),
    })),
  );
  const failedReads = reads.filter((item) => !item.read.ok).length;
  const pairTotalSupply = parsePositiveBigInt(pairTotalSupplyRaw);
  const matchedLocks = reads
    .map((item) => {
      const info = item.read.value;
      if (!info || !addressesMatch(info.tokenAddress, normalizedPair)) return null;
      return normalizeLockRecord(item.lockId, info, pairTotalSupply);
    })
    .filter((item): item is TokenChairLpLockRecord => Boolean(item));
  const activeLocks = matchedLocks.filter((lock) => lock.isLocked && !lock.withdrawn);
  const withdrawableLocks = matchedLocks.filter((lock) => !lock.withdrawn && !lock.isLocked);
  const activeInfos = reads
    .map((item) => item.read.value)
    .filter((info): info is LockerInfo => {
      if (!info) return false;
      return (
        addressesMatch(info.tokenAddress, normalizedPair) &&
        info.isLocked &&
        !info.withdrawn
      );
    });
  const lockedAmount = activeInfos.reduce((sum, info) => sum + info.amount, 0n);
  const lockedAmountRaw = lockedAmount > 0n ? lockedAmount.toString() : null;
  const lockedPercent =
    lockedAmount > 0n && pairTotalSupply !== null && pairTotalSupply > 0n
      ? bigintPercent(lockedAmount, pairTotalSupply)
      : null;
  const nextUnlockTime = activeLocks
    .map((lock) => parsePositiveBigInt(lock.unlockTime))
    .filter((value): value is bigint => value !== null)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0] ?? null;
  const ownerAddresses = uniqueAddresses(activeLocks.map((lock) => lock.ownerAddress));
  const maxLocksReached = totalLocks > BigInt(readCount);
  const eventLockIds = eventRead.value?.lockIds ?? [];
  const warnings = [
    eventRead.ok
      ? null
      : `PulseLaunch locker LockCreated event scan failed: ${eventRead.error ?? "unknown error"}.`,
    eventRead.value?.maxEventLockIdsReached
      ? `PulseLaunch locker event scan was capped at ${eventLockIds.length.toLocaleString("en-US")} matching lock IDs.`
      : null,
    maxLocksReached && eventLockIds.length === 0
      ? `Locker scan was capped at the most recent ${readCount.toLocaleString("en-US")} of ${totalLocks.toString()} total locks.`
      : null,
    failedReads > 0
      ? `${failedReads.toLocaleString("en-US")} locker record read${failedReads === 1 ? "" : "s"} failed.`
      : null,
    matchedLocks.length === 0
      ? "No readable PulseLaunch locker record matched the selected pair in the bounded scan."
      : null,
    matchedLocks.length > 0 && activeLocks.length === 0
      ? "Readable locker records matched the selected pair, but none are currently active."
      : null,
  ].filter((warning): warning is string => Boolean(warning));

  return {
    status:
      failedReads > 0 || warnings.length > 0
        ? "partial"
        : "success",
    lockerAddress,
    lockerLabel,
    pairAddress: normalizedPair,
    checkedLockCount: lockIds.length,
    totalLocks: totalLocks.toString(),
    maxLocksReached,
    matchedLocks,
    activeLocks,
    withdrawableLocks,
    lockedAmountRaw,
    lockedPercent,
    nextUnlockTime: nextUnlockTime?.toString() ?? null,
    nextUnlockDateIso: nextUnlockTime ? unixSecondsToIso(nextUnlockTime) : null,
    ownerAddresses,
    warnings,
    errors: [],
  };
}

function emptyLockerData({
  status,
  lockerAddress,
  lockerLabel,
  pairAddress,
  warnings = [],
  errors = [],
}: {
  status: TokenChairLpLockerData["status"];
  lockerAddress: Address | null;
  lockerLabel: string | null;
  pairAddress: Address | null;
  warnings?: string[];
  errors?: string[];
}): TokenChairLpLockerData {
  return {
    status,
    lockerAddress,
    lockerLabel,
    pairAddress,
    checkedLockCount: 0,
    totalLocks: null,
    maxLocksReached: false,
    matchedLocks: [],
    activeLocks: [],
    withdrawableLocks: [],
    lockedAmountRaw: null,
    lockedPercent: null,
    nextUnlockTime: null,
    nextUnlockDateIso: null,
    ownerAddresses: [],
    warnings,
    errors,
  };
}

async function readLockInfo(
  reader: TokenChairContractReader,
  lockerAddress: Address,
  lockId: bigint,
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<LockerInfo>> {
  const result = await readWithAbort(
    () =>
      reader.readContract({
        address: lockerAddress,
        abi: getLockInfoAbi,
        functionName: "getLockInfo",
        args: [lockId],
      }),
    signal,
  );
  const value = normalizeLockInfo(result.value);
  return {
    ok: result.ok && value !== null,
    value,
    error: result.ok ? null : result.error,
  };
}

async function readLockCreatedLockIds(
  reader: TokenChairContractReader,
  lockerAddress: Address,
  pairAddress: Address,
  maxEventLockIds: number,
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<{ lockIds: bigint[]; maxEventLockIdsReached: boolean }>> {
  const blockRead = await readWithAbort(
    () => reader.getBlockNumber(),
    signal,
  );
  if (!blockRead.ok || blockRead.value === null) {
    return {
      ok: false,
      value: null,
      error: blockRead.error ?? "PulseChain latest block could not be read for locker event discovery.",
    };
  }

  const logsRead = await readWithAbort(
    () =>
      reader.getLogs({
        address: lockerAddress,
        event: lockCreatedEvent,
        fromBlock: 0n,
        toBlock: blockRead.value!,
      }),
    signal,
  );
  if (!logsRead.ok || !logsRead.value) {
    return {
      ok: false,
      value: null,
      error: logsRead.error ?? "PulseLaunch locker LockCreated logs could not be read.",
    };
  }

  const maxIds = Math.max(1, maxEventLockIds);
  const lockIds: bigint[] = [];
  for (const log of logsRead.value) {
    const lockId = normalizeLockCreatedLockId(log, pairAddress);
    if (lockId === null) continue;
    lockIds.push(lockId);
    if (lockIds.length >= maxIds) {
      return {
        ok: true,
        value: {
          lockIds: uniqueBigints(lockIds),
          maxEventLockIdsReached: true,
        },
        error: null,
      };
    }
  }

  return {
    ok: true,
    value: {
      lockIds: uniqueBigints(lockIds),
      maxEventLockIdsReached: false,
    },
    error: null,
  };
}

async function readUint(
  reader: TokenChairContractReader,
  address: Address,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[],
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<bigint>> {
  const result = await readWithAbort(
    () => reader.readContract({ address, abi, functionName, args }),
    signal,
  );
  const value = normalizeBigInt(result.value);
  return {
    ok: result.ok && value !== null,
    value,
    error: result.ok ? null : result.error,
  };
}

function normalizeLockCreatedLockId(
  log: unknown,
  pairAddress: Address,
): bigint | null {
  const args = asRecord(asRecord(log)?.args);
  const token = normalizeAddress(args?.token);
  if (!addressesMatch(token, pairAddress)) return null;
  return normalizeBigInt(args?.lockId);
}

async function readWithAbort<T>(
  task: () => Promise<T>,
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<T>> {
  if (signal?.aborted) {
    return {
      ok: false,
      value: null,
      error: "PulseChain locker contract read timed out.",
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
        error: "PulseChain locker contract read timed out.",
      });
    signal.addEventListener("abort", abort, { once: true });
  });

  try {
    return await Promise.race([read, aborted]);
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
  }
}

function normalizeLockInfo(value: unknown): LockerInfo | null {
  if (!Array.isArray(value) || value.length < 6) return null;
  const tokenAddress = normalizeAddress(value[0]);
  const ownerAddress = normalizeAddress(value[1]);
  const amount = normalizeBigInt(value[2]);
  const unlockTime = normalizeBigInt(value[3]);
  if (!tokenAddress || !ownerAddress || amount === null || unlockTime === null) {
    return null;
  }
  if (typeof value[4] !== "boolean" || typeof value[5] !== "boolean") {
    return null;
  }
  return {
    tokenAddress,
    ownerAddress,
    amountRaw: amount.toString(),
    amount,
    unlockTime: unlockTime.toString(),
    withdrawn: value[4],
    isLocked: value[5],
  };
}

function normalizeLockRecord(
  lockId: bigint,
  info: LockerInfo,
  pairTotalSupply: bigint | null,
): TokenChairLpLockRecord {
  return {
    lockId: lockId.toString(),
    tokenAddress: info.tokenAddress,
    ownerAddress: info.ownerAddress,
    amountRaw: info.amountRaw,
    unlockTime: info.unlockTime,
    unlockDateIso: unixSecondsToIso(BigInt(info.unlockTime)),
    withdrawn: info.withdrawn,
    isLocked: info.isLocked,
    lpSupplyPercent:
      pairTotalSupply !== null && pairTotalSupply > 0n
        ? bigintPercent(info.amount, pairTotalSupply)
        : null,
  };
}

function normalizeAddress(value: unknown): Address | null {
  if (typeof value !== "string" || !isAddress(value)) return null;
  return getAddress(value);
}

function normalizeBigInt(value: unknown): bigint | null {
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return null;
}

function parsePositiveBigInt(value: string | null | undefined): bigint | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed > 0n ? parsed : null;
}

function bigintPercent(value: bigint, total: bigint): number {
  const scaled = value * 1_000_000n / total;
  return Number(scaled) / 10_000;
}

function uniqueAddresses(addresses: readonly Address[]): Address[] {
  const seen = new Set<string>();
  const unique: Address[] = [];
  for (const address of addresses) {
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(address);
  }
  return unique;
}

function uniqueBigints(values: readonly bigint[]): bigint[] {
  const seen = new Set<string>();
  const unique: bigint[] = [];
  for (const value of values) {
    const key = value.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

function unixSecondsToIso(value: bigint): string | null {
  const maxSeconds = BigInt(Math.floor(Number.MAX_SAFE_INTEGER / 1000));
  if (value > maxSeconds) return null;
  const ms = Number(value) * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function addressesMatch(
  left: Address | null | undefined,
  right: Address | null | undefined,
): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function hasContractCode(code: Hex | null | undefined): boolean {
  return Boolean(code && code !== "0x");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}
