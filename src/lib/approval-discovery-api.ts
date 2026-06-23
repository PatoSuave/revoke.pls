import type { Address } from "viem";

import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BSC_CHAIN_ID,
  CELO_CHAIN_ID,
  GNOSIS_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  SONIC_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
} from "@/lib/chains";
import type {
  DiscoveredPair,
  DiscoveryResult,
  DiscoverySourceMeta,
  Erc20ApprovalParseDiagnostics,
  NftDiscoveredApproval,
  NftDiscoveryResult,
  Permit2DiscoveryResult,
} from "@/lib/discovery";
import type { Permit2DiscoveredAllowance } from "@/lib/permit2";
import { isDesktopBuild } from "@/lib/platform";

type SerializedBigInt = string;

export type SerializableDiscoveredPair = Omit<
  DiscoveredPair,
  "rawApprovalValue" | "blockNumber"
> & {
  rawApprovalValue?: SerializedBigInt;
  blockNumber?: SerializedBigInt;
};

export type SerializablePermit2DiscoveredAllowance = Omit<
  Permit2DiscoveredAllowance,
  "rawAmount" | "expiration" | "nonce" | "blockNumber"
> & {
  rawAmount?: SerializedBigInt;
  expiration?: SerializedBigInt;
  nonce?: SerializedBigInt;
  blockNumber?: SerializedBigInt;
};

export type SerializableNftDiscoveredApproval = Omit<
  NftDiscoveredApproval,
  "tokenId" | "blockNumber"
> & {
  tokenId?: SerializedBigInt;
  blockNumber?: SerializedBigInt;
};

export interface SerializableDiscoveryResult {
  pairs: SerializableDiscoveredPair[];
  source: DiscoverySourceMeta;
  erc20Parse: Omit<Erc20ApprovalParseDiagnostics, "samplePairs"> & {
    samplePairs: SerializableDiscoveredPair[];
  };
  rawCount: number;
  truncated: boolean;
  windows: number;
  requests: number;
}

export interface SerializablePermit2DiscoveryResult {
  allowances: SerializablePermit2DiscoveredAllowance[];
  source: DiscoverySourceMeta;
  rawCount: number;
  truncated: boolean;
  windows: number;
  requests: number;
}

export interface SerializableNftDiscoveryResult {
  approvals: SerializableNftDiscoveredApproval[];
  source: DiscoverySourceMeta;
  rawCount: number;
  truncated: boolean;
  windows: number;
  requests: number;
}

export interface ServerApprovalDiscoveryResponse {
  ok: boolean;
  status: "complete" | "config-missing" | "bad-request" | "upstream-failure";
  chainId: ServerApprovalDiscoveryChainId;
  erc20: SerializableDiscoveryResult;
  permit2: SerializablePermit2DiscoveryResult;
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}

export interface ServerNftDiscoveryResponse {
  ok: boolean;
  status: "complete" | "config-missing" | "bad-request" | "upstream-failure";
  chainId: ServerApprovalDiscoveryChainId;
  nft: SerializableNftDiscoveryResult;
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}

export type ServerApprovalDiscoveryChainId =
  | typeof BSC_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID
  | typeof SONIC_CHAIN_ID
  | typeof AVALANCHE_CHAIN_ID
  | typeof MANTLE_CHAIN_ID
  | typeof LINEA_CHAIN_ID
  | typeof BLAST_CHAIN_ID
  | typeof BERACHAIN_CHAIN_ID
  | typeof CELO_CHAIN_ID
  | typeof GNOSIS_CHAIN_ID
  | typeof UNICHAIN_CHAIN_ID
  | typeof WORLDCHAIN_CHAIN_ID;

export function usesServerApprovalDiscovery(
  chainId: number | undefined,
): chainId is ServerApprovalDiscoveryChainId {
  if (isDesktopBuild) return false;
  return (
    chainId === BSC_CHAIN_ID ||
    chainId === BASE_CHAIN_ID ||
    chainId === POLYGON_CHAIN_ID ||
    chainId === SONIC_CHAIN_ID ||
    chainId === AVALANCHE_CHAIN_ID ||
    chainId === MANTLE_CHAIN_ID ||
    chainId === LINEA_CHAIN_ID ||
    chainId === BLAST_CHAIN_ID ||
    chainId === BERACHAIN_CHAIN_ID ||
    chainId === CELO_CHAIN_ID ||
    chainId === GNOSIS_CHAIN_ID ||
    chainId === UNICHAIN_CHAIN_ID ||
    chainId === WORLDCHAIN_CHAIN_ID
  );
}

export async function fetchServerApprovalDiscovery({
  owner,
  chainId,
  signal,
}: {
  owner: Address;
  chainId: ServerApprovalDiscoveryChainId;
  signal?: AbortSignal;
}): Promise<ServerApprovalDiscoveryResponse> {
  const url = new URL("/api/discovery/approvals", window.location.origin);
  url.searchParams.set("chainId", chainId.toString());
  url.searchParams.set("owner", owner);
  url.searchParams.set("scope", "erc20");

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });

  return readJsonResponse<ServerApprovalDiscoveryResponse>(
    response,
    "approval discovery",
  );
}

