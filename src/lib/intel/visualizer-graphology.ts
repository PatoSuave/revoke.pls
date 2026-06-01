import { MultiDirectedGraph } from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";

import type {
  VisualizerEdge,
  VisualizerFlowDirection,
  VisualizerGraph,
  VisualizerNode,
  VisualizerNodeKind,
  VisualizerStatus,
} from "./visualizer-types";
import { getVisibleVisualizerNodeIds } from "./visualizer-utils";

export interface VisualizerSigmaNodeAttributes {
  label: string;
  x: number;
  y: number;
  size: number;
  color: string;
  kind: VisualizerNodeKind;
  status: VisualizerStatus;
  forceLabel: boolean;
  zIndex: number;
  hidden: boolean;
  activityLabel: string;
}

export interface VisualizerSigmaEdgeAttributes {
  label: string;
  size: number;
  color: string;
  kind: VisualizerEdge["kind"];
  direction: VisualizerFlowDirection;
  valueUsd: number;
  txCount: number;
  status: VisualizerStatus;
  weight: number;
  forceLabel: boolean;
  zIndex: number;
  hidden: boolean;
}

export type VisualizerSigmaGraph = MultiDirectedGraph<
  VisualizerSigmaNodeAttributes,
  VisualizerSigmaEdgeAttributes
>;

const NODE_COLORS: Record<VisualizerNodeKind, string> = {
  "searched-wallet": "#22d3ee",
  wallet: "#e8e9ff",
  "known-protocol": "#2dd4bf",
  "token-contract": "#00e5a0",
  "lp-pair": "#7c3aed",
  router: "#38bdf8",
  "unknown-contract": "#fbbf24",
  "high-risk-spender": "#ff4d6d",
  spender: "#f59e0b",
};

const EDGE_COLORS: Record<VisualizerFlowDirection, string> = {
  inflow: "#00e5a0",
  outflow: "#ff4d6d",
  internal: "#dfe4ff",
  approval: "#a855f7",
  warning: "#fbbf24",
};

export const VISUALIZER_DIMMED_COLOR = "#34384f";
export const VISUALIZER_HIDDEN_COLOR = "#1d2133";

export function buildVisualizerGraphologyGraph(
  graph: VisualizerGraph,
  visibleEdges: readonly VisualizerEdge[],
): VisualizerSigmaGraph {
  const sigmaGraph = new MultiDirectedGraph<
    VisualizerSigmaNodeAttributes,
    VisualizerSigmaEdgeAttributes
  >();
  const visibleEdgeIds = new Set(visibleEdges.map((edge) => edge.id));
  const visibleNodeIds = getVisibleVisualizerNodeIds(
    graph.centerNodeId,
    visibleEdges,
  );

  for (const node of graph.nodes) {
    sigmaGraph.addNode(node.id, buildSigmaNodeAttributes(node, visibleNodeIds));
  }

  for (const edge of graph.edges) {
    sigmaGraph.addDirectedEdgeWithKey(
      edge.id,
      edge.from,
      edge.to,
      buildSigmaEdgeAttributes(edge, visibleEdgeIds),
    );
  }

  forceAtlas2.assign(sigmaGraph, {
    iterations: 64,
    getEdgeWeight: "weight",
    settings: {
      adjustSizes: true,
      barnesHutOptimize: true,
      edgeWeightInfluence: 0.55,
      gravity: 0.72,
      linLogMode: true,
      scalingRatio: 2.6,
      slowDown: 4.2,
      strongGravityMode: true,
    },
  });

  if (sigmaGraph.hasNode(graph.centerNodeId)) {
    sigmaGraph.mergeNodeAttributes(graph.centerNodeId, {
      x: 0,
      y: 0,
      forceLabel: true,
      zIndex: 20,
    });
  }

  return sigmaGraph;
}

export function getVisualizerFocusSets({
  edges,
  focusNodeId,
  focusEdgeId,
}: {
  edges: readonly VisualizerEdge[];
  focusNodeId: string | null;
  focusEdgeId: string | null;
}) {
  const relatedNodeIds = new Set<string>();
  const activeEdgeIds = new Set<string>();

  if (focusNodeId) relatedNodeIds.add(focusNodeId);

  for (const edge of edges) {
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

  return { relatedNodeIds, activeEdgeIds };
}

function buildSigmaNodeAttributes(
  node: VisualizerNode,
  visibleNodeIds: ReadonlySet<string>,
): VisualizerSigmaNodeAttributes {
  const jitter = seededOffset(node.id);

  return {
    label: node.label,
    x: (node.x - 50) / 17 + jitter.x,
    y: (50 - node.y) / 17 + jitter.y,
    size: getNodeSize(node),
    color: NODE_COLORS[node.kind],
    kind: node.kind,
    status: node.status,
    forceLabel: node.kind === "searched-wallet" || node.volumeScore >= 60,
    zIndex: node.kind === "searched-wallet" ? 20 : Math.round(node.volumeScore),
    hidden: !visibleNodeIds.has(node.id),
    activityLabel: node.activityLabel,
  };
}

function buildSigmaEdgeAttributes(
  edge: VisualizerEdge,
  visibleEdgeIds: ReadonlySet<string>,
): VisualizerSigmaEdgeAttributes {
  return {
    label: edge.label,
    size: Math.min(5.4, Math.max(1.1, 1 + edge.txCount * 0.24)),
    color: EDGE_COLORS[edge.direction],
    kind: edge.kind,
    direction: edge.direction,
    valueUsd: edge.valueUsd,
    txCount: edge.txCount,
    status: edge.status,
    weight: Math.max(0.45, Math.log10(edge.valueUsd + 10)),
    forceLabel: edge.status === "elevated" || edge.status === "watch",
    zIndex: edge.status === "elevated" ? 9 : edge.status === "watch" ? 7 : 4,
    hidden: !visibleEdgeIds.has(edge.id),
  };
}

function getNodeSize(node: VisualizerNode) {
  if (node.kind === "searched-wallet") return 18;
  if (node.kind === "high-risk-spender") return 12.5;
  return Math.min(15, Math.max(5.5, 5 + node.volumeScore / 9));
}

function seededOffset(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return {
    x: ((hash % 37) - 18) / 230,
    y: (((hash >>> 8) % 37) - 18) / 230,
  };
}
