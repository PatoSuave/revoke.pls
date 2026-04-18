/**
 * Single source of truth for branding, metadata, and public URLs.
 *
 * Everything the landing page, SEO metadata, and social previews need to
 * reference lives here. When a real production domain is ready, set
 * `NEXT_PUBLIC_SITE_URL` in the deployment environment — no other files
 * need to change.
 *
 * Values here are deliberately conservative: no testimonials, no
 * superlatives, no fabricated audit claims.
 */

const DEFAULT_SITE_URL = "https://pulse-revoke.app";

function normalizeUrl(input: string | undefined): string {
  const raw = (input ?? DEFAULT_SITE_URL).trim();
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export const siteConfig = {
  /** Public-facing product name. */
  name: "Pulse Revoke",
  /** Short product name without marketing suffix (for tab titles, nav). */
  shortName: "Pulse Revoke",
  /** One-line tagline. */
  tagline: "Manage PulseChain token approvals",
  /** Single-sentence meta description (used for SEO + OG). */
  description:
    "Pulse Revoke is a non-custodial tool to review and revoke ERC-20 token approvals on PulseChain. Open source, read-only until you sign.",
  /** Longer paragraph for hero copy and social previews. */
  longDescription:
    "Review every ERC-20 allowance your wallet has granted on PulseChain, understand the risk, and revoke the ones you no longer need — one signature at a time.",
  /** Canonical public URL. Override at build time with NEXT_PUBLIC_SITE_URL. */
  url: normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL),
  /** Path (relative to `url`) of the Open Graph / Twitter social image. */
  ogImage: "/og.png",
  /** Keywords for search engines. Keep conservative and factual. */
  keywords: [
    "PulseChain",
    "PulseChain approvals",
    "revoke approvals",
    "token allowance",
    "ERC-20 allowance",
    "wallet security",
    "revoke.cash alternative",
  ] as const,
  /** Anchor targets for primary nav. */
  nav: [
    { href: "#scanner", label: "Scanner" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#safety", label: "Safety" },
    { href: "#faq", label: "FAQ" },
  ] as const,
  /** External / utility links. */
  links: {
    explorer: "https://scan.pulsechain.com",
    pulsex: "https://pulsex.com",
    walletConnect: "https://cloud.reown.com",
    github: "https://github.com/PatoSuave/revoke.pls",
  },
  /** Short attribution line shown in the footer. */
  attribution: "Built for the PulseChain community.",
} as const;

export type SiteConfig = typeof siteConfig;

export function absoluteUrl(path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${suffix}`;
}
