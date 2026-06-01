import type { IntelFeature } from "./types";

export const INTEL_FEATURES = [
  {
    key: "wallet-intelligence",
    eyebrow: "First demo",
    title: "Wallet Intelligence",
    body: "Inspect a PulseChain wallet view with a local sample portfolio, decoded activity, and a one-hop relationship map.",
    status: "demo",
    statusLabel: "Demo shell",
    href: "/intel/wallet",
    metrics: ["Portfolio snapshot", "Decoded feed", "Graph shell"],
  },
  {
    key: "constellation-network-maps",
    eyebrow: "Visualizer demo",
    title: "Constellation Network Maps",
    body: "Explore a full-canvas PulseChain relationship visualizer with local demo entities, transaction edges, filters, and detail panels.",
    status: "demo",
    statusLabel: "Demo shell",
    href: "/intel/visualizer",
    metrics: ["Graph canvas", "Timeline", "Details"],
  },
  {
    key: "research-assistant",
    eyebrow: "Research layer",
    title: "Research Assistant",
    body: "Turn visible chain context into structured notes, questions, and investigation checklists without executing wallet actions.",
    status: "research-preview",
    statusLabel: "Designing",
    metrics: ["Notes", "Questions", "Citations"],
  },
  {
    key: "token-deep-analytics",
    eyebrow: "Token layer",
    title: "Token Deep Analytics",
    body: "Summarize token concentration, liquidity context, holder movement, and contract signals for PulseChain-native review.",
    status: "planned",
    statusLabel: "Planned",
    metrics: ["Holders", "Liquidity", "Movement"],
  },
  {
    key: "research-workspaces",
    eyebrow: "Workflow layer",
    title: "Research Workspaces",
    body: "Organize wallet notes, saved addresses, watchlists, and exports into a repeatable due-diligence workspace.",
    status: "planned",
    statusLabel: "Planned",
    metrics: ["Watchlists", "Notes", "Exports"],
  },
  {
    key: "real-time-network-pulse",
    eyebrow: "Network layer",
    title: "Real-Time Network Pulse",
    body: "Show network conditions, notable contract activity, and chain-level signals once capped live reads are approved.",
    status: "planned",
    statusLabel: "Planned",
    metrics: ["Gas", "Throughput", "Hot contracts"],
  },
  {
    key: "risk-exposure-awareness",
    eyebrow: "Exposure layer",
    title: "Risk & Exposure Awareness",
    body: "Highlight visible approvals, concentration, unusual relationships, and incomplete checks with conservative labels.",
    status: "planned",
    statusLabel: "Planned",
    metrics: ["Approvals", "Exposure", "Missing context"],
  },
] as const satisfies readonly IntelFeature[];

export function getIntelFeatureByKey(key: IntelFeature["key"]) {
  return INTEL_FEATURES.find((feature) => feature.key === key) ?? null;
}
