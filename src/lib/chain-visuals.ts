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
