import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { WalletLifeboat } from "@/components/sections/wallet-lifeboat";
import { LIFEBOAT_ROUTE } from "@/lib/lifeboat/copy";
import { isWalletLifeboatEnabled } from "@/lib/lifeboat/visibility";
import { absoluteUrl, siteConfig } from "@/lib/site";

const title = "Wallet Lifeboat";
const description =
  "Read-only compromised-wallet triage for checking visible approvals and planned risk diagnostics before adding gas.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: LIFEBOAT_ROUTE,
  },
  openGraph: {
    type: "website",
    title: `${title} - ${siteConfig.shortName}`,
    description,
    url: absoluteUrl(LIFEBOAT_ROUTE),
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} - ${siteConfig.shortName}`,
    description,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WalletLifeboatPage() {
  if (!isWalletLifeboatEnabled()) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="bg-pulse-bg">
        <WalletLifeboat />
        <AntiPhishingBanner />
      </main>
      <SiteFooter />
    </>
  );
}
