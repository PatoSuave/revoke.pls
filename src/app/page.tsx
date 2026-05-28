import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { ChainLogo } from "@/components/chains/chain-logo";
import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { PulseChainResourceLinks } from "@/components/sections/pulsechain-resource-links";
import { PulseMark } from "@/components/pulse-mark";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import {
  currentRelease,
  isPlaceholderCid,
  isPlaceholderUrl,
  type ReleaseArtifact,
  type ReleaseManifest,
} from "@/lib/release";
import { absoluteUrl, siteConfig } from "@/lib/site";
import {
  formatRevokeSupport,
  LIVE_SUPPORTED_CHAIN_COUNT,
  LIVE_SUPPORTED_CHAIN_LIST,
  LIVE_SUPPORTED_CHAIN_ROWS,
  VERIFIED_ROW_SUPPORT_NOTE,
} from "@/lib/supported-chain-copy";

const productName = "Pulse Revoke";
const launcherTitle = `${productName} - Scan, review, revoke`;
const launcherDescription =
  `Launch the Pulse Revoke scanner. Review and revoke token and NFT approvals on ${LIVE_SUPPORTED_CHAIN_LIST} without custody.`;

export const metadata: Metadata = {
  title: launcherTitle,
  description: launcherDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: productName,
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

const TRUST_POINTS = [
  {
    title: "No seed phrase",
    body: "Pulse Revoke never asks for seed phrases, private keys, or mnemonics.",
  },
  {
    title: "No custody",
    body: "Funds stay in your wallet. The app reads public approval state.",
  },
  {
    title: "Wallet-confirmed revokes",
    body: "Every revoke is an on-chain transaction you approve in your wallet.",
  },
  {
    title: "Labels are context",
    body: "Spender labels help review, but they are not guarantees of safety.",
  },
] as const;

const HERO_TRUST_ITEMS = [
  "No seed phrase",
  "No custody",
  "Wallet-confirmed revokes",
  "Scan first, connect only when ready",
] as const;

const CHAIN_CARD_COPY: Record<string, string> = {
  PulseChain:
    "Primary Pulse Revoke lane for PRC-20, ERC-721-style, and ERC-1155-style approvals.",
  "BNB Smart Chain":
    "Shared scanner and wallet-side revoke flow with BSC gas guardrails.",
  Base: "Shared scanner and wallet-side revoke flow using Base explorer discovery.",
  Polygon:
    "Shared scanner and wallet-side revoke flow using PolygonScan and live checks.",
  "Ethereum Mainnet":
    "Server-side discovery with wallet-side revoke only after row verification.",
  "Arbitrum One":
    "Server-side discovery with verified ERC-20/NFT row-level revoke.",
  Optimism:
    "Server-side discovery for OP Mainnet with verified row-level revoke.",
  HyperEVM:
    "Server-side discovery with verified ERC-20/NFT row-level revoke on chain ID 999.",
};

const CHAIN_CARD_VISUALS: Record<
  string,
  {
    accent: string;
    accentSoft: string;
    accentBorder: string;
    textShadow: string;
  }
> = {
  PulseChain: {
    accent: "#A78BFA",
    accentSoft: "rgba(120, 57, 238, 0.16)",
    accentBorder: "rgba(167, 139, 250, 0.46)",
    textShadow: "0 0 22px rgba(120, 57, 238, 0.34)",
  },
  "BNB Smart Chain": {
    accent: "#F3BA2F",
    accentSoft: "rgba(243, 186, 47, 0.11)",
    accentBorder: "rgba(243, 186, 47, 0.34)",
    textShadow: "0 0 20px rgba(243, 186, 47, 0.25)",
  },
  Base: {
    accent: "#4D8BFF",
    accentSoft: "rgba(0, 82, 255, 0.12)",
    accentBorder: "rgba(77, 139, 255, 0.36)",
    textShadow: "0 0 20px rgba(0, 82, 255, 0.28)",
  },
  Polygon: {
    accent: "#A56BFF",
    accentSoft: "rgba(130, 71, 229, 0.13)",
    accentBorder: "rgba(165, 107, 255, 0.36)",
    textShadow: "0 0 20px rgba(130, 71, 229, 0.28)",
  },
  "Ethereum Mainnet": {
    accent: "#8EA5FF",
    accentSoft: "rgba(98, 126, 234, 0.13)",
    accentBorder: "rgba(142, 165, 255, 0.35)",
    textShadow: "0 0 20px rgba(98, 126, 234, 0.28)",
  },
  "Arbitrum One": {
    accent: "#28A0F0",
    accentSoft: "rgba(40, 160, 240, 0.12)",
    accentBorder: "rgba(40, 160, 240, 0.34)",
    textShadow: "0 0 20px rgba(40, 160, 240, 0.26)",
  },
  Optimism: {
    accent: "#FF5A68",
    accentSoft: "rgba(255, 4, 32, 0.11)",
    accentBorder: "rgba(255, 90, 104, 0.34)",
    textShadow: "0 0 20px rgba(255, 4, 32, 0.24)",
  },
  HyperEVM: {
    accent: "#47E6A2",
    accentSoft: "rgba(71, 230, 162, 0.12)",
    accentBorder: "rgba(71, 230, 162, 0.34)",
    textShadow: "0 0 20px rgba(71, 230, 162, 0.24)",
  },
};

const SCANNER_PANEL_POINTS = [
  {
    title: "Address-only review",
    body: "Start with a pasted EVM wallet address before connecting anything.",
  },
  {
    title: "Live verification",
    body: "Rows stay actionable only after current approval state is checked.",
  },
  {
    title: "Wallet prompt is final",
    body: "Revoke writes appear in your wallet only after you choose an action.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Scan an address",
    body: "Paste an EVM address or connect a wallet when ready. The scanner reads public approval history and current state.",
  },
  {
    step: "02",
    title: "Review approvals",
    body: "Compare active token allowances and NFT operator approvals with chain, spender, and risk context.",
  },
  {
    step: "03",
    title: "Revoke with your wallet",
    body: "Choose only the approvals you want to clear. Each revoke is wallet-confirmed and submitted on-chain.",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "Does Pulse Revoke custody funds?",
    answer:
      "No. Pulse Revoke reads public wallet and chain data. Your funds stay in your wallet at all times.",
  },
  {
    question: "Can it move my tokens?",
    answer:
      "The app cannot move tokens by itself. It only prepares explicit revoke transactions after you click a revoke action and confirm in your wallet.",
  },
  {
    question: "Why do I need to sign transactions?",
    answer:
      "Revoking changes approval state on-chain, so your wallet must sign and submit a transaction. Network gas applies.",
  },
  {
    question: "What does revoking do?",
    answer:
      "For PRC-20, BEP-20, and ERC-20 tokens, revoking sets the spender allowance to zero. For NFTs, it clears the relevant operator or per-token approval.",
  },
  {
    question: "Is the desktop app available yet?",
    answer:
      "Not yet. The Tauri desktop path is scaffolded, but public desktop artifacts are still pending release.",
  },
  {
    question: "What chains are supported?",
    answer: `${LIVE_SUPPORTED_CHAIN_LIST} are live in the scanner. ${VERIFIED_ROW_SUPPORT_NOTE} Results should still be checked on the relevant explorer before signing.`,
  },
] as const;

export default function LauncherPage() {
  const release = currentRelease;
  const desktopReady = release.artifacts.some(
    (artifact) => !isPlaceholderUrl(artifact.href),
  );
  const ipfsReady = !isPlaceholderCid(release.ipfs.cid);

  return (
    <div className="min-h-dvh bg-pulse-bg text-pulse-text">
      <SiteHeader />
      <main>
        <Hero />
        <SupportedChainsSection />
        <HowItWorks />
        <TrustStrip />
        <AntiPhishingBanner />
        <PulseChainResourceLinks />
        <DesktopSection release={release} desktopReady={desktopReady} />
        <IpfsSection release={release} ipfsReady={ipfsReady} />
        <FAQSection />
      </main>
      <SiteFooter desktopReady={desktopReady} />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-pulse-border/60 bg-pulse-bg/85 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-0">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2.5"
          aria-label={`${productName} home`}
        >
          <PulseMark className="h-8 w-8 shrink-0" />
          <span className="truncate text-sm font-semibold sm:text-base">
            Pulse <span className="text-gradient-pulse">Revoke</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-pulse-muted md:flex">
          <a href="#chains" className="transition hover:text-pulse-text">
            Chains
          </a>
          <a href="#how-it-works" className="transition hover:text-pulse-text">
            How it works
          </a>
          <Link href="/security" className="transition hover:text-pulse-text">
            Security
          </Link>
          <a href="#faq" className="transition hover:text-pulse-text">
            FAQ
          </a>
          <a
            href={siteConfig.links.x}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Pulse Revoke on X"
            className="x-profile-pulse-link"
          >
            X
          </a>
        </nav>

        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <ThemeModeToggle className="hidden sm:inline-grid" />
          <Link
            href="/app"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-pulse-gradient px-3 py-2 text-xs font-semibold text-pulse-on-gradient transition hover:brightness-110 sm:px-4"
          >
            <span className="sm:hidden">Launch</span>
            <span className="hidden sm:inline">Launch Scanner</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-pulse-border/50">
      <div className="absolute inset-0 bg-pulse-radial opacity-90" aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-pulse-bg to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <div className="min-w-0">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-pulse-cyan/35 bg-pulse-panel/75 px-3 py-1 text-xs font-semibold text-pulse-cyan">
            <span
              className="h-1.5 w-1.5 rounded-full bg-pulse-green"
              aria-hidden
            />
            <span>{LIVE_SUPPORTED_CHAIN_COUNT} live EVM networks</span>
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] sm:text-6xl">
            Review risky approvals before they become a problem.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-pulse-muted sm:text-lg">
            Scan token and NFT approvals across {LIVE_SUPPORTED_CHAIN_LIST}.
            Revoke only after live verification confirms an approval is still
            active.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-xl bg-pulse-gradient px-6 py-3 text-sm font-semibold text-pulse-on-gradient shadow-glow transition hover:brightness-110"
            >
              Launch Scanner
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-6 py-3 text-sm font-semibold text-pulse-text transition hover:bg-pulse-text/10"
            >
              Security &amp; Trust
            </Link>
          </div>

          <HeroTrustStrip />
        </div>

        <ScannerPathPanel />
      </div>
    </section>
  );
}

