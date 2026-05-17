import type { Metadata } from "next";
import Link from "next/link";

import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { ApprovalScanner } from "@/components/sections/approval-scanner";
import { PulseChainResourceLinks } from "@/components/sections/pulsechain-resource-links";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { absoluteUrl, siteConfig } from "@/lib/site";
import {
  LIVE_SUPPORTED_CHAIN_ROWS,
} from "@/lib/supported-chain-copy";
import { retired_feature_ROUTE } from "@/lib/retired-feature";

export const metadata: Metadata = {
  title: "Revoke Scanner",
  description: siteConfig.description,
  alternates: {
    canonical: "/app",
  },
  openGraph: {
    type: "website",
    title: `Revoke Scanner · ${siteConfig.shortName}`,
    description: siteConfig.description,
    url: absoluteUrl("/app"),
  },
  twitter: {
    card: "summary_large_image",
    title: `Revoke Scanner · ${siteConfig.shortName}`,
    description: siteConfig.description,
  },
};

export default function AppPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-pulse-bg">
        <AppWorkspaceIntro />
        <AntiPhishingBanner />
        <ApprovalScanner />
        <PulseChainResourceLinks compact />
      </main>
      <SiteFooter />
    </>
  );
}

function AppWorkspaceIntro() {
  return (
    <section className="border-b border-pulse-border/50 bg-pulse-bg">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Scanner workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-pulse-text sm:text-4xl">
              Review active approvals
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-pulse-muted sm:text-base">
              Review active token and NFT approvals. Revoke only after live
              verification confirms the approval is still active.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2 text-[11px] text-pulse-muted lg:items-end">
            <p className="font-semibold uppercase tracking-[0.16em] text-pulse-muted/80">
              Live supported chains
            </p>
            <div className="flex max-w-full flex-wrap gap-1.5 lg:justify-end">
              {LIVE_SUPPORTED_CHAIN_ROWS.map((row) => (
                <span
                  key={row.chain}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-pulse-border/70 bg-pulse-panel/40 px-2.5 py-1 font-medium text-pulse-muted"
                >
                  <span className="truncate text-pulse-text">{row.chain}</span>
                  <span className="font-mono text-[10px]">ID {row.chainId}</span>
                </span>
              ))}
            </div>
            <Link
              href={retired_feature_ROUTE}
              className="mt-2 inline-flex max-w-full items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
            >
              retired-feature
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
