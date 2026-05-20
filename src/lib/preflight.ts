import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { RevokeTarget } from "@/lib/revoke";
import { erc20Abi, formatAllowance, isUnlimitedAllowance } from "@/lib/erc20";
import type { NftApproval } from "@/lib/nft-approvals";
import { nftReadAbi, ZERO_ADDRESS } from "@/lib/nft-approvals";
import {
  PERMIT2_ADDRESS,
  isPermit2AllowanceActive,
  parsePermit2AllowanceRead,
  permit2ReadAbi,
} from "@/lib/permit2";
import {
  getGasWarningLevel,
  getNativeGasSymbol,
  getRevokeGasThresholds,
  isGasWarningLevel,
  type GasWarningLevel,
  type RevokeGasCallKind,
} from "@/lib/revoke-gas";

export type PreflightStatus =
  | "active"
  | "highGasWarning"
  | "cleared"
  | "unverified";

export const BSC_GAS_CAP_TITLE = "BSC gas limit exceeded";
export const BSC_GAS_CAP_BODY =
  "BNB Smart Chain rejects individual transactions above 16,777,216 gas after the Osaka/Mendel upgrade. This revoke estimated above that cap, so it was blocked before wallet submission.";
export const BSC_GAS_CAP_HELPER =
  "Try again with a different RPC or verify directly on BscScan. If the token requires more gas than the chain allows, it may not be revokable through a standard approve(spender, 0) transaction.";
export const BSC_GAS_CAP_ERROR = `${BSC_GAS_CAP_TITLE}. ${BSC_GAS_CAP_BODY} ${BSC_GAS_CAP_HELPER}`;
export const HIGH_GAS_WARNING_TITLE = "Unusually high gas estimate";
export const HIGH_GAS_WARNING_BODY =
  "This revoke estimates above 1,000,000 gas on BSC. That is unusually high for a standard token approval revoke. Rabby or another wallet may warn that this could be risky. Only continue if you recognize this token and spender.";
export const HIGH_GAS_WARNING_HELPER =
  "This does not mean the transaction is automatically malicious, but it is abnormal for a normal BEP-20 revoke. You can cancel and verify directly on BscScan.";

export interface Erc20PreflightContext {
  tokenSymbol: string;
  tokenDecimals: number | null;
  approvalKind?: "erc20" | "permit2";
  nowUnix?: number;
}

export interface Erc20PreflightResult {
  kind: "erc20";
  status: PreflightStatus;
  currentAllowance?: bigint;
  currentLabel?: string;
  error?: string;
  chainId?: number;
  estimatedGas?: bigint;
  estimatedFeeWei?: bigint;
  gasPriceWei?: bigint;
  nativeSymbol?: string;
  maxTransactionGas?: bigint;
  highGasWarningThreshold?: bigint;
  severeGasWarningThreshold?: bigint;
  extremeGasWarningThreshold?: bigint;
  gasCapExceeded?: boolean;
  highGasWarning?: boolean;
  gasWarningLevel?: GasWarningLevel;
  gasEstimateAttempted?: boolean;
  gasEstimateSucceeded?: boolean;
  gasEstimateError?: string;
}

export interface NftPreflightResult {
  kind: "nft-token" | "nft-operator";
  status: PreflightStatus;
  approvedForAll?: boolean;
  currentApprovedAddress?: Address;
  error?: string;
  chainId?: number;
  estimatedGas?: bigint;
  estimatedFeeWei?: bigint;
  gasPriceWei?: bigint;
  nativeSymbol?: string;
  maxTransactionGas?: bigint;
  highGasWarningThreshold?: bigint;
  severeGasWarningThreshold?: bigint;
  extremeGasWarningThreshold?: bigint;
  gasCapExceeded?: boolean;
  highGasWarning?: boolean;
  gasWarningLevel?: GasWarningLevel;
  gasEstimateAttempted?: boolean;
  gasEstimateSucceeded?: boolean;
  gasEstimateError?: string;
}

export type ApprovalPreflightResult =
  | Erc20PreflightResult
  | NftPreflightResult;

export type SafeRevokeGasResult<T extends ApprovalPreflightResult> =
  | { ok: true; gas?: bigint }
  | { ok: false; preflight: T };

export interface BatchPreflightSummary {
  total: number;
  attempted: number;
  succeeded: number;
  failed: number;
  active: number;
  highGasWarning: number;
  cleared: number;
  unverified: number;
}

export const EMPTY_BATCH_PREFLIGHT_SUMMARY: BatchPreflightSummary = {
  total: 0,
  attempted: 0,
  succeeded: 0,
  failed: 0,
  active: 0,
  highGasWarning: 0,
  cleared: 0,
  unverified: 0,
};