function HeroTrustStrip() {
  return (
    <ul className="mt-6 grid max-w-2xl gap-2 text-sm text-pulse-muted sm:grid-cols-2">
      {HERO_TRUST_ITEMS.map((item) => (
        <li
          key={item}
          className="flex min-w-0 items-center gap-2 rounded-xl border border-pulse-border/70 bg-pulse-panel/45 px-3 py-2"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-green"
            aria-hidden
          />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ScannerPathPanel() {
  return (
    <aside aria-label="Scanner workflow" className="grid gap-3">
      <div className="rounded-2xl border border-pulse-cyan/30 bg-pulse-panel/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
          Live scanner
        </p>
        <p className="mt-2 text-2xl font-semibold leading-8 text-pulse-text">
          Scan first. Connect only when you are ready to revoke.
        </p>
        <p className="mt-3 text-sm leading-6 text-pulse-muted">
          PulseChain is the primary lane, and the same wallet-confirmed safety
          model applies across every supported EVM network.
        </p>
      </div>

      <div className="grid gap-3">
        {SCANNER_PANEL_POINTS.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-pulse-border bg-pulse-bg/60 p-4"
          >
            <p className="text-base font-semibold text-pulse-text">
              {item.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-pulse-muted">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <p className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4 text-xs leading-5 text-pulse-muted">
        Desktop and IPFS releases are tracked below as roadmap status. The live
        product action is the web scanner.
      </p>
    </aside>
  );
}

function SupportedChainsSection() {
  return (
    <section id="chains" className="border-b border-pulse-border/60 py-14 sm:py-20">
      <SectionHeader
        eyebrow="Supported chains"
        title={`${LIVE_SUPPORTED_CHAIN_COUNT} live EVM networks`}
      />
      <div className="mx-auto mt-9 grid max-w-6xl gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {LIVE_SUPPORTED_CHAIN_ROWS.map((row) => (
          <ChainCard key={row.chain} row={row} />
        ))}
      </div>
    </section>
  );
}

function ChainCard({ row }: { row: (typeof LIVE_SUPPORTED_CHAIN_ROWS)[number] }) {
  const isPrimary = row.chain === "PulseChain";
  const supportLabel = formatRevokeSupport(row);
  const visual = CHAIN_CARD_VISUALS[row.chain] ?? {
    accent: "#31D6FF",
    accentSoft: "rgba(49, 214, 255, 0.11)",
    accentBorder: "rgba(49, 214, 255, 0.34)",
    textShadow: "0 0 20px rgba(49, 214, 255, 0.24)",
  };
  const chainId = Number(row.chainId);
  const cardStyle = {
    "--chain-accent": visual.accent,
    "--chain-accent-soft": visual.accentSoft,
    "--chain-accent-border": visual.accentBorder,
    "--chain-text-shadow": visual.textShadow,
  } as CSSProperties;

  return (
    <article
      style={cardStyle}
      className={`group relative flex min-h-52 overflow-hidden rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-glow ${
        isPrimary
          ? "border-[color:var(--chain-accent-border)] bg-[linear-gradient(135deg,var(--chain-accent-soft),rgba(17,19,29,0.72))]"
          : "border-[color:var(--chain-accent-border)] bg-[linear-gradient(135deg,var(--chain-accent-soft),rgba(17,19,29,0.56))]"
      }`}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-5 text-[color:var(--chain-accent)] opacity-[0.10] transition group-hover:opacity-[0.16]"
        aria-hidden
      >
        <ChainLogo chainId={chainId} className="h-28 w-28" tone="muted" />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--chain-accent-border)] bg-pulse-bg/50 shadow-[0_0_22px_var(--chain-accent-soft)]">
            <ChainLogo chainId={chainId} className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h3
              className="text-base font-semibold"
              style={{
                color: visual.accent,
                textShadow: "var(--chain-text-shadow)",
              }}
            >
              {row.chain}
            </h3>
            <p className="mt-1 font-mono text-xs text-pulse-muted">
              <span className="text-[color:var(--chain-accent)]">Chain ID</span>{" "}
              {row.chainId}
            </p>
          </div>
        </div>
        {isPrimary ? (
          <span className="shrink-0 rounded-full border border-[color:var(--chain-accent-border)] bg-[color:var(--chain-accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--chain-accent)]">
            Primary
          </span>
        ) : null}
      </div>

      <p className="relative z-10 mt-4 flex-1 text-sm leading-6 text-pulse-muted">
        {CHAIN_CARD_COPY[row.chain] ?? row.note}
      </p>

      <div className="relative z-10 mt-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-pulse-green/30 bg-pulse-green/10 px-2.5 py-1 text-[11px] font-semibold text-pulse-green">
          Scan live
        </span>
        <span className="rounded-full border border-[color:var(--chain-accent-border)] bg-pulse-bg/55 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--chain-accent)]">
          {supportLabel}
        </span>
      </div>
    </article>
  );
}

function TrustStrip() {
  return (
    <section
      id="trust"
      className="border-b border-pulse-border/60 bg-pulse-bg py-14 sm:py-20"
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <SectionKicker>Trust model</SectionKicker>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Clear limits before every signature.
          </h2>
          <p className="mt-4 text-sm leading-7 text-pulse-muted">
            Pulse Revoke is designed to make approvals easier to inspect, not
            to replace wallet review. Verify spender addresses, chain context,
            and wallet prompts before leaving access open or signing a revoke.
          </p>
          <Link
            href="/security"
            className="mt-5 inline-flex items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-4 py-2.5 text-sm font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
          >
            Security &amp; Trust
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TRUST_POINTS.map((point) => (
            <div
              key={point.title}
              className="rounded-2xl border border-pulse-border bg-pulse-panel/55 p-5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-pulse-green"
                  aria-hidden
                />
                <p className="text-sm font-semibold text-pulse-text">
                  {point.title}
                </p>
              </div>
              <p className="mt-2 text-xs leading-5 text-pulse-muted">
                {point.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-pulse-border/60 py-16 sm:py-20">
      <SectionHeader
        eyebrow="How it works"
        title="A narrow scan, review, revoke flow"
        body="The product does three things with clear boundaries: read public approval data, verify active state, and prepare wallet-confirmed revoke transactions."
      />
      <div className="mx-auto mt-10 grid max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-3">
        {HOW_IT_WORKS.map((item) => (
          <article
            key={item.step}
            className="rounded-2xl border border-pulse-border bg-pulse-panel/60 p-6"
          >
            <span className="font-mono text-xs font-semibold text-pulse-cyan">
              {item.step}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-pulse-text">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-pulse-muted">
              {item.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DesktopSection({
  release,
  desktopReady,
}: {
  release: ReleaseManifest;
  desktopReady: boolean;
}) {
  return (
    <section id="desktop" className="border-b border-pulse-border/60 py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <SectionKicker>Roadmap status</SectionKicker>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Desktop builds are planned, not live yet.
          </h2>
          <p className="mt-4 text-sm leading-7 text-pulse-muted">
            The live scanner is the hosted /app. The desktop path is scaffolded
            for a future signed Tauri build, and no public artifact is linked
            until release files and checksums are real.
          </p>
          <div className="mt-5 grid gap-2 text-sm text-pulse-muted">
            <CheckLine>Future local interface after installation.</CheckLine>
            <CheckLine>WalletConnect pairing planned for desktop use.</CheckLine>
            <CheckLine>Same approval review and revoke model as /app.</CheckLine>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-pulse-border bg-pulse-panel/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-pulse-text">
                  Desktop release status
                </p>
                <p className="mt-1 text-xs text-pulse-muted">
                  {desktopReady
                    ? `Artifacts listed for ${release.version}.`
                    : "No public desktop artifact or checksum is published yet."}
                </p>
              </div>
              <StatusPill tone={desktopReady ? "success" : "neutral"}>
                {desktopReady ? release.version : "Pending"}
              </StatusPill>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {release.artifacts.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>

          <div className="rounded-2xl border border-pulse-border bg-pulse-panel/60 p-5">
            <div>
              <p className="text-sm font-semibold text-pulse-text">
                Release guardrail
              </p>
              <p className="mt-2 text-xs leading-5 text-pulse-muted">
                Desktop downloads remain disabled until signed release
                artifacts and checksums are available. Placeholder manifest
                values never render as download links.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArtifactCard({ artifact }: { artifact: ReleaseArtifact }) {
  const ready = !isPlaceholderUrl(artifact.href);

  if (!ready) {
    return (
      <div className="rounded-xl border border-pulse-border bg-pulse-bg/55 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-pulse-text">
              {artifact.platform}
            </p>
            <p className="mt-1 text-xs text-pulse-muted">
              {artifact.architecture}
            </p>
          </div>
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted">
            Pending
          </span>
        </div>
        <p className="mt-3 text-xs text-pulse-muted">Download coming soon.</p>
      </div>
    );
  }

  return (
    <a
      href={artifact.href}
      className="block rounded-xl border border-pulse-cyan/40 bg-pulse-cyan/10 p-4 transition hover:bg-pulse-cyan/15"
    >
      <p className="text-sm font-semibold text-pulse-text">
        {artifact.platform}
      </p>
      <p className="mt-1 text-xs text-pulse-muted">{artifact.architecture}</p>
      <p className="mt-3 text-xs font-semibold text-pulse-cyan">Download</p>
    </a>
  );
}

function IpfsSection({
  release,
  ipfsReady,
}: {
  release: ReleaseManifest;
  ipfsReady: boolean;
}) {
  return (
    <section id="ipfs" className="border-b border-pulse-border/60 py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <SectionKicker>Roadmap status</SectionKicker>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            IPFS publishing waits for a verified release artifact.
          </h2>
          <p className="mt-4 text-sm leading-7 text-pulse-muted">
            The release manifest models gateways and checksums so builds can be
            pinned later. The final CID stays pending until a real artifact is
            published and verified.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-2xl border border-pulse-border bg-pulse-panel/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-pulse-text">
                  IPFS status
                </p>
                <p className="mt-1 text-xs text-pulse-muted">
                  {ipfsReady
                    ? "A pinned CID is present in the release manifest."
                    : "Final CID pending release."}
                </p>
              </div>
              <StatusPill tone={ipfsReady ? "success" : "neutral"}>
                {ipfsReady ? "Pinned" : "CID pending"}
              </StatusPill>
            </div>
          </div>

          <div className="rounded-2xl border border-pulse-border bg-pulse-panel/60 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-muted">
                Content ID
              </p>
              {ipfsReady ? (
                <p className="mt-2 break-all font-mono text-sm text-pulse-text">
                  {release.ipfs.cid}
                </p>
              ) : (
                <p className="mt-2 text-sm text-pulse-muted">
                  No final CID has been published yet.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[release.ipfs.preferredGateway, ...release.ipfs.alternateGateways].map(
              (gateway) => (
                <span
                  key={gateway.base}
                  className="rounded-full border border-pulse-border bg-pulse-bg/55 px-3 py-1 text-xs text-pulse-muted"
                >
                  {gateway.label}
                </span>
              ),
            )}
          </div>

          <p className="rounded-2xl border border-pulse-border bg-pulse-panel/60 p-5 text-xs leading-5 text-pulse-muted">
            Gateway links stay disabled until a real CID is present. Checksums
            should be published with the same release.
          </p>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="py-16 sm:py-20">
      <SectionHeader
        eyebrow="FAQ"
        title="Short answers before you connect"
        body="Approval tools should be boring in the right places: clear permissions, clear transactions, clear limits."
      />
      <div className="mx-auto mt-10 grid max-w-6xl gap-3 px-4 sm:px-6 lg:grid-cols-2">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-pulse-border bg-pulse-panel/60 p-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-pulse-text">
              {item.question}
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-pulse-border text-pulse-muted transition group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-pulse-muted">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function SiteFooter({ desktopReady }: { desktopReady: boolean }) {
  return (
    <footer className="border-t border-pulse-border/60 bg-pulse-bg py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 text-sm text-pulse-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <PulseMark className="h-7 w-7" />
          <div>
            <p className="font-semibold text-pulse-text">{productName}</p>
            <p className="text-xs">{siteConfig.attribution}</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-4 text-xs">
          <Link href="/app" className="transition hover:text-pulse-text">
            Launch Scanner
          </Link>
          <Link href="/security" className="transition hover:text-pulse-text">
            Security &amp; Trust
          </Link>
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-pulse-text"
          >
            GitHub
          </a>
          <a
            href={siteConfig.links.x}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-pulse-text"
          >
            X
          </a>
          <a href="#desktop" className="transition hover:text-pulse-text">
            Desktop {desktopReady ? "downloads" : "coming soon"}
          </a>
        </nav>
      </div>
    </footer>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
      <SectionKicker>{eyebrow}</SectionKicker>
      <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-3 text-sm leading-7 text-pulse-muted">{body}</p>
      ) : null}
    </div>
  );
}

function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
      {children}
    </p>
  );
}

function CheckLine({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2">
      <span
        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-green"
        aria-hidden
      />
      <span>{children}</span>
    </p>
  );
}

function StatusPill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "success";
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : "border-pulse-border bg-pulse-panel/70 text-pulse-muted";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${toneClass} ${className}`}
    >
      {children}
    </span>
  );
}
