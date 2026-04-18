import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
} from "viem";

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
    return { message: error.message, rejected: false };
  }

  return { message: "Unknown error", rejected: false };
}
