export interface PulsechainResourceLink {
  label: string;
  href: string;
  domain: string;
  category: string;
  description: string;
}

export const PULSECHAIN_RESOURCE_LINKS = [
  {
    label: "PulseChain",
    href: "https://pulsechain.com/",
    domain: "pulsechain.com",
    category: "Network",
    description: "PulseChain network site and ecosystem entry point.",
  },
  {
    label: "PulseX",
    href: "https://pulsex.com/",
    domain: "pulsex.com",
    category: "DEX",
    description: "PulseChain decentralized exchange resource.",
  },
  {
    label: "LibertySwap",
    href: "https://libertyswap.finance/",
    domain: "libertyswap.finance",
    category: "DEX / bridge",
    description: "PulseChain swap and bridge resource.",
  },
  {
    label: "9mm Pro",
    href: "https://9mm.pro/",
    domain: "9mm.pro",
    category: "DEX suite",
    description: "PulseChain-compatible DEX and protocol suite.",
  },
  {
    label: "HEX",
    href: "https://hex.com/",
    domain: "hex.com",
    category: "Protocol",
    description: "HEX protocol resource.",
  },
] as const satisfies readonly PulsechainResourceLink[];

export const PULSECHAIN_RESOURCE_NOTICE =
  "These are curated navigation links for exact-domain checking. A listed link is not financial advice or a safety guarantee; always verify the domain and wallet prompt before connecting or signing.";