export async function fetchServerNftDiscovery({
  owner,
  chainId,
  signal,
}: {
  owner: Address;
  chainId: ServerApprovalDiscoveryChainId;
  signal?: AbortSignal;
}): Promise<ServerNftDiscoveryResponse> {
  const url = new URL("/api/discovery/approvals", window.location.origin);
  url.searchParams.set("chainId", chainId.toString());
  url.searchParams.set("owner", owner);
  url.searchParams.set("scope", "nft");

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });

  return readJsonResponse<ServerNftDiscoveryResponse>(
    response,
    "NFT approval discovery",
  );
}

export function serializeDiscoveryResult(
  result: DiscoveryResult,
): SerializableDiscoveryResult {
  return {
    ...result,
    pairs: result.pairs.map(serializeDiscoveredPair),
    erc20Parse: {
      ...result.erc20Parse,
      samplePairs: result.erc20Parse.samplePairs.map(serializeDiscoveredPair),
    },
  };
}

export function serializePermit2DiscoveryResult(
  result: Permit2DiscoveryResult,
): SerializablePermit2DiscoveryResult {
  return {
    ...result,
    allowances: result.allowances.map(serializePermit2Allowance),
  };
}

export function serializeNftDiscoveryResult(
  result: NftDiscoveryResult,
): SerializableNftDiscoveryResult {
  return {
    ...result,
    approvals: result.approvals.map(serializeNftApproval),
  };
}

export function hydrateDiscoveryResult(
  result: SerializableDiscoveryResult,
): DiscoveryResult {
  return {
    ...result,
    pairs: result.pairs.map(hydrateDiscoveredPair),
    erc20Parse: {
      ...result.erc20Parse,
      samplePairs: result.erc20Parse.samplePairs.map(hydrateDiscoveredPair),
    },
  };
}

export function hydratePermit2DiscoveryResult(
  result: SerializablePermit2DiscoveryResult,
): Permit2DiscoveryResult {
  return {
    ...result,
    allowances: result.allowances.map(hydratePermit2Allowance),
  };
}

export function hydrateNftDiscoveryResult(
  result: SerializableNftDiscoveryResult,
): NftDiscoveryResult {
  return {
    ...result,
    approvals: result.approvals.map(hydrateNftApproval),
  };
}

function serializeDiscoveredPair(
  pair: DiscoveredPair,
): SerializableDiscoveredPair {
  const { rawApprovalValue, blockNumber, ...serializable } = pair;
  return {
    ...serializable,
    ...(rawApprovalValue !== undefined
      ? { rawApprovalValue: rawApprovalValue.toString() }
      : {}),
    ...(blockNumber !== undefined
      ? { blockNumber: blockNumber.toString() }
      : {}),
  };
}

function serializePermit2Allowance(
  allowance: Permit2DiscoveredAllowance,
): SerializablePermit2DiscoveredAllowance {
  const { rawAmount, expiration, nonce, blockNumber, ...serializable } =
    allowance;
  return {
    ...serializable,
    ...(rawAmount !== undefined
      ? { rawAmount: rawAmount.toString() }
      : {}),
    ...(expiration !== undefined
      ? { expiration: expiration.toString() }
      : {}),
    ...(nonce !== undefined
      ? { nonce: nonce.toString() }
      : {}),
    ...(blockNumber !== undefined
      ? { blockNumber: blockNumber.toString() }
      : {}),
  };
}

function serializeNftApproval(
  approval: NftDiscoveredApproval,
): SerializableNftDiscoveredApproval {
  const { tokenId, blockNumber, ...serializable } = approval;
  return {
    ...serializable,
    ...(tokenId !== undefined ? { tokenId: tokenId.toString() } : {}),
    ...(blockNumber !== undefined
      ? { blockNumber: blockNumber.toString() }
      : {}),
  };
}

function hydrateDiscoveredPair(pair: SerializableDiscoveredPair): DiscoveredPair {
  const { rawApprovalValue, blockNumber, ...hydrated } = pair;
  return {
    ...hydrated,
    ...(rawApprovalValue !== undefined
      ? { rawApprovalValue: BigInt(rawApprovalValue) }
      : {}),
    ...(blockNumber !== undefined
      ? { blockNumber: BigInt(blockNumber) }
      : {}),
  };
}

function hydratePermit2Allowance(
  allowance: SerializablePermit2DiscoveredAllowance,
): Permit2DiscoveredAllowance {
  const { rawAmount, expiration, nonce, blockNumber, ...hydrated } = allowance;
  return {
    ...hydrated,
    ...(rawAmount !== undefined
      ? { rawAmount: BigInt(rawAmount) }
      : {}),
    ...(expiration !== undefined
      ? { expiration: BigInt(expiration) }
      : {}),
    ...(nonce !== undefined
      ? { nonce: BigInt(nonce) }
      : {}),
    ...(blockNumber !== undefined
      ? { blockNumber: BigInt(blockNumber) }
      : {}),
  };
}

function hydrateNftApproval(
  approval: SerializableNftDiscoveredApproval,
): NftDiscoveredApproval {
  const { tokenId, blockNumber, ...hydrated } = approval;
  return {
    ...hydrated,
    ...(tokenId !== undefined ? { tokenId: BigInt(tokenId) } : {}),
    ...(blockNumber !== undefined
      ? { blockNumber: BigInt(blockNumber) }
      : {}),
  };
}

async function readJsonResponse<T>(
  response: Response,
  label: string,
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${label} API returned ${response.status} without JSON.`);
  }

  const body = (await response.json()) as T & {
    ok?: boolean;
    errors?: readonly string[];
  };
  if (body.ok === false) {
    throw new Error(body.errors?.[0] ?? `${label} API returned an error.`);
  }
  return body as T;
}
