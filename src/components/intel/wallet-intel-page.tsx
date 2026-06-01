"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { IntelShellHeader, IntelStatusBadge } from "@/components/intel/intel-shell";
import { SiteFooter } from "@/components/sections/site-footer";
import {
  buildDemoWalletIntel,
  DEMO_INTEL_WALLET,
} from "@/lib/intel/demo-wallet";
import { compactIntelAddress, validateIntelWalletAddress } from "@/lib/intel/address";
import type {
  IntelGraphEdge,
  IntelGraphEdgeKind,
  IntelGraphNode,
} from "@/lib/intel/types";

const GRAPH_FILTERS = [
  { key: "all", label: "All" },
  { key: "approval", label: "Approvals" },
  { key: "token-flow", label: "Tokens" },
  { key: "native-flow", label: "Native" },
  { key: "staking", label: "Staking" },
  { key: "liquidity", label: "Liquidity" },
  { key: "swap", label: "Swaps" },
] as const;

type GraphFilter = (typeof GRAPH_FILTERS)[number]["key"];

const WALLET_STATUS_BADGES = [
  "Read-only view",
  "No live RPC",
  "Demo data",
] as const;

const REPORT_STEPS = [
  {
    title: "1. Validate address",
    body: "Place the wallet at the center without connecting it.",
  },
  {
    title: "2. Review context",
    body: "Scan the summary, activity, and visible relationships.",
  },
  {
    title: "3. Plan research",
    body: "Use findings as questions for a future capped live-read phase.",
  },
] as const;

const GRAPH_LEGEND = [
  ["Approval", "bg-pulse-pink"],
  ["Token", "bg-pulse-cyan"],
  ["Native", "bg-pulse-green"],
  ["Staking", "bg-pulse-purple"],
  ["Liquidity", "bg-pulse-yellow"],
] as const;

const EDGE_TONE: Record<IntelGraphEdgeKind, string> = {
  approval: "stroke-pulse-pink",
  "token-flow": "stroke-pulse-cyan",
  "native-flow": "stroke-pulse-green",
  staking: "stroke-pulse-purple",
  swap: "stroke-pulse-yellow",
  liquidity: "stroke-pulse-cyan",
};

const NODE_DOT_TONE: Record<IntelGraphNode["kind"], string> = {
  wallet: "bg-pulse-pink",
  contract: "bg-pulse-cyan",
  token: "bg-pulse-green",
  staking: "bg-pulse-purple",
  liquidity: "bg-pulse-yellow",
};

function getCurvedEdgePath(from: IntelGraphNode, to: IntelGraphNode): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const curveStrength = Math.min(8, Math.max(3.5, length * 0.12));
  const normalX = (-dy / length) * curveStrength;
  const normalY = (dx / length) * curveStrength;

  return `M ${from.x} ${from.y} Q ${midX + normalX} ${midY + normalY} ${to.x} ${to.y}`;
}

