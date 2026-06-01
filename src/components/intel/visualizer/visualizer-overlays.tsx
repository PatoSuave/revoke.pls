"use client";

import { VisualizerIcon } from "@/components/intel/visualizer/visualizer-icons";
import { VISUALIZER_TIME_RANGE_OPTIONS } from "@/components/intel/visualizer/visualizer-top-bar";
import type {
  VisualizerEdge,
  VisualizerGraph,
  VisualizerNode,
  VisualizerTransaction,
} from "@/lib/intel/visualizer-types";

export function VisualizerToolbar({
  zoomLabel,
  layoutLocked,
  onZoomIn,
  onZoomOut,
  onFit,
  onExpandSelected,
  onToggleLock,
  onExport,
}: {
  zoomLabel: string;
  layoutLocked: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onExpandSelected: () => void;
  onToggleLock: () => void;
  onExport: () => void;
}) {
  const actions = [
    ["plus", "Zoom in", onZoomIn],
    ["minus", "Zoom out", onZoomOut],
    ["fit", "Fit graph", onFit],
    ["expand", "Expand selected", onExpandSelected],
    ["lock", layoutLocked ? "Unlock layout" : "Lock layout", onToggleLock],
    ["image", "Export placeholder", onExport],
  ] as const;

  return (
    <div className="pointer-events-auto absolute right-3 top-24 z-30 flex max-w-[calc(100%-1.5rem)] items-center gap-2 overflow-x-auto rounded-lg border border-pulse-border bg-pulse-bg/78 p-2 shadow-glow backdrop-blur-xl sm:right-4 md:flex-col">
      <span className="rounded-md border border-pulse-border bg-pulse-panel/80 px-2 py-1 font-mono text-[10px] text-pulse-cyan">
        {zoomLabel}
      </span>
      {actions.map(([icon, label, action]) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-label={label}
          onClick={action}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-pulse-border bg-pulse-panel/70 text-pulse-muted transition hover:border-pulse-cyan/45 hover:text-pulse-text"
        >
          <VisualizerIcon name={icon} className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export function VisualizerTimeline({
  graph,
  activeTimeRange,
  onTimeRangeChange,
}: {
  graph: VisualizerGraph;
  activeTimeRange: string;
  onTimeRangeChange: (range: string) => void;
}) {
  return (
    <section className="absolute inset-x-3 bottom-3 z-30 rounded-lg border border-pulse-border bg-pulse-bg/76 p-2.5 shadow-glow backdrop-blur-xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
            Volume timeline
          </p>
          <div className="intel-viz-timeline-strip mt-2 flex h-14 min-w-0 items-end gap-1 overflow-x-auto rounded-md border border-pulse-border bg-pulse-panel/38 px-3 pb-2 pt-3">
            {graph.timeline.map((bucket) => (
              <button
                key={bucket.label}
                type="button"
                onClick={() => onTimeRangeChange(bucket.label)}
                className={`intel-viz-timeline-bar intel-viz-timeline-${bucket.direction} shrink-0 rounded-t-md transition hover:brightness-125 ${
                  activeTimeRange === bucket.label
                    ? "intel-viz-timeline-active"
                    : ""
                }`}
                style={{ height: `${Math.max(18, bucket.volume)}%` }}
                title={`${bucket.label} preview volume`}
                aria-label={`${bucket.label} preview volume`}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-md border border-pulse-border bg-pulse-panel/45 p-1">
          {VISUALIZER_TIME_RANGE_OPTIONS.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onTimeRangeChange(range)}
              className={`shrink-0 rounded px-3 py-1.5 text-xs font-semibold transition ${
                activeTimeRange === range
                  ? "bg-pulse-cyan text-pulse-bg"
                  : "text-pulse-muted hover:bg-pulse-text/5 hover:text-pulse-text"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VisualizerDetailDrawer({
  selectedNode,
  selectedEdge,
  transactions,
}: {
  selectedNode: VisualizerNode;
  selectedEdge: VisualizerEdge | null;
  transactions: readonly VisualizerTransaction[];
}) {
  const address = selectedNode.address;
  const explorerHref = address
    ? `https://scan.pulsechain.com/address/${address}`
    : undefined;

  return (
    <aside className="intel-viz-panel max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-lg border border-pulse-border bg-pulse-panel/72 p-4">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
        Entity inspector
      </p>
      {selectedEdge ? (
        <EdgeDetails edge={selectedEdge} transactions={transactions} />
      ) : (
        <NodeDetails node={selectedNode} explorerHref={explorerHref} />
      )}
    </aside>
  );
}

function NodeDetails({
  node,
  explorerHref,
}: {
  node: VisualizerNode;
  explorerHref?: string;
}) {
  return (
    <div>
      <h2 className="mt-3 text-2xl font-semibold text-pulse-text">
        {node.label}
      </h2>
      <p className="mt-3 text-sm leading-6 text-pulse-muted">
        {node.description}
      </p>
      <dl className="mt-5 grid gap-3 text-sm">
        <DetailRow label="Type" value={node.kind} />
        <DetailRow label="Confidence" value={node.confidenceLabel} />
        <DetailRow label="Balance" value={node.balanceLabel} />
        <DetailRow label="Activity" value={node.activityLabel} />
        {node.address ? (
          <DetailRow label="Address" value={node.address} mono />
        ) : null}
      </dl>
      <div className="mt-4 grid gap-2">
        {node.address ? (
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(node.address ?? "")}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-pulse-border bg-pulse-bg/55 px-4 py-2 text-sm font-semibold text-pulse-text transition hover:border-pulse-cyan/45"
          >
            <VisualizerIcon name="copy" className="h-4 w-4" />
            Copy address
          </button>
        ) : null}
        {explorerHref ? (
          <a
            href={explorerHref}
            target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md border border-pulse-cyan/35 bg-pulse-cyan/10 px-4 py-2 text-sm font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
        >
            Open in explorer
          </a>
        ) : null}
      </div>
    </div>
  );
}

function EdgeDetails({
  edge,
  transactions,
}: {
  edge: VisualizerEdge;
  transactions: readonly VisualizerTransaction[];
}) {
  const relatedTransactions = transactions.filter((transaction) =>
    edge.transactionIds.includes(transaction.id),
  );

  return (
    <div>
      <h2 className="mt-3 text-2xl font-semibold text-pulse-text">
        {edge.label}
      </h2>
      <p className="mt-3 text-sm leading-6 text-pulse-muted">
        Relationship summary with transaction count, value, token, and time
        range context.
      </p>
      <dl className="mt-5 grid gap-3 text-sm">
        <DetailRow label="Transaction count" value={`${edge.txCount}`} />
        <DetailRow label="Total value" value={edge.valueLabel} />
        <DetailRow label="Token" value={edge.token} />
        <DetailRow label="Direction" value={edge.direction} />
        <DetailRow label="First seen" value={edge.firstSeenLabel} />
        <DetailRow label="Last seen" value={edge.lastSeenLabel} />
      </dl>
      <div className="mt-5 rounded-lg border border-pulse-border bg-pulse-bg/45 p-3">
        <p className="text-xs font-semibold text-pulse-cyan">
          Sample transactions
        </p>
        <div className="mt-3 grid gap-2">
          {relatedTransactions.length > 0 ? (
            relatedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-md border border-pulse-border bg-pulse-panel/45 px-3 py-2 text-xs"
              >
                <div className="flex justify-between gap-3">
                  <span className="text-pulse-text">
                    {transaction.typeLabel}
                  </span>
                  <span className="text-pulse-muted">
                    {transaction.timeLabel}
                  </span>
                </div>
                <p className="mt-1 text-pulse-muted">
                  {transaction.valueLabel} {transaction.token}
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-md border border-pulse-border bg-pulse-panel/45 px-3 py-2 text-xs text-pulse-muted">
              No transaction rows match this filtered preview edge.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-pulse-border bg-pulse-bg/45 p-3">
      <dt className="text-xs font-semibold text-pulse-cyan">{label}</dt>
      <dd
        className={`mt-2 break-words text-pulse-text ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
