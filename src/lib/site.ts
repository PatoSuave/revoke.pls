/**
 * Single source of truth for branding, metadata, and public URLs.
 *
 * Any change to brand name, tagline, domain, social copy, or nav should happen
 * here so routes, metadata, generated images, and footer copy stay consistent.
 */

export const DEFAULT_SITE_URL = "https://revoke.pls";

export interface SiteUrlResolution {
  url: string;
  usedFallback: boolean;
  issue: "invalid" | null;
}

function parseSiteUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    const rootOnly = /^\/*$/.test(parsed.pathname);
    const httpProtocol =
      parsed.protocol === "https:" || parsed.protocol === "http:";

    if (
      !httpProtocol ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      !rootOnly ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveSiteUrl(
  input: string | undefined,
  fallback = DEFAULT_SITE_URL,
): SiteUrlResolution {
  const raw = input?.trim();
  const fallbackUrl = parseSiteUrl(fallback);

  if (!fallbackUrl) {
    throw new Error("Invalid built-in site URL fallback configuration.");
  }

  if (!raw) {
    return { url: fallbackUrl, usedFallback: true, issue: null };
  }

  const url = parseSiteUrl(raw);
  if (url) {
    return { url, usedFallback: false, issue: null };
  }

  return { url: fallbackUrl, usedFallback: true, issue: "invalid" };
}

export function normalizeSiteUrl(
  input: string | undefined,
  fallback = DEFAULT_SITE_URL,
): string {
  return resolveSiteUrl(input, fallback).url;
}

function hostFromUrl(input: string): string {
  return new URL(input).host;
}

const siteUrlResolution = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

if (siteUrlResolution.issue) {
  console.warn(
    "Invalid NEXT_PUBLIC_SITE_URL; using the default site URL. Expected an http(s) URL or bare hostname with no path, search, hash, username, or password.",
  );
}

const resolvedUrl = siteUrlResolution.url;

export const siteConfig = {
  /** Public-facing product name. */
  name: "Pulse Revoke",
  /** Short product name without marketing suffix (for tab titles, nav). */
  shortName: "Pulse Revoke",
  /** Production domain, without protocol. */
  domain: hostFromUrl(resolvedUrl),
  /** One-line tagline. */
  tagline: "Manage PulseChain and BSC token approvals",
  /** Single-sentence meta description (used for SEO + OG). */
  description:
    "Pulse Revoke is a non-custodial tool to review and revoke token and NFT approvals on PulseChain and BSC. Open source, read-only until you sign.",
  /** Longer paragraph for hero copy and social previews. */
  longDescription:
    "Review every token allowance and NFT operator approval your wallet has granted on PulseChain or BSC, understand the risk, and revoke the ones you no longer need one signature at a time.",
  /** Canonical public URL. Override at build time with NEXT_PUBLIC_SITE_URL. */
  url: resolvedUrl,
  /** Keywords for search engines. Keep conservative and factual. */
  keywords: [
    "PulseChain",
    "BSC",
    "BNB Smart Chain",
    "PulseChain approvals",
    "BSC approvals",
    "Pulse Revoke",
    "revoke approvals",
    "token allowance",
    "BEP-20 allowance",
    "NFT approvals",
    "ApprovalForAll",
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
    bscscan: "https://bscscan.com",
    pulsex: "https://pulsex.com",
    walletConnect: "https://cloud.reown.com",
    github: "https://github.com/PatoSuave/revoke.pls",
  },
  /** Short attribution line shown in the footer. */
  attribution: "Built for the PulseChain and BSC communities.",
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
