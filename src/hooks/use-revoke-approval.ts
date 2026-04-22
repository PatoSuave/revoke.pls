"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import type { SupportedChainId } from "@/lib/chains";
import { normalizeRevokeError } from "@/lib/errors";
import { buildRevokeCall, type RevokeTarget } from "@/lib/revoke";
import { trackEvent } from "@/lib/telemetry";

export type RevokeStatus =
  | "idle"
  | "wallet"
  | "pending"
  | "success"
  | "error"
  | "rejected";

export interface UseRevokeApprovalResult {
  status: RevokeStatus;
  hash?: `0x${string}`;
  errorMessage?: string;
  /** True while the wallet is open or the tx is confirming on-chain. */
  isBusy: boolean;
  revoke: () => void;
  reset: () => void;
}

export interface UseRevokeApprovalOptions {
  target: RevokeTarget;
  /** Called exactly once per confirmed (non-reverted) transaction. */
  onSuccess?: (hash: `0x${string}`) => void;
}

/**
 * Per-row revoke state machine.
 *
 * Wraps wagmi's `useWriteContract` + `useWaitForTransactionReceipt` so each
 * approval row owns an isolated transaction lifecycle. Errors are normalized
 * through `normalizeRevokeError` to distinguish wallet rejection from
 * on-chain revert from generic RPC failure.
 *
 * Status is derived from wagmi primitives — we never duplicate transaction
 * state into local React state, which keeps the machine in sync with the
 * underlying mutations even across reconnects.
 */
export function useRevokeApproval({
  target,
  onSuccess,
}: UseRevokeApprovalOptions): UseRevokeApprovalResult {
  const write = useWriteContract();
  const wait = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: target.chainId as SupportedChainId,
    query: { enabled: Boolean(write.data) },
  });

  const status: RevokeStatus = useMemo(() => {
    if (write.status === "pending") return "wallet";
    if (write.status === "error") {
      return normalizeRevokeError(write.error).rejected ? "rejected" : "error";
    }
    if (write.data) {
      if (wait.status === "error") return "error";
      if (wait.status === "success") {
        return wait.data?.status === "reverted" ? "error" : "success";
      }
      return "pending";
    }
    return "idle";
  }, [write.status, write.error, write.data, wait.status, wait.data]);

  const errorMessage = useMemo(() => {
    if (write.status === "error") {
      return normalizeRevokeError(write.error).message;
    }
    if (wait.status === "error") {
      return normalizeRevokeError(wait.error).message;
    }
    if (wait.data?.status === "reverted") {
      return "Transaction reverted on-chain.";
    }
    return undefined;
  }, [write.status, write.error, wait.status, wait.error, wait.data]);

  const notifiedHashRef = useRef<`0x${string}` | null>(null);
  const lastStatusRef = useRef<RevokeStatus>("idle");

  useEffect(() => {
    if (
      status === "success" &&
      write.data &&
      notifiedHashRef.current !== write.data
    ) {
      notifiedHashRef.current = write.data;
      onSuccess?.(write.data);
    }
  }, [status, write.data, onSuccess]);

  useEffect(() => {
    const prev = lastStatusRef.current;
    if (prev === status) return;
    lastStatusRef.current = status;
    if (status === "success") {
      trackEvent("revoke_confirmed", { kind: "erc20", chainId: target.chainId });
    } else if (status === "error") {
      trackEvent(
        "revoke_failed",
        { kind: "erc20", chainId: target.chainId },
        "warn",
      );
    } else if (status === "rejected") {
      trackEvent("revoke_rejected", { kind: "erc20", chainId: target.chainId });
    }
  }, [status, target.chainId]);

  const revoke = useCallback(() => {
    notifiedHashRef.current = null;
    trackEvent("revoke_submitted", { kind: "erc20", chainId: target.chainId });
    write.writeContract({
      ...buildRevokeCall(target),
      chainId: target.chainId as SupportedChainId,
    });
  }, [target, write]);

  const reset = useCallback(() => {
    notifiedHashRef.current = null;
    write.reset();
  }, [write]);

  return {
    status,
    hash: write.data,
    errorMessage,
    isBusy: status === "wallet" || status === "pending",
    revoke,
    reset,
  };
}
