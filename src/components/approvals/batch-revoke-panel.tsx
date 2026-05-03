"use client";

import type {
  BatchItemResult,
  BatchItemStatus,
  UseBatchRevokeResult,
} from "@/hooks/use-batch-revoke";
import { getChainConfig } from "@/lib/chains";
import { explorerTxUrl } from "@/lib/explorer";
import type { ScoredApproval } from "@/lib/risk";

/**
 * Sticky-ish action bar shown above the approval list when the user has
 * selected rows and no batch is in flight. Mirrors the row layout visually
 * but stays compact.
 */
export function BatchActionBar({
  selectedCount,
  visibleCount,
  allVisibleSelected,
  highRiskSelected,
  unlimitedSelected,
  onSelectAllVisible,
  onClear,
  onReview,
  disabled,
}: {
  selectedCount: number;
  visibleCount: number;
  allVisibleSelected: boolean;
  highRiskSelected: number;
  unlimitedSelected: number;
  onSelectAllVisible: () => void;
  onClear: () => void;
  onReview: () => void;
  disabled?: boolean;
}) {
  const showBar = selectedCount > 0 || visibleCount > 0;
  if (!showBar) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-pulse-purple/35 bg-pulse-purple/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs text-pulse-muted">
        <button
          type="button"
          onClick={onSelectAllVisible}
          disabled={disabled || visibleCount === 0}
          className="rounded-lg border border-pulse-border bg-white/5 px-2.5 py-1 text-xs font-semibold text-pulse-text transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {allVisibleSelected ? "Deselect visible" : "Select all visible"}
        </button>
        <span>
          <span className="font-semibold text-pulse-text">{selectedCount}</span>
          {" selected"}
          {selectedCount > 0 ? (
            <>
              {highRiskSelected > 0 ? (
                <>
                  {" / "}
                  <span className="text-pulse-red">
                    {highRiskSelected} high-risk
                  </span>
                </>
              ) : null}
              {unlimitedSelected > 0 ? (
                <>
                  {" / "}
                  <span className="text-pulse-red">
                    {unlimitedSelected} unlimited
                  </span>
                </>
              ) : null}
            </>
          ) : null}
        </span>
      </div>

      <div className="flex items-center gap-2 self-stretch sm:self-auto">
        <button
          type="button"
          onClick={onClear}
          disabled={disabled || selectedCount === 0}
          className="flex-1 rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onReview}
          disabled={disabled || selectedCount === 0}
          className="flex-1 rounded-xl bg-pulse-gradient px-3 py-2 text-xs font-semibold text-pulse-bg shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        >
          Review selected
        </button>
      </div>
    </div>
  );
}

/**
 * Confirmation + progress + summary panel. Renders based on batch.state.
 */
export function BatchRevokePanel({ batch }: { batch: UseBatchRevokeResult }) {
  if (batch.state === "idle") return null;

  if (batch.state === "refreshing") {
    return <RefreshingCard batch={batch} />;
  }

  if (batch.state === "confirming") {
    return <ConfirmingCard batch={batch} />;
  }

  if (batch.state === "running" || batch.state === "stopping") {
    return <RunningCard batch={batch} />;
  }

  return <CompleteCard batch={batch} />;
}

function RefreshingCard({ batch }: { batch: UseBatchRevokeResult }) {
  return (
    <div className="rounded-2xl border border-pulse-cyan/40 bg-pulse-cyan/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
        Batch review
      </p>
      <h3 className="mt-1 text-lg font-semibold text-pulse-text">
        Refreshing current approval...
      </h3>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-pulse-muted">
        Checking {batch.items.length} selected approval
        {batch.items.length === 1 ? "" : "s"} live on-chain before any wallet
        prompt opens.
      </p>
    </div>
  );
}

