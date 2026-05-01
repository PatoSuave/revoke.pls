"use client";

import { getPublicClient } from "@wagmi/core";
import { useCallback, useMemo, useRef, useState } from "react";
import { useConfig, useWriteContract } from "wagmi";
import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { SupportedChainId } from "@/lib/chains";
import { normalizeRevokeError } from "@/lib/errors";
import {
  batchPreflightContext,
  buildErc20PreflightRead,
  EMPTY_BATCH_PREFLIGHT_SUMMARY,
  evaluateErc20AllowancePreflight,
  failedErc20Preflight,
  summarizeBatchPreflight,
  type BatchPreflightSummary,
  type Erc20PreflightResult,
} from "@/lib/preflight";
import { buildRevokeCall } from "@/lib/revoke";
import { trackEvent } from "@/lib/telemetry";

export type BatchItemStatus =
  | "queued"
  | "refreshing"
  | "wallet"
  | "submitted"
  | "success"
  | "failed"
  | "rejected"
  | "skipped"
  | "cleared"
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

  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const stopRef = useRef(false);
  const preflightRunRef = useRef(0);

  const patch = useCallback((key: string, value: BatchItemResult) => {
    setResults((prev) => ({ ...prev, [key]: value }));
  }, []);

  const beginConfirm = useCallback((next: readonly Approval[]) => {
    if (next.length === 0) return;
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
    stopRef.current = false;
    setState("refreshing");

    void (async () => {
      const reads = await Promise.all(
        next.map(async (item) => [
          item.key,
          await refreshErc20PreflightForItem(config, ownerAddress, item),
        ] as const),
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
  }, [config, ownerAddress]);

  const resetAll = useCallback(() => {
    preflightRunRef.current += 1;
    setItems([]);
    setResults({});
    setCurrentKey(null);
    setPreflightSummary(EMPTY_BATCH_PREFLIGHT_SUMMARY);
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
      const currentResult = results[item.key];
      if (
        currentResult?.status === "cleared" ||
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
      const latest = await refreshErc20PreflightForItem(
        config,
        ownerAddress,
        item,
      );
      if (latest.status !== "active") {
        patch(item.key, resultFromPreflight(latest));
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
  }, [
    items,
    results,
    config,
    ownerAddress,
    writeContractAsync,
    patch,
    onComplete,
  ]);

  const counts = useMemo<BatchCounts>(() => {
    let success = 0;
    let failed = 0;
    let rejected = 0;
    let skipped = 0;
    let cleared = 0;
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
      unverified,
      ready,
      done: success + failed + rejected + skipped + cleared + unverified,
    };
  }, [items, results]);

  return {
    state,
    items,
    currentKey,
    results,
    counts,
    preflightSummary,
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
    return evaluateErc20AllowancePreflight(raw, batchPreflightContext(item));
  } catch (error) {
    return failedErc20Preflight(error);
  }
}

function resultFromPreflight(
  preflight: Erc20PreflightResult,
): BatchItemResult {
  if (preflight.status === "active") {
    return { status: "queued", preflight };
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
