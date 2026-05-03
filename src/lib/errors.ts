import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
} from "viem";

import { BSC_GAS_CAP_ERROR } from "@/lib/preflight";

export interface NormalizedError {
  message: string;
  rejected: boolean;
}

/**
 * Turn a wagmi / viem error into a short, user-facing message. Specifically
 * identifies wallet-rejection so the UI can branch to a soft "try again"
 * state instead of a loud failure state.
 */
export function normalizeRevokeError(error: unknown): NormalizedError {
  if (error instanceof BaseError) {
    if (isBscGasCapError(error.shortMessage) || isBscGasCapError(error.message)) {
      return { message: BSC_GAS_CAP_ERROR, rejected: false };
    }

    const rejected = error.walk((e) => e instanceof UserRejectedRequestError);
    if (rejected) {
      return {
        message: "Transaction rejected in wallet.",
        rejected: true,
      };
    }

    const reverted = error.walk(
      (e) => e instanceof ContractFunctionRevertedError,
    );
    if (reverted instanceof ContractFunctionRevertedError) {
      const reason =
        reverted.data?.errorName ??
        reverted.reason ??
        reverted.shortMessage;
      return {
        message: reason
          ? `Transaction reverted: ${reason}`
          : "Transaction reverted on-chain.",
        rejected: false,
      };
    }

    return {
      message: error.shortMessage || error.message,
      rejected: false,
    };
  }

  if (error instanceof Error) {
    if (isBscGasCapError(error.message)) {
      return { message: BSC_GAS_CAP_ERROR, rejected: false };
    }
    return { message: error.message, rejected: false };
  }

  return { message: "Unknown error", rejected: false };
}

function isBscGasCapError(message: string | undefined): boolean {
  const lower = message?.toLowerCase() ?? "";
  return (
    lower.includes("osaka") ||
    lower.includes("mendel") ||
    lower.includes("gas cannot exceed 16777216") ||
    lower.includes("gas cannot exceed 16,777,216")
  );
}