export function WalletIntelPage() {
  const [addressInput, setAddressInput] = useState<string>(DEMO_INTEL_WALLET);
  const [filter, setFilter] = useState<GraphFilter>("all");
  const [selectedNodeId, setSelectedNodeId] = useState("searched-wallet");

  const validation = useMemo(
    () => validateIntelWalletAddress(addressInput),
    [addressInput],
  );
  const report = useMemo(
    () =>
      buildDemoWalletIntel(
        validation.ok ? validation.normalizedAddress : DEMO_INTEL_WALLET,
      ),
    [validation],
  );

  const selectedNode =
    report.graph.nodes.find((node) => node.id === selectedNodeId) ??
    report.graph.nodes.find((node) => node.id === report.graph.centerNodeId) ??
    report.graph.nodes[0];

  const visibleEdges = useMemo(
    () =>
      filter === "all"
        ? report.graph.edges
        : report.graph.edges.filter((edge) => edge.kind === filter),
    [filter, report.graph.edges],
  );
  const resetToDemoWallet = () => {
    setAddressInput(DEMO_INTEL_WALLET);
    setSelectedNodeId(report.graph.centerNodeId);
    setFilter("all");
  };

  return (
    <div className="min-h-dvh bg-pulse-bg text-pulse-text">
      <IntelShellHeader />
      <main>
        <section className="border-b border-pulse-border/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.7fr)] lg:items-start">
            <div className="min-w-0">
              <IntelStatusBadge>Wallet Intelligence demo</IntelStatusBadge>
              <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.07] sm:text-6xl">
                Inspect a wallet before deeper research.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-pulse-muted sm:text-lg">
                Paste an EVM address to place it at the center of a local
                PulseChain demo report. This page uses static sample data,
                client-side validation, and no wallet connection.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {WALLET_STATUS_BADGES.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-xs font-semibold text-pulse-muted"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <form
              className="rounded-3xl border border-pulse-cyan/25 bg-pulse-panel/70 p-5 shadow-glow"
              onSubmit={(event) => event.preventDefault()}
            >
              <label
                htmlFor="intel-wallet-address"
                className="text-sm font-semibold text-pulse-text"
              >
                Wallet address
              </label>
              <p className="mt-2 text-sm leading-6 text-pulse-muted">
                Validation happens locally. The current pass does not query
                explorers, RPC endpoints, or reputation feeds.
              </p>
              <input
                id="intel-wallet-address"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                value={addressInput}
                onChange={(event) => setAddressInput(event.target.value)}
                placeholder="0x..."
                className="mt-4 w-full rounded-2xl border border-pulse-border bg-pulse-bg/80 px-4 py-3 font-mono text-sm text-pulse-text outline-none transition placeholder:text-pulse-muted/70 focus:border-pulse-cyan focus:ring-2 focus:ring-pulse-cyan/25"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={resetToDemoWallet}
                  className="inline-flex items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-4 py-2 text-sm font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
                >
                  Load demo wallet
                </button>
                <a
                  href="#demo-report"
                  className="inline-flex items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-4 py-2 text-sm font-semibold text-pulse-text transition hover:bg-pulse-text/10"
                >
                  Jump to report
                </a>
              </div>
              <div className="mt-3 min-h-6 text-sm">
                {validation.ok ? (
                  <p className="text-pulse-green">
                    Demo report centered on{" "}
                    {compactIntelAddress(validation.normalizedAddress)}.
                  </p>
                ) : (
                  <p className="text-pulse-yellow">{validation.reason}</p>
                )}
              </div>
            </form>
          </div>
        </section>

        <section
          id="demo-report"
          className="border-b border-pulse-border/60 py-10 sm:py-14"
        >
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.38fr)]">
            <ReportOverviewCard walletAddress={report.walletAddress} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <SummaryStat
                label="Demo value"
                value={report.summary.totalValueLabel}
                note="Local portfolio sample"
              />
              <SummaryStat
                label="Relations"
                value={String(report.summary.relationCount)}
                note="One-hop graph edges"
              />
            </div>
          </div>
          <div className="mx-auto mt-4 grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {REPORT_STEPS.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-pulse-border bg-pulse-panel/45 p-4"
              >
                <h3 className="text-sm font-semibold text-pulse-text">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-pulse-muted">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-pulse-border/60 py-12 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
            <div className="grid gap-6">
              <PortfolioPanel report={report} />
              <ActivityPanel report={report} />
            </div>
            <DemoStatusPanel walletAddress={report.walletAddress} />
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
            <GraphPanel
              nodes={report.graph.nodes}
              edges={visibleEdges}
              selectedNodeId={selectedNode.id}
              onSelectNode={setSelectedNodeId}
              filter={filter}
              onFilterChange={setFilter}
            />
            <NodeDetailsPanel node={selectedNode} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-pulse-border bg-pulse-panel/55 p-5">
      <p className="text-xs font-semibold text-pulse-cyan">{label}</p>
      <p className="mt-2 text-3xl font-bold text-pulse-text">{value}</p>
      <p className="mt-2 text-sm text-pulse-muted">{note}</p>
    </div>
  );
}

function ReportOverviewCard({
  walletAddress,
}: {
  walletAddress: `0x${string}`;
}) {
  return (
    <section className="rounded-3xl border border-pulse-cyan/25 bg-pulse-panel/70 p-5 shadow-glow sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pulse-cyan">
            Demo report status
          </p>
          <h2 className="mt-2 text-3xl font-bold text-pulse-text">
            Local sample report ready for review.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-pulse-muted sm:text-base">
            The wallet address drives the center node only. Portfolio values,
            activity, labels, and relationships remain static sample records
            until a live-data phase is approved.
          </p>
        </div>
        <div className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4 lg:min-w-72">
          <p className="text-xs font-semibold text-pulse-cyan">
            Center wallet
          </p>
          <p className="mt-2 break-all font-mono text-sm text-pulse-text">
            {walletAddress}
          </p>
        </div>
      </div>
    </section>
  );
}

