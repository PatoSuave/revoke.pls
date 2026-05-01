"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPublicClient } from "@wagmi/core";
import { useConfig, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Address } from "viem";

import type { SupportedChainId } from "@/lib/chains";
import { normalizeRevokeError } from "@/lib/errors";
import {
  buildErc721TokenRevoke,
  buildSetApprovalForAllRevoke,
} from "@/lib/nft-approvals";
import type { NftApproval } from "@/lib/nft-approvals";
import {
  buildNftPreflightRead,
  evaluateNftApprovalPreflight,
  failedNftPreflight,
  type NftPreflightResult,
} from "@/lib/preflight";
import { trackEvent } from "@/lib/telemetry";

import type { RevokeStatus } from "@/hooks/use-revoke-approval";

export interface UseRevokeNftApprovalResult {
  status: RevokeStatus;
  hash?: `0x${string}`;
  errorMessage?: string;
  preflight: NftPreflightResult | null;
  isBusy: boolean;
  isRefreshingApproval: boolean;
  refreshPreflight: () => Promise<NftPreflightResult>;
  revoke: () => Promise<void>;
  reset: () => void;
}

export interface UseRevokeNftApprovalOptions {
  target: NftApproval;
  ownerAddress: Address;
  onSuccess?: (hash: `0x${string}`) => void;
}

/**
 * Per-row revoke state machine for NFT approvals. Structurally identical to
 * `useRevokeApproval` for ERC-20 but targets the two NFT revoke call shapes:
 *   - `setApprovalForAll(operator, false)` for `kind === "approvalForAll"`
 *   - `approve(address(0), tokenId)` for `kind === "tokenApproval"` (ERC-721)
 *
 * ERC-1155 only exposes the collection-wide `setApprovalForAll` path, so the
 * per-token branch is never taken for 1155 collections.
 */
export function useRevokeNftApproval({
  target,
  ownerAddress,
  onSuccess,
}: UseRevokeNftApprovalOptions): UseRevokeNftApprovalResult {
  const config = useConfig();
  const write = useWriteContract();
  const [preflight, setPreflight] = useState<NftPreflightResult | null>(null);
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

  const telemetryKind =
    target.kind === "approvalForAll" ? "nft-operator" : "nft-token";

  useEffect(() => {
    const prev = lastStatusRef.current;
    if (prev === status) return;
    lastStatusRef.current = status;
    if (status === "success") {
      trackEvent("revoke_confirmed", {
        kind: telemetryKind,
        chainId: target.chainId,
      });
    } else if (status === "error") {
      trackEvent(
        "revoke_failed",
        { kind: telemetryKind, chainId: target.chainId },
        "warn",
      );
    } else if (status === "rejected") {
      trackEvent("revoke_rejected", {
        kind: telemetryKind,
        chainId: target.chainId,
      });
    }
  }, [status, telemetryKind, target.chainId]);

  const refreshPreflight = useCallback(async () => {
    setIsRefreshingApproval(true);
    try {
      const client = getPublicClient(config, {
        chainId: target.chainId as SupportedChainId,
      });
      if (!client) throw new Error(`No public client for chain ${target.chainId}`);
      const raw = await client.readContract(
        buildNftPreflightRead(ownerAddress, target),
      );
      const next = evaluateNftApprovalPreflight(raw, target);
      setPreflight(next);
      return next;
    } catch (error) {
      const next = failedNftPreflight(error, target);
      setPreflight(next);
      return next;
    } finally {
      setIsRefreshingApproval(false);
    }
  }, [config, ownerAddress, target]);

  const revoke = useCallback(async () => {
    notifiedHashRef.current = null;
    const latest = await refreshPreflight();
    if (latest.status !== "active") return;
    trackEvent("revoke_submitted", {
      kind: telemetryKind,
      chainId: target.chainId,
    });
    const call =
      target.kind === "approvalForAll"
        ? buildSetApprovalForAllRevoke({
            collectionAddress: target.collectionAddress,
            operatorAddress: target.operatorAddress,
          })
        : buildErc721TokenRevoke({
            collectionAddress: target.collectionAddress,
            tokenId: target.tokenId!,
          });
    write.writeContract({
      ...call,
      chainId: target.chainId as SupportedChainId,
    });
  }, [refreshPreflight, target, write, telemetryKind]);

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
