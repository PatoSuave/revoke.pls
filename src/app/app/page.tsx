import type { Metadata } from "next";

import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { ApprovalScanner } from "@/components/sections/approval-scanner";
import { PulseChainLogoMark } from "@/components/pulsechain-logo-mark";
import { PulseChainGasTracker } from "@/components/gas/pulsechain-gas-tracker";
import { OrbitCommandAppIntro } from "@/components/sections/orbit-command";
import { PulseChainResourceLinks } from "@/components/sections/pulsechain-resource-links";
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
    title: `Revoke Scanner | ${siteConfig.shortName}`,
    description: siteConfig.description,
    url: absoluteUrl("/app"),
  },
  twitter: {
    card: "summary_large_image",
    title: `Revoke Scanner | ${siteConfig.shortName}`,
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
          <OrbitCommandAppIntro />
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
        <PulseChainLogoMark className="h-64 w-[17.25rem] lg:h-80 lg:w-[21.5rem]" />
      </div>
    </div>
  );
}
