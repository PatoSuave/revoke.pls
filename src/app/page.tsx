import type { Metadata } from "next";
import Link from "next/link";

import { PulseMark } from "@/components/pulse-mark";
import { absoluteUrl, siteConfig } from "@/lib/site";

// ─── Metadata ────────────────────────────────────────────────────────────────

const launcherTitle = `${siteConfig.name} — PulseChain Token Approval Manager`;
const launcherDescription =
  "Download Pulse Revoke or launch the web app. Review and revoke ERC-20 and NFT token approvals on PulseChain — non-custodial, open source.";

export const metadata: Metadata = {
  title: launcherTitle,
  description: launcherDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: launcherTitle,
    description: launcherDescription,
    url: absoluteUrl("/"),
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: launcherTitle,
    description: launcherDescription,
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LauncherPage() {
  const { launcher, links } = siteConfig;

  return (
    <div className="flex min-h-dvh flex-col bg-pulse-bg text-pulse-text">
      {/* Status banner */}
      <div className="border-b border-pulse-border/50 bg-pulse-panel/60 px-4 py-2 text-center text-[11px] font-medium text-pulse-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" aria-hidden />
          Mainnet live · PulseChain · chainId 369
        </span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-pulse-border/60 bg-pulse-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <PulseMark className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight">
              Pulse<span className="text-gradient-pulse"> Revoke</span>
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-xs text-pulse-muted sm:flex">
            <a href="#downloads" className="transition hover:text-pulse-text">
              Downloads
            </a>
            <a href="#ipfs" className="transition hover:text-pulse-text">
              IPFS
            </a>
            <a href="#resources" className="transition hover:text-pulse-text">
              Resources
            </a>
          </nav>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-xl bg-pulse-gradient px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            Launch App
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-pulse-radial py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <PulseMark className="mx-auto h-16 w-16 sm:h-20 sm:w-20" />

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-pulse-border bg-pulse-panel/80 px-3 py-1 text-[11px] font-semibold text-pulse-muted">
              <span className="text-gradient-pulse">{launcher.version}</span>
              <span className="text-pulse-border">·</span>
              <span>Public release</span>
            </div>

            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
              Pulse<span className="text-gradient-pulse"> Revoke</span>
            </h1>

            <p className="mt-4 text-base text-pulse-muted sm:text-lg">
              {siteConfig.longDescription}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-xl bg-pulse-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
              >
                Launch Web App
                <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
              <a
                href={links.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-pulse-border bg-white/5 px-6 py-3 text-sm font-semibold text-pulse-text transition hover:bg-white/10"
              >
                View on GitHub
              </a>
            </div>

            {/* Preview card */}
            <div className="relative mx-auto mt-14 max-w-2xl overflow-hidden rounded-2xl border border-pulse-border shadow-glow">
              <div
                className="flex h-64 items-center justify-center bg-pulse-panel sm:h-80"
                aria-label="App preview"
              >
                {/* Replace with <Image src={launcher.previewImage} fill alt="Pulse Revoke app screenshot" /> once the asset exists */}
                <PreviewPlaceholder />
              </div>
            </div>
          </div>
        </section>

        {/* Downloads */}
        <section id="downloads" className="border-t border-pulse-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHeader
              eyebrow="Desktop"
              title="Download"
              description="Native desktop builds are coming. The web app at /app works in any browser today — no install required."
            />

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DownloadButton href={launcher.downloads.windows} platform="Windows" icon="🪟" />
              <DownloadButton href={launcher.downloads.windowsArm} platform="Windows ARM" icon="🪟" />
              <DownloadButton href={launcher.downloads.macos} platform="macOS" icon="🍎" />
              <DownloadButton href={launcher.downloads.linux} platform="Linux" icon="🐧" />
            </div>

            <div className="mt-4 text-center">
              <a
                href={launcher.downloads.checksums}
                className="inline-flex items-center gap-1.5 text-xs text-pulse-muted transition hover:text-pulse-text"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="12" height="12" rx="2" />
                  <path d="M5 8h6M5 5h4M5 11h3" />
                </svg>
                SHA-256 Checksums
              </a>
            </div>
          </div>
        </section>

        {/* IPFS */}
        <section id="ipfs" className="border-t border-pulse-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHeader
              eyebrow="Distributed"
              title="Available on IPFS"
              description="Each release is pinned to IPFS for censorship-resistant distribution. Access via any public gateway or your own node."
            />

            <div className="mt-8 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/70">
              <div className="border-b border-pulse-border/60 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-pulse-muted">
                  Content ID
                </p>
                <p className="mt-1.5 break-all font-mono text-sm text-pulse-text">
                  {launcher.ipfs.cid}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 px-5 py-4">
                <IpfsGatewayLink
                  gateway="IPFS.io"
                  href={`${launcher.ipfs.gateway}${launcher.ipfs.cid}`}
                />
                <IpfsGatewayLink
                  gateway="Cloudflare"
                  href={`https://cloudflare-ipfs.com/ipfs/${launcher.ipfs.cid}`}
                />
                <IpfsGatewayLink
                  gateway="Pinata"
                  href={`https://gateway.pinata.cloud/ipfs/${launcher.ipfs.cid}`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Resources */}
        <section id="resources" className="border-t border-pulse-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHeader
              eyebrow="Links"
              title="Resources"
              description="Source code, block explorer, and ecosystem tools."
            />

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ResourceCard
                title="GitHub"
                description="Source code, issues, and pull requests."
                href={links.github}
                external
              />
              <ResourceCard
                title="PulseScan"
                description="Block explorer for PulseChain mainnet."
                href={links.explorer}
                external
              />
              <ResourceCard
                title="PulseX"
                description="Native DEX for the PulseChain ecosystem."
                href={links.pulsex}
                external
              />
              <ResourceCard
                title="WalletConnect"
                description="Get a project ID to enable QR wallet pairing."
                href={links.walletConnect}
                external
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-pulse-border/60 bg-pulse-bg py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4 text-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <PulseMark className="h-6 w-6" />
            <span className="text-sm font-semibold text-pulse-text">
              {siteConfig.name}
            </span>
            <span className="font-mono text-[11px] text-pulse-muted">
              {siteConfig.domain}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-pulse-muted">
            <Link href="/app" className="transition hover:text-pulse-text">
              Launch App
            </Link>
            <a href={links.github} target="_blank" rel="noreferrer" className="transition hover:text-pulse-text">
              GitHub
            </a>
            <a href={links.explorer} target="_blank" rel="noreferrer" className="transition hover:text-pulse-text">
              PulseScan
            </a>
          </div>
          <p className="text-[11px] text-pulse-muted/70">
            Informational and transactional. Not financial advice.{" "}
            © {new Date().getFullYear()} {siteConfig.name} · {siteConfig.attribution}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-muted">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 text-sm text-pulse-muted">{description}</p>
    </div>
  );
}

function DownloadButton({
  href,
  platform,
  icon,
}: {
  href: string;
  platform: string;
  icon: string;
}) {
  const isPlaceholder = href === "#";
  return (
    <a
      href={href}
      aria-disabled={isPlaceholder}
      aria-label={`Download for ${platform}${isPlaceholder ? " — coming soon" : ""}`}
      className={`flex flex-col items-center gap-2 rounded-xl border border-pulse-border bg-pulse-panel/70 px-4 py-5 text-center text-sm font-semibold transition ${
        isPlaceholder
          ? "cursor-not-allowed opacity-50"
          : "hover:border-pulse-purple/50 hover:bg-pulse-panel2"
      }`}
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="text-pulse-text">{platform}</span>
      {isPlaceholder ? (
        <span className="text-[10px] font-normal text-pulse-muted">Coming soon</span>
      ) : (
        <span className="text-[10px] font-normal text-pulse-cyan">Download</span>
      )}
    </a>
  );
}

function IpfsGatewayLink({ gateway, href }: { gateway: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-pulse-border bg-pulse-bg/60 px-3 py-2 text-xs font-medium text-pulse-muted transition hover:border-pulse-cyan/40 hover:text-pulse-cyan"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm0 0v12M2 8h12M3 5a9 9 0 0 0 10 0M3 11a9 9 0 0 0 10 0" />
      </svg>
      {gateway}
    </a>
  );
}

function ResourceCard({
  title,
  description,
  href,
  external,
}: {
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="flex flex-col gap-1.5 rounded-xl border border-pulse-border bg-pulse-panel/60 px-5 py-4 transition hover:border-pulse-purple/50 hover:bg-pulse-panel2"
    >
      <span className="flex items-center justify-between">
        <span className="text-sm font-semibold text-pulse-text">{title}</span>
        {external && (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-pulse-muted" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3H3v10h10v-3M13 3H9m4 0v4M7 9l6-6" />
          </svg>
        )}
      </span>
      <span className="text-xs text-pulse-muted">{description}</span>
    </a>
  );
}

function PreviewPlaceholder() {
  return (
    <div className="w-full px-6">
      <div className="mx-auto max-w-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 animate-none rounded bg-pulse-panel2" />
          <div className="h-7 w-20 rounded-lg bg-pulse-gradient opacity-70" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 rounded-xl border border-pulse-border/60 bg-pulse-bg/60 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-pulse-panel2" />
              <div className="h-2.5 w-16 rounded bg-pulse-panel2" />
            </div>
            <div className="flex items-center">
              <div className="h-2.5 w-24 rounded bg-pulse-panel2" />
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${i === 0 ? "bg-pulse-red" : i === 1 ? "bg-yellow-500/70" : "bg-pulse-green"}`} />
              <div className="h-2.5 w-12 rounded bg-pulse-panel2" />
            </div>
            <div className="flex items-center justify-end">
              <div className="h-7 w-16 rounded-lg bg-pulse-panel2" />
            </div>
          </div>
        ))}
        <p className="text-center text-[10px] text-pulse-muted/60">
          Pulse Revoke · Web App Preview
        </p>
      </div>
    </div>
  );
}
