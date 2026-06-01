"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import type { SigmaGraphCanvasClientProps } from "@/components/intel/visualizer/sigma-graph-canvas";
import {
  buildVisualizerGraphologyGraph,
  getVisualizerFocusSets,
} from "@/lib/intel/visualizer-graphology";
import type {
  VisualizerEdge,
  VisualizerGraph,
  VisualizerNode,
} from "@/lib/intel/visualizer-types";

export type VisualizerGraphCommandAction =
  | "zoom-in"
  | "zoom-out"
  | "fit"
  | "expand-selected"
  | "toggle-lock"
  | "export";

export interface VisualizerGraphCommand {
  id: number;
  action: VisualizerGraphCommandAction;
}

export interface VisualizerGraphCanvasProps {
  graph: VisualizerGraph;
  visibleEdges: readonly VisualizerEdge[];
  selectedNodeId: string;
  selectedEdgeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onClearSelection: () => void;
  command: VisualizerGraphCommand | null;
  layoutLocked: boolean;
}

const SigmaGraphCanvasClient = dynamic<SigmaGraphCanvasClientProps>(
  () =>
    import("@/components/intel/visualizer/sigma-graph-canvas").then(
      (module) => module.SigmaGraphCanvasClient,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="intel-viz-sigma-loading">
        Loading WebGL intelligence graph...
      </div>
    ),
  },
);

export function VisualizerGraphCanvas({
  graph,
  visibleEdges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
  command,
  layoutLocked,
}: VisualizerGraphCanvasProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const sigmaGraph = useMemo(
    () => buildVisualizerGraphologyGraph(graph, visibleEdges),
    [graph, visibleEdges],
  );
  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const edgeById = useMemo(
    () => new Map(graph.edges.map((edge) => [edge.id, edge])),
    [graph.edges],
  );
  const focus = useMemo(
    () =>
      getVisualizerFocusSets({
        edges: visibleEdges,
        focusNodeId: hoveredNodeId ?? selectedNodeId,
        focusEdgeId: hoveredEdgeId ?? selectedEdgeId,
      }),
    [hoveredEdgeId, hoveredNodeId, selectedEdgeId, selectedNodeId, visibleEdges],
  );
  const hoveredNode = hoveredNodeId ? nodeById.get(hoveredNodeId) ?? null : null;
  const hoveredEdge = hoveredEdgeId ? edgeById.get(hoveredEdgeId) ?? null : null;

  return (
    <section
      className="intel-viz-canvas absolute inset-0 overflow-hidden shadow-glow"
      aria-label="PulseChain wallet graph"
    >
      <div className="pointer-events-none absolute inset-0 intel-viz-grid" />
      <div className="pointer-events-none absolute inset-0 intel-viz-noise" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full intel-viz-reticle" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-6rem)] rounded-lg border border-pulse-border bg-pulse-bg/64 px-3 py-2 shadow-glow backdrop-blur-xl sm:left-4 sm:top-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
          Trace canvas
        </p>
        <h1 className="mt-1 text-sm font-semibold text-pulse-text sm:text-base">
          PulseChain wallet graph
        </h1>
        <div className="mt-2 inline-flex rounded border border-pulse-cyan/30 bg-pulse-cyan/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-pulse-cyan">
          Sample data
        </div>
      </div>

      <div className="intel-viz-sigma-shell">
        <SigmaGraphCanvasClient
          sigmaGraph={sigmaGraph}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          hoveredNodeId={hoveredNodeId}
          hoveredEdgeId={hoveredEdgeId}
          relatedNodeIds={focus.relatedNodeIds}
          activeEdgeIds={focus.activeEdgeIds}
          onSelectNode={onSelectNode}
          onSelectEdge={onSelectEdge}
          onClearSelection={onClearSelection}
          onHoverNode={setHoveredNodeId}
          onHoverEdge={setHoveredEdgeId}
          command={command}
          layoutLocked={layoutLocked}
        />
      </div>

      <VisualizerGraphTooltip hoveredNode={hoveredNode} hoveredEdge={hoveredEdge} />

      <div className="pointer-events-none absolute left-3 right-3 top-[7.6rem] z-20 flex flex-wrap gap-1.5 sm:left-4 sm:right-auto">
        {[
          ["Wallet", "bg-pulse-text/75"],
          ["Protocol", "bg-pulse-cyan"],
          ["Token", "bg-pulse-green"],
          ["LP", "bg-pulse-purple"],
          ["Watch", "bg-pulse-yellow"],
          ["Elevated", "bg-pulse-red"],
        ].map(([label, tone]) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded border border-pulse-border bg-pulse-bg/58 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-pulse-muted backdrop-blur"
          >
            <span className={`h-2 w-2 rounded-full ${tone}`} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

function VisualizerGraphTooltip({
  hoveredNode,
  hoveredEdge,
}: {
  hoveredNode: VisualizerNode | null;
  hoveredEdge: VisualizerEdge | null;
}) {
  if (!hoveredNode && !hoveredEdge) return null;

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-30 w-[min(19rem,calc(100%-1.5rem))] rounded-lg border border-pulse-border bg-pulse-bg/88 p-3 shadow-glow backdrop-blur-xl sm:right-4 sm:top-4">
      {hoveredNode ? (
        <>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
            Entity hover
          </p>
          <h2 className="mt-2 text-sm font-semibold text-pulse-text">
            {hoveredNode.label}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <TooltipMetric label="Type" value={hoveredNode.kind} />
            <TooltipMetric label="Activity" value={hoveredNode.activityLabel} />
            <TooltipMetric label="Flow" value={hoveredNode.balanceLabel} />
            <TooltipMetric label="Status" value={hoveredNode.status} />
          </dl>
        </>
      ) : null}
      {hoveredEdge ? (
        <>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
            Relationship hover
          </p>
          <h2 className="mt-2 text-sm font-semibold text-pulse-text">
            {hoveredEdge.label}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <TooltipMetric label="Type" value={hoveredEdge.kind} />
            <TooltipMetric label="Value" value={hoveredEdge.valueLabel} />
            <TooltipMetric label="Tx count" value={`${hoveredEdge.txCount}`} />
            <TooltipMetric label="Direction" value={hoveredEdge.direction} />
          </dl>
        </>
      ) : null}
    </div>
  );
}

function TooltipMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-pulse-border bg-pulse-panel/44 px-2 py-1.5">
      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-pulse-muted">
        {label}
      </dt>
      <dd className="mt-1 truncate text-pulse-text">{value}</dd>
    </div>
  );
}
