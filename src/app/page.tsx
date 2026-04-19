import type { Metadata } from "next";
import Link from "next/link";

import { PulseMark } from "@/components/pulse-mark";
import {
  currentRelease,
  isPlaceholderCid,
  isPlaceholderUrl,
  type ArtifactIcon,
  type ChecksumsArtifact,
  type IpfsGateway,
  type ReleaseArtifact,
  type ReleaseManifest,
} from "@/lib/release";
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
  const release = currentRelease;
  const { links } = siteConfig;

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
              <span className="text-gradient-pulse">{release.version}</span>
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
            <figure
              className="relative mx-auto mt-14 max-w-3xl"
              aria-label="Pulse Revoke scanner preview"
            >
              <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel shadow-glow">
                {/* Browser chrome */}
                <div className="flex items-center gap-3 border-b border-pulse-border/70 bg-pulse-bg/60 px-4 py-2.5">
                  <div className="flex items-center gap-1.5" aria-hidden>
                    <span className="h-2.5 w-2.5 rounded-full bg-pulse-red/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-pulse-green/70" />
                  </div>
                  <div className="flex-1 truncate rounded-md border border-pulse-border/60 bg-pulse-panel/80 px-3 py-1 text-center font-mono text-[11px] text-pulse-muted">
                    {siteConfig.domain}/app
                  </div>
                </div>
                {/* App preview */}
                <PreviewMockup />
              </div>
              <figcaption className="mt-3 text-center text-[11px] text-pulse-muted/70">
                Preview of the live scanner at{" "}
                <Link href="/app" className="underline-offset-2 hover:text-pulse-text hover:underline">
                  {siteConfig.domain}/app
                </Link>
              </figcaption>
            </figure>
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
              {release.artifacts.map((artifact) => (
                <DownloadButton key={artifact.id} artifact={artifact} />
              ))}
            </div>

            <div className="mt-5 flex flex-col items-center gap-2">
              <ChecksumsLink checksums={release.checksums} />
            </div>
          </div>
        </section>

        {/* IPFS */}
        <section id="ipfs" className="border-t border-pulse-border/60 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionHeader
              eyebrow="Distributed"
              title="Available on IPFS"
              description="Each release is pinned to IPFS for censorship-resistant distribution. Access via any public gateway or your own node — the CID stays the same."
            />
            <IpfsCard ipfs={release.ipfs} />
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

const PLATFORM_ICONS: Record<ArtifactIcon, React.ReactElement> = {
  windows: <WindowsIcon />,
  macos: <MacIcon />,
  linux: <LinuxIcon />,
};

function DownloadButton({ artifact }: { artifact: ReleaseArtifact }) {
  const { href, platform, architecture, icon, note } = artifact;
  const unreleased = isPlaceholderUrl(href);
  const label = `Download for ${platform} ${architecture}`;
  const platformIcon = PLATFORM_ICONS[icon];

  const base =
    "flex flex-col items-center gap-2.5 rounded-xl border px-4 py-5 text-center transition";

  if (unreleased) {
    return (
      <div
        role="button"
        aria-disabled="true"
        aria-label={`${label} — coming soon`}
        className={`${base} cursor-not-allowed border-pulse-border/70 bg-pulse-panel/40`}
      >
        <span className="text-pulse-muted/70" aria-hidden>
          {platformIcon}
        </span>
        <span className="text-sm font-semibold text-pulse-muted">
          {platform}
        </span>
        <span className="text-[10px] text-pulse-muted/60">{architecture}</span>
        <span className="rounded-full border border-pulse-border/70 bg-pulse-bg/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-pulse-muted">
          Coming soon
        </span>
      </div>
    );
  }

  return (
    <a
      href={href}
      aria-label={label}
      className={`${base} border-pulse-border bg-pulse-panel/70 hover:border-pulse-purple/50 hover:bg-pulse-panel2`}
    >
      <span className="text-pulse-text" aria-hidden>
        {platformIcon}
      </span>
      <span className="text-sm font-semibold text-pulse-text">{platform}</span>
      <span className="text-[10px] text-pulse-muted">{architecture}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-pulse-cyan">
        Download
      </span>
      {note ? (
        <span className="text-[10px] text-pulse-muted/70">{note}</span>
      ) : null}
    </a>
  );
}

