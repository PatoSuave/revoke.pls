import type { Metadata } from "next";

import { WalletIntelPage } from "@/components/intel/wallet-intel-page";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `Wallet Intelligence Demo - ${siteConfig.shortName}`,
  description:
    "Inspect a PulseChain wallet in a read-only local demo with portfolio context, decoded sample activity, and a one-hop graph shell.",
  alternates: {
    canonical: "/intel/wallet",
  },
  openGraph: {
    type: "website",
    title: `Wallet Intelligence Demo - ${siteConfig.shortName}`,
    description:
      "Inspect a read-only local demo wallet report for PulseChain research context.",
    url: absoluteUrl("/intel/wallet"),
  },
  twitter: {
    card: "summary_large_image",
    title: `Wallet Intelligence Demo - ${siteConfig.shortName}`,
    description:
      "Inspect a read-only local demo wallet report for PulseChain research context.",
  },
};

export default function IntelWalletPage() {
  return <WalletIntelPage />;
}
