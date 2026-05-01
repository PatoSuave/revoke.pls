"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPublicClient } from "@wagmi/core";
import { useConfig, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Address } from "viem";

import type { SupportedChainId } from "@/lib/chains";
import { normalizeRevokeError } from "@/lib/errors";
import {
  buildErc20PreflightRead,
  evaluateErc20AllowancePreflight,
  failedErc20Preflight,
  type Erc20PreflightResult,
} from "@/lib/preflight";
import { buildRevokeCall, type RevokeTarget } from "@/lib/revoke";
import { trackEvent } from "@/lib/telemetry";

export type RevokeStatus =
  | "idle"
  | "refreshing"
  | "wallet"
  | "pending"
  | "success"
  | "error"
  | "rejected";

export interface UseRevokeApprovalResult {
  status: RevokeStatus;
  hash?: `0x${string}`;
  errorMessage?: string;
  preflight: Erc20PreflightResult | null;
  /** True while the wallet is open or the tx is confirming on-chain. */
  isBusy: boolean;
  isRefreshingApproval: boolean;
  refreshPreflight: () => Promise<Erc20PreflightResult>;
  revoke: () => Promise<void>;
  reset: () => void;
}

export interface UseRevokeApprovalOptions {
  target: RevokeTarget;
  ownerAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number | null;
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
  ownerAddress,
  tokenSymbol,
  tokenDecimals,
  onSuccess,
}: UseRevokeApprovalOptions): UseRevokeApprovalResult {
  const config = useConfig();
  const write = useWriteContract();
  const [preflight, setPreflight] = useState<Erc20PreflightResult | null>(null);
  const [isRefreshingApproval, setIsRefreshingApproval] = useState(false);
  const wait = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: target.chainId as SupportedChainId,
    query: { enabled: Boolean(write.data) },
  });

  const status: RevokeStatus = useMemo(() => {
    if (isRefreshingApproval) return "refreshing";
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
  }, [
    isRefreshingApproval,
    write.status,
    write.error,
    write.data,
    wait.status,
    wait.data,
  ]);

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

  const refreshPreflight = useCallback(async () => {
    setIsRefreshingApproval(true);
    try {
      const client = getPublicClient(config, {
        chainId: target.chainId as SupportedChainId,
      });
      if (!client) throw new Error(`No public client for chain ${target.chainId}`);
      const raw = await client.readContract(
        buildErc20PreflightRead(ownerAddress, target),
      );
      const next = evaluateErc20AllowancePreflight(raw, {
        tokenSymbol,
        tokenDecimals,
      });
      setPreflight(next);
      return next;
    } catch (error) {
      const next = failedErc20Preflight(error);
      setPreflight(next);
      return next;
    } finally {
      setIsRefreshingApproval(false);
    }
  }, [config, ownerAddress, target, tokenSymbol, tokenDecimals]);

  const revoke = useCallback(async () => {
    notifiedHashRef.current = null;
    const latest = await refreshPreflight();
    if (latest.status !== "active") return;
    trackEvent("revoke_submitted", { kind: "erc20", chainId: target.chainId });
    write.writeContract({
      ...buildRevokeCall(target),
      chainId: target.chainId as SupportedChainId,
    });
  }, [refreshPreflight, target, write]);

  const reset = useCallback(() => {
    notifiedHashRef.current = null;
    setPreflight(null);
    write.reset();
  }, [write]);

  return {
    status,
    hash: write.data,
    errorMessage,
    preflight,
    isBusy:
      status === "refreshing" || status === "wallet" || status === "pending",
    isRefreshingApproval,
    refreshPreflight,
    revoke,
    reset,
  };
}
