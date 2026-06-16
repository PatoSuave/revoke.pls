"use client";

import { getPublicClient } from "@wagmi/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import { getChainConfig, type SupportedChainId } from "@/lib/chains";
import { normalizeRevokeError } from "@/lib/errors";
import {
  applyGasEstimateToPreflight,
  batchPreflightContext,
  blockedErc20Preflight,
  buildErc20PreflightRead,
  EMPTY_BATCH_PREFLIGHT_SUMMARY,
  evaluateErc20AllowancePreflight,
  failedErc20Preflight,
  safeGasForRevokeRequest,
  summarizeBatchPreflight,
  type BatchPreflightSummary,
  type Erc20PreflightResult,
} from "@/lib/preflight";
import { verifyErc20PostRevokeCleared } from "@/lib/post-revoke-verification";
import { buildRevokeCall, getWalletRevokeBlockReason } from "@/lib/revoke";
import { trackEvent } from "@/lib/telemetry";

export type BatchItemStatus =
  | "queued"
  | "refreshing"
  | "wallet"
  | "submitted"
  | "verifying"
  | "success"
  | "failed"
  | "rejected"
  | "skipped"
  | "cleared"
  | "review"
  | "unverified";

export interface BatchItemResult {
  status: BatchItemStatus;
  hash?: `0x${string}`;
  error?: string;
  preflight?: Erc20PreflightResult;
}

export type BatchState =
  | "idle"
  | "refreshing"
  | "confirming"
  | "running"
  | "stopping"
  | "complete";

export interface BatchCounts {
  total: number;
  success: number;
  failed: number;
  rejected: number;
  skipped: number;
  cleared: number;
  highGasWarning: number;
  unverified: number;
  ready: number;
  done: number;
}

export interface UseBatchRevokeResult {
  state: BatchState;
  /** Snapshot of items taken when the batch entered `confirming`. */
  items: readonly Approval[];
  /** Key of the item currently being processed, if any. */
  currentKey: string | null;
  results: Readonly<Record<string, BatchItemResult>>;
  counts: BatchCounts;
  preflightSummary: BatchPreflightSummary;
  blockedReason: string | null;
  /** Move from idle → confirming with a snapshot of approvals to revoke. */
  beginConfirm: (items: readonly Approval[]) => void;
  /** Cancel from the confirmation step without submitting anything. */
  cancelConfirm: () => void;
  /** Start the sequential revoke loop. Resolves when the loop ends. */
  start: () => Promise<void>;
  /** Request a stop. Honored between transactions — never mid-submission. */
  stop: () => void;
  /** Dismiss the `complete` summary and return to `idle`. */
  close: () => void;
}

/**
 * Sequential batch revoke coordinator.
 *
 * Design constraints (see milestone spec):
 *  - one `approve(spender, 0)` at a time
 *  - never parallel submission; never on-chain multicall
 *  - stop requests are cooperative and only take effect *between* txs
 *  - a wallet rejection implicitly stops the batch (strong user signal),
 *    remaining items are marked `skipped`
 *
 * The loop is driven by `start()` — a plain async function that awaits each
 * `writeContractAsync` + `waitForTransactionReceipt` before moving on. React
 * state mirrors the loop's progress for the UI.
 */