function PortfolioPanel({
  report,
}: {
  report: ReturnType<typeof buildDemoWalletIntel>;
}) {
  return (
    <section className="rounded-3xl border border-pulse-border bg-pulse-panel/55 p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-pulse-cyan">
            Demo portfolio summary
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-pulse-text">
            Visible PulseChain positions
          </h2>
        </div>
        <p className="text-xs text-pulse-muted">{report.generatedAtLabel}</p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {report.portfolio.map((item) => (
          <article
            key={item.symbol}
            className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold text-pulse-cyan">
                  {item.symbol}
                </p>
                <h3 className="mt-1 text-base font-semibold text-pulse-text">
                  {item.name}
                </h3>
              </div>
              <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-2.5 py-1 text-[11px] text-pulse-muted">
                {item.chain}
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-pulse-text">
              {item.valueLabel}
            </p>
            <p className="mt-2 text-sm font-semibold text-pulse-yellow">
              {item.exposureLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-pulse-muted">
              {item.note}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({
  report,
}: {
  report: ReturnType<typeof buildDemoWalletIntel>;
}) {
  return (
    <section className="rounded-3xl border border-pulse-border bg-pulse-panel/55 p-5 sm:p-6">
      <p className="text-sm font-semibold text-pulse-cyan">
        Demo decoded activity feed
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-pulse-text">
        Recent sample signals
      </h2>

      <div className="mt-5 grid gap-3">
        {report.activity.map((item) => (
          <article
            key={item.id}
            className="grid gap-3 rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
          >
            <div>
              <p className="font-mono text-xs text-pulse-muted">
                {item.timestampLabel}
              </p>
              <p className="mt-1 text-xs font-semibold text-pulse-cyan">
                {item.chain}
              </p>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-pulse-text">
                {item.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-pulse-muted">
                {item.description}
              </p>
            </div>
            <span className="h-fit rounded-full border border-pulse-border bg-pulse-panel/75 px-2.5 py-1 text-[11px] font-semibold text-pulse-muted">
              {item.severity}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

function DemoStatusPanel({ walletAddress }: { walletAddress: `0x${string}` }) {
  return (
    <aside className="rounded-3xl border border-pulse-cyan/25 bg-pulse-panel/70 p-5 shadow-glow">
      <p className="text-sm font-semibold text-pulse-cyan">Report mode</p>
      <h2 className="mt-2 text-2xl font-semibold text-pulse-text">
        Local demo only
      </h2>
      <p className="mt-3 text-sm leading-6 text-pulse-muted">
        The address changes the center node, but all balances, labels, activity,
        and relationships are static sample records for this foundation pass.
      </p>
      <dl className="mt-5 grid gap-3 text-sm">
        <div className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4">
          <dt className="text-xs font-semibold text-pulse-cyan">
            Disabled in this pass
          </dt>
          <dd className="mt-2 text-pulse-muted">
            Live explorer reads, wallet prompts, transaction submission, and
            automated actions.
          </dd>
        </div>
        <div className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4">
          <dt className="text-xs font-semibold text-pulse-cyan">
            Current center
          </dt>
          <dd className="mt-2 break-all font-mono text-pulse-text">
            {walletAddress}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

function GraphPanel({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  filter,
  onFilterChange,
}: {
  nodes: readonly IntelGraphNode[];
  edges: readonly IntelGraphEdge[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  filter: GraphFilter;
  onFilterChange: (filter: GraphFilter) => void;
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const hoveredEdge = edges.find((edge) => edge.id === hoveredEdgeId) ?? null;
  const spotlightNodeId =
    hoveredNodeId ?? (hoveredEdgeId ? null : selectedNodeId);
  const hasPointerSpotlight = hoveredNodeId !== null || hoveredEdgeId !== null;
  const activeEdgeIds = new Set<string>();
  const relatedNodeIds = new Set<string>(
    spotlightNodeId ? [spotlightNodeId] : [],
  );

  for (const edge of edges) {
    const isNodeEdge =
      spotlightNodeId !== null &&
      (edge.from === spotlightNodeId || edge.to === spotlightNodeId);
    const isHoveredEdge = edge.id === hoveredEdgeId;

    if (isNodeEdge || isHoveredEdge) {
      activeEdgeIds.add(edge.id);
      relatedNodeIds.add(edge.from);
      relatedNodeIds.add(edge.to);
    }
  }

  if (hoveredEdge) {
    relatedNodeIds.add(hoveredEdge.from);
    relatedNodeIds.add(hoveredEdge.to);
  }

  return (
    <section className="rounded-3xl border border-pulse-border bg-pulse-panel/55 p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-pulse-cyan">
            One-hop constellation graph
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-pulse-text">
            Demo relationship map
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            Hover/select nodes to spotlight relationships and pin details.
          </p>
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-pulse-border bg-pulse-bg/45 p-1">
          {GRAPH_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onFilterChange(item.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === item.key
                  ? "bg-pulse-cyan text-pulse-bg"
                  : "text-pulse-muted hover:bg-pulse-text/5 hover:text-pulse-text"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="intel-map-stage relative mt-6 aspect-[16/10] min-h-[320px] overflow-hidden rounded-3xl border border-pulse-border bg-pulse-bg/65">
        <div className="intel-map-grid pointer-events-none absolute inset-0" />
        <div className="intel-map-depth pointer-events-none absolute inset-6 rounded-[1.75rem]" />
        <div className="intel-map-axis pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2" />
        <div className="intel-map-axis pointer-events-none absolute left-0 top-1/2 h-px w-full -translate-y-1/2" />
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-pulse-border/80 bg-pulse-bg/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-pulse-muted">
          One-hop / local demo
        </div>
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          aria-label="Animated demo relationship map"
          role="img"
        >
          {edges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);

            if (!from || !to) return null;

            const path = getCurvedEdgePath(from, to);
            const isActive = hasPointerSpotlight && activeEdgeIds.has(edge.id);
            const isDimmed = hasPointerSpotlight && !isActive;

            return (
              <g
                key={edge.id}
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
              >
                <path
                  d={path}
                  className={`intel-edge-shadow ${
                    isActive
                      ? "opacity-70"
                      : isDimmed
                        ? "opacity-10"
                        : "opacity-22"
                  }`}
                  strokeWidth={edge.kind === "approval" ? 5.5 : 4.4}
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d={path}
                  className={`intel-edge-flow ${EDGE_TONE[edge.kind]} ${
                    isActive
                      ? "intel-edge-active"
                      : isDimmed
                        ? "intel-edge-muted"
                        : ""
                  }`}
                  strokeWidth={isActive ? 1.85 : 1.15}
                  strokeLinecap="round"
                  fill="none"
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 2}
                  textAnchor="middle"
                  className={`intel-edge-label text-[3px] ${
                    isActive
                      ? "fill-pulse-text opacity-100"
                      : "fill-pulse-muted opacity-0"
                  }`}
                >
                  {edge.label}
                </text>
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          const size =
            node.weight === "primary"
              ? "h-20 w-20"
              : node.weight === "strong"
                ? "h-16 w-16"
                : "h-14 w-14";
          const isSelected = node.id === selectedNodeId;
          const isRelated = relatedNodeIds.has(node.id);
          const isDimmed = hasPointerSpotlight && !isRelated;
          const style = {
            left: `${node.x}%`,
            top: `${node.y}%`,
            transform: "translate(-50%, -50%)",
          } satisfies CSSProperties;

          return (
            <button
              key={node.id}
              type="button"
              style={style}
              aria-pressed={isSelected}
              aria-label={`Inspect ${node.label} ${node.kind} node`}
              onClick={() => onSelectNode(node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onFocus={() => setHoveredNodeId(node.id)}
              onBlur={() => setHoveredNodeId(null)}
              className={`intel-node-button absolute flex ${size} flex-col items-center justify-center rounded-2xl border text-center text-[10px] font-semibold leading-3 transition ${
                isSelected
                  ? "intel-node-selected border-pulse-cyan bg-pulse-cyan/18 text-pulse-text shadow-glow"
                  : "border-pulse-border bg-pulse-panel/85 text-pulse-muted hover:border-pulse-cyan/50 hover:text-pulse-text"
              } ${
                isRelated ? "intel-node-related" : ""
              } ${isDimmed ? "intel-node-dimmed" : ""} ${
                node.weight === "primary" ? "intel-node-core" : ""
              }`}
            >
              <span className="intel-node-surface" aria-hidden />
              <span
                className={`relative mb-1 h-2 w-2 rounded-full ${NODE_DOT_TONE[node.kind]}`}
                aria-hidden
              />
              <span className="relative block max-w-[4.25rem] truncate px-1">
                {node.label}
              </span>
              <span className="relative mt-1 rounded-full bg-pulse-bg/70 px-1.5 py-0.5 font-mono text-[9px]">
                {node.kind}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-pulse-muted">
        {GRAPH_LEGEND.map(([label, colorClass]) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 rounded-full border border-pulse-border bg-pulse-bg/45 px-3 py-1"
          >
            <span
              className={`h-2 w-2 rounded-full ${colorClass}`}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function NodeDetailsPanel({ node }: { node: IntelGraphNode }) {
  return (
    <aside className="rounded-3xl border border-pulse-cyan/25 bg-pulse-panel/70 p-5 shadow-glow">
      <p className="text-sm font-semibold text-pulse-cyan">Node details</p>
      <h2 className="mt-2 text-2xl font-semibold text-pulse-text">
        {node.label}
      </h2>
      <p className="mt-3 text-sm leading-6 text-pulse-muted">
        {node.description}
      </p>
      <dl className="mt-5 grid gap-3 text-sm">
        <div className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4">
          <dt className="text-xs font-semibold text-pulse-cyan">Kind</dt>
          <dd className="mt-2 text-pulse-text">{node.kind}</dd>
        </div>
        {node.address ? (
          <div className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4">
            <dt className="text-xs font-semibold text-pulse-cyan">Address</dt>
            <dd className="mt-2 break-all font-mono text-pulse-text">
              {node.address}
            </dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}