export function buildErc20PreflightRead(
  ownerAddress: Address,
  target: Pick<
    RevokeTarget,
    "tokenAddress" | "spenderAddress" | "approvalKind" | "approvalContractAddress"
  >,
) {
  if (target.approvalKind === "permit2") {
    return {
      address: target.approvalContractAddress ?? PERMIT2_ADDRESS,
      abi: permit2ReadAbi,
      functionName: "allowance" as const,
      args: [ownerAddress, target.tokenAddress, target.spenderAddress] as const,
    };
  }

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
  if (context.approvalKind === "permit2") {
    const permit2Read = parsePermit2AllowanceRead(result);
    if (!permit2Read) {
      return {
        kind: "erc20",
        status: "unverified",
        error: "Unexpected Permit2 allowance read result",
      };
    }

    const active = isPermit2AllowanceActive(permit2Read, {
      nowUnix: context.nowUnix,
    });

    return {
      kind: "erc20",
      status: active ? "active" : "cleared",
      currentAllowance: permit2Read.amount,
      currentLabel: formatPreflightAllowance(permit2Read.amount, context),
    };
  }

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
  const gasCapExceeded = isBscGasCapErrorMessage(error);
  return {
    kind: "erc20",
    status: "unverified",
    error: gasCapExceeded ? BSC_GAS_CAP_ERROR : safeErrorCategory(error),
    gasCapExceeded,
  };
}

