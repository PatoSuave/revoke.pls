import type { Metadata } from "next";

import { IntelVisualizerPage } from "@/components/intel/visualizer/visualizer-page";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: `PulseChain Visualizer - ${siteConfig.shortName}`,
  description:
    "A read-only PulseChain wallet relationship visualizer preview.",
  alternates: {
    canonical: "/intel/visualizer",
  },
  openGraph: {
    type: "website",
    title: `PulseChain Visualizer - ${siteConfig.shortName}`,
    description:
      "Explore a read-only PulseChain relationship map preview for research context.",
    url: absoluteUrl("/intel/visualizer"),
  },
  twitter: {
    card: "summary_large_image",
    title: `PulseChain Visualizer - ${siteConfig.shortName}`,
    description:
      "Explore a read-only PulseChain relationship map preview for research context.",
  },
};

export default function VisualizerPage() {
  return <IntelVisualizerPage />;
}
