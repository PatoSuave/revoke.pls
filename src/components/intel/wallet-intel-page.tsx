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

const EDGE_TONE: Record<IntelGraphEdgeKind, string> = {
  approval: "stroke-pulse-pink",
  "token-flow": "stroke-pulse-cyan",
  "native-flow": "stroke-pulse-green",
  staking: "stroke-pulse-purple",
  swap: "stroke-pulse-yellow",
  liquidity: "stroke-pulse-cyan",
};

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
                {["Read-only view", "No live RPC", "Demo data"].map((item) => (
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

        <section className="border-b border-pulse-border/60 py-10 sm:py-14">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-4">
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
            <SummaryStat
              label="Decoded events"
              value={String(report.summary.decodedActivityCount)}
              note="Static activity feed"
            />
            <SummaryStat
              label="Exposure markers"
              value={String(report.summary.exposureCount)}
              note="Review context only"
            />
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
            Center wallet
          </dt>
          <dd className="mt-2 break-all font-mono text-pulse-text">
            {walletAddress}
          </dd>
        </div>
        <div className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4">
          <dt className="text-xs font-semibold text-pulse-cyan">
            Disabled in this pass
          </dt>
          <dd className="mt-2 text-pulse-muted">
            Live explorer reads, wallet prompts, transaction submission, and
            automated actions.
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
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

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

      <div className="relative mt-6 aspect-[16/10] min-h-[320px] overflow-hidden rounded-3xl border border-pulse-border bg-pulse-bg/65">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          {edges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);

            if (!from || !to) return null;

            return (
              <g key={edge.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className={`${EDGE_TONE[edge.kind]} opacity-70`}
                  strokeWidth={edge.kind === "approval" ? 1.6 : 1.2}
                  strokeLinecap="round"
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 2}
                  textAnchor="middle"
                  className="fill-pulse-muted text-[3px]"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          const size =
            node.weight === "primary" ? "h-20 w-20" : node.weight === "strong" ? "h-16 w-16" : "h-14 w-14";
          const isSelected = node.id === selectedNodeId;
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
              onClick={() => onSelectNode(node.id)}
              className={`absolute flex ${size} flex-col items-center justify-center rounded-2xl border text-center text-[10px] font-semibold leading-3 transition ${
                isSelected
                  ? "border-pulse-cyan bg-pulse-cyan/18 text-pulse-text shadow-glow"
                  : "border-pulse-border bg-pulse-panel/85 text-pulse-muted hover:border-pulse-cyan/50 hover:text-pulse-text"
              }`}
            >
              <span className="block max-w-[4.25rem] truncate px-1">
                {node.label}
              </span>
              <span className="mt-1 rounded-full bg-pulse-bg/70 px-1.5 py-0.5 font-mono text-[9px]">
                {node.kind}
              </span>
            </button>
          );
        })}
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
