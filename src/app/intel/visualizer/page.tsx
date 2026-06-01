import type { Metadata } from "next";

import { IntelVisualizerPage } from "@/components/intel/visualizer/visualizer-page";

export const metadata: Metadata = {
  title: "PulseChain Visualizer | Pulse Revoke",
  description:
    "A read-only local demo of a PulseChain wallet relationship visualizer.",
};

export default function VisualizerPage() {
  return <IntelVisualizerPage />;
}
