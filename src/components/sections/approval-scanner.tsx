"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";

import { ApprovalFilters } from "@/components/approvals/approval-filters";
import { ApprovalRow } from "@/components/approvals/approval-row";
import {
  BatchActionBar,
  BatchRevokePanel,
} from "@/components/approvals/batch-revoke-panel";
import { NftApprovalRow } from "@/components/approvals/nft-approval-row";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { ScannerDiagnosticsPanel } from "@/components/sections/scanner-diagnostics";
import { useApprovalDiscovery } from "@/hooks/use-approval-discovery";
import { useBatchRevoke } from "@/hooks/use-batch-revoke";
import { useNftApprovalDiscovery } from "@/hooks/use-nft-approval-discovery";
import {
  getChainConfig,
  isSupportedChainId,
  supportedChainConfigList,
  type SupportedChainConfig,
} from "@/lib/chains";
import { shortenAddress } from "@/lib/format";
import type { NftApproval } from "@/lib/nft-approvals";
import {
  filterAndSortScoredApprovals,
  scoreApprovals,
  type ApprovalFilter,
  type ApprovalSort,
  type ScoredApproval,
} from "@/lib/risk";

/**
 * Connected-wallet approval scanner (PulseChain + Ethereum).
 *
 * Uses `useApprovalDiscovery` to pull historical `Approval` events from the
 * configured explorer, re-validate every `(token, spender)` pair live via
 * Multicall3, and enrich matches from the curated registry. The registry-
 * only `useApprovalScan` hook is preserved under `@/hooks/use-approval-scan`
 * as a secondary option for future registry-constrained modes.
 */
export function ApprovalScanner() {
  const { address, isConnected, status: accountStatus } = useAccount();
  const chainId = useChainId();
  const chainConfig = getChainConfig(chainId);
  const onSupportedChain = isSupportedChainId(chainId);
  const debugMode = useDebugModeFromQuery();

  return (
    <section
      id="scanner"
      className="relative bg-gradient-to-b from-pulse-bg via-pulse-panel/20 to-pulse-bg py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Wallet safety console
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Approval <span className="text-gradient-pulse">scanner</span>
            </h2>
            <p className="mt-3 leading-7 text-pulse-muted">
              Connect on PulseChain or Ethereum to find ERC-20 allowances and
              NFT operator approvals from your wallet history. Every result is
              re-checked live before it is shown as active.
            </p>
          </div>
          <SafetyStrip />
        </div>

        <div className="relative mt-8 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/80 shadow-glow">
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pulse-cyan/70 to-transparent"
            aria-hidden
          />
          <div className="p-4 sm:p-6 lg:p-8">
            <ScannerBody
              accountStatus={accountStatus}
              address={address}
              chainId={chainId}
              isConnected={isConnected}
              chainConfig={chainConfig}
              onSupportedChain={onSupportedChain}
              debugMode={debugMode}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function useDebugModeFromQuery() {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(
      params.get("debug") === "1" ||
        params.get("debug")?.toLowerCase() === "true",
    );
  }, []);

  return debugMode;
}

function SafetyStrip() {
  const items = [
    "No custody",
    "No seed phrases",
    "User-approved writes only",
    "Curated labels, still verify",
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-pulse-border bg-pulse-bg/60 p-2 text-[11px] text-pulse-muted sm:grid-cols-4 lg:max-w-xl">
      {items.map((item) => (
        <span
          key={item}
          className="flex items-center gap-2 rounded-xl bg-pulse-panel/70 px-3 py-2"
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-pulse-green"
            aria-hidden
          />
          {item}
        </span>
      ))}
    </div>
  );
}