export function useBatchRevoke({
  ownerAddress,
  onComplete,
}: {
  ownerAddress: Address;
  onComplete?: () => void;
}): UseBatchRevokeResult {
  const [state, setState] = useState<BatchState>("idle");
  const [items, setItems] = useState<readonly Approval[]>([]);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, BatchItemResult>>({});
  const [preflightSummary, setPreflightSummary] =
    useState<BatchPreflightSummary>(EMPTY_BATCH_PREFLIGHT_SUMMARY);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const config = useConfig();
  const { address: connectedAddress, chainId: walletChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const stopRef = useRef(false);
  const preflightRunRef = useRef(0);
  const walletStateRef = useRef({ connectedAddress, walletChainId });

  useEffect(() => {
    walletStateRef.current = { connectedAddress, walletChainId };
  }, [connectedAddress, walletChainId]);

  const patch = useCallback((key: string, value: BatchItemResult) => {
    setResults((prev) => ({ ...prev, [key]: value }));
  }, []);

  const walletRevokeBlockReason = useCallback(
    (targetChainId: number) => {
      const current = walletStateRef.current;
      return getWalletRevokeBlockReason({
        connectedAddress: current.connectedAddress,
        ownerAddress,
        walletChainId: current.walletChainId,
        targetChainId,
      });
    },
    [ownerAddress],
  );

  const beginConfirm = useCallback((next: readonly Approval[]) => {
    if (next.length === 0) return;
    const chainIds = new Set(next.map((item) => item.chainId));
    if (chainIds.size > 1) {
      const initial: Record<string, BatchItemResult> = {};
      for (const a of next) {
        initial[a.key] = {
          status: "unverified",
          error:
            "Selected approvals span multiple chains. Clear the selection and batch one chain at a time.",
        };
      }
      setItems(next);
      setResults(initial);
      setCurrentKey(null);
      setPreflightSummary({
        ...EMPTY_BATCH_PREFLIGHT_SUMMARY,
        total: next.length,
        attempted: next.length,
        failed: next.length,
        unverified: next.length,
      });
      setBlockedReason(
        "Selected approvals span multiple chains. Batch revoke one chain at a time.",
      );
      stopRef.current = false;
      setState("confirming");
      return;
    }

    const walletBlockReason = walletRevokeBlockReason(next[0]!.chainId);
    if (walletBlockReason) {
      const initial: Record<string, BatchItemResult> = {};
      for (const a of next) {
        initial[a.key] = {
          status: "unverified",
          error: walletBlockReason,
          preflight: blockedErc20Preflight(walletBlockReason),
        };
      }
      setItems(next);
      setResults(initial);
      setCurrentKey(null);
      setPreflightSummary({
        ...EMPTY_BATCH_PREFLIGHT_SUMMARY,
        total: next.length,
        attempted: next.length,
        failed: next.length,
        unverified: next.length,
      });
      setBlockedReason(walletBlockReason);
      stopRef.current = false;
      setState("confirming");
      return;
    }

    const runId = preflightRunRef.current + 1;
    preflightRunRef.current = runId;
    const initial: Record<string, BatchItemResult> = {};
    for (const a of next) initial[a.key] = { status: "refreshing" };
    setItems(next);
    setResults(initial);
    setCurrentKey(null);
    setPreflightSummary({
      ...EMPTY_BATCH_PREFLIGHT_SUMMARY,
      total: next.length,
      attempted: next.length,
    });
    setBlockedReason(null);
    stopRef.current = false;
    setState("refreshing");

    void (async () => {
      const reads = await Promise.all(
        next.map(async (item) => {
          const blockReason = walletRevokeBlockReason(item.chainId);
          return [
            item.key,
            blockReason
              ? blockedErc20Preflight(blockReason)
              : await refreshErc20PreflightForItem(
                  config,
                  ownerAddress,
                  item,
                ),
          ] as const;
        }),
      );
      if (preflightRunRef.current !== runId) return;

      const nextResults: Record<string, BatchItemResult> = {};
      const preflightResults: Erc20PreflightResult[] = [];
      for (const [key, preflight] of reads) {
        preflightResults.push(preflight);
        nextResults[key] = resultFromPreflight(preflight);
      }
      setResults(nextResults);
      setPreflightSummary(summarizeBatchPreflight(preflightResults));
      setState("confirming");
    })();
  }, [config, ownerAddress, walletRevokeBlockReason]);

  const resetAll = useCallback(() => {
    preflightRunRef.current += 1;
    setItems([]);
    setResults({});
    setCurrentKey(null);
    setPreflightSummary(EMPTY_BATCH_PREFLIGHT_SUMMARY);
    setBlockedReason(null);
    stopRef.current = false;
    setState("idle");
  }, []);

  const cancelConfirm = useCallback(() => {
    resetAll();
  }, [resetAll]);

  const close = useCallback(() => {
    resetAll();
  }, [resetAll]);

  const stop = useCallback(() => {
    const wasRunning = stopRef.current === false;
    stopRef.current = true;
    const chainId = items[0]?.chainId;
    setState((s) => {
      if (s === "running") {
        if (wasRunning) trackEvent("batch_stopped", { reason: "user", chainId });
        return "stopping";
      }
      return s;
    });
  }, [items]);

  const start = useCallback(async () => {
    stopRef.current = false;
    setState("running");
    const batchChainId = items[0]?.chainId;
    trackEvent("batch_started", { size: items.length, chainId: batchChainId });

    let successCount = 0;
    let failedCount = 0;
    let rejectedCount = 0;
    let skippedCount = 0;
    let unverifiedCount = 0;

    for (const item of items) {
      const currentResult = results[item.key];
      if (
        currentResult?.status === "cleared" ||
        currentResult?.status === "review" ||
        currentResult?.status === "unverified"
      ) {
        continue;
      }

      if (stopRef.current) {
        patch(item.key, { status: "skipped" });
        skippedCount += 1;
        continue;
      }

      setCurrentKey(item.key);
      patch(item.key, { status: "refreshing" });
      const preflightBlockReason = walletRevokeBlockReason(item.chainId);
      if (preflightBlockReason) {
        patch(item.key, {
          status: "unverified",
          error: preflightBlockReason,
          preflight: blockedErc20Preflight(preflightBlockReason),
        });
        unverifiedCount += 1;
        continue;
      }
      const latest = await refreshErc20PreflightForItem(
        config,
        ownerAddress,
        item,
      );
      if (latest.status !== "active") {
        patch(item.key, resultFromPreflight(latest));
        continue;
      }

      const chainConfig = getChainConfig(item.chainId);
      const safeGas = safeGasForRevokeRequest(
        latest,
        chainConfig?.maxTransactionGas,
      );
      if (!safeGas.ok) {
        patch(item.key, resultFromPreflight(safeGas.preflight));
        continue;
      }

      const submitBlockReason = walletRevokeBlockReason(item.chainId);
      if (submitBlockReason) {
        patch(item.key, {
          status: "unverified",
          error: submitBlockReason,
          preflight: blockedErc20Preflight(submitBlockReason),
        });
        unverifiedCount += 1;
        continue;
      }

      patch(item.key, { status: "wallet" });

      let hash: `0x${string}`;
      try {
        hash = await writeContractAsync({
          ...buildRevokeCall({
            chainId: item.chainId,
            tokenAddress: item.tokenAddress,
            spenderAddress: item.spenderAddress,
            approvalKind: item.approvalKind,
            approvalContractAddress: item.approvalContractAddress,
          }),
          chainId: item.chainId as SupportedChainId,
          ...(safeGas.gas !== undefined ? { gas: safeGas.gas } : {}),
        });
      } catch (e) {
        const n = normalizeRevokeError(e);
        patch(item.key, {
          status: n.rejected ? "rejected" : "failed",
          error: n.message,
        });
        if (n.rejected) {
          rejectedCount += 1;
          // Wallet rejection is a strong user signal: stop the batch.
          stopRef.current = true;
          trackEvent("batch_stopped", {
            reason: "rejected",
            chainId: item.chainId,
          });
        } else {
          failedCount += 1;
        }
        continue;
      }

      patch(item.key, { status: "submitted", hash });

      try {
        const client = getPublicClient(config, {
          chainId: item.chainId as SupportedChainId,
        });
        if (!client) throw new Error(`No public client for chain ${item.chainId}`);
        const receipt = await client.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          patch(item.key, {
            status: "failed",
            hash,
            error: "Transaction reverted on-chain.",
          });
          failedCount += 1;
        } else {
          patch(item.key, { status: "verifying", hash });
          const verification = await verifyErc20PostRevokeCleared({
            client,
            ownerAddress,
            target: {
              chainId: item.chainId,
              tokenAddress: item.tokenAddress,
              spenderAddress: item.spenderAddress,
              approvalKind: item.approvalKind,
              approvalContractAddress: item.approvalContractAddress,
            },
          });

          if (verification.state === "confirmed-cleared") {
            patch(item.key, { status: "success", hash });
            successCount += 1;
          } else {
            patch(item.key, {
              status: "unverified",
              hash,
              error: postRevokeVerificationErrorMessage(verification),
            });
            unverifiedCount += 1;
          }
        }
      } catch (e) {
        const n = normalizeRevokeError(e);
        patch(item.key, { status: "failed", hash, error: n.message });
        failedCount += 1;
      }
    }

    setCurrentKey(null);

    setState("complete");
    trackEvent("batch_completed", {
      total: items.length,
      chainId: batchChainId,
      success: successCount,
      failed: failedCount,
      rejected: rejectedCount,
      skipped: skippedCount,
      unverified: unverifiedCount,
      partial: failedCount + rejectedCount + skippedCount + unverifiedCount > 0,
    });
    onComplete?.();
  }, [
    items,
    results,
    config,
    ownerAddress,
    writeContractAsync,
    patch,
    onComplete,
    walletRevokeBlockReason,
  ]);

  const counts = useMemo<BatchCounts>(() => {
    let success = 0;
    let failed = 0;
    let rejected = 0;
    let skipped = 0;
    let cleared = 0;
    let highGasWarning = 0;
    let unverified = 0;
    let ready = 0;
    for (const item of items) {
      const r = results[item.key];
      if (!r) continue;
      if (r.status === "success") success++;
      else if (r.status === "failed") failed++;
      else if (r.status === "rejected") rejected++;
      else if (r.status === "skipped") skipped++;
      else if (r.status === "cleared") cleared++;
      else if (r.status === "review") highGasWarning++;
      else if (r.status === "unverified") unverified++;
      else if (r.status === "queued") ready++;
    }
    return {
      total: items.length,
      success,
      failed,
      rejected,
      skipped,
      cleared,
      highGasWarning,
      unverified,
      ready,
      done:
        success +
        failed +
        rejected +
        skipped +
        cleared +
        highGasWarning +
        unverified,
    };
  }, [items, results]);

  return {
    state,
    items,
    currentKey,
    results,
    counts,
    preflightSummary,
    blockedReason,
    beginConfirm,
    cancelConfirm,
    start,
    stop,
    close,
  };
}

