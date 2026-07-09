import type { Metadata } from "next";

import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { absoluteUrl, siteConfig } from "@/lib/site";
import {
  TOKEN_CONTRACT_REPORT_CHAIN_COUNT,
  TOKEN_CONTRACT_REPORT_PATH,
} from "@/lib/token-contract-report";
import { TokenContractReportClient } from "./token-contract-report-client";

export const metadata: Metadata = {
  title: `Token Contract Report | ${siteConfig.shortName}`,
  description:
    "Generate a read-only token contract report from public EVM chain data, explorer source metadata, and bounded standard probes.",
  alternates: {
    canonical: TOKEN_CONTRACT_REPORT_PATH,
  },
  openGraph: {
    type: "website",
    title: `Token Contract Report | ${siteConfig.shortName}`,
    description:
      "Review token contract context across Pulse Revoke's live EVM networks without connecting a wallet.",
    url: absoluteUrl(TOKEN_CONTRACT_REPORT_PATH),
  },
  twitter: {
    card: "summary_large_image",
    title: `Token Contract Report | ${siteConfig.shortName}`,
    description:
      "Read-only token contract reports across Pulse Revoke's live EVM networks.",
  },
};

export default function TokenContractReportPage() {
  return (
    <>
      <SiteHeader />
      <main className="scanner-map-surface min-h-screen overflow-hidden bg-pulse-bg">
        <section className="border-b border-pulse-border/45 bg-transparent">
          <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Token contract report
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-pulse-text sm:text-4xl">
              Read a token contract before you trust it
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-pulse-muted sm:text-base">
              Select one of the {TOKEN_CONTRACT_REPORT_CHAIN_COUNT} live Pulse
              Revoke chains, paste a token or collection contract, and review
              read-only evidence from public chain and explorer data.
            </p>
          </div>
        </section>
        <TokenContractReportClient />
        <AntiPhishingBanner />
      </main>
      <SiteFooter />
    </>
  );
}