function ScannerBody({
  accountStatus,
  address,
  chainId,
  isConnected,
  chainConfig,
  onSupportedChain,
  debugMode,
}: {
  accountStatus: ReturnType<typeof useAccount>["status"];
  address: `0x${string}` | undefined;
  chainId: number | undefined;
  isConnected: boolean;
  chainConfig: SupportedChainConfig | undefined;
  onSupportedChain: boolean;
  debugMode: boolean;
}) {
  if (accountStatus === "reconnecting" || accountStatus === "connecting") {
    return (
      <div className="space-y-5">
        <ScannerState
          eyebrow="Step 1"
          title="Reconnecting to your wallet"
          body="Waiting for your wallet to finish reconnecting..."
          action={null}
        />
        <ScannerDiagnosticsPanel
          enabled={debugMode}
          owner={address}
          chainId={chainId}
          chainConfig={chainConfig}
          onSupportedChain={onSupportedChain}
          isConnected={isConnected}
        />
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="space-y-5">
        <ScannerState
          eyebrow="Step 1"
          title="Connect to review live approvals"
          body="The scan reads public wallet history and on-chain state. It does not move funds, request signatures, or send transactions."
          action={<ConnectWalletButton />}
        />
        <ScannerDiagnosticsPanel
          enabled={debugMode}
          owner={address}
          chainId={chainId}
          chainConfig={chainConfig}
          onSupportedChain={onSupportedChain}
          isConnected={isConnected}
        />
      </div>
    );
  }

  if (!onSupportedChain || !chainConfig) {
    const names = supportedChainConfigList.map((c) => c.displayName).join(" or ");
    return (
      <div className="space-y-5">
        <ScannerState
          tone="warning"
          eyebrow="Unsupported network"
          title={`Switch to ${names}`}
          body={`Revoke.PLS supports ${names}. Switch networks in your wallet to continue. Your wallet stays connected, and no transaction is requested.`}
          action={<ConnectWalletButton variant="ghost" />}
        />
        <ScannerDiagnosticsPanel
          enabled={debugMode}
          owner={address}
          chainId={chainId}
          chainConfig={chainConfig}
          onSupportedChain={onSupportedChain}
          isConnected={isConnected}
        />
      </div>
    );
  }

  return (
    <ConnectedScanner
      owner={address}
      chainConfig={chainConfig}
      debugMode={debugMode}
    />
  );
}

function ConnectedScanner({
  owner,
  chainConfig,
  debugMode,
}: {
  owner: `0x${string}`;
  chainConfig: SupportedChainConfig;
  debugMode: boolean;
}) {
  const scan = useApprovalDiscovery({ owner, chainId: chainConfig.chainId });
  const nft = useNftApprovalDiscovery({ owner, chainId: chainConfig.chainId });

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

  const allVisibleSelected = useMemo(
    () =>
      visibleApprovals.length > 0 &&
      visibleApprovals.every((a) => selected.has(a.key)),
    [visibleApprovals, selected],
  );

  const toggleSelectAllVisible = useCallback(() => {
    if (visibleApprovals.length === 0) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const a of visibleApprovals) next.delete(a.key);
      } else {
        for (const a of visibleApprovals) next.add(a.key);
      }
      return next;
    });
  }, [visibleApprovals, allVisibleSelected]);

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
      <ScannerSummary
        owner={owner}
        chainConfig={chainConfig}
        activeCount={scan.stats.active}
        candidateCount={scan.stats.candidates}
        highRiskCount={highRiskCount}
        status={scan.status}
        isFetching={scan.isFetching}
        batchActive={batchActive}
        onRescan={scan.refetch}
      />

      <ScanContent
        scan={scan}
        chainConfig={chainConfig}
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

      <CoverageNote scan={scan} chainConfig={chainConfig} />
      <ScannerDiagnosticsPanel
        enabled={debugMode}
        owner={owner}
        chainId={chainConfig.chainId}
        chainConfig={chainConfig}
        onSupportedChain
        isConnected
        erc20={scan}
        nft={nft}
      />

      <NftSection nft={nft} chainConfig={chainConfig} />
    </div>
  );
}

