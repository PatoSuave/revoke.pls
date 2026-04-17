import { ApprovalScanner } from "@/components/sections/approval-scanner";
import { Hero } from "@/components/sections/hero";
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
        <TrustSafety />
      </main>
      <SiteFooter />
    </>
  );
}
