"use client";

import type { ReactNode } from "react";

import type {
  VisualizerGraph,
  VisualizerNode,
  VisualizerTransaction,
} from "@/lib/intel/visualizer-types";
import type {
  VisualizerDirectionFilter,
  VisualizerFilters,
} from "@/lib/intel/visualizer-utils";

const MIN_VALUE_OPTIONS = [
  { label: "Any value", value: 0 },
  { label: "$1k+", value: 1000 },
  { label: "$5k+", value: 5000 },
  { label: "$25k+", value: 25000 },
] as const;

const DIRECTION_OPTIONS = [
  { label: "Both", value: "both" },
  { label: "Inflow", value: "inflow" },
  { label: "Outflow", value: "outflow" },
  { label: "Internal", value: "internal" },
  { label: "Approvals", value: "approval" },
  { label: "Warnings", value: "warning" },
] as const satisfies readonly {
  label: string;
  value: VisualizerDirectionFilter;
}[];

export function VisualizerLeftPanel({
  graph,
  selectedNode,
  transactions,
  onSelectTransaction,
}: {
  graph: VisualizerGraph;
  selectedNode: VisualizerNode;
  transactions: readonly VisualizerTransaction[];
  onSelectTransaction: (edgeId: string) => void;
}) {
  const counterparties = graph.nodes
    .filter(
      (node) =>
        node.kind === "wallet" ||
        node.kind === "spender" ||
        node.kind === "high-risk-spender",
    )
    .slice(0, 6);

  return (
    <aside className="intel-viz-panel flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border border-pulse-border bg-pulse-panel/72">
      <div className="border-b border-pulse-border/70 p-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
          PulseChain Visualizer
        </p>
        <h2 className="mt-2 text-xl font-semibold text-pulse-text">
          Wallet scope
        </h2>
        <p className="mt-2 text-sm leading-6 text-pulse-muted">
          Local sample context for the selected wallet, entity, and flow cluster.
        </p>
      </div>

      <div className="grid gap-3 p-4">
        <MetricGrid
          items={[
            ["PLS balance", graph.summary.plsBalanceLabel],
            ["Token count", graph.summary.tokenCountLabel],
            ["First seen", graph.summary.firstSeenLabel],
            ["Last active", graph.summary.lastActiveLabel],
            ["Total inflow", graph.summary.totalInflowLabel],
            ["Total outflow", graph.summary.totalOutflowLabel],
          ]}
        />

        <div className="rounded-lg border border-pulse-border bg-pulse-bg/45 p-3">
          <p className="text-xs font-semibold text-pulse-cyan">
            Selected entity
          </p>
          <h3 className="mt-2 text-base font-semibold text-pulse-text">
            {selectedNode.label}
          </h3>
          <p className="mt-2 text-xs leading-5 text-pulse-muted">
            {selectedNode.description}
          </p>
        </div>

        <div className="rounded-lg border border-pulse-border bg-pulse-bg/45 p-3">
          <p className="text-xs font-semibold text-pulse-cyan">
            Top counterparties
          </p>
          <div className="mt-3 grid gap-2">
            {counterparties.map((node) => (
              <div
                key={node.id}
                className="flex items-center justify-between gap-3 rounded-md border border-pulse-border bg-pulse-panel/45 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-pulse-text">
                    {node.label}
                  </p>
                  <p className="text-xs text-pulse-muted">
                    {node.activityLabel}
                  </p>
                </div>
                <span className="shrink-0 rounded border border-pulse-border px-2 py-1 font-mono text-[10px] uppercase text-pulse-muted">
                  {node.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 border-t border-pulse-border/70 p-4">
        <p className="text-xs font-semibold text-pulse-cyan">
          Transaction list
        </p>
        <div className="mt-3 max-h-[24rem] max-w-full overflow-auto pr-1">
          <table className="w-full min-w-[32rem] border-separate border-spacing-y-2 text-left text-xs">
            <thead className="text-pulse-muted">
              <tr>
                {["time", "from", "to", "value", "token", "type", "status"].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-2 py-1 font-mono uppercase tracking-[0.14em]"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="cursor-pointer rounded-xl bg-pulse-bg/50 text-pulse-text transition hover:bg-pulse-text/5"
                  onClick={() => onSelectTransaction(transaction.edgeId)}
                >
                  <td className="rounded-l-xl px-2 py-2 text-pulse-muted">
                    {transaction.timeLabel}
                  </td>
                  <td className="px-2 py-2">{transaction.fromLabel}</td>
                  <td className="px-2 py-2">{transaction.toLabel}</td>
                  <td className="px-2 py-2 font-semibold">
                    {transaction.valueLabel}
                  </td>
                  <td className="px-2 py-2 text-pulse-cyan">
                    {transaction.token}
                  </td>
                  <td className="px-2 py-2">{transaction.typeLabel}</td>
                  <td className="rounded-r-xl px-2 py-2 text-pulse-muted">
                    {transaction.statusLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </aside>
  );
}

export function VisualizerFilterPanel({
  filters,
  onFiltersChange,
}: {
  filters: VisualizerFilters;
  onFiltersChange: (filters: VisualizerFilters) => void;
}) {
  return (
    <section className="intel-viz-panel rounded-lg border border-pulse-border bg-pulse-panel/72 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Filters
          </p>
          <h2 className="mt-2 text-lg font-semibold text-pulse-text">
            Graph layers
          </h2>
        </div>
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              direction: "both",
              minValueUsd: 0,
              showKnownProtocols: true,
              showUnknownContracts: true,
              showApprovals: true,
              showLpInteractions: true,
            })
          }
          className="rounded-md border border-pulse-border bg-pulse-bg/60 px-3 py-2 text-xs font-semibold text-pulse-muted transition hover:text-pulse-text"
        >
          Clear
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <ControlGroup label="Flow direction">
          <div className="grid grid-cols-2 gap-2">
            {DIRECTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onFiltersChange({ ...filters, direction: option.value })
                }
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                  filters.direction === option.value
                    ? "border-pulse-cyan/70 bg-pulse-cyan/15 text-pulse-text"
                    : "border-pulse-border bg-pulse-bg/45 text-pulse-muted hover:text-pulse-text"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </ControlGroup>

        <ControlGroup label="Minimum value">
          <div className="grid grid-cols-2 gap-2">
            {MIN_VALUE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onFiltersChange({ ...filters, minValueUsd: option.value })
                }
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                  filters.minValueUsd === option.value
                    ? "border-pulse-green/70 bg-pulse-green/10 text-pulse-text"
                    : "border-pulse-border bg-pulse-bg/45 text-pulse-muted hover:text-pulse-text"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </ControlGroup>

        <ControlGroup label="Visible layers">
          <div className="grid gap-2">
            <FilterToggle
              label="Known protocols"
              active={filters.showKnownProtocols}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  showKnownProtocols: !filters.showKnownProtocols,
                })
              }
            />
            <FilterToggle
              label="Unknown contracts"
              active={filters.showUnknownContracts}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  showUnknownContracts: !filters.showUnknownContracts,
                })
              }
            />
            <FilterToggle
              label="Approvals"
              active={filters.showApprovals}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  showApprovals: !filters.showApprovals,
                })
              }
            />
            <FilterToggle
              label="LP interactions"
              active={filters.showLpInteractions}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  showLpInteractions: !filters.showLpInteractions,
                })
              }
            />
          </div>
        </ControlGroup>
      </div>
    </section>
  );
}

function MetricGrid({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="min-w-0 rounded-lg border border-pulse-border bg-pulse-bg/45 p-3"
        >
          <p className="text-[11px] font-semibold text-pulse-muted">{label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-pulse-text">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-pulse-muted">{label}</p>
      {children}
    </div>
  );
}

function FilterToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-md border border-pulse-border bg-pulse-bg/45 px-3 py-2 text-xs font-semibold text-pulse-muted transition hover:text-pulse-text"
    >
      <span>{label}</span>
      <span
        className={`h-5 w-9 rounded-full border p-0.5 transition ${
          active
            ? "border-pulse-cyan/70 bg-pulse-cyan/20"
            : "border-pulse-border bg-pulse-panel"
        }`}
      >
        <span
          className={`block h-3.5 w-3.5 rounded-full transition ${
            active
              ? "translate-x-4 bg-pulse-cyan"
              : "translate-x-0 bg-pulse-muted"
          }`}
        />
      </span>
    </button>
  );
}
