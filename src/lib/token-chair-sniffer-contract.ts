import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";

import { PULSECHAIN_CHAIN_ID, getChainConfig, pulsechain } from "@/lib/chains";
import type {
  TokenChairAccessControlSignal,
  TokenChairContractData,
  TokenChairContractReadStatus,
  TokenChairPendingOwnerSignal,
  TokenChairProxySignal,
  TokenChairTaxGetterSignal,
  TokenChairTaxSignals,
} from "@/lib/token-chair-sniffer";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_ROLE = `0x${"0".repeat(64)}` as Hex;

const EIP_1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as Hex;
const EIP_1967_ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103" as Hex;
const EIP_1967_BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50" as Hex;

const stringNameAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

const stringSymbolAbi = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;

const decimalsAbi = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

const ownerAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

const getOwnerAbi = [
  {
    type: "function",
    name: "getOwner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

const addressGetterAbi = (name: string) => [
  {
    type: "function",
    name,
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

const uintGetterAbi = (name: string) => [
  {
    type: "function",
    name,
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const defaultAdminRoleAbi = [
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
] as const;

const getRoleAdminAbi = [
  {
    type: "function",
    name: "getRoleAdmin",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }],
    outputs: [{ type: "bytes32" }],
  },
] as const;

const PENDING_OWNER_FUNCTIONS = [
  "pendingOwner",
  "pendingAdmin",
  "newOwner",
] as const;

const TAX_GETTER_FUNCTIONS = {
  buy: [
    "buyTax",
    "buyFee",
    "buyTaxFee",
    "totalBuyTax",
    "totalBuyFee",
    "_buyTax",
    "_buyFee",
  ],
  sell: [
    "sellTax",
    "sellFee",
    "sellTaxFee",
    "totalSellTax",
    "totalSellFee",
    "_sellTax",
    "_sellFee",
  ],
} as const;

export interface TokenChairContractReader {
  readContract(args: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args?: readonly unknown[];
  }): Promise<unknown>;
  getCode(args: { address: Address }): Promise<Hex | undefined>;
  getStorageAt(args: { address: Address; slot: Hex }): Promise<Hex | undefined>;
}

export interface FetchTokenChairContractOptions {
  reader?: TokenChairContractReader;
  signal?: AbortSignal;
}

interface ReadAttempt<T> {
  ok: boolean;
  value: T | null;
  error: string | null;
}

interface OwnerReadResult {
  ownerAddress: Address | null;
  ownerFunction: TokenChairContractData["ownerFunction"];
  ownershipRenounced: boolean | null;
  warning: string | null;
}

export async function fetchTokenChairContractData(
  tokenAddress: Address,
  options: FetchTokenChairContractOptions = {},
): Promise<TokenChairContractData> {
  const reader = options.reader ?? createPulseChainContractReader();
  const codeRead = await readWithAbort(
    () => reader.getCode({ address: tokenAddress }),
    options.signal,
  );

  if (!codeRead.ok) {
    return createUnableContractData(tokenAddress, [
      codeRead.error ?? "PulseChain contract bytecode could not be read.",
    ]);
  }

  const code = codeRead.value;
  if (!hasContractCode(code)) {
    return createUnableContractData(tokenAddress, [
      "No contract bytecode was found at this address on PulseChain.",
    ]);
  }

  const [
    nameRead,
    symbolRead,
    decimalsRead,
    ownerRead,
    pendingOwner,
    proxy,
    accessControl,
    taxes,
  ] =
    await Promise.all([
      readTokenString(reader, tokenAddress, "name", stringNameAbi, options.signal),
      readTokenString(
        reader,
        tokenAddress,
        "symbol",
        stringSymbolAbi,
        options.signal,
      ),
      readDecimals(reader, tokenAddress, options.signal),
      readOwner(reader, tokenAddress, options.signal),
      readPendingOwner(reader, tokenAddress, options.signal),
      readProxySignals(reader, tokenAddress, code, options.signal),
      readAccessControlSignal(reader, tokenAddress, options.signal),
      readTaxSignals(reader, tokenAddress, options.signal),
    ]);

  const warnings = [
    nameRead.ok ? null : "Token name could not be read from the contract.",
    symbolRead.ok ? null : "Token symbol could not be read from the contract.",
    decimalsRead.ok ? null : "Token decimals could not be read from the contract.",
    ownerRead.warning,
    pendingOwner.address
      ? `A ${pendingOwner.functionName ?? "pending owner/admin"} getter returned ${pendingOwner.address}.`
      : null,
    proxy.detected === null
      ? "Common proxy checks were incomplete for this contract."
      : null,
    accessControl.detected === true
      ? "Common AccessControl role functions responded for this contract."
      : null,
    accessControl.detected === null
      ? "Common AccessControl role checks were incomplete for this contract."
      : null,
    taxGetterWarning("buy", taxes.buy),
    taxGetterWarning("sell", taxes.sell),
  ].filter((warning): warning is string => Boolean(warning));

  return {
    tokenAddress,
    status: contractStatusFromWarnings(warnings),
    tokenName: nameRead.value,
    tokenSymbol: symbolRead.value,
    decimals: decimalsRead.value,
    ownerAddress: ownerRead.ownerAddress,
    ownerFunction: ownerRead.ownerFunction,
    ownershipRenounced: ownerRead.ownershipRenounced,
    proxy,
    pendingOwner,
    accessControl,
    taxes,
    explorer: null,
    holders: null,
    warnings,
    errors: [],
  };
}

export function createPulseChainContractReader(): TokenChairContractReader {
  const rpcUrl =
    getChainConfig(PULSECHAIN_CHAIN_ID)?.rpc.url ??
    pulsechain.rpcUrls.default.http[0];
  const client = createPublicClient({
    chain: pulsechain,
    transport: http(rpcUrl),
  });

  return {
    readContract: (args) => client.readContract(args as never),
    getCode: (args) => client.getCode(args),
    getStorageAt: (args) => client.getStorageAt(args),
  };
}

async function readTokenString(
  reader: TokenChairContractReader,
  address: Address,
  functionName: "name" | "symbol",
  abi: readonly unknown[],
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<string>> {
  const result = await readWithAbort(
    () => reader.readContract({ address, abi, functionName }),
    signal,
  );
  const value = cleanString(result.value);
  return {
    ok: result.ok && Boolean(value),
    value,
    error: result.ok ? null : result.error,
  };
}

async function readDecimals(
  reader: TokenChairContractReader,
  address: Address,
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<number>> {
  const result = await readWithAbort(
    () => reader.readContract({ address, abi: decimalsAbi, functionName: "decimals" }),
    signal,
  );
  const value = normalizeDecimals(result.value);
  return {
    ok: result.ok && value !== null,
    value,
    error: result.ok ? null : result.error,
  };
}

async function readOwner(
  reader: TokenChairContractReader,
  address: Address,
  signal: AbortSignal | undefined,
): Promise<OwnerReadResult> {
  const owner = await readOwnerFunction(reader, address, "owner", ownerAbi, signal);
  if (owner.ownerAddress || owner.ownershipRenounced === true) return owner;

  const getOwner = await readOwnerFunction(
    reader,
    address,
    "getOwner",
    getOwnerAbi,
    signal,
  );
  if (getOwner.ownerAddress || getOwner.ownershipRenounced === true) {
    return getOwner;
  }

  return {
    ownerAddress: null,
    ownerFunction: null,
    ownershipRenounced: null,
    warning:
      "No standard owner() or getOwner() value could be read; hidden ownership is not ruled out.",
  };
}

async function readOwnerFunction(
  reader: TokenChairContractReader,
  address: Address,
  functionName: "owner" | "getOwner",
  abi: readonly unknown[],
  signal: AbortSignal | undefined,
): Promise<OwnerReadResult> {
  const result = await readWithAbort(
    () => reader.readContract({ address, abi, functionName }),
    signal,
  );
  const ownerAddress = normalizeAddress(result.value);
  if (!result.ok || !ownerAddress) {
    return {
      ownerAddress: null,
      ownerFunction: null,
      ownershipRenounced: null,
      warning: null,
    };
  }

  return {
    ownerAddress: ownerAddress === ZERO_ADDRESS ? null : ownerAddress,
    ownerFunction: functionName,
    ownershipRenounced: ownerAddress === ZERO_ADDRESS,
    warning: null,
  };
}

async function readPendingOwner(
  reader: TokenChairContractReader,
  address: Address,
  signal: AbortSignal | undefined,
): Promise<TokenChairPendingOwnerSignal> {
  for (const functionName of PENDING_OWNER_FUNCTIONS) {
    const result = await readWithAbort(
      () =>
        reader.readContract({
          address,
          abi: addressGetterAbi(functionName),
          functionName,
        }),
      signal,
    );
    const ownerAddress = normalizeAddress(result.value);
    if (ownerAddress && ownerAddress !== ZERO_ADDRESS) {
      return { address: ownerAddress, functionName };
    }
  }

  return { address: null, functionName: null };
}

async function readProxySignals(
  reader: TokenChairContractReader,
  address: Address,
  code: Hex,
  signal: AbortSignal | undefined,
): Promise<TokenChairProxySignal> {
  const [implementationRead, adminRead, beaconRead] = await Promise.all([
    readWithAbort(
      () =>
        reader.getStorageAt({
          address,
          slot: EIP_1967_IMPLEMENTATION_SLOT,
        }),
      signal,
    ),
    readWithAbort(
      () =>
        reader.getStorageAt({
          address,
          slot: EIP_1967_ADMIN_SLOT,
        }),
      signal,
    ),
    readWithAbort(
      () =>
        reader.getStorageAt({
          address,
          slot: EIP_1967_BEACON_SLOT,
        }),
      signal,
    ),
  ]);

  const implementationAddress = addressFromStorageSlot(implementationRead.value);
  const adminAddress = addressFromStorageSlot(adminRead.value);
  const beaconAddress = addressFromStorageSlot(beaconRead.value);
  const minimalProxyTarget = extractMinimalProxyTarget(code);
  const checks = [
    implementationAddress
      ? `EIP-1967 implementation slot points to ${implementationAddress}.`
      : null,
    adminAddress ? `EIP-1967 admin slot points to ${adminAddress}.` : null,
    beaconAddress ? `EIP-1967 beacon slot points to ${beaconAddress}.` : null,
    minimalProxyTarget
      ? `EIP-1167 minimal proxy bytecode points to ${minimalProxyTarget}.`
      : null,
  ].filter((check): check is string => Boolean(check));
  const detected = Boolean(
    implementationAddress ||
      beaconAddress ||
      minimalProxyTarget,
  );
  const storageReadsComplete =
    implementationRead.ok && adminRead.ok && beaconRead.ok;

  return {
    detected: detected ? true : storageReadsComplete ? false : null,
    implementationAddress,
    adminAddress,
    beaconAddress,
    minimalProxyTarget,
    checks,
  };
}

async function readAccessControlSignal(
  reader: TokenChairContractReader,
  address: Address,
  signal: AbortSignal | undefined,
): Promise<TokenChairAccessControlSignal> {
  const defaultRoleRead = await readHex32Function(
    reader,
    address,
    "DEFAULT_ADMIN_ROLE",
    defaultAdminRoleAbi,
    [],
    signal,
  );
  const defaultAdminRole = defaultRoleRead.value ?? ZERO_ROLE;
  const roleAdminRead = await readHex32Function(
    reader,
    address,
    "getRoleAdmin",
    getRoleAdminAbi,
    [defaultAdminRole],
    signal,
  );
  const checks = [
    defaultRoleRead.value
      ? `DEFAULT_ADMIN_ROLE() returned ${defaultRoleRead.value}.`
      : null,
    roleAdminRead.value
      ? `getRoleAdmin(DEFAULT_ADMIN_ROLE) returned ${roleAdminRead.value}.`
      : null,
  ].filter((check): check is string => Boolean(check));
  const detected = checks.length > 0
    ? true
    : defaultRoleRead.error === "PulseChain contract read timed out." ||
        roleAdminRead.error === "PulseChain contract read timed out."
      ? null
      : false;

  return {
    detected,
    defaultAdminRole: defaultRoleRead.value,
    roleAdmin: roleAdminRead.value,
    checks,
  };
}

async function readTaxSignals(
  reader: TokenChairContractReader,
  address: Address,
  signal: AbortSignal | undefined,
): Promise<TokenChairTaxSignals> {
  const [buy, sell] = await Promise.all([
    readTaxGetterSignal(reader, address, TAX_GETTER_FUNCTIONS.buy, signal),
    readTaxGetterSignal(reader, address, TAX_GETTER_FUNCTIONS.sell, signal),
  ]);

  return { buy, sell };
}

async function readTaxGetterSignal(
  reader: TokenChairContractReader,
  address: Address,
  functionNames: readonly string[],
  signal: AbortSignal | undefined,
): Promise<TokenChairTaxGetterSignal> {
  let timedOut = false;

  for (const functionName of functionNames) {
    const result = await readWithAbort(
      () =>
        reader.readContract({
          address,
          abi: uintGetterAbi(functionName),
          functionName,
        }),
      signal,
    );
    const valueRaw = normalizeIntegerString(result.value);
    if (result.ok && valueRaw !== null) {
      return {
        status: "found",
        valueRaw,
        functionName,
        checkedFunctions: [...functionNames],
      };
    }
    timedOut = timedOut || result.error === "PulseChain contract read timed out.";
  }

  return {
    status: timedOut ? "unable-to-verify" : "not-found",
    valueRaw: null,
    functionName: null,
    checkedFunctions: [...functionNames],
  };
}

async function readHex32Function(
  reader: TokenChairContractReader,
  address: Address,
  functionName: string,
  abi: readonly unknown[],
  args: readonly unknown[],
  signal: AbortSignal | undefined,
): Promise<ReadAttempt<Hex>> {
  const result = await readWithAbort(
    () => reader.readContract({ address, abi, functionName, args }),
    signal,
  );
  const value = normalizeHex32(result.value);
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
      error: "PulseChain contract read timed out.",
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
        error: "PulseChain contract read timed out.",
      });
    signal.addEventListener("abort", abort, { once: true });
  });

  try {
    return await Promise.race([read, aborted]);
  } finally {
    if (abort) signal.removeEventListener("abort", abort);
  }
}

function createUnableContractData(
  tokenAddress: Address,
  errors: string[],
): TokenChairContractData {
  return {
    tokenAddress,
    status: "unable-to-verify",
    tokenName: null,
    tokenSymbol: null,
    decimals: null,
    ownerAddress: null,
    ownerFunction: null,
    ownershipRenounced: null,
    proxy: {
      detected: null,
      implementationAddress: null,
      adminAddress: null,
      beaconAddress: null,
      minimalProxyTarget: null,
      checks: [],
    },
    pendingOwner: { address: null, functionName: null },
    accessControl: {
      detected: null,
      defaultAdminRole: null,
      roleAdmin: null,
      checks: [],
    },
    taxes: emptyTaxSignals("unable-to-verify"),
    explorer: null,
    holders: null,
    warnings: [],
    errors,
  };
}

function contractStatusFromWarnings(
  warnings: readonly string[],
): TokenChairContractReadStatus {
  return warnings.length > 0 ? "partial" : "success";
}

function hasContractCode(value: Hex | null | undefined): value is Hex {
  return Boolean(value && value !== "0x");
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDecimals(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "bigint" && value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(value);
  }
  return null;
}

function normalizeAddress(value: unknown): Address | null {
  if (typeof value !== "string" || !isAddress(value)) return null;
  return getAddress(value);
}

function normalizeHex32(value: unknown): Hex | null {
  if (typeof value !== "string") return null;
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) return null;
  return value as Hex;
}

