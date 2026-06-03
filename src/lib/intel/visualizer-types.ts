export type VisualizerNodeKind =
  | "searched-wallet"
  | "wallet"
  | "known-protocol"
  | "token-contract"
  | "lp-pair"
  | "router"
  | "unknown-contract"
  | "high-risk-spender"
  | "spender";

export type VisualizerEdgeKind =
  | "pls-transfer"
  | "token-transfer"
  | "approval"
  | "swap"
  | "lp-interaction"
  | "contract-call";

export type VisualizerFlowDirection =
  | "inflow"
  | "outflow"
  | "internal"
  | "approval"
  | "warning";

export type VisualizerStatus = "context" | "review" | "watch" | "elevated";

export interface VisualizerNode {
  id: string;
  label: string;
  kind: VisualizerNodeKind;
  address?: `0x${string}`;
  x: number;
  y: number;
  volumeScore: number;
  balanceLabel: string;
  activityLabel: string;
  status: VisualizerStatus;
  confidenceLabel: string;
  description: string;
}

export interface VisualizerEdge {
  id: string;
  from: string;
  to: string;
  kind: VisualizerEdgeKind;
  direction: VisualizerFlowDirection;
  label: string;
  token: string;
  valueLabel: string;
  valueUsd: number;
  txCount: number;
  firstSeenLabel: string;
  lastSeenLabel: string;
  status: VisualizerStatus;
  transactionIds: readonly string[];
}

export interface VisualizerTransaction {
  id: string;
  edgeId: string;
  timeLabel: string;
  fromLabel: string;
  toLabel: string;
  valueLabel: string;
  token: string;
  typeLabel: string;
  statusLabel: string;
}

export interface VisualizerTimelineBucket {
  label: string;
  volume: number;
  direction: VisualizerFlowDirection;
}

export interface VisualizerGraph {
  centerNodeId: string;
  generatedAtLabel: string;
  nodes: readonly VisualizerNode[];
  edges: readonly VisualizerEdge[];
  transactions: readonly VisualizerTransaction[];
  timeline: readonly VisualizerTimelineBucket[];
  summary: {
    totalInflowLabel: string;
    totalOutflowLabel: string;
    tokenCountLabel: string;
    plsBalanceLabel: string;
    firstSeenLabel: string;
    lastActiveLabel: string;
  };
}
