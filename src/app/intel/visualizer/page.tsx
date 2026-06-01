import type { Metadata } from "next";

import { IntelVisualizerPage } from "@/components/intel/visualizer/visualizer-page";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `PulseChain Visualizer - ${siteConfig.shortName}`,
  description:
    "A read-only local demo of a PulseChain wallet relationship visualizer.",
  alternates: {
    canonical: "/intel/visualizer",
  },
  openGraph: {
    type: "website",
    title: `PulseChain Visualizer - ${siteConfig.shortName}`,
    description:
      "Explore a read-only local demo relationship map for PulseChain research context.",
    url: absoluteUrl("/intel/visualizer"),
  },
  twitter: {
    card: "summary_large_image",
    title: `PulseChain Visualizer - ${siteConfig.shortName}`,
    description:
      "Explore a read-only local demo relationship map for PulseChain research context.",
  },
};

export default function VisualizerPage() {
  return <IntelVisualizerPage />;
}