function ChecksumsLink({ checksums }: { checksums: ChecksumsArtifact }) {
  const { href, note } = checksums;
  const unreleased = isPlaceholderUrl(href);
  const base =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition";
  const icon = (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5 8h6M5 5h4M5 11h3" />
    </svg>
  );

  return (
    <>
      {unreleased ? (
        <span
          aria-disabled="true"
          className={`${base} cursor-not-allowed border-pulse-border/60 bg-pulse-panel/40 text-pulse-muted/70`}
        >
          {icon}
          SHA-256 checksums — coming soon
        </span>
      ) : (
        <a
          href={href}
          className={`${base} border-pulse-border bg-pulse-panel/60 text-pulse-muted hover:border-pulse-cyan/40 hover:text-pulse-cyan`}
        >
          {icon}
          SHA-256 checksums
        </a>
      )}
      <p className="max-w-md text-center text-[11px] text-pulse-muted/70">
        {note}
      </p>
    </>
  );
}

function IpfsCard({ ipfs }: { ipfs: ReleaseManifest["ipfs"] }) {
  const { cid, preferredGateway, alternateGateways } = ipfs;
  const unreleased = isPlaceholderCid(cid);
  const gateways: readonly IpfsGateway[] = [preferredGateway, ...alternateGateways];

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pulse-border/60 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-pulse-muted">
          Content ID
        </p>
        {unreleased ? (
          <span className="rounded-full border border-pulse-border/70 bg-pulse-bg/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-pulse-muted">
            Placeholder
          </span>
        ) : (
          <span className="rounded-full border border-pulse-green/30 bg-pulse-green/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-pulse-green">
            Pinned
          </span>
        )}
      </div>
      <div className="px-5 py-4">
        <p className="break-all font-mono text-sm text-pulse-text">{cid}</p>
        <p className="mt-2 text-[11px] text-pulse-muted/80">
          CIDs are content-addressed: any gateway below serves the same bytes.
          Verify against the checksums file after download.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-pulse-border/60 px-5 py-4">
        {gateways.map((gateway) => (
          <IpfsGatewayLink
            key={gateway.base}
            gateway={gateway}
            cid={cid}
            disabled={unreleased}
          />
        ))}
      </div>
    </div>
  );
}

