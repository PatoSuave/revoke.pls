import { compactIntelAddress } from "./address";
import type {
  IntelActivityItem,
  IntelGraph,
  IntelPortfolioItem,
  IntelWalletReport,
} from "./types";

export const DEMO_INTEL_WALLET =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

const DEMO_CONTRACTS = {
  pulsexRouter: "0x1715a3E4A142d8b698131108995174F37aEBA10D" as const,
  hexToken: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" as const,
  staking: "0x0000000000000000000000000000000000000369" as const,
  lpPair: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab" as const,
  counterparty: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" as const,
};

export function buildDemoWalletIntel(
  walletAddress: `0x${string}` = DEMO_INTEL_WALLET,
): IntelWalletReport {
  const shortAddress = compactIntelAddress(walletAddress);

  return {
    mode: "demo",
    walletAddress,
    generatedAtLabel: "Local demo data",
    summary: {
      totalValueLabel: "$42,680 demo",
      chainCount: 1,
      relationCount: 5,
      decodedActivityCount: DEMO_ACTIVITY.length,
      exposureCount: 3,
    },
    portfolio: buildDemoPortfolio(shortAddress),
    activity: DEMO_ACTIVITY,
    graph: buildDemoGraph(walletAddress),
  };
}

function buildDemoPortfolio(shortAddress: string): readonly IntelPortfolioItem[] {
  return [
    {
      symbol: "PLS",
      name: "PulseChain native balance",
      chain: "PulseChain",
      valueLabel: "$12,940 demo",
      exposureLabel: "Native asset",
      note: `${shortAddress} shows native balance context in this local sample.`,
    },
    {
      symbol: "HEX",
      name: "HEX liquid position",
      chain: "PulseChain",
      valueLabel: "$21,880 demo",
      exposureLabel: "Token position",
      note: "Sample view includes a staking-related relationship for research context.",
    },
    {
      symbol: "PLSX-LP",
      name: "PulseX liquidity receipt",
      chain: "PulseChain",
      valueLabel: "$7,860 demo",
      exposureLabel: "Liquidity position",
      note: "Demo liquidity context is shown without live pricing or pool reads.",
    },
  ];
}

const DEMO_ACTIVITY = [
  {
    id: "approval-pulsex",
    timestampLabel: "3h ago",
    title: "Unlimited approval observed",
    description:
      "Sample decoded feed shows a token allowance relationship to a PulseX router address.",
    chain: "PulseChain",
    kind: "approval",
    severity: "review",
  },
  {
    id: "hex-stake",
    timestampLabel: "1d ago",
    title: "Staking contract interaction",
    description:
      "Sample wallet touched a HEX staking address. This pass only displays local context.",
    chain: "PulseChain",
    kind: "staking",
    severity: "context",
  },
  {
    id: "lp-add",
    timestampLabel: "2d ago",
    title: "Liquidity position changed",
    description:
      "Sample decoded feed shows a liquidity receipt moving into the wallet view.",
    chain: "PulseChain",
    kind: "liquidity",
    severity: "watch",
  },
  {
    id: "native-transfer",
    timestampLabel: "4d ago",
    title: "Native transfer cluster",
    description:
      "Sample one-hop relationship groups a native transfer with an external wallet.",
    chain: "PulseChain",
    kind: "native-flow",
    severity: "context",
  },
] as const satisfies readonly IntelActivityItem[];

function buildDemoGraph(walletAddress: `0x${string}`): IntelGraph {
  return {
    centerNodeId: "searched-wallet",
    nodes: [
      {
        id: "searched-wallet",
        label: "Wallet under review",
        description:
          "The searched address is always the center node in this local demo graph.",
        kind: "wallet",
        address: walletAddress,
        x: 50,
        y: 50,
        weight: "primary",
      },
      {
        id: "pulsex-router",
        label: "PulseX router",
        description:
          "Demo router relationship used to show how allowance context can appear in the map.",
        kind: "contract",
        address: DEMO_CONTRACTS.pulsexRouter,
        x: 21,
        y: 28,
        weight: "strong",
      },
      {
        id: "hex-token",
        label: "HEX token",
        description:
          "Token node used for sample balance and staking relationship context.",
        kind: "token",
        address: DEMO_CONTRACTS.hexToken,
        x: 76,
        y: 24,
        weight: "strong",
      },
      {
        id: "hex-staking",
        label: "HEX staking",
        description:
          "Demo staking node for future read-only stake diagnostics.",
        kind: "staking",
        address: DEMO_CONTRACTS.staking,
        x: 80,
        y: 70,
        weight: "normal",
      },
      {
        id: "lp-pair",
        label: "PulseX LP",
        description:
          "Liquidity node used to preview future pool and receipt context.",
        kind: "liquidity",
        address: DEMO_CONTRACTS.lpPair,
        x: 29,
        y: 76,
        weight: "normal",
      },
      {
        id: "external-wallet",
        label: "External wallet",
        description:
          "Sample one-hop counterparty shown as descriptive context only.",
        kind: "wallet",
        address: DEMO_CONTRACTS.counterparty,
        x: 12,
        y: 58,
        weight: "normal",
      },
    ],
    edges: [
      {
        id: "edge-approval",
        from: "searched-wallet",
        to: "pulsex-router",
        kind: "approval",
        label: "Allowance",
        valueLabel: "Unlimited demo",
        direction: "out",
      },
      {
        id: "edge-token",
        from: "hex-token",
        to: "searched-wallet",
        kind: "token-flow",
        label: "Token balance",
        valueLabel: "HEX demo",
        direction: "in",
      },
      {
        id: "edge-stake",
        from: "searched-wallet",
        to: "hex-staking",
        kind: "staking",
        label: "Stake context",
        valueLabel: "Read-only demo",
        direction: "out",
      },
      {
        id: "edge-liquidity",
        from: "lp-pair",
        to: "searched-wallet",
        kind: "liquidity",
        label: "LP receipt",
        valueLabel: "PLSX-LP demo",
        direction: "in",
      },
      {
        id: "edge-native",
        from: "external-wallet",
        to: "searched-wallet",
        kind: "native-flow",
        label: "Native transfer",
        valueLabel: "PLS demo",
        direction: "in",
      },
      {
        id: "edge-swap",
        from: "searched-wallet",
        to: "lp-pair",
        kind: "swap",
        label: "Swap route",
        valueLabel: "Demo path",
        direction: "bidirectional",
      },
    ],
  };
}
