import type { Metadata } from "next";
import Link from "next/link";

import { LinkChecker } from "@/components/security/link-checker";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { absoluteUrl, siteConfig } from "@/lib/site";

const title = "Phishing Link Checker";
const description =
  "Check a crypto link with local static analysis before connecting a wallet.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/security/check-link",
  },
  openGraph: {
    type: "website",
    title: `${title} - ${siteConfig.shortName}`,
    description,
    url: absoluteUrl("/security/check-link"),
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} - ${siteConfig.shortName}`,
    description,
  },
};

export default function LinkCheckerPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-pulse-bg">
        <section className="relative overflow-hidden border-b border-pulse-border/50">
          <div
            className="absolute inset-0 bg-pulse-radial opacity-85"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-pulse-bg to-transparent"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
                Link Checker
              </p>
              <h1 className="mt-4 text-4xl font-bold sm:text-6xl">
                Check a crypto link before connecting your wallet.
              </h1>
              <p className="mt-5 text-base leading-7 text-pulse-muted sm:text-lg">
                Paste a URL or domain to inspect static phishing signals. Pulse
                Revoke does not open submitted links, fetch remote pages, or ask
                you to connect a wallet for this check.
              </p>
              <div className="mt-8">
                <Link
                  href="/security"
                  className="inline-flex items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-5 py-3 text-sm font-semibold text-pulse-text transition hover:bg-pulse-text/10"
                >
                  Back to Security &amp; Trust
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-pulse-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <LinkChecker />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
