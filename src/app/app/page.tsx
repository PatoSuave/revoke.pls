import type { Metadata } from "next";
import Link from "next/link";

import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { ApprovalScanner } from "@/components/sections/approval-scanner";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { absoluteUrl, siteConfig } from "@/lib/site";
import {
  LIVE_SUPPORTED_CHAIN_COUNT,
  LIVE_SUPPORTED_CHAIN_LIST,
  LIVE_SUPPORTED_CHAIN_ROWS,
  VERIFIED_ROW_SUPPORT_NOTE,
  formatRevokeSupport,
} from "@/lib/supported-chain-copy";

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

          <div className="flex flex-col gap-2 text-[11px] text-pulse-muted lg:items-end">
            <p className="font-semibold uppercase tracking-[0.16em] text-pulse-muted/80">
              Live supported chains
            </p>
            <div className="flex flex-wrap gap-1.5 lg:justify-end">
              {LIVE_SUPPORTED_CHAIN_ROWS.map((row) => (
                <span
                  key={row.chain}
                  className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full border border-pulse-border/70 bg-pulse-panel/40 px-2.5 py-1 font-medium text-pulse-muted"
                >
                  <span className="text-pulse-text">{row.chain}</span>
                  <span className="font-mono text-[10px]">ID {row.chainId}</span>
                  <span className="text-[10px]">
                    {formatRevokeSupport(row)}
                  </span>
                </span>
              ))}
            </div>
            <p className="max-w-xl text-xs leading-5 lg:max-w-sm lg:text-right">
              Live now on {LIVE_SUPPORTED_CHAIN_COUNT} EVM networks:{" "}
              {LIVE_SUPPORTED_CHAIN_LIST}. {VERIFIED_ROW_SUPPORT_NOTE} No seed
              phrases or private keys.{" "}
              <Link
                href="/security"
                className="font-semibold text-pulse-cyan underline underline-offset-2 hover:text-pulse-text"
              >
                Security details
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