type PreflightClient = NonNullable<ReturnType<typeof getPublicClient>>;

async function refreshErc20PreflightForItem(
  config: Parameters<typeof getPublicClient>[0],
  ownerAddress: Address,
  item: Approval,
): Promise<Erc20PreflightResult> {
  try {
    const client = getPublicClient(config, {
      chainId: item.chainId as SupportedChainId,
    }) as PreflightClient | undefined;
    if (!client) throw new Error(`No public client for chain ${item.chainId}`);
    const raw = await client.readContract(
      buildErc20PreflightRead(ownerAddress, item),
    );
    const allowancePreflight = evaluateErc20AllowancePreflight(
      raw,
      batchPreflightContext(item),
    );
    if (allowancePreflight.status !== "active") return allowancePreflight;

    const chainConfig = getChainConfig(item.chainId);
    if (!chainConfig?.maxTransactionGas) return allowancePreflight;

    const estimatedGas = await client.estimateContractGas({
      ...buildRevokeCall({
        chainId: item.chainId,
        tokenAddress: item.tokenAddress,
        spenderAddress: item.spenderAddress,
        approvalKind: item.approvalKind,
        approvalContractAddress: item.approvalContractAddress,
      }),
      account: ownerAddress,
    });
    const gasPriceWei = await getGasPriceOrUndefined(client);

    return applyGasEstimateToPreflight(
      allowancePreflight,
      estimatedGas,
      chainConfig.maxTransactionGas,
      chainConfig.highGasWarningThreshold,
      {
        chainId: item.chainId,
        callKind: "erc20",
        gasPriceWei,
        nativeSymbol: chainConfig.nativeSymbol,
      },
    );
  } catch (error) {
    return withGasCapContext(failedErc20Preflight(error), item.chainId);
  }
}

