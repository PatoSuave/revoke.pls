"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";

import { ApprovalFilters } from "@/components/approvals/approval-filters";
import { ApprovalRow } from "@/components/approvals/approval-row";
import {
  BatchActionBar,
  BatchRevokePanel,
} from "@/components/approvals/batch-revoke-panel";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { useApprovalScan } from "@/hooks/use-approval-scan";
import { useBatchRevoke } from "@/hooks/use-batch-revoke";
import { pulsechain } from "@/lib/chains";
import { shortenAddress } from "@/lib/format";
import {
  filterAndSortScoredApprovals,
  scoreApprovals,
  type ApprovalFilter,
  type ApprovalSort,
  type ScoredApproval,
} from "@/lib/risk";

/**
 * Connected-wallet approval scanner for PulseChain.
 *
 * Reads are issued through `useApprovalScan` which batches the curated
 * registry (tokens × spenders) into a single Multicall3 call. This component
 * is pure UI glue: state branching, filter/sort, and render.
 */
export function ApprovalScanner() {
  const { address, isConnected, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const onPulseChain = chainId === pulsechain.id;

  return (
    <section
      id="scanner"
      className="relative border-t border-pulse-border/60 bg-gradient-to-b from-pulse-bg to-pulse-panel/40 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Approval <span className="text-gradient-pulse">scanner</span>
            </h2>
            <p className="mt-3 text-pulse-muted">
              Connect a wallet on PulseChain to review ERC-20 allowances that
              you have granted to spender contracts in the curated registry.
            </p>
          </div>
          <div className="hidden sm:block">
            <ConnectWalletButton variant="ghost" />
          </div>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-3xl border border-pulse-border bg-pulse-panel/70 p-6 sm:p-10">
          <ScannerBody
            accountStatus={accountStatus}
            address={address}
            isConnected={isConnected}
            onPulseChain={onPulseChain}
          />
        </div>
      </div>
    </section>
  );
}

function ScannerBody({
  accountStatus,
  address,
  isConnected,
  onPulseChain,
}: {
  accountStatus: ReturnType<typeof useAccount>["status"];
  address: `0x${string}` | undefined;
  isConnected: boolean;
  onPulseChain: boolean;
}) {
  if (accountStatus === "reconnecting" || accountStatus === "connecting") {
    return (
      <ScannerState
        eyebrow="Step 1"
        title="Reconnecting to your wallet"
        body="Waiting for your wallet to finish reconnecting…"
        action={null}
      />
    );
  }

  if (!isConnected || !address) {
    return (
      <ScannerState
        eyebrow="Step 1"
        title="Connect a wallet to scan approvals"
        body="We never store your address. Connection is used only to query on-chain allowances from your wallet."
        action={<ConnectWalletButton />}
      />
    );
  }

  if (!onPulseChain) {
    return (
      <ScannerState
        tone="warning"
        eyebrow="Wrong network"
        title="Switch to PulseChain"
        body="Pulse Revoke supports PulseChain mainnet (chainId 369). Switch networks to continue."
        action={<ConnectWalletButton variant="ghost" />}
      />
    );
  }

  return <ConnectedScanner owner={address} />;
}

function ConnectedScanner({ owner }: { owner: `0x${string}` }) {
  const scan = useApprovalScan({ owner });

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ApprovalSort>("risk");
  const [filter, setFilter] = useState<ApprovalFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const scored = useMemo(
    () => scoreApprovals(scan.approvals),
    [scan.approvals],
  );

  const visibleApprovals = useMemo(
    () => filterAndSortScoredApprovals(scored, { query, sort, filter }),
    [scored, query, sort, filter],
  );

  const highRiskCount = useMemo(
    () => scored.filter((a) => a.risk.level === "high").length,
    [scored],
  );

  // Prune selections when the underlying scan loses an approval (e.g. after
  // a successful revoke triggers a rescan).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const keys = new Set(scored.map((a) => a.key));
      let changed = false;
      const next = new Set<string>();
      for (const k of prev) {
        if (keys.has(k)) next.add(k);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [scored]);

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const allVisibleSelected =
    visibleApprovals.length > 0 &&
    visibleApprovals.every((a) => selected.has(a.key));

  const toggleSelectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const all = visibleApprovals.every((a) => next.has(a.key));
      if (all) {
        for (const a of visibleApprovals) next.delete(a.key);
      } else {
        for (const a of visibleApprovals) next.add(a.key);
      }
      return next;
    });
  }, [visibleApprovals]);

  const batch = useBatchRevoke({ onComplete: scan.refetch });
  const batchActive =
    batch.state === "running" || batch.state === "stopping";

  const selectedApprovals = useMemo(
    () => scored.filter((a) => selected.has(a.key)),
    [scored, selected],
  );

  const selectedHighRisk = useMemo(
    () => selectedApprovals.filter((a) => a.risk.level === "high").length,
    [selectedApprovals],
  );
  const selectedUnlimited = useMemo(
    () => selectedApprovals.filter((a) => a.unlimited).length,
    [selectedApprovals],
  );

  const onReviewBatch = useCallback(() => {
    batch.beginConfirm(selectedApprovals);
  }, [batch, selectedApprovals]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-pulse-border bg-pulse-bg/60 px-3 py-1 text-xs font-medium text-pulse-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" aria-hidden />
            Connected
          </span>
          <span className="font-mono text-xs text-pulse-muted">
            {shortenAddress(owner)}
          </span>
          <span className="text-xs text-pulse-muted">
            Scanning {scan.tokensScanned} tokens × {scan.spendersScanned}{" "}
            spenders
          </span>
          {highRiskCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pulse-red/40 bg-pulse-red/10 px-3 py-1 text-xs font-semibold text-pulse-red">
              <span
                className="h-1.5 w-1.5 rounded-full bg-pulse-red"
                aria-hidden
              />
              {highRiskCount} high-risk
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={scan.refetch}
          disabled={scan.isFetching || batchActive}
          className="inline-flex items-center gap-2 rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {scan.isFetching ? "Scanning…" : "Rescan"}
        </button>
      </div>

      <ScanContent
        scan={scan}
        scored={scored}
        visibleApprovals={visibleApprovals}
        query={query}
        sort={sort}
        filter={filter}
        onQueryChange={setQuery}
        onSortChange={setSort}
        onFilterChange={setFilter}
        selected={selected}
        onToggleSelect={toggleSelect}
        onClearSelection={clearSelection}
        onToggleSelectAllVisible={toggleSelectAllVisible}
        allVisibleSelected={allVisibleSelected}
        selectedHighRisk={selectedHighRisk}
        selectedUnlimited={selectedUnlimited}
        onReviewBatch={onReviewBatch}
        batch={batch}
      />

      <p className="text-xs text-pulse-muted">
        Scans are limited to the curated registry in this build. Discovery of
        approvals outside the registry requires indexing and will ship in a
        later milestone.
      </p>
    </div>
  );
}

