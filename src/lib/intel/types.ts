export type IntelFeatureStatus = "demo" | "planned" | "research-preview";

export type IntelFeatureKey =
  | "wallet-intelligence"
  | "constellation-network-maps"
  | "research-assistant"
  | "token-deep-analytics"
  | "research-workspaces"
  | "real-time-network-pulse"
  | "risk-exposure-awareness";

export interface IntelFeature {
  key: IntelFeatureKey;
  title: string;
  eyebrow: string;
  body: string;
  status: IntelFeatureStatus;
  statusLabel: string;
  href?: string;
  metrics: readonly string[];
}

export type IntelAddressValidation =
  | {
      ok: true;
      normalizedAddress: `0x${string}`;
    }
  | {
      ok: false;
      reason: string;
    };

export type IntelGraphNodeKind =
  | "wallet"
  | "contract"
  | "token"
  | "staking"
  | "liquidity";

export type IntelGraphEdgeKind =
  | "approval"
  | "token-flow"
  | "native-flow"
  | "staking"
  | "swap"
  | "liquidity";

export interface IntelGraphNode {
  id: string;
  label: string;
  description: string;
  kind: IntelGraphNodeKind;
  address?: `0x${string}`;
  x: number;
  y: number;
  weight: "primary" | "strong" | "normal";
}

export interface IntelGraphEdge {
  id: string;
  from: string;
  to: string;
  kind: IntelGraphEdgeKind;
  label: string;
  valueLabel: string;
  direction: "in" | "out" | "bidirectional";
}

export interface IntelGraph {
  centerNodeId: string;
  nodes: readonly IntelGraphNode[];
  edges: readonly IntelGraphEdge[];
}

export interface IntelPortfolioItem {
  symbol: string;
  name: string;
  chain: "PulseChain";
  valueLabel: string;
  exposureLabel: string;
  note: string;
}

export interface IntelActivityItem {
  id: string;
  timestampLabel: string;
  title: string;
  description: string;
  chain: "PulseChain";
  kind: IntelGraphEdgeKind;
  severity: "context" | "review" | "watch";
}

export interface IntelWalletReport {
  mode: "demo";
  walletAddress: `0x${string}`;
  generatedAtLabel: string;
  summary: {
    totalValueLabel: string;
    chainCount: number;
    relationCount: number;
    decodedActivityCount: number;
    exposureCount: number;
  };
  portfolio: readonly IntelPortfolioItem[];
  activity: readonly IntelActivityItem[];
  graph: IntelGraph;
}