async function getGasPriceOrUndefined(
  client: PreflightClient,
): Promise<bigint | undefined> {
  try {
    return await client.getGasPrice();
  } catch {
    return undefined;
  }
}

function resultFromPreflight(
  preflight: Erc20PreflightResult,
): BatchItemResult {
  if (preflight.status === "active") {
    return { status: "queued", preflight };
  }
  if (preflight.status === "highGasWarning") {
    return {
      status: "review",
      error:
        "High-gas BSC revoke requires individual review and is skipped by batch by default.",
      preflight,
    };
  }
  if (preflight.status === "cleared") {
    return { status: "cleared", preflight };
  }
  return {
    status: "unverified",
    error: preflight.error,
    preflight,
  };
}

function postRevokeVerificationErrorMessage(
  result: Awaited<ReturnType<typeof verifyErc20PostRevokeCleared>>,
): string {
  if (result.state === "mismatch") {
    return "Transaction confirmed, but live verification still found an active approval. Rescan before trusting this approval as revoked.";
  }
  if (result.state === "incomplete") {
    return result.error
      ? `Transaction confirmed, but post-revoke verification was incomplete: ${result.error}. Rescan before trusting this approval as revoked.`
      : "Transaction confirmed, but post-revoke verification was incomplete. Rescan before trusting this approval as revoked.";
  }
  if (result.state === "failed") {
    return result.error
      ? `Transaction confirmed, but post-revoke verification failed: ${result.error}. Rescan before trusting this approval as revoked.`
      : "Transaction confirmed, but post-revoke verification failed. Rescan before trusting this approval as revoked.";
  }
  return "Transaction confirmed, but post-revoke verification did not complete. Rescan before trusting this approval as revoked.";
}

function withGasCapContext(
  result: Erc20PreflightResult,
  chainId: number,
): Erc20PreflightResult {
  const maxTransactionGas = getChainConfig(chainId)?.maxTransactionGas;
  if (!result.gasCapExceeded || !maxTransactionGas) return result;
  return { ...result, maxTransactionGas };
}