function ScanContent({
  scan,
  scored,
  visibleApprovals,
  query,
  sort,
  filter,
  onQueryChange,
  onSortChange,
  onFilterChange,
  selected,
  onToggleSelect,
  onClearSelection,
  onToggleSelectAllVisible,
  allVisibleSelected,
  selectedHighRisk,
  selectedUnlimited,
  onReviewBatch,
  batch,
}: {
  scan: ReturnType<typeof useApprovalScan>;
  scored: readonly ScoredApproval[];
  visibleApprovals: readonly ScoredApproval[];
  query: string;
  sort: ApprovalSort;
  filter: ApprovalFilter;
  onQueryChange: (v: string) => void;
  onSortChange: (v: ApprovalSort) => void;
  onFilterChange: (v: ApprovalFilter) => void;
  selected: Set<string>;
  onToggleSelect: (key: string) => void;
  onClearSelection: () => void;
  onToggleSelectAllVisible: () => void;
  allVisibleSelected: boolean;
  selectedHighRisk: number;
  selectedUnlimited: number;
  onReviewBatch: () => void;
  batch: ReturnType<typeof useBatchRevoke>;
}) {
  const batchActive = batch.state === "running" || batch.state === "stopping";
  const batchInteracting = batch.state !== "idle";
  if (scan.status === "pending") {
    return <ScannerSkeleton totalChecks={scan.totalChecks} />;
  }

  if (scan.status === "error") {
    return (
      <div className="rounded-2xl border border-pulse-red/40 bg-pulse-red/10 p-5 text-sm">
        <p className="font-semibold text-pulse-red">Scan failed</p>
        <p className="mt-1 text-pulse-muted">
          {scan.error?.message ??
            "Something went wrong reading allowances from PulseChain."}
        </p>
        <button
          type="button"
          onClick={scan.refetch}
          className="mt-3 inline-flex items-center rounded-lg border border-pulse-red/40 bg-pulse-red/20 px-3 py-1.5 text-xs font-semibold text-pulse-red hover:bg-pulse-red/30"
        >
          Retry
        </button>
      </div>
    );
  }

  if (scored.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-6 text-sm">
        <p className="font-semibold text-pulse-text">No active approvals found</p>
        <p className="mt-1 text-pulse-muted">
          This wallet has no non-zero allowances to any spender in the curated
          registry. Broader chain-wide discovery ships in a later milestone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GuidancePanel />

      <ApprovalFilters
        query={query}
        onQueryChange={onQueryChange}
        sort={sort}
        onSortChange={onSortChange}
        filter={filter}
        onFilterChange={onFilterChange}
        count={visibleApprovals.length}
        totalChecks={scan.totalChecks}
        disabled={scan.isFetching || batchInteracting}
      />

      <BatchActionBar
        selectedCount={selected.size}
        visibleCount={visibleApprovals.length}
        allVisibleSelected={allVisibleSelected}
        highRiskSelected={selectedHighRisk}
        unlimitedSelected={selectedUnlimited}
        onSelectAllVisible={onToggleSelectAllVisible}
        onClear={onClearSelection}
        onReview={onReviewBatch}
        disabled={batchInteracting}
      />

      <BatchRevokePanel batch={batch} />

      {visibleApprovals.length === 0 ? (
        <div className="rounded-2xl border border-pulse-border bg-pulse-bg/40 p-6 text-sm text-pulse-muted">
          No approvals match your filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <div className="hidden grid-cols-[auto_1.2fr_1.5fr_1fr_auto] gap-4 border-b border-pulse-border bg-pulse-bg/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-pulse-muted sm:grid">
            <div aria-hidden />
            <div>Token</div>
            <div>Spender</div>
            <div>Allowance · Risk</div>
            <div className="text-right">Action</div>
          </div>
          <ul>
            {visibleApprovals.map((approval) => (
              <ApprovalRow
                key={approval.key}
                approval={approval}
                onRevoked={scan.refetch}
                selected={selected.has(approval.key)}
                onToggleSelect={onToggleSelect}
                selectionDisabled={batchInteracting}
                batchActive={batchActive}
                batchResult={batch.results[approval.key]}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GuidancePanel() {
  return (
    <div className="rounded-2xl border border-pulse-border/70 bg-pulse-bg/50 p-4 text-xs text-pulse-muted">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-text">
        A quick read on risk
      </p>
      <ul className="grid gap-2 sm:grid-cols-3">
        <li>
          <span className="font-semibold text-pulse-text">Unlimited first.</span>{" "}
          Unlimited allowances expose your full token balance if the spender is
          ever compromised. Revoke or reduce when not actively used.
        </li>
        <li>
          <span className="font-semibold text-pulse-text">Unknown spenders.</span>{" "}
          Spenders outside the verified registry deserve extra caution. Confirm
          the address on PulseScan before leaving an approval in place.
        </li>
        <li>
          <span className="font-semibold text-pulse-text">Trusted + finite.</span>{" "}
          Lower priority but still worth reviewing periodically — especially if
          the position is no longer active.
        </li>
      </ul>
    </div>
  );
}

function ScannerSkeleton({ totalChecks }: { totalChecks: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-pulse-muted">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-pulse-cyan" />
        Reading allowances for {totalChecks} token/spender pairs…
      </div>
      <div className="overflow-hidden rounded-2xl border border-pulse-border">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid grid-cols-1 items-center gap-3 border-b border-pulse-border/60 px-4 py-4 last:border-b-0 sm:grid-cols-[1.2fr_1.5fr_1fr_auto] sm:gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-pulse-panel2" />
              <div className="h-3 w-24 animate-pulse rounded bg-pulse-panel2" />
            </div>
            <div className="h-3 w-40 animate-pulse rounded bg-pulse-panel2" />
            <div className="h-3 w-20 animate-pulse rounded bg-pulse-panel2" />
            <div className="h-8 w-20 animate-pulse rounded bg-pulse-panel2 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScannerState({
  eyebrow,
  title,
  body,
  action,
  tone = "neutral",
}: {
  eyebrow: string;
  title: string;
  body: string;
  action: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  const eyebrowClass =
    tone === "warning" ? "text-pulse-red" : "text-pulse-muted";

  return (
    <div className="flex flex-col items-start gap-5 text-left">
      <span
        className={`text-xs font-semibold uppercase tracking-[0.18em] ${eyebrowClass}`}
      >
        {eyebrow}
      </span>
      <h3 className="max-w-xl text-2xl font-semibold text-pulse-text sm:text-3xl">
        {title}
      </h3>
      <p className="max-w-xl text-pulse-muted">{body}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
