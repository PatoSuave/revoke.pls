export interface PulsechainResourceLink {
  label: string;
  href: string;
  domain: string;
  category: string;
  description: string;
  logoSrc: string;
  accentColor: string;
  accentSoft: string;
  accentBorder: string;
}

export const PULSECHAIN_RESOURCE_LINKS = [
  {
    label: "PulseChain",
    href: "https://pulsechain.com/",
    domain: "pulsechain.com",
    category: "Network",
    description: "PulseChain network site and ecosystem entry point.",
    logoSrc: "/protocol-logos/pulsechain.png",
    accentColor: "#9B5CFF",
    accentSoft: "rgba(155, 92, 255, 0.13)",
    accentBorder: "rgba(155, 92, 255, 0.36)",
  },
  {
    label: "PulseX",
    href: "https://pulsex.com/",
    domain: "pulsex.com",
    category: "DEX",
    description: "PulseChain decentralized exchange resource.",
    logoSrc: "/protocol-logos/pulsex.png",
    accentColor: "#24F28C",
    accentSoft: "rgba(36, 242, 140, 0.11)",
    accentBorder: "rgba(36, 242, 140, 0.32)",
  },
  {
    label: "LibertySwap",
    href: "https://libertyswap.finance/",
    domain: "libertyswap.finance",
    category: "DEX / bridge",
    description: "PulseChain swap and bridge resource.",
    logoSrc: "/protocol-logos/libertyswap.png",
    accentColor: "#FF7A1A",
    accentSoft: "rgba(255, 122, 26, 0.11)",
    accentBorder: "rgba(255, 122, 26, 0.34)",
  },
  {
    label: "9mm Pro",
    href: "https://9mm.pro/",
    domain: "9mm.pro",
    category: "DEX suite",
    description: "PulseChain-compatible DEX and protocol suite.",
    logoSrc: "/protocol-logos/9mm-pro.png",
    accentColor: "#E8F1FF",
    accentSoft: "rgba(232, 241, 255, 0.08)",
    accentBorder: "rgba(232, 241, 255, 0.26)",
  },
  {
    label: "HEX",
    href: "https://hex.com/",
    domain: "hex.com",
    category: "Protocol",
    description: "HEX protocol resource.",
    logoSrc: "/protocol-logos/hex.png",
    accentColor: "#FF3AB6",
    accentSoft: "rgba(255, 58, 182, 0.11)",
    accentBorder: "rgba(255, 58, 182, 0.34)",
  },
] as const satisfies readonly PulsechainResourceLink[];

export const PULSECHAIN_RESOURCE_NOTICE =
  "These are curated navigation links for exact-domain checking. A listed link is not financial advice or a safety guarantee; always verify the domain and wallet prompt before connecting or signing.";
