export interface PulsechainResourceAction {
  label: string;
  href: string;
  domain: string;
  kind?: "primary" | "secondary";
}

export interface PulsechainResourceLink {
  label: string;
  href: string;
  domain: string;
  category: string;
  description: string;
  hoverVideoSrc?: string;
  logoSrc?: string;
  fallbackMark?: string;
  accentColor: string;
  accentReadable: string;
  accentSoft: string;
  accentBorder: string;
  logoPlate?: "dark";
  actions?: readonly PulsechainResourceAction[];
}

export const PULSECHAIN_RESOURCE_LINKS: readonly PulsechainResourceLink[] = [
  {
    label: "PulseChain",
    href: "https://pulsechain.com/",
    domain: "pulsechain.com",
    category: "Network",
    description: "PulseChain network site and ecosystem entry point.",
    hoverVideoSrc: "/media/richard-heart-twerking.mp4",
    logoSrc: "/protocol-logos/pulsechain.png",
    accentColor: "#9B5CFF",
    accentReadable: "#6D28D9",
    accentSoft: "rgba(155, 92, 255, 0.13)",
    accentBorder: "rgba(155, 92, 255, 0.36)",
  },
  {
    label: "PulseX",
    href: "https://pulsex.com/",
    domain: "pulsex.com",
    category: "DEX",
    description: "PulseChain decentralized exchange resource.",
    hoverVideoSrc: "/media/richard-heart-twerking.mp4",
    logoSrc: "/protocol-logos/pulsex.png",
    accentColor: "#24F28C",
    accentReadable: "#008C5A",
    accentSoft: "rgba(36, 242, 140, 0.11)",
    accentBorder: "rgba(36, 242, 140, 0.32)",
  },
  {
    label: "LibertySwap",
    href: "https://libertyswap.finance/",
    domain: "libertyswap.finance",
    category: "DEX / bridge",
    description: "PulseChain swap and bridge resource.",
    hoverVideoSrc: "/media/libertyswap-pcock.mp4",
    logoSrc: "/protocol-logos/libertyswap.png",
    accentColor: "#FF7A1A",
    accentReadable: "#C2410C",
    accentSoft: "rgba(255, 122, 26, 0.11)",
    accentBorder: "rgba(255, 122, 26, 0.34)",
  },
  {
    label: "9mm Pro",
    href: "https://9mm.pro/",
    domain: "9mm.pro",
    category: "DEX suite",
    description: "PulseChain-compatible DEX and protocol suite.",
    hoverVideoSrc: "/media/9mm-hover.mov",
    logoSrc: "/protocol-logos/9mm-pro.png",
    accentColor: "#E8F1FF",
    accentReadable: "#334155",
    accentSoft: "rgba(232, 241, 255, 0.08)",
    accentBorder: "rgba(232, 241, 255, 0.26)",
    logoPlate: "dark",
  },
  {
    label: "HEX",
    href: "https://hex.com/",
    domain: "hex.com",
    category: "Protocol",
    description: "HEX protocol resource.",
    hoverVideoSrc: "/media/richard-heart-twerking.mp4",
    logoSrc: "/protocol-logos/hex.png",
    accentColor: "#FF3AB6",
    accentReadable: "#C0267B",
    accentSoft: "rgba(255, 58, 182, 0.11)",
    accentBorder: "rgba(255, 58, 182, 0.34)",
  },
  {
    label: "Trezor",
    href: "https://trezor.io/store",
    domain: "trezor.io",
    category: "Hardware wallet",
    description: "Official Trezor store link for hardware wallet purchases.",
    logoSrc: "/protocol-logos/trezor.svg",
    accentColor: "#00B489",
    accentReadable: "#047857",
    accentSoft: "rgba(0, 180, 137, 0.11)",
    accentBorder: "rgba(0, 180, 137, 0.34)",
    actions: [
      {
        label: "Official site",
        href: "https://trezor.io/store",
        domain: "trezor.io",
        kind: "primary",
      },
    ],
  },
  {
    label: "ZKX Wallet",
    href: "https://zkxwallet.com/",
    domain: "zkxwallet.com",
    category: "Wallet",
    description: "ZKX Wallet site for wallet downloads and product information.",
    logoSrc: "/protocol-logos/zkx-wallet.png",
    accentColor: "#3A8BFF",
    accentReadable: "#2563EB",
    accentSoft: "rgba(58, 139, 255, 0.11)",
    accentBorder: "rgba(58, 139, 255, 0.34)",
  },
] as const;

export const PULSECHAIN_RESOURCE_NOTICE =
  "These are curated navigation links for domain checking. A listed link is not financial advice or a safety guarantee; always verify the destination domain and wallet prompt before connecting or signing.";