function normalizeIntegerString(value: unknown): string | null {
  if (typeof value === "bigint" && value >= 0n) return value.toString();
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value.toString();
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return BigInt(value.trim()).toString();
  }
  return null;
}

function emptyTaxSignals(
  status: TokenChairTaxGetterSignal["status"],
): TokenChairTaxSignals {
  return {
    buy: {
      status,
      valueRaw: null,
      functionName: null,
      checkedFunctions: [...TAX_GETTER_FUNCTIONS.buy],
    },
    sell: {
      status,
      valueRaw: null,
      functionName: null,
      checkedFunctions: [...TAX_GETTER_FUNCTIONS.sell],
    },
  };
}

function taxGetterWarning(
  kind: "buy" | "sell",
  signal: TokenChairTaxGetterSignal,
): string | null {
  if (signal.status === "unable-to-verify") {
    return `Common ${kind} tax/fee getter reads could not be completed.`;
  }
  if (signal.status !== "found" || signal.valueRaw === null) return null;
  if (BigInt(signal.valueRaw) === 0n) return null;
  return `A public ${kind} tax/fee getter returned raw value ${signal.valueRaw}; this is not a trade simulation.`;
}

function addressFromStorageSlot(value: Hex | null | undefined): Address | null {
  if (!value || value === "0x") return null;
  const padded = value.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const address = `0x${padded.slice(-40)}`;
  if (address === ZERO_ADDRESS || !isAddress(address)) return null;
  return getAddress(address);
}

function extractMinimalProxyTarget(code: Hex): Address | null {
  const match = code
    .toLowerCase()
    .match(/363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e903d91602b57fd5bf3/);
  if (!match) return null;
  const address = `0x${match[1]}`;
  return isAddress(address) ? getAddress(address) : null;
}
