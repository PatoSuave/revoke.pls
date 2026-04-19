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

/**
 * Sentinel value used for launcher links that do not have a real target yet
 * (desktop builds, checksums, etc). Components check against this to render
 * buttons as disabled / "coming soon" instead of leaking `"#"` everywhere.
 */
export const LAUNCHER_PLACEHOLDER_URL = "#";

/**
 * Sentinel value used for the IPFS CID until a real build is pinned. The
 * prefix `bafybei` is a valid CIDv1 prefix, which means UI code that just
 * renders the string still looks right — but logic can detect the
 * placeholder state via `isLauncherPlaceholderCid()`.
 */
export const LAUNCHER_PLACEHOLDER_CID = "bafybeiexamplecidplaceholder";

export function isLauncherPlaceholderUrl(value: string): boolean {
  return value === LAUNCHER_PLACEHOLDER_URL;
}

export function isLauncherPlaceholderCid(value: string): boolean {
  return value === LAUNCHER_PLACEHOLDER_CID;
}

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
    "Pulse Revoke is a non-custodial tool to review and revoke ERC-20 and NFT approvals on PulseChain. Open source, read-only until you sign.",
  /** Longer paragraph for hero copy and social previews. */
  longDescription:
    "Review every ERC-20 allowance and NFT operator approval your wallet has granted on PulseChain, understand the risk, and revoke the ones you no longer need — one signature at a time.",
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
    pulsex: "https://pulsex.com",
    walletConnect: "https://cloud.reown.com",
    github: "https://github.com/PatoSuave/revoke.pls",
  },
  /** Short attribution line shown in the footer. */
  attribution: "Built for the PulseChain community.",
  /**
   * Launcher / distribution page config.
   * Centralises all release metadata so the landing page never hardcodes
   * values. Swap placeholder strings for real values when a release ships.
   */
  launcher: {
    /** Current release version displayed on the landing page. */
    version: "v0.1.0",
    /** Path to the app preview image shown on the landing page. Place the
     *  PNG at `public/launcher-preview.png` to activate it. */
    previewImage: "/launcher-preview.png",
    /** Desktop download URLs. Use the `LAUNCHER_PLACEHOLDER_URL` sentinel
     *  (`"#"`) until builds ship — components detect it and render the
     *  "coming soon" state. */
    downloads: {
      windows: LAUNCHER_PLACEHOLDER_URL,
      windowsArm: LAUNCHER_PLACEHOLDER_URL,
      macos: LAUNCHER_PLACEHOLDER_URL,
      linux: LAUNCHER_PLACEHOLDER_URL,
      /** URL to the checksums file for the release. */
      checksums: LAUNCHER_PLACEHOLDER_URL,
    },
    /** IPFS distribution config. Swap `cid` for the real pinned value when
     *  a build is published. */
    ipfs: {
      cid: LAUNCHER_PLACEHOLDER_CID,
      /** Public IPFS gateway base URL (include trailing `/ipfs/`). */
      gateway: "https://ipfs.io/ipfs/",
    },
  } as const,
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
