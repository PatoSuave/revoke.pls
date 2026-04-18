/**
 * Single source of truth for branding, metadata, and public URLs.
 *
 * Any change to brand name, tagline, domain, social copy, or nav should
 * happen here — no other module is allowed to hardcode the brand. When
 * the production domain is configured, set `NEXT_PUBLIC_SITE_URL` in the
 * deployment environment and the rest of the app follows automatically:
 *
 *   - `layout.tsx` feeds this into `metadataBase`, OG, Twitter, canonical
 *   - `icon.tsx` / `apple-icon.tsx` / `opengraph-image.tsx` read the brand
 *     values from here when generating image assets at build time
 *   - the site header/footer render nav + brand text from here
 *
 * Values here are deliberately conservative: no testimonials, no
 * superlatives, no fabricated audit claims.
 */

const DEFAULT_SITE_URL = "https://revoke.pls";

function normalizeUrl(input: string | undefined): string {
  const raw = (input ?? DEFAULT_SITE_URL).trim();
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function hostFromUrl(input: string): string {
  try {
    return new URL(input).host;
  } catch {
    return input.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

const resolvedUrl = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const siteConfig = {
  /** Public-facing product name. */
  name: "Pulse Revoke",
  /** Short product name without marketing suffix (for tab titles, nav). */
  shortName: "Pulse Revoke",
  /** Production domain, without protocol. Matches `url` when
   *  `NEXT_PUBLIC_SITE_URL` is set; useful for plain-text footer display
   *  and OG image rendering. */
  domain: hostFromUrl(resolvedUrl),
  /** One-line tagline. */
  tagline: "Manage PulseChain token approvals",
  /** Single-sentence meta description (used for SEO + OG). */
  description:
    "Pulse Revoke is a non-custodial tool to review and revoke ERC-20 token approvals on PulseChain. Open source, read-only until you sign.",
  /** Longer paragraph for hero copy and social previews. */
  longDescription:
    "Review every ERC-20 allowance your wallet has granted on PulseChain, understand the risk, and revoke the ones you no longer need — one signature at a time.",
  /** Canonical public URL. Override at build time with NEXT_PUBLIC_SITE_URL. */
  url: resolvedUrl,
  /** Keywords for search engines. Keep conservative and factual. */
  keywords: [
    "PulseChain",
    "PulseChain approvals",
    "revoke approvals",
    "revoke.pls",
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
  /** Brand accent colors used by the OG image and icon renderers. */
  brandColors: {
    background: "#07070b",
    text: "#ffffff",
    muted: "#9ca3af",
    gradientStart: "#22d3ee",
    gradientMid: "#7c3aed",
    gradientEnd: "#ff2fb5",
  },
} as const;

export type SiteConfig = typeof siteConfig;

export function absoluteUrl(path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${suffix}`;
}