function ConfirmingCard({ batch }: { batch: UseBatchRevokeResult }) {
  const highRisk = batch.items.filter((a) => {
    const approval = a as ScoredApproval;
    return approval.risk?.level === "high";
  }).length;
  const unlimited = batch.items.filter((a) => a.unlimited).length;
  const ready = batch.counts.ready;
  const cleared = batch.counts.cleared;
  const unverified = batch.counts.unverified;
  const chainConfig = getChainConfig(batch.items[0]?.chainId);
  const gasLabel = chainConfig
    ? `${ready} ${chainConfig.nativeSymbol} gas fees`
    : `${ready} gas fees`;

  return (
    <div className="rounded-2xl border border-pulse-purple/40 bg-pulse-purple/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-purple">
        Batch review
      </p>
      <h3 className="mt-1 text-lg font-semibold text-pulse-text">
        Revoke {ready} active {ready === 1 ? "approval" : "approvals"}
        {chainConfig ? ` on ${chainConfig.displayName}` : ""}
      </h3>
      <ul className="mt-3 flex flex-wrap gap-1.5 text-xs text-pulse-muted">
        <Pill tone="green">{ready} ready to revoke</Pill>
        {cleared > 0 ? (
          <Pill tone="muted">{cleared} already cleared</Pill>
        ) : null}
        {unverified > 0 ? (
          <Pill tone="red">{unverified} unverified</Pill>
        ) : null}
        {highRisk > 0 ? (
          <Pill tone="red">{highRisk} high-risk</Pill>
        ) : null}
        {unlimited > 0 ? (
          <Pill tone="red">{unlimited} unlimited</Pill>
        ) : null}
        <Pill tone="muted">
          {batch.items.length} wallet prompts / {gasLabel}
        </Pill>
      </ul>
      <p className="mt-3 max-w-2xl text-xs leading-5 text-pulse-muted">
        Each revoke is a normal token approval reset submitted one at a time.
        Pulse Revoke never batches funds, never uses a proxy contract, and never
        signs for you. Your wallet prompts once per approval.
      </p>
      {batch.blockedReason ? (
        <p className="mt-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs leading-5 text-amber-200">
          {batch.blockedReason}
        </p>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-pulse-muted">
        Already-cleared approvals are skipped. Unverified approvals are not
        submitted from this batch.
      </p>
      <p className="mt-1 text-xs leading-5 text-pulse-muted">
        Preflight reads: {batch.preflightSummary.attempted} attempted,{" "}
        {batch.preflightSummary.succeeded} succeeded,{" "}
        {batch.preflightSummary.failed} failed.
      </p>

      <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-pulse-border/60 bg-pulse-bg/40">
        <ul className="divide-y divide-pulse-border/60">
          {batch.items.map((item, i) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
            >
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-pulse-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-semibold text-pulse-text">
                  {item.tokenSymbol}
                </span>
                <span className="text-pulse-muted">-&gt; {item.spenderLabel}</span>
              </span>
              <span className="font-mono text-[11px] text-pulse-muted">
                {batch.results[item.key]?.preflight?.currentLabel ??
                  (item.unlimited ? "Unlimited" : item.formattedAllowance)}
              </span>
              <span className="text-[11px] font-semibold text-pulse-muted">
                {STATUS_LABEL[batch.results[item.key]?.status ?? "queued"]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={batch.cancelConfirm}
          className="rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void batch.start()}
          disabled={ready === 0}
          className="rounded-xl bg-pulse-gradient px-3 py-2 text-xs font-semibold text-pulse-bg shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {ready === 0 ? "No active approvals" : "Start wallet prompts"}
        </button>
      </div>
    </div>
  );
}

function RunningCard({ batch }: { batch: UseBatchRevokeResult }) {
  const stopping = batch.state === "stopping";
  const pct =
    batch.counts.total === 0
      ? 0
      : Math.round((batch.counts.done / batch.counts.total) * 100);

  return (
    <div className="rounded-2xl border border-pulse-cyan/40 bg-pulse-cyan/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {stopping ? "Stopping after current tx" : "Batch in progress"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-pulse-text">
            {batch.counts.done} / {batch.counts.total} processed
          </h3>
        </div>
        <button
          type="button"
          onClick={batch.stop}
          disabled={stopping}
          className="rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {stopping ? "Stopping..." : "Stop after current"}
        </button>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-pulse-bg/60">
        <div
          className="h-full bg-pulse-gradient transition-all"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>

      <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto pr-1">
        {batch.items.map((item, i) => {
          const result = batch.results[item.key];
          const isCurrent = batch.currentKey === item.key;
          return (
            <BatchProgressRow
              key={item.key}
              index={i + 1}
              label={`${item.tokenSymbol} -> ${item.spenderLabel}`}
              current={isCurrent}
              result={result}
              chainId={item.chainId}
            />
          );
        })}
      </ul>
    </div>
  );
}

function CompleteCard({ batch }: { batch: UseBatchRevokeResult }) {
  const { success, failed, rejected, skipped, cleared, unverified, total } =
    batch.counts;
  const stoppedByRejection = rejected > 0 && skipped > 0;

  return (
    <div className="rounded-2xl border border-pulse-border bg-pulse-panel/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-muted">
        Batch complete
      </p>
      <h3 className="mt-1 text-lg font-semibold text-pulse-text">
        {success} of {total} revoked
      </h3>
      <p className="mt-1 text-xs leading-5 text-pulse-muted">
        Completed items have confirmed on-chain. Any failed, rejected, or
        unverified approvals remain unchanged and can be reviewed again.
      </p>

      {stoppedByRejection ? (
        <p className="mt-1 text-xs text-pulse-muted">
          Batch stopped after a wallet rejection. Remaining approvals were not
          submitted — you can re-select and retry.
        </p>
      ) : null}

      <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {success > 0 ? <Pill tone="green">{success} succeeded</Pill> : null}
        {failed > 0 ? <Pill tone="red">{failed} failed</Pill> : null}
        {rejected > 0 ? <Pill tone="muted">{rejected} rejected</Pill> : null}
        {skipped > 0 ? <Pill tone="muted">{skipped} skipped</Pill> : null}
        {cleared > 0 ? <Pill tone="green">{cleared} already cleared</Pill> : null}
        {unverified > 0 ? <Pill tone="red">{unverified} unverified</Pill> : null}
      </ul>

      <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto pr-1">
        {batch.items.map((item, i) => (
          <BatchProgressRow
            key={item.key}
            index={i + 1}
            label={`${item.tokenSymbol} -> ${item.spenderLabel}`}
            result={batch.results[item.key]}
            chainId={item.chainId}
          />
        ))}
      </ul>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={batch.close}
          className="rounded-xl bg-pulse-gradient px-3 py-2 text-xs font-semibold text-pulse-bg shadow-glow transition hover:brightness-110"
        >
          Close
        </button>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<BatchItemStatus, string> = {
  queued: "Queued",
  refreshing: "Refreshing",
  wallet: "Confirm in wallet...",
  submitted: "Confirming...",
  success: "Revoked",
  failed: "Failed",
  rejected: "Rejected",
  skipped: "Skipped",
  cleared: "Already cleared",
  unverified: "Unverified",
};

const STATUS_TONE: Record<
  BatchItemStatus,
  "muted" | "info" | "success" | "red"
> = {
  queued: "muted",
  refreshing: "info",
  wallet: "info",
  submitted: "info",
  success: "success",
  failed: "red",
  rejected: "muted",
  skipped: "muted",
  cleared: "success",
  unverified: "red",
};

function BatchProgressRow({
  index,
  label,
  current,
  result,
  chainId,
}: {
  index: number;
  label: string;
  current?: boolean;
  result?: BatchItemResult;
  chainId: number;
}) {
  const status = result?.status ?? "queued";
  const tone = STATUS_TONE[status];
  const toneClass = {
    muted: "text-pulse-muted",
    info: "text-pulse-cyan",
    success: "text-pulse-green",
    red: "text-pulse-red",
  }[tone];

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
        current
          ? "border-pulse-cyan/50 bg-pulse-cyan/5"
          : "border-pulse-border/60 bg-pulse-bg/40"
      }`}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="font-mono text-pulse-muted">
          {String(index).padStart(2, "0")}
        </span>
        <span className="truncate text-pulse-text">{label}</span>
      </span>
      <span
        className={`flex shrink-0 items-center gap-2 font-semibold ${toneClass}`}
      >
        {STATUS_LABEL[status]}
        {result?.hash ? (
          <a
            href={explorerTxUrl(chainId, result.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold underline underline-offset-2 hover:text-pulse-cyan"
          >
            tx
          </a>
        ) : null}
      </span>
    </li>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "muted" | "green" | "red";
}) {
  const cls = {
    muted:
      "border-pulse-border bg-pulse-bg/60 text-pulse-muted",
    green: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    red: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}
