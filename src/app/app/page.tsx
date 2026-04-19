import type { Metadata } from "next";

import { ApprovalScanner } from "@/components/sections/approval-scanner";
import { FAQ } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { TrustSafety } from "@/components/sections/trust-safety";
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
      <main>
        <Hero />
        <ApprovalScanner />
        <HowItWorks />
        <TrustSafety />
        <FAQ />
      </main>
      <SiteFooter />
    </>
  );
}