function ScannerSummary({
  owner,
  chainConfig,
  activeCount,
  candidateCount,
  highRiskCount,
  status,
  isFetching,
  batchActive,
  onRescan,
}: {
  owner: `0x${string}`;
  chainConfig: SupportedChainConfig;
  activeCount: number;
  candidateCount: number;
  highRiskCount: number;
  status: ReturnType<typeof useApprovalDiscovery>["status"];
  isFetching: boolean;
  batchActive: boolean;
  onRescan: () => void;
}) {
  const summary =
    candidateCount > 0
      ? `${activeCount} active / ${candidateCount} checked`
      : status === "pending"
      ? "Searching wallet history"
      : "No active ERC-20/PRC-20 approvals";

  return (
    <div className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-pulse-green/30 bg-pulse-green/10 px-3 py-1 text-xs font-semibold text-pulse-green">
            <span
              className="h-1.5 w-1.5 rounded-full bg-pulse-green"
              aria-hidden
            />
            {chainConfig.displayName}
          </span>
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 font-mono text-xs text-pulse-muted">
            {shortenAddress(owner)}
          </span>
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-xs font-medium text-pulse-muted">
            {summary}
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onRescan}
            disabled={isFetching || batchActive}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetching ? "Scanning..." : "Rescan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NftSection({
  nft,
  chainConfig,
}: {
  nft: ReturnType<typeof useNftApprovalDiscovery>;
  chainConfig: SupportedChainConfig;
}) {
  const sorted = useMemo(() => sortNftApprovals(nft.approvals), [nft.approvals]);
  const highRisk = sorted.filter((a) => a.risk.level === "high").length;

  return (
    <section className="space-y-4 rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 sm:p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-muted">
            Collection permissions
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-pulse-text">
            NFT approvals
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-pulse-muted">
            Review collection-wide operator approvals and per-token ERC-721
            approvals. Collection-wide permissions are usually the highest
            priority to verify.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {highRisk > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pulse-red/40 bg-pulse-red/10 px-3 py-1 text-xs font-semibold text-pulse-red">
              <span
                className="h-1.5 w-1.5 rounded-full bg-pulse-red"
                aria-hidden
              />
              {highRisk} high-risk
            </span>
          ) : null}
          <button
            type="button"
            onClick={nft.refetch}
            disabled={nft.isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nft.isFetching ? "Scanning..." : "Rescan"}
          </button>
        </div>
      </header>

      <NftSectionBody nft={nft} sorted={sorted} chainConfig={chainConfig} />

      <p className="text-xs text-pulse-muted">
        Collection-wide operator approvals expose every NFT in the collection.
        NFT approvals are discovered via{" "}
        {nft.sourceMeta?.name ?? chainConfig.discovery.name}
        {nft.stats.windows > 1
          ? ` (${nft.stats.windows} block-range windows)`
          : ""}{" "}
        and re-verified live on-chain before display.
        {nft.truncated
          ? " A per-wallet fetch cap was reached, so very old approvals may be missing."
          : ""}{" "}
        Per-token approvals are ERC-721 only; ERC-1155 exposes the operator
        pattern exclusively.
      </p>
    </section>
  );
}