function IpfsGatewayLink({
  gateway,
  cid,
  disabled,
}: {
  gateway: IpfsGateway;
  cid: string;
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition";
  const icon = (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zm0 0v12M2 8h12M3 5a9 9 0 0 0 10 0M3 11a9 9 0 0 0 10 0" />
    </svg>
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${base} cursor-not-allowed border-pulse-border/60 bg-pulse-bg/30 text-pulse-muted/60`}
      >
        {icon}
        {gateway.label}
      </span>
    );
  }

  return (
    <a
      href={`${gateway.base}${cid}`}
      target="_blank"
      rel="noreferrer"
      className={`${base} border-pulse-border bg-pulse-bg/60 text-pulse-muted hover:border-pulse-cyan/40 hover:text-pulse-cyan`}
    >
      {icon}
      {gateway.label}
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

const PREVIEW_ROWS = [
  {
    symbol: "USDC",
    spender: "PulseX Router v2",
    trusted: true,
    allowance: "Unlimited",
    risk: "High",
    riskColor: "red",
  },
  {
    symbol: "DAI",
    spender: "0x9f3…a21c",
    trusted: false,
    allowance: "1,000.00",
    risk: "Medium",
    riskColor: "yellow",
  },
  {
    symbol: "WPLS",
    spender: "PulseX Router v1",
    trusted: true,
    allowance: "250.00",
    risk: "Low",
    riskColor: "green",
  },
] as const;

function PreviewMockup() {
  return (
    <div className="p-5 sm:p-6" aria-hidden>
      {/* Connected header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pulse-border bg-pulse-bg/60 px-2.5 py-1 text-[10px] font-medium text-pulse-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" />
            Connected
          </span>
          <span className="font-mono text-[10px] text-pulse-muted">
            0x3f2…b7c
          </span>
          <span className="text-[10px] text-pulse-muted">3 active · 5 candidates</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-pulse-red/40 bg-pulse-red/10 px-2 py-0.5 text-[10px] font-semibold text-pulse-red">
            1 high-risk
          </span>
        </div>
        <span className="rounded-lg border border-pulse-border bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-pulse-text">
          Rescan
        </span>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-pulse-border bg-pulse-bg/40">
        <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 border-b border-pulse-border bg-pulse-bg/60 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-wider text-pulse-muted sm:grid">
          <div>Token</div>
          <div>Spender</div>
          <div>Allowance · Risk</div>
          <div className="text-right">Action</div>
        </div>
        <ul className="divide-y divide-pulse-border/60">
          {PREVIEW_ROWS.map((row) => (
            <li
              key={row.symbol}
              className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[1.2fr_1.5fr_1fr_auto] sm:gap-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-pulse-gradient text-[10px] font-bold text-white">
                  {row.symbol.slice(0, 2)}
                </div>
                <span className="text-xs font-semibold text-pulse-text">
                  {row.symbol}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs text-pulse-text">
                  {row.spender}
                </span>
                {row.trusted ? (
                  <span className="rounded-full border border-pulse-cyan/40 bg-pulse-cyan/10 px-1.5 py-0.5 text-[9px] font-semibold text-pulse-cyan">
                    Trusted
                  </span>
                ) : (
                  <span className="rounded-full border border-pulse-border bg-pulse-panel2/60 px-1.5 py-0.5 text-[9px] font-semibold text-pulse-muted">
                    Unknown
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    row.riskColor === "red"
                      ? "bg-pulse-red"
                      : row.riskColor === "yellow"
                      ? "bg-yellow-400"
                      : "bg-pulse-green"
                  }`}
                />
                <span className="text-xs text-pulse-text">{row.allowance}</span>
                <span className="text-[10px] text-pulse-muted">· {row.risk}</span>
              </div>
              <div className="flex justify-start sm:justify-end">
                <span className="rounded-lg bg-pulse-gradient px-3 py-1.5 text-[10px] font-semibold text-white shadow-glow">
                  Revoke
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Platform icons ────────────────────────────────────────────────────────────

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="currentColor">
      <path d="M3 5.5 11 4v7.5H3V5.5zm9-1.65L21 2v9.5h-9V3.85zM3 12.5h8V20l-8-1.5v-6zm9 0h9V22l-9-1.5v-8z" />
    </svg>
  );
}

function MacIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="currentColor">
      <path d="M16.37 1.5c.06 1.34-.47 2.64-1.26 3.58-.85 1-2.23 1.76-3.53 1.66-.13-1.3.5-2.63 1.29-3.51.88-1.02 2.37-1.75 3.5-1.73zM20.6 17.37c-.55 1.26-.81 1.82-1.52 2.93-1 1.55-2.4 3.49-4.15 3.5-1.55.02-1.95-1.02-4.05-1.01-2.1.01-2.54 1.03-4.1 1.01-1.74-.02-3.07-1.76-4.07-3.31C.53 16.1.25 10.9 2.53 8.14c1.62-1.96 4.17-3.1 6.57-3.1 2.44 0 3.98 1.34 6 1.34 1.96 0 3.15-1.34 5.98-1.34 2.14 0 4.4 1.17 6.01 3.19-5.27 2.89-4.41 10.43-5.49 9.14z" />
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="currentColor">
      <path d="M12 2c-2.2 0-4 1.8-4 4v1.4c-1.8 1.3-3 3.3-3 5.6 0 1.9.8 3.6 2 4.8l-.8 2.3c-.2.5.3 1 .8.8l2.3-.8c.9.5 1.9.8 3 .8 1.1 0 2.1-.3 3-.8l2.2.8c.5.2 1-.3.8-.8l-.8-2.3c1.2-1.2 2-2.9 2-4.8 0-2.3-1.2-4.3-3-5.6V6c0-2.2-1.8-4-4-4zm-1.5 5.5a.75.75 0 110 1.5.75.75 0 010-1.5zm3 0a.75.75 0 110 1.5.75.75 0 010-1.5zM12 13c1.5 0 2.7.5 3 1.3-.3.8-1.5 1.3-3 1.3s-2.7-.5-3-1.3c.3-.8 1.5-1.3 3-1.3z" />
    </svg>
  );
}
