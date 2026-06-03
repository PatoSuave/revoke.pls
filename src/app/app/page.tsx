import type { Metadata } from "next";
import type { CSSProperties } from "react";

import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { ApprovalScanner } from "@/components/sections/approval-scanner";
import { ChainLogo } from "@/components/chains/chain-logo";
import { PulseMark } from "@/components/pulse-mark";
import { PulseChainGasTracker } from "@/components/gas/pulsechain-gas-tracker";
import { PulseChainResourceLinks } from "@/components/sections/pulsechain-resource-links";
import { getChainVisual } from "@/lib/chain-visuals";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { absoluteUrl, siteConfig } from "@/lib/site";
import {
  HYPEREVM_LIVE_NETWORK_NOTE,
  LIVE_SUPPORTED_CHAIN_ROWS,
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
      <main className="scanner-map-surface overflow-hidden bg-pulse-bg">
        <ScannerAppBackdrop />
        <div className="relative z-10">
          <AppWorkspaceIntro />
          <AntiPhishingBanner />
          <ApprovalScanner />
          <PulseChainGasTracker />
          <PulseChainResourceLinks compact />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function ScannerAppBackdrop() {
  return (
    <div className="chain-map-backdrop" aria-hidden>
      <div className="chain-map-mark hidden sm:block">
        <PulseMark className="h-64 w-64 lg:h-80 lg:w-80" />
      </div>
    </div>
  );
}

function AppWorkspaceIntro() {
  return (
    <section className="border-b border-pulse-border/45 bg-transparent">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Approval scanner
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-pulse-text sm:text-4xl">
              Review approvals before you revoke
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-pulse-muted sm:text-base">
              Paste a wallet address to review approvals without connecting.
              Connect only the matching wallet when you are ready to revoke a
              live-verified row.
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pulse-muted sm:text-base">
              {HYPEREVM_LIVE_NETWORK_NOTE}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2 text-[11px] text-pulse-muted lg:items-end">
            <p className="font-semibold uppercase tracking-[0.16em] text-pulse-muted/80">
              Live supported chains
            </p>
            <div className="flex max-w-full flex-wrap gap-1.5 lg:justify-end">
              {LIVE_SUPPORTED_CHAIN_ROWS.map((row) => (
                <LiveSupportedChainPill key={row.chain} row={row} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveSupportedChainPill({
  row,
}: {
  row: (typeof LIVE_SUPPORTED_CHAIN_ROWS)[number];
}) {
  const visual = getChainVisual(row.chain);
  const chainId = Number(row.chainId);
  const pillStyle = {
    "--accent-color": visual.accent,
    "--accent-readable": visual.accentReadable,
    "--accent-soft": visual.accentSoft,
    "--accent-border": visual.accentBorder,
    "--accent-shadow": visual.accentShadow,
  } as CSSProperties;

  return (
    <span
      style={pillStyle}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[color:var(--accent-border)] bg-pulse-panel/55 px-2.5 py-1 font-medium text-pulse-muted shadow-[0_0_12px_var(--accent-soft)] transition hover:border-[color:var(--accent-color)] hover:bg-pulse-panel/75"
    >
      <span
        className="brand-live-dot h-1.5 w-1.5 shrink-0 rounded-full"
        aria-hidden
      />
      <ChainLogo chainId={chainId} className="h-3.5 w-3.5 shrink-0" />
      <span className="brand-accent-text truncate font-semibold">
        {row.chain}
      </span>
      <span className="font-mono text-[10px] text-pulse-muted">
        ID {row.chainId}
      </span>
    </span>
  );
}
