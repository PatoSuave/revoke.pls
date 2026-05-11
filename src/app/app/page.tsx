import type { Metadata } from "next";
import Link from "next/link";

import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { ApprovalScanner } from "@/components/sections/approval-scanner";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { absoluteUrl, siteConfig } from "@/lib/site";

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
  const statusItems = [
    "PulseChain",
    "BNB Smart Chain",
    "Base",
    "Ethereum Mainnet",
    "Arbitrum One read-only beta",
  ];

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

          <div className="flex flex-col gap-3 text-xs text-pulse-muted lg:items-end">
            <div className="flex flex-wrap gap-2">
              {statusItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-pulse-border bg-pulse-panel/65 px-3 py-1 font-semibold"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="max-w-xl leading-5 lg:max-w-sm lg:text-right">
              Scans are read-only. Revoke actions appear only on enabled
              networks after verification. No seed phrases or private keys.{" "}
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
