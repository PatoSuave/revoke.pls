import { keccak256, toBytes, type Abi, type Address } from "viem";

export const PERMIT2_ADDRESS =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address;

export const PERMIT2_APPROVAL_TOPIC0 = keccak256(
  toBytes("Approval(address,address,address,uint160,uint48)"),
);

export const PERMIT2_PERMIT_TOPIC0 = keccak256(
  toBytes("Permit(address,address,address,uint160,uint48,uint48)"),
);

export const PERMIT2_SOURCE_LABEL = "Permit2 nested allowance";

export const permit2ReadAbi: Abi = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
];

export const permit2RevokeAbi: Abi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
];

export interface Permit2DiscoveredAllowance {
  chainId: number;
  approvalType: "permit2";
  permit2Address: Address;
  ownerAddress: Address;
  tokenAddress: Address;
  spenderAddress: Address;
  sourceEvent: "Approval" | "Permit";
  rawAmount?: bigint;
  expiration?: bigint;
  nonce?: bigint;
  blockNumber?: bigint;
  transactionHash?: `0x${string}`;
  logIndex?: string;
}

export interface Permit2AllowanceRead {
  amount: bigint;
  expiration: bigint;
  nonce: bigint;
}

export interface Permit2AllowanceContext {
  nowUnix?: number;
}

function toUint(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }
  return null;
}

export function parsePermit2AllowanceRead(
  result: unknown,
): Permit2AllowanceRead | null {
  if (Array.isArray(result)) {
    const amount = toUint(result[0]);
    const expiration = toUint(result[1]);
    const nonce = toUint(result[2]);
    if (amount === null || expiration === null || nonce === null) return null;
    return { amount, expiration, nonce };
  }

  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    const amount = toUint(record.amount ?? record[0]);
    const expiration = toUint(record.expiration ?? record[1]);
    const nonce = toUint(record.nonce ?? record[2]);
    if (amount === null || expiration === null || nonce === null) return null;
    return { amount, expiration, nonce };
  }

  return null;
}

export function currentPermit2NowUnix(context?: Permit2AllowanceContext): bigint {
  const now = context?.nowUnix ?? Math.floor(Date.now() / 1000);
  return BigInt(Math.max(0, Math.floor(now)));
}

export function isPermit2AllowanceActive(
  read: Permit2AllowanceRead,
  context?: Permit2AllowanceContext,
): boolean {
  return read.amount > 0n && read.expiration > currentPermit2NowUnix(context);
}

