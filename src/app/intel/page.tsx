import type { Metadata } from "next";

import { IntelHub } from "@/components/intel/intel-hub";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `PulseChain Intelligence Suite - ${siteConfig.shortName}`,
  description:
    "A read-only PulseChain intelligence demo for wallet context, relationship maps, token analytics, research workspaces, and exposure awareness.",
  alternates: {
    canonical: "/intel",
  },
  openGraph: {
    type: "website",
    title: `PulseChain Intelligence Suite - ${siteConfig.shortName}`,
    description:
      "Explore the first read-only PulseChain intelligence foundation with local demo data.",
    url: absoluteUrl("/intel"),
  },
  twitter: {
    card: "summary_large_image",
    title: `PulseChain Intelligence Suite - ${siteConfig.shortName}`,
    description:
      "Explore the first read-only PulseChain intelligence foundation with local demo data.",
  },
};

export default function IntelPage() {
  return <IntelHub />;
}
