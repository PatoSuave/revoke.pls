import { ApprovalScanner } from "@/components/sections/approval-scanner";
import { FAQ } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { HowItWorks } from "@/components/sections/how-it-works";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { TrustSafety } from "@/components/sections/trust-safety";

export default function HomePage() {
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