function NftSectionBody({
  nft,
  sorted,
  chainConfig,
}: {
  nft: ReturnType<typeof useNftApprovalDiscovery>;
  sorted: NftApproval[];
  chainConfig: SupportedChainConfig;
}) {
  if (nft.status === "pending") {
    return (
      <div className="rounded-2xl border border-pulse-cyan/30 bg-pulse-cyan/5 p-4 text-xs text-pulse-muted">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-pulse-cyan" />{" "}
        {nft.stats.candidates > 0
          ? `Verifying ${nft.stats.candidates} NFT approval candidate${
              nft.stats.candidates === 1 ? "" : "s"
            } live on-chain...`
          : "Searching NFT approval history..."}
      </div>
    );
  }

  if (nft.status === "error") {
    return (
      <div className="rounded-2xl border border-pulse-red/40 bg-pulse-red/10 p-5 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-red">
          NFT scan interrupted
        </p>
        <p className="mt-2 font-semibold text-pulse-text">
          We could not finish checking NFT approvals.
        </p>
        <p className="mt-1 text-pulse-muted">
          {nft.error?.message ??
            `Something went wrong reading NFT approvals from ${chainConfig.displayName}.`}
        </p>
        <button
          type="button"
          onClick={nft.refetch}
          className="mt-3 inline-flex items-center rounded-lg border border-pulse-red/40 bg-pulse-red/20 px-3 py-1.5 text-xs font-semibold text-pulse-red hover:bg-pulse-red/30"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-6 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-green">
          Clear for now
        </p>
        <p className="mt-2 text-lg font-semibold text-pulse-text">
          No active NFT approvals
        </p>
        <p className="mt-1 max-w-2xl leading-6 text-pulse-muted">
          {nft.stats.candidates === 0
            ? `We couldn't find any NFT approval history for this wallet on ${
                nft.sourceMeta?.name ?? chainConfig.discovery.name
              }.`
            : `${nft.stats.candidates} historical NFT approval${
                nft.stats.candidates === 1 ? "" : "s"
              } were checked on ${chainConfig.displayName}, but none are still active on-chain.`}
          {nft.truncated
            ? " A per-wallet fetch cap was reached; very old approvals may be missing."
            : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
      <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 border-b border-pulse-border bg-pulse-bg/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-pulse-muted sm:grid">
        <div>Collection</div>
        <div>Operator</div>
        <div>Permission / Risk</div>
        <div className="text-right">Action</div>
      </div>
      <ul>
        {sorted.map((approval) => (
          <NftApprovalRow
            key={approval.key}
            approval={approval}
            onRevoked={nft.refetch}
          />
        ))}
      </ul>
    </div>
  );
}

function riskRankNft(level: NftApproval["risk"]["level"]): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function sortNftApprovals(approvals: readonly NftApproval[]): NftApproval[] {
  return [...approvals].sort((a, b) => {
    const rank = riskRankNft(b.risk.level) - riskRankNft(a.risk.level);
    if (rank !== 0) return rank;
    if (a.kind !== b.kind) return a.kind === "approvalForAll" ? -1 : 1;
    const coll =
      (a.collectionName ?? a.collectionAddress).localeCompare(
        b.collectionName ?? b.collectionAddress,
      );
    if (coll !== 0) return coll;
    return a.operatorLabel.localeCompare(b.operatorLabel);
  });
}

function CoverageNote({
  scan,
  chainConfig,
}: {
  scan: ReturnType<typeof useApprovalDiscovery>;
  chainConfig: SupportedChainConfig;
}) {
  return (
    <p className="text-xs text-pulse-muted">
      Approvals are discovered from your wallet&rsquo;s historical ERC-20
      Approval events via{" "}
      {scan.sourceMeta?.name ?? chainConfig.discovery.name}
      {scan.stats.windows > 1
        ? ` (${scan.stats.windows} block-range windows)`
        : ""}{" "}
      and re-verified live on-chain before display.
      {scan.truncated
        ? ` A per-wallet fetch cap was reached, so very old approvals may be missing. Verify directly on ${chainConfig.explorer.name} if you suspect a legacy approval.`
        : ""}{" "}
      Protocol labels and trust badges come from the curated registry; unknown
      spenders stay unverified.
    </p>
  );
}

function ScanContent({
  scan,
  chainConfig,
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
  scan: ReturnType<typeof useApprovalDiscovery>;
  chainConfig: SupportedChainConfig;
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
  const failedAllowanceReads = scan.diagnostics.liveReadFailures.allowance;
  if (scan.status === "pending") {
    return <ScannerSkeleton candidates={scan.stats.candidates} />;
  }

  if (scan.status === "error") {
    return (
      <div className="rounded-2xl border border-pulse-red/40 bg-pulse-red/10 p-5 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-red">
          Scan interrupted
        </p>
        <p className="mt-2 font-semibold text-pulse-text">
          We could not finish reading approval history.
        </p>
        <p className="mt-1 leading-6 text-pulse-muted">
          {scan.error?.message ??
            `Something went wrong reading allowances from ${chainConfig.displayName}.`}
        </p>
        <p className="mt-2 text-xs text-pulse-muted">
          This is a read-only step. Try again, switch RPC/explorer settings, or
          verify directly on {chainConfig.explorer.name} if the explorer is
          rate-limited.
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
      <div className="rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/45 p-6 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-green">
          Clear for now
        </p>
        <p className="mt-2 text-lg font-semibold text-pulse-text">
          No active ERC-20/PRC-20 approvals found
        </p>
        <p className="mt-2 max-w-2xl leading-6 text-pulse-muted">
          {scan.stats.candidates === 0
            ? `We couldn't find any fungible token approval history for this wallet on ${
                scan.sourceMeta?.name ?? chainConfig.discovery.name
              }. If you expect an approval is in place, verify directly on ${chainConfig.explorer.name}.`
            : `${scan.stats.candidates} historical approval${
                scan.stats.candidates === 1 ? "" : "s"
              } were checked on ${chainConfig.displayName}, but none currently hold a non-zero allowance on-chain.`}
          {scan.truncated
            ? " A per-wallet fetch cap was reached; very old approvals may be missing."
            : ""}
        </p>
        {failedAllowanceReads > 0 ? (
          <AllowanceReadWarning
            count={failedAllowanceReads}
            explorerName={chainConfig.explorer.name}
          />
        ) : null}
        <div className="mt-4 grid gap-2 text-xs text-pulse-muted sm:grid-cols-3">
          <EmptyStateStep title="Check the network" body={chainConfig.displayName} />
          <EmptyStateStep title="Rescan later" body="Explorer APIs can lag." />
          <EmptyStateStep title="Verify labels" body="Use the explorer for anything suspicious." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GuidancePanel />

      {failedAllowanceReads > 0 ? (
        <AllowanceReadWarning
          count={failedAllowanceReads}
          explorerName={chainConfig.explorer.name}
        />
      ) : null}

      <ApprovalFilters
        query={query}
        onQueryChange={onQueryChange}
        sort={sort}
        onSortChange={onSortChange}
        filter={filter}
        onFilterChange={onFilterChange}
        count={visibleApprovals.length}
        candidateCount={scan.stats.candidates}
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
            <div>Exposure / Risk</div>
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
        How to read this scan
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
          the address on the block explorer before leaving an approval in place.
        </li>
        <li>
          <span className="font-semibold text-pulse-text">Known is not risk-free.</span>{" "}
          Registry labels identify addresses we recognize. You should still
          review every spender before signing a revoke or leaving access open.
        </li>
      </ul>
    </div>
  );
}

function AllowanceReadWarning({
  count,
  explorerName,
}: {
  count: number;
  explorerName: string;
}) {
  return (
    <div className="rounded-2xl border border-pulse-red/40 bg-pulse-red/10 p-4 text-sm text-pulse-text">
      <p className="font-semibold text-pulse-red">
        {count} allowance read{count === 1 ? "" : "s"} could not be verified live.
      </p>
      <p className="mt-1 leading-6 text-pulse-muted">
        Failed allowance reads are not counted as safe or cleared. Rescan with a
        healthier RPC, or verify the affected token/spender pairs directly on{" "}
        {explorerName}.
      </p>
    </div>
  );
}

function EmptyStateStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-pulse-border/70 bg-pulse-panel/55 p-3">
      <p className="font-semibold text-pulse-text">{title}</p>
      <p className="mt-1 text-pulse-muted">{body}</p>
    </div>
  );
}

function ScannerSkeleton({ candidates }: { candidates: number }) {
  const status =
    candidates > 0
      ? `Re-validating ${candidates} historical approval candidate${
          candidates === 1 ? "" : "s"
        } with live on-chain reads.`
      : "Searching explorer logs for ERC-20/PRC-20-compatible approval history.";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-pulse-cyan/30 bg-pulse-cyan/5 p-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-pulse-cyan"
            aria-hidden
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Scan in progress
            </p>
            <p className="mt-1 text-sm text-pulse-muted">{status}</p>
            <p className="mt-1 text-xs text-pulse-muted/80">
              This step is read-only. Revoke transactions are requested only
              after you choose an approval and confirm it.
            </p>
          </div>
        </div>
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
    <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
      <div className="flex flex-col items-start gap-4 text-left">
        <span
          className={`text-xs font-semibold uppercase tracking-[0.18em] ${eyebrowClass}`}
        >
          {eyebrow}
        </span>
        <h3 className="max-w-xl text-2xl font-semibold text-pulse-text sm:text-3xl">
          {title}
        </h3>
        <p className="max-w-xl leading-6 text-pulse-muted">{body}</p>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="rounded-2xl border border-pulse-border bg-pulse-bg/50 p-4 text-xs text-pulse-muted">
        <p className="font-semibold uppercase tracking-[0.16em] text-pulse-text">
          Safety posture
        </p>
        <ul className="mt-3 space-y-2">
          <li>No private keys or seed phrases.</li>
          <li>Reads are public wallet and chain data.</li>
          <li>Write requests happen only after you click revoke.</li>
        </ul>
      </div>
    </div>
  );
}
