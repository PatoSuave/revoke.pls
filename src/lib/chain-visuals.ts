export interface ChainVisual {
  accent: string;
  accentReadable: string;
  accentSoft: string;
  accentBorder: string;
  accentShadow: string;
}

export const DEFAULT_CHAIN_VISUAL: ChainVisual = {
  accent: "#31D6FF",
  accentReadable: "#087F9E",
  accentSoft: "rgba(49, 214, 255, 0.11)",
  accentBorder: "rgba(49, 214, 255, 0.34)",
  accentShadow: "0 0 20px rgba(49, 214, 255, 0.24)",
};

export const CHAIN_VISUALS: Record<string, ChainVisual> = {
  PulseChain: {
    accent: "#A78BFA",
    accentReadable: "#6D28D9",
    accentSoft: "rgba(120, 57, 238, 0.16)",
    accentBorder: "rgba(167, 139, 250, 0.46)",
    accentShadow: "0 0 22px rgba(120, 57, 238, 0.34)",
  },
  "BNB Smart Chain": {
    accent: "#F3BA2F",
    accentReadable: "#A16207",
    accentSoft: "rgba(243, 186, 47, 0.11)",
    accentBorder: "rgba(243, 186, 47, 0.34)",
    accentShadow: "0 0 20px rgba(243, 186, 47, 0.25)",
  },
  Base: {
    accent: "#4D8BFF",
    accentReadable: "#0052FF",
    accentSoft: "rgba(0, 82, 255, 0.12)",
    accentBorder: "rgba(77, 139, 255, 0.36)",
    accentShadow: "0 0 20px rgba(0, 82, 255, 0.28)",
  },
  Polygon: {
    accent: "#A56BFF",
    accentReadable: "#7E22CE",
    accentSoft: "rgba(130, 71, 229, 0.13)",
    accentBorder: "rgba(165, 107, 255, 0.36)",
    accentShadow: "0 0 20px rgba(130, 71, 229, 0.28)",
  },
  "Sonic Mainnet": {
    accent: "#58F1D4",
    accentReadable: "#0F766E",
    accentSoft: "rgba(88, 241, 212, 0.12)",
    accentBorder: "rgba(88, 241, 212, 0.34)",
    accentShadow: "0 0 20px rgba(88, 241, 212, 0.24)",
  },
  "Avalanche C-Chain": {
    accent: "#FF6B6B",
    accentReadable: "#C81E1E",
    accentSoft: "rgba(232, 65, 66, 0.12)",
    accentBorder: "rgba(255, 107, 107, 0.35)",
    accentShadow: "0 0 20px rgba(232, 65, 66, 0.24)",
  },
  Mantle: {
    accent: "#67E8F9",
    accentReadable: "#0891B2",
    accentSoft: "rgba(103, 232, 249, 0.11)",
    accentBorder: "rgba(103, 232, 249, 0.34)",
    accentShadow: "0 0 20px rgba(103, 232, 249, 0.23)",
  },
  Linea: {
    accent: "#8F9BFF",
    accentReadable: "#4F46E5",
    accentSoft: "rgba(143, 155, 255, 0.12)",
    accentBorder: "rgba(143, 155, 255, 0.34)",
    accentShadow: "0 0 20px rgba(79, 70, 229, 0.24)",
  },
  Blast: {
    accent: "#F8FF46",
    accentReadable: "#7C6F00",
    accentSoft: "rgba(248, 255, 70, 0.12)",
    accentBorder: "rgba(248, 255, 70, 0.34)",
    accentShadow: "0 0 20px rgba(248, 255, 70, 0.22)",
  },
  Berachain: {
    accent: "#F59E0B",
    accentReadable: "#B45309",
    accentSoft: "rgba(245, 158, 11, 0.12)",
    accentBorder: "rgba(245, 158, 11, 0.34)",
    accentShadow: "0 0 20px rgba(245, 158, 11, 0.24)",
  },
  Celo: {
    accent: "#35D07F",
    accentReadable: "#047857",
    accentSoft: "rgba(53, 208, 127, 0.12)",
    accentBorder: "rgba(53, 208, 127, 0.34)",
    accentShadow: "0 0 20px rgba(53, 208, 127, 0.24)",
  },
  Gnosis: {
    accent: "#3E6957",
    accentReadable: "#166534",
    accentSoft: "rgba(62, 105, 87, 0.12)",
    accentBorder: "rgba(62, 105, 87, 0.34)",
    accentShadow: "0 0 20px rgba(62, 105, 87, 0.24)",
  },
  Unichain: {
    accent: "#FF4D9D",
    accentReadable: "#DB2777",
    accentSoft: "rgba(255, 77, 157, 0.12)",
    accentBorder: "rgba(255, 77, 157, 0.34)",
    accentShadow: "0 0 20px rgba(255, 77, 157, 0.24)",
  },
  "World Chain": {
    accent: "#6EE7F9",
    accentReadable: "#0891B2",
    accentSoft: "rgba(110, 231, 249, 0.12)",
    accentBorder: "rgba(110, 231, 249, 0.34)",
    accentShadow: "0 0 20px rgba(110, 231, 249, 0.24)",
  },
  "Robinhood Chain": {
    accent: "#00C805",
    accentReadable: "#047857",
    accentSoft: "rgba(0, 200, 5, 0.12)",
    accentBorder: "rgba(0, 200, 5, 0.34)",
    accentShadow: "0 0 20px rgba(0, 200, 5, 0.24)",
  },
  "Ethereum Mainnet": {
    accent: "#8EA5FF",
    accentReadable: "#4F67D8",
    accentSoft: "rgba(98, 126, 234, 0.13)",
    accentBorder: "rgba(142, 165, 255, 0.35)",
    accentShadow: "0 0 20px rgba(98, 126, 234, 0.28)",
  },
  "Arbitrum One": {
    accent: "#28A0F0",
    accentReadable: "#087CB8",
    accentSoft: "rgba(40, 160, 240, 0.12)",
    accentBorder: "rgba(40, 160, 240, 0.34)",
    accentShadow: "0 0 20px rgba(40, 160, 240, 0.26)",
  },
  Optimism: {
    accent: "#FF5A68",
    accentReadable: "#DC2626",
    accentSoft: "rgba(255, 4, 32, 0.11)",
    accentBorder: "rgba(255, 90, 104, 0.34)",
    accentShadow: "0 0 20px rgba(255, 4, 32, 0.24)",
  },
  HyperEVM: {
    accent: "#47E6A2",
    accentReadable: "#047857",
    accentSoft: "rgba(71, 230, 162, 0.12)",
    accentBorder: "rgba(71, 230, 162, 0.34)",
    accentShadow: "0 0 20px rgba(71, 230, 162, 0.24)",
  },
};

export function getChainVisual(chainName: string): ChainVisual {
  return CHAIN_VISUALS[chainName] ?? DEFAULT_CHAIN_VISUAL;
}
