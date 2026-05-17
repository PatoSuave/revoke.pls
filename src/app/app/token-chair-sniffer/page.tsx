import type { Metadata } from "next";

import { TokenChairSniffer } from "@/components/sections/token-chair-sniffer";
import { TOKEN_CHAIR_SNIFFER_ROUTE } from "@/lib/token-chair-sniffer";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Token Chair Sniffer",
  description:
    "PulseChain-only read-only token risk scanner for visible market, liquidity, ownership, and contract-risk signals.",
  alternates: {
    canonical: TOKEN_CHAIR_SNIFFER_ROUTE,
  },
  openGraph: {
    type: "website",
    title: `Token Chair Sniffer - ${siteConfig.shortName}`,
    description:
      "Sniff before you ape with visible PulseChain token market and contract-risk signals.",
    url: absoluteUrl(TOKEN_CHAIR_SNIFFER_ROUTE),
  },
  twitter: {
    card: "summary_large_image",
    title: `Token Chair Sniffer - ${siteConfig.shortName}`,
    description:
      "PulseChain-only read-only token risk scanner for visible token signals.",
  },
};

export default function TokenChairSnifferPage() {
  return <TokenChairSniffer />;
}
