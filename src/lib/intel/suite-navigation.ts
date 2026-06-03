export const INTEL_SURFACES = [
  {
    href: "/intel",
    eyebrow: "Overview",
    label: "Suite hub",
    body: "Roadmap, module status, and current demo entry points.",
  },
  {
    href: "/intel/wallet",
    eyebrow: "Report demo",
    label: "Wallet report",
    body: "Address-centered portfolio, activity, and one-hop context.",
  },
  {
    href: "/intel/visualizer",
    eyebrow: "Graph demo",
    label: "Graph workbench",
    body: "Full-canvas relationship map with filters and timeline.",
  },
] as const;

export type IntelSurfaceHref = (typeof INTEL_SURFACES)[number]["href"];
