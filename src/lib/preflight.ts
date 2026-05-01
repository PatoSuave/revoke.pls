import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { RevokeTarget } from "@/lib/revoke";
import { erc20Abi, formatAllowance, isUnlimitedAllowance } from "@/lib/erc20";
import type { NftApproval } from "@/lib/nft-approvals";
import { nftReadAbi, ZERO_ADDRESS } from "@/lib/nft-approvals";

export type PreflightStatus = "active" | "cleared" | "unverified";

export interface Erc20PreflightContext {
  tokenSymbol: string;
  tokenDecimals: number | null;
}

export interface Erc20PreflightResult {
  kind: "erc20";
  status: PreflightStatus;
  currentAllowance?: bigint;
  currentLabel?: string;
  error?: string;
}

export interface NftPreflightResult {
  kind: "nft-token" | "nft-operator";
  status: PreflightStatus;
  approvedForAll?: boolean;
  currentApprovedAddress?: Address;
  error?: string;
}

export type ApprovalPreflightResult =
  | Erc20PreflightResult
  | NftPreflightResult;

export interface BatchPreflightSummary {
  total: number;
  attempted: number;
  succeeded: number;
  failed: number;
  active: number;
  cleared: number;
  unverified: number;
}

export const EMPTY_BATCH_PREFLIGHT_SUMMARY: BatchPreflightSummary = {
  total: 0,
  attempted: 0,
  succeeded: 0,
  failed: 0,
  active: 0,
  cleared: 0,
  unverified: 0,
};

export function buildErc20PreflightRead(
  ownerAddress: Address,
  target: Pick<RevokeTarget, "tokenAddress" | "spenderAddress">,
) {
  return {
    address: target.tokenAddress,
    abi: erc20Abi,
    functionName: "allowance" as const,
    args: [ownerAddress, target.spenderAddress] as const,
  };
}

export function buildNftPreflightRead(
  ownerAddress: Address,
  target: Pick<
    NftApproval,
    "kind" | "collectionAddress" | "operatorAddress" | "tokenId"
  >,
) {
  if (target.kind === "approvalForAll") {
    return {
      address: target.collectionAddress,
      abi: nftReadAbi,
      functionName: "isApprovedForAll" as const,
      args: [ownerAddress, target.operatorAddress] as const,
    };
  }

  return {
    address: target.collectionAddress,
    abi: nftReadAbi,
    functionName: "getApproved" as const,
    args: [target.tokenId!] as const,
  };
}

export function formatPreflightAllowance(
  raw: bigint,
  context: Erc20PreflightContext,
): string {
  if (isUnlimitedAllowance(raw)) return "Unlimited";
  if (typeof context.tokenDecimals === "number") {
    return `${formatAllowance(raw, context.tokenDecimals)} ${
      context.tokenSymbol
    }`;
  }
  return `Raw allowance: ${raw.toString()} units`;
}

export function evaluateErc20AllowancePreflight(
  result: unknown,
  context: Erc20PreflightContext,
): Erc20PreflightResult {
  if (typeof result !== "bigint") {
    return {
      kind: "erc20",
      status: "unverified",
      error: "Unexpected allowance read result",
    };
  }

  return {
    kind: "erc20",
    status: result === 0n ? "cleared" : "active",
    currentAllowance: result,
    currentLabel: formatPreflightAllowance(result, context),
  };
}

export function failedErc20Preflight(error: unknown): Erc20PreflightResult {
  return {
    kind: "erc20",
    status: "unverified",
    error: safeErrorCategory(error),
  };
}

export function evaluateNftApprovalPreflight(
  result: unknown,
  target: Pick<NftApproval, "kind" | "operatorAddress">,
): NftPreflightResult {
  if (target.kind === "approvalForAll") {
    if (typeof result !== "boolean") {
      return {
        kind: "nft-operator",
        status: "unverified",
        error: "Unexpected operator approval read result",
      };
    }

    return {
      kind: "nft-operator",
      status: result ? "active" : "cleared",
      approvedForAll: result,
    };
  }

  if (typeof result !== "string") {
    return {
      kind: "nft-token",
      status: "unverified",
      error: "Unexpected token approval read result",
    };
  }

  const approvedAddress = result as Address;
  const approvedLower = approvedAddress.toLowerCase();
  const operatorLower = target.operatorAddress.toLowerCase();

  return {
    kind: "nft-token",
    status:
      approvedLower !== ZERO_ADDRESS && approvedLower === operatorLower
        ? "active"
        : "cleared",
    currentApprovedAddress: approvedAddress,
  };
}

export function failedNftPreflight(
  error: unknown,
  target: Pick<NftApproval, "kind">,
): NftPreflightResult {
  return {
    kind: target.kind === "approvalForAll" ? "nft-operator" : "nft-token",
    status: "unverified",
    error: safeErrorCategory(error),
  };
}

export function summarizeBatchPreflight(
  results: readonly Erc20PreflightResult[],
): BatchPreflightSummary {
  let active = 0;
  let cleared = 0;
  let unverified = 0;

  for (const result of results) {
    if (result.status === "active") active += 1;
    else if (result.status === "cleared") cleared += 1;
    else unverified += 1;
  }

  return {
    total: results.length,
    attempted: results.length,
    succeeded: active + cleared,
    failed: unverified,
    active,
    cleared,
    unverified,
  };
}

export function batchPreflightContext(
  approval: Pick<Approval, "tokenSymbol" | "tokenDecimals">,
): Erc20PreflightContext {
  return {
    tokenSymbol: approval.tokenSymbol,
    tokenDecimals: approval.tokenDecimals,
  };
}

function safeErrorCategory(error: unknown): string {
  if (!error || typeof error !== "object") return "Unknown read error";
  const name =
    "name" in error && typeof error.name === "string"
      ? error.name.trim()
      : "";
  if (name) return name.slice(0, 80);
  const code = "code" in error ? error.code : undefined;
  if (typeof code === "string" || typeof code === "number") {
    return `code ${String(code).slice(0, 48)}`;
  }
  return "Read error";
}