export function blockedErc20Preflight(error: string): Erc20PreflightResult {
  return {
    kind: "erc20",
    status: "unverified",
    error,
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
  const gasCapExceeded = isBscGasCapErrorMessage(error);
  return {
    kind: target.kind === "approvalForAll" ? "nft-operator" : "nft-token",
    status: "unverified",
    error: gasCapExceeded ? BSC_GAS_CAP_ERROR : safeErrorCategory(error),
    gasCapExceeded,
  };
}

export function blockedNftPreflight(
  error: string,
  target: Pick<NftApproval, "kind">,
): NftPreflightResult {
  return {
    kind: target.kind === "approvalForAll" ? "nft-operator" : "nft-token",
    status: "unverified",
    error,
  };
}

export function applyGasEstimateToPreflight<T extends ApprovalPreflightResult>(
  result: T,
  estimatedGas: bigint,
  maxTransactionGas: bigint | undefined,
  highGasWarningThreshold?: bigint,
  options: {
    chainId?: number;
    callKind?: RevokeGasCallKind;
    gasPriceWei?: bigint;
    nativeSymbol?: string;
  } = {},
): T {
  const callKind = options.callKind ?? result.kind;
  const thresholds = getRevokeGasThresholds({
    chainId: options.chainId,
    kind: callKind,
    highGasWarningThreshold,
  });
  const gasWarningLevel = getGasWarningLevel({
    chainId: options.chainId,
    kind: callKind,
    estimatedGas,
    highGasWarningThreshold,
  });
  const gasFields = {
    chainId: options.chainId,
    estimatedGas,
    estimatedFeeWei:
      options.gasPriceWei !== undefined
        ? estimatedGas * options.gasPriceWei
        : undefined,
    gasPriceWei: options.gasPriceWei,
    nativeSymbol: getNativeGasSymbol({
      chainId: options.chainId,
      fallback: options.nativeSymbol,
    }),
    maxTransactionGas,
    highGasWarningThreshold: thresholds.high,
    severeGasWarningThreshold: thresholds.severe,
    extremeGasWarningThreshold: thresholds.extreme,
    gasWarningLevel,
    gasEstimateAttempted: true,
    gasEstimateSucceeded: true,
  };

  if (maxTransactionGas && estimatedGas > maxTransactionGas) {
    return blockGasCapPreflight(result, gasFields, maxTransactionGas);
  }

  if (isGasWarningLevel(gasWarningLevel)) {
    return {
      ...result,
      ...gasFields,
      status: "highGasWarning",
      gasCapExceeded: false,
      highGasWarning: true,
    };
  }

  return {
    ...result,
    ...gasFields,
    gasCapExceeded: false,
    highGasWarning: false,
  };
}

export function blockGasEstimateFailure<T extends ApprovalPreflightResult>(
  result: T,
  error: unknown,
  options: {
    chainId?: number;
    callKind?: RevokeGasCallKind;
    nativeSymbol?: string;
  } = {},
): T {
  const gasCapExceeded = isBscGasCapErrorMessage(error);
  const safeError = safeErrorCategory(error);
  return {
    ...result,
    chainId: options.chainId,
    status: "unverified",
    error: gasCapExceeded
      ? BSC_GAS_CAP_ERROR
      : `Gas estimate failed: ${safeError}`,
    nativeSymbol: getNativeGasSymbol({
      chainId: options.chainId,
      fallback: options.nativeSymbol,
    }),
    gasCapExceeded,
    gasWarningLevel: "unavailable",
    gasEstimateAttempted: true,
    gasEstimateSucceeded: false,
    gasEstimateError: safeError,
  };
}

export function safeGasForRevokeRequest<T extends ApprovalPreflightResult>(
  result: T,
  maxTransactionGas: bigint | undefined,
  allowHighGasWarning = false,
): SafeRevokeGasResult<T> {
  if (result.gasCapExceeded) {
    return { ok: false, preflight: result };
  }

  if (result.status === "highGasWarning" && !allowHighGasWarning) {
    return { ok: false, preflight: result };
  }

  if (result.status !== "active" && result.status !== "highGasWarning") {
    return { ok: false, preflight: result };
  }

  if (maxTransactionGas && (!result.estimatedGas || result.estimatedGas > maxTransactionGas)) {
    return {
      ok: false,
      preflight: blockGasCapPreflight(
        result,
        {
          chainId: result.chainId,
          estimatedGas: result.estimatedGas,
          estimatedFeeWei: result.estimatedFeeWei,
          gasPriceWei: result.gasPriceWei,
          nativeSymbol: result.nativeSymbol,
          maxTransactionGas: result.maxTransactionGas,
          highGasWarningThreshold: result.highGasWarningThreshold,
          severeGasWarningThreshold: result.severeGasWarningThreshold,
          extremeGasWarningThreshold: result.extremeGasWarningThreshold,
          gasWarningLevel: result.gasWarningLevel,
          gasEstimateAttempted: result.gasEstimateAttempted,
          gasEstimateSucceeded: result.gasEstimateSucceeded,
        },
        maxTransactionGas,
      ),
    };
  }

  if (!maxTransactionGas) {
    return { ok: true, gas: result.estimatedGas };
  }

  return { ok: true, gas: result.estimatedGas };
}

export function isBscGasCapErrorMessage(error: unknown): boolean {
  const lower = collectErrorText(error).toLowerCase();
  return (
    lower.includes("osaka") ||
    lower.includes("mendel") ||
    lower.includes("transaction gas cannot exceed 16777216") ||
    lower.includes("transaction gas cannot exceed 16,777,216") ||
    lower.includes("gas cannot exceed 16777216") ||
    lower.includes("gas cannot exceed 16,777,216") ||
    lower.includes("exceeds maximum transaction gas")
  );
}

export function summarizeBatchPreflight(
  results: readonly Erc20PreflightResult[],
): BatchPreflightSummary {
  let active = 0;
  let highGasWarning = 0;
  let cleared = 0;
  let unverified = 0;

  for (const result of results) {
    if (result.status === "active") active += 1;
    else if (result.status === "highGasWarning") highGasWarning += 1;
    else if (result.status === "cleared") cleared += 1;
    else unverified += 1;
  }

  return {
    total: results.length,
    attempted: results.length,
    succeeded: active + highGasWarning + cleared,
    failed: unverified,
    active,
    highGasWarning,
    cleared,
    unverified,
  };
}

export function batchPreflightContext(
  approval: Pick<Approval, "tokenSymbol" | "tokenDecimals" | "approvalKind">,
): Erc20PreflightContext {
  return {
    tokenSymbol: approval.tokenSymbol,
    tokenDecimals: approval.tokenDecimals,
    approvalKind: approval.approvalKind,
  };
}

function safeErrorCategory(error: unknown): string {
  if (isBscGasCapErrorMessage(error)) return BSC_GAS_CAP_ERROR;
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

function blockGasCapPreflight<T extends ApprovalPreflightResult>(
  result: T,
  gasFields: Pick<
    ApprovalPreflightResult,
    | "chainId"
    | "estimatedGas"
    | "estimatedFeeWei"
    | "gasPriceWei"
    | "nativeSymbol"
    | "maxTransactionGas"
    | "highGasWarningThreshold"
    | "severeGasWarningThreshold"
    | "extremeGasWarningThreshold"
    | "gasWarningLevel"
    | "gasEstimateAttempted"
    | "gasEstimateSucceeded"
  >,
  maxTransactionGas: bigint,
): T {
  return {
    ...result,
    ...gasFields,
    status: "unverified",
    error: BSC_GAS_CAP_ERROR,
    maxTransactionGas,
    gasCapExceeded: true,
  };
}

function collectErrorText(error: unknown, depth = 0): string {
  if (depth > 4 || error === null || error === undefined) return "";
  if (typeof error === "string") return error;
  if (typeof error === "number" || typeof error === "bigint") {
    return error.toString();
  }
  if (typeof error !== "object") return "";

  const parts: string[] = [];
  const record = error as Record<string, unknown>;
  for (const key of ["name", "message", "shortMessage", "details", "code"]) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      parts.push(String(value));
    }
  }
  parts.push(collectErrorText(record.cause, depth + 1));

  return parts.filter(Boolean).join(" ");
}
