"use client";

import { useMemo, useState, type CSSProperties } from "react";

import type {
  VisualizerEdge,
  VisualizerGraph,
  VisualizerNode,
} from "@/lib/intel/visualizer-types";
import {
  getCurvedVisualizerPath,
  getVisualizerEdgeTone,
  getVisualizerNodeTone,
} from "@/lib/intel/visualizer-utils";

export function VisualizerGraphCanvas({
  graph,
  visibleEdges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
}: {
  graph: VisualizerGraph;
  visibleEdges: readonly VisualizerEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>([graph.centerNodeId]);
    for (const edge of visibleEdges) {
      ids.add(edge.from);
      ids.add(edge.to);
    }
    return ids;
  }, [graph.centerNodeId, visibleEdges]);
  const selectedFocusNodeId =
    selectedNodeId && selectedNodeId !== graph.centerNodeId
      ? selectedNodeId
      : null;
  const focusNodeId = hoveredNodeId ?? selectedFocusNodeId;
  const focusEdgeId = hoveredEdgeId ?? selectedEdgeId;
  const hasFocus = focusNodeId !== null || focusEdgeId !== null;
  const relatedNodeIds = new Set<string>();
  const activeEdgeIds = new Set<string>();

  if (focusNodeId) relatedNodeIds.add(focusNodeId);

  for (const edge of visibleEdges) {
    const touchesFocusNode =
      focusNodeId !== null &&
      (edge.from === focusNodeId || edge.to === focusNodeId);
    const isFocusEdge = edge.id === focusEdgeId;

    if (touchesFocusNode || isFocusEdge) {
      activeEdgeIds.add(edge.id);
      relatedNodeIds.add(edge.from);
      relatedNodeIds.add(edge.to);
    }
  }

  return (
    <div className="intel-viz-canvas relative min-h-[620px] overflow-hidden rounded-[1.75rem] border border-pulse-border bg-pulse-bg/80 lg:min-h-[calc(100dvh-10.75rem)]">
      <div className="intel-viz-grid pointer-events-none absolute inset-0" />
      <div className="intel-viz-noise pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-pulse-border/80 bg-pulse-bg/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-pulse-muted">
        Local demo graph / no live reads
      </div>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="PulseChain visualizer demo graph"
      >
        {visibleEdges.map((edge) => {
          const from = nodeById.get(edge.from);
          const to = nodeById.get(edge.to);
          if (!from || !to) return null;

          const path = getCurvedVisualizerPath(from, to);
          const isActive = activeEdgeIds.has(edge.id);
          const showLabel = edge.id === focusEdgeId;
          const isDimmed = hasFocus && !isActive;
          const toneClass = getVisualizerEdgeTone(edge.direction);
          const width = Math.min(4, Math.max(1.1, 1 + edge.txCount * 0.18));

          return (
            <g
              key={edge.id}
              className="cursor-pointer"
              onClick={() => onSelectEdge(edge.id)}
              onMouseEnter={() => setHoveredEdgeId(edge.id)}
              onMouseLeave={() => setHoveredEdgeId(null)}
            >
              <path
                d={path}
                className={`intel-viz-edge-shadow ${
                  isDimmed
                    ? "opacity-10"
                    : isActive
                      ? "opacity-80"
                      : "opacity-[0.34]"
                }`}
                strokeWidth={width + 4.2}
                strokeLinecap="round"
                fill="none"
              />
              <path
                d={path}
                className={`intel-viz-edge ${toneClass} ${
                  isActive ? "intel-viz-edge-active" : ""
                } ${isDimmed ? "intel-viz-edge-dimmed" : ""}`}
                strokeWidth={isActive ? width + 0.8 : width}
                strokeLinecap="round"
                fill="none"
              />
              <circle
                cx={to.x}
                cy={to.y}
                r={isActive ? 1.25 : 0.82}
                className={`intel-viz-edge-terminal ${toneClass} ${
                  isDimmed ? "opacity-15" : "opacity-70"
                }`}
                fill="rgb(var(--pulse-bg) / 0.86)"
                strokeWidth="0.9"
              />
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 1.8}
                  textAnchor="middle"
                  className={`intel-viz-edge-label text-[2.75px] ${
                  showLabel
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

      {graph.nodes.map((node) => {
        const isVisible = visibleNodeIds.has(node.id);
        const isSelected = node.id === selectedNodeId;
        const isRelated = relatedNodeIds.has(node.id);
        const isDimmed = hasFocus && !isRelated;
        const size = getNodeSize(node);
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
            aria-label={`Inspect ${node.label}`}
            onClick={() => onSelectNode(node.id)}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
            onFocus={() => setHoveredNodeId(node.id)}
            onBlur={() => setHoveredNodeId(null)}
            className={`intel-viz-node-button absolute z-20 ${size} ${
              getVisualizerNodeTone(node.kind)
            } ${isSelected ? "intel-viz-node-selected" : ""} ${
              isRelated ? "intel-viz-node-related" : ""
            } ${isDimmed ? "intel-viz-node-dimmed" : ""} ${
              !isVisible ? "intel-viz-node-hidden" : ""
            }`}
          >
            <span className="intel-viz-node-ring" aria-hidden />
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-pulse-text/10 bg-pulse-bg/70 font-mono text-[11px] font-bold text-pulse-text">
              {getNodeGlyph(node)}
            </span>
            <span className="relative mt-1 block max-w-[5.2rem] truncate px-1 text-[10px] font-semibold leading-3">
              {node.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function getNodeSize(node: VisualizerNode) {
  if (node.kind === "searched-wallet") return "h-[6.5rem] w-[6.5rem]";
  if (node.volumeScore >= 70) return "h-[5.6rem] w-[5.6rem]";
  if (node.volumeScore >= 45) return "h-[4.8rem] w-[4.8rem]";
  return "h-[4rem] w-[4rem]";
}

function getNodeGlyph(node: VisualizerNode) {
  switch (node.kind) {
    case "searched-wallet":
      return "W";
    case "router":
      return "R";
    case "known-protocol":
      return "P";
    case "token-contract":
      return "T";
    case "lp-pair":
      return "LP";
    case "unknown-contract":
      return "?";
    case "spender":
      return "S";
    case "wallet":
    default:
      return "A";
  }
}
