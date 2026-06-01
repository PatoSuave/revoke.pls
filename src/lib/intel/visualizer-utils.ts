import type {
  VisualizerEdge,
  VisualizerFlowDirection,
  VisualizerGraph,
  VisualizerNode,
} from "./visualizer-types";

export type VisualizerDirectionFilter =
  | "both"
  | "inflow"
  | "outflow"
  | "internal"
  | "approval"
  | "warning";

export interface VisualizerFilters {
  direction: VisualizerDirectionFilter;
  minValueUsd: number;
  showKnownProtocols: boolean;
  showUnknownContracts: boolean;
  showApprovals: boolean;
  showLpInteractions: boolean;
}

export const DEFAULT_VISUALIZER_FILTERS: VisualizerFilters = {
  direction: "both",
  minValueUsd: 0,
  showKnownProtocols: true,
  showUnknownContracts: true,
  showApprovals: true,
  showLpInteractions: true,
};

export function getVisualizerNodeMap(graph: VisualizerGraph) {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

export function getVisualizerEdgeMap(graph: VisualizerGraph) {
  return new Map(graph.edges.map((edge) => [edge.id, edge]));
}

export function filterVisualizerEdges(
  edges: readonly VisualizerEdge[],
  nodeById: ReadonlyMap<string, VisualizerNode>,
  filters: VisualizerFilters,
): readonly VisualizerEdge[] {
  return edges.filter((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return false;

    if (
      filters.direction !== "both" &&
      edge.direction !== filters.direction
    ) {
      return false;
    }

    if (edge.valueUsd < filters.minValueUsd) return false;
    if (!filters.showApprovals && edge.kind === "approval") return false;
    if (!filters.showLpInteractions && edge.kind === "lp-interaction") {
      return false;
    }

    const nodes = [from, to];
    if (
      !filters.showKnownProtocols &&
      nodes.some((node) => node.kind === "known-protocol" || node.kind === "router")
    ) {
      return false;
    }
    if (
      !filters.showUnknownContracts &&
      nodes.some(
        (node) =>
          node.kind === "unknown-contract" || node.kind === "spender",
      )
    ) {
      return false;
    }

    return true;
  });
}

export function getVisibleVisualizerNodeIds(
  centerNodeId: string,
  edges: readonly VisualizerEdge[],
) {
  const nodeIds = new Set<string>([centerNodeId]);
  for (const edge of edges) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);
  }
  return nodeIds;
}

export function getVisualizerEdgeTone(direction: VisualizerFlowDirection) {
  switch (direction) {
    case "inflow":
      return "intel-viz-edge-inflow";
    case "outflow":
      return "intel-viz-edge-outflow";
    case "approval":
      return "intel-viz-edge-approval";
    case "warning":
      return "intel-viz-edge-warning";
    case "internal":
    default:
      return "intel-viz-edge-internal";
  }
}

export function getVisualizerNodeTone(kind: VisualizerNode["kind"]) {
  switch (kind) {
    case "searched-wallet":
      return "intel-viz-node-center";
    case "router":
    case "known-protocol":
      return "intel-viz-node-protocol";
    case "token-contract":
      return "intel-viz-node-token";
    case "lp-pair":
      return "intel-viz-node-liquidity";
    case "unknown-contract":
    case "spender":
      return "intel-viz-node-warning";
    case "wallet":
    default:
      return "intel-viz-node-wallet";
  }
}

export function getCurvedVisualizerPath(
  from: Pick<VisualizerNode, "x" | "y">,
  to: Pick<VisualizerNode, "x" | "y">,
): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const bend = Math.min(9, Math.max(3, length * 0.11));
  const normalX = (-dy / length) * bend;
  const normalY = (dx / length) * bend;

  return `M ${from.x} ${from.y} Q ${midX + normalX} ${midY + normalY} ${to.x} ${to.y}`;
}
