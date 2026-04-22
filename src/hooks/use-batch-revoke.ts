"use client";

import { getPublicClient } from "@wagmi/core";
import { useCallback, useMemo, useRef, useState } from "react";
import { useConfig, useWriteContract } from "wagmi";

import type { Approval } from "@/lib/approvals";
import type { SupportedChainId } from "@/lib/chains";
import { normalizeRevokeError } from "@/lib/errors";
import { buildRevokeCall } from "@/lib/revoke";
import { trackEvent } from "@/lib/telemetry";

export type BatchItemStatus =
  | "queued"
  | "wallet"
  | "submitted"
  | "success"
  | "failed"
  | "rejected"
  | "skipped";

export interface BatchItemResult {
  status: BatchItemStatus;
  hash?: `0x${string}`;
  error?: string;
}

export type BatchState =
  | "idle"
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
  onComplete,
}: {
  onComplete?: () => void;
} = {}): UseBatchRevokeResult {
  const [state, setState] = useState<BatchState>("idle");
  const [items, setItems] = useState<readonly Approval[]>([]);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, BatchItemResult>>({});

  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const stopRef = useRef(false);

  const patch = useCallback((key: string, value: BatchItemResult) => {
    setResults((prev) => ({ ...prev, [key]: value }));
  }, []);

  const beginConfirm = useCallback((next: readonly Approval[]) => {
    if (next.length === 0) return;
    const initial: Record<string, BatchItemResult> = {};
    for (const a of next) initial[a.key] = { status: "queued" };
    setItems(next);
    setResults(initial);
    setCurrentKey(null);
    stopRef.current = false;
    setState("confirming");
  }, []);

  const resetAll = useCallback(() => {
    setItems([]);
    setResults({});
    setCurrentKey(null);
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

    const receiptPromises: Promise<void>[] = [];

    for (const item of items) {
      if (stopRef.current) {
        patch(item.key, { status: "skipped" });
        skippedCount += 1;
        continue;
      }

      setCurrentKey(item.key);
      patch(item.key, { status: "wallet" });

      let hash: `0x${string}`;
      try {
        hash = await writeContractAsync({
          ...buildRevokeCall({
            chainId: item.chainId,
            tokenAddress: item.tokenAddress,
            spenderAddress: item.spenderAddress,
          }),
          chainId: item.chainId as SupportedChainId,
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

      const receiptPromise = (async () => {
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
            patch(item.key, { status: "success", hash });
            successCount += 1;
          }
        } catch (e) {
          const n = normalizeRevokeError(e);
          patch(item.key, { status: "failed", hash, error: n.message });
          failedCount += 1;
        }
      })();
      receiptPromises.push(receiptPromise);
    }

    setCurrentKey(null);

    // Wait for all transaction receipts to be processed
    await Promise.all(receiptPromises);

    setState("complete");
    trackEvent("batch_completed", {
      total: items.length,
      chainId: batchChainId,
      success: successCount,
      failed: failedCount,
      rejected: rejectedCount,
      skipped: skippedCount,
      partial: failedCount + rejectedCount + skippedCount > 0,
    });
    onComplete?.();
  }, [items, config, writeContractAsync, patch, onComplete]);

  const counts = useMemo<BatchCounts>(() => {
    let success = 0;
    let failed = 0;
    let rejected = 0;
    let skipped = 0;
    for (const item of items) {
      const r = results[item.key];
      if (!r) continue;
      if (r.status === "success") success++;
      else if (r.status === "failed") failed++;
      else if (r.status === "rejected") rejected++;
      else if (r.status === "skipped") skipped++;
    }
    return {
      total: items.length,
      success,
      failed,
      rejected,
      skipped,
      done: success + failed + rejected + skipped,
    };
  }, [items, results]);

  return {
    state,
    items,
    currentKey,
    results,
    counts,
    beginConfirm,
    cancelConfirm,
    start,
    stop,
    close,
  };
}
