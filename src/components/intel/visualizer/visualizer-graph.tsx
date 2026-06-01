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
  command,
  layoutLocked,
}: VisualizerGraphCanvasProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const sigmaGraph = useMemo(
    () => buildVisualizerGraphologyGraph(graph, visibleEdges),
    [graph, visibleEdges],
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

  return (
    <section
      className="intel-viz-canvas relative h-[73dvh] min-h-[38rem] max-h-[calc(100dvh-8.5rem)] overflow-hidden rounded-lg border border-pulse-border shadow-glow"
      aria-label="PulseChain visualizer demo graph"
    >
      <div className="pointer-events-none absolute inset-0 intel-viz-grid" />
      <div className="pointer-events-none absolute inset-0 intel-viz-noise" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[31rem] w-[31rem] -translate-x-1/2 -translate-y-1/2 rounded-full intel-viz-reticle" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-6rem)] rounded-lg border border-pulse-border bg-pulse-bg/76 px-3 py-2 shadow-glow backdrop-blur-xl sm:left-4 sm:top-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
          Trace canvas
        </p>
        <h1 className="mt-1 text-sm font-semibold text-pulse-text sm:text-base">
          PulseChain visualizer demo graph
        </h1>
        <p className="mt-1 text-xs text-pulse-muted">
          Local sample graph. Live reads are not connected on this screen.
        </p>
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
          onHoverNode={setHoveredNodeId}
          onHoverEdge={setHoveredEdgeId}
          command={command}
          layoutLocked={layoutLocked}
        />
      </div>

      <div className="pointer-events-none absolute left-3 right-3 top-[7.7rem] z-20 flex flex-wrap gap-2 sm:left-4 sm:right-auto sm:top-[8.2rem]">
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
            className="inline-flex items-center gap-1.5 rounded border border-pulse-border bg-pulse-bg/68 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-pulse-muted backdrop-blur"
          >
            <span className={`h-2 w-2 rounded-full ${tone}`} />
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
