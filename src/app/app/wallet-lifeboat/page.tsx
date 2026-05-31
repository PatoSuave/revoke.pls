import type { Metadata } from "next";

import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { WalletLifeboat } from "@/components/sections/wallet-lifeboat";
import { LIFEBOAT_ROUTE } from "@/lib/lifeboat/copy";
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
};

export default function WalletLifeboatPage() {
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
