import type { Metadata } from "next";

import { TokenChairSniffer } from "@/components/sections/token-chair-sniffer";
import {
  TOKEN_CHAIR_SNIFFER_ROUTE,
  normalizeTokenChairQueryToken,
} from "@/lib/token-chair-sniffer";
import { absoluteUrl, siteConfig } from "@/lib/site";

type TokenChairSnifferSearchParams = Promise<{
  token?: string | string[];
  address?: string | string[];
}>;

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

export const dynamic = "force-dynamic";

export default async function TokenChairSnifferPage({
  searchParams,
}: {
  searchParams: TokenChairSnifferSearchParams;
}) {
  const params = await searchParams;
  const initialTokenAddress =
    normalizeTokenChairQueryToken(params.token) ??
    normalizeTokenChairQueryToken(params.address);

  return (
    <TokenChairSniffer
      initialTokenAddress={initialTokenAddress}
      initialResponse={null}
    />
  );
}
