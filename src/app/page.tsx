import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { ChainLogo } from "@/components/chains/chain-logo";
import { HoverVideoLayer } from "@/components/hover-video-layer";
import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { PulseChainResourceLinks } from "@/components/sections/pulsechain-resource-links";
import { PulseMark } from "@/components/pulse-mark";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import { getChainVisual } from "@/lib/chain-visuals";
import { absoluteUrl, siteConfig } from "@/lib/site";
import {
  formatRevokeSupport,
  LIVE_SUPPORTED_CHAIN_COUNT,
  LIVE_SUPPORTED_CHAIN_LIST,
  LIVE_SUPPORTED_CHAIN_ROWS,
  VERIFIED_ROW_SUPPORT_NOTE,
} from "@/lib/supported-chain-copy";

const productName = "Pulse Revoke";
const launcherTitle = `${productName}: Scan, review, revoke`;
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
    title: "Wallet confirmed revokes",
    body: "Every revoke is a transaction you approve in your wallet.",
  },
  {
    title: "Labels are context",
    body: "Spender labels help review, but they are not guarantees of safety.",
  },
] as const;

const HERO_TRUST_ITEMS = [
  "No seed phrase",
  "No custody",
  "Wallet confirmed revokes",
  "Scan first, connect only when ready",
] as const;

const CHAIN_CARD_COPY: Record<string, string> = {
  PulseChain:
    "Primary Pulse Revoke lane for PRC-20, ERC-721, and ERC-1155 approvals.",
  "BNB Smart Chain":
    "Shared scanner with BSC gas guardrails and revokes through your wallet.",
  Base: "Shared scanner with Base explorer discovery and revokes through your wallet.",
  Polygon:
    "Shared scanner with PolygonScan discovery, live checks, and revokes through your wallet.",
  "Sonic Mainnet":
    "Shared scanner with SonicScan discovery, live checks, and revokes through your wallet.",
  "Avalanche C-Chain":
    "Shared scanner with SnowScan discovery, live checks, and revokes through your wallet.",
  Mantle:
    "Shared scanner with Mantle explorer links, live checks, and revokes through your wallet.",
  Linea:
    "Shared scanner with LineaScan discovery, live checks, and revokes through your wallet.",
  Blast:
    "Shared scanner with Blastscan discovery, live checks, and revokes through your wallet.",
  Berachain:
    "Shared scanner with Berascan discovery, live checks, and revokes through your wallet.",
  Celo:
    "Shared scanner with CeloScan discovery, live checks, and revokes through your wallet.",
  Gnosis:
    "Shared scanner with Gnosisscan discovery, live checks, and revokes through your wallet.",
  Unichain:
    "Shared scanner with Uniscan discovery, live checks, and revokes through your wallet.",
  "World Chain":
    "Shared scanner with Worldscan discovery, live checks, and revokes through your wallet.",
  "Robinhood Chain":
    "Shared scanner with Robinhood Blockscout discovery, live checks, and revokes through your wallet.",
  Monad:
    "Shared scanner with Monadscan discovery, live checks, and revokes through your wallet.",
  Katana:
    "Shared scanner with Katanascan discovery, live checks, and revokes through your wallet.",
  Sei: "Shared scanner with Seiscan discovery, live checks, and revokes through your wallet.",
  Plasma:
    "Shared scanner with PlasmaScan discovery, live checks, and revokes through your wallet.",
  Abstract:
    "Shared scanner with Abscan discovery, live checks, and revokes through your wallet.",
  "Ethereum Mainnet":
    "Hosted approval discovery with revokes through your wallet after row verification.",
  "Arbitrum One":
    "Hosted approval discovery with verified ERC-20 and NFT revokes per row.",
  Optimism:
    "Hosted approval discovery for OP Mainnet with verified revokes per row.",
  HyperEVM:
    "Hosted approval discovery with verified ERC-20 and NFT revokes per row on chain ID 999.",
};

const SCANNER_PANEL_POINTS = [
  {
    title: "Address review",
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

const RICHARD_HEART_HOVER_VIDEO_SRC =
  "/media/richard-heart-twerking.mp4";

const CHAIN_CARD_HOVER_MEDIA_SRC: Partial<Record<string, string>> = {
  PulseChain: RICHARD_HEART_HOVER_VIDEO_SRC,
  "BNB Smart Chain": "/media/cz-hover.gif",
  "Robinhood Chain": "/media/i-am-not-a-cat-roaring-kitty.gif",
  "Ethereum Mainnet": "/media/vitalik-hover.gif",
};

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
    body: "Choose only the approvals you want to clear. Each revoke is confirmed in your wallet and submitted on chain.",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "Does Pulse Revoke custody funds?",
    answer:
      "No. Pulse Revoke reads public wallet and chain data. Your funds stay in your wallet at all times.",
  },
  {
    question: "Is Pulse Revoke decentralized?",
    answer:
      "Pulse Revoke does not custody funds. It reads public blockchain data and prepares revoke transactions that only your wallet can approve. The website is a hosted interface, but the important actions happen on chain, and you can verify every approval or revoke transaction through your wallet and the relevant block explorer.",
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
    question: "What chains are supported?",
    answer: `${LIVE_SUPPORTED_CHAIN_LIST} are live in the scanner. ${VERIFIED_ROW_SUPPORT_NOTE} Results should still be checked on the relevant explorer before signing.`,
  },
] as const;

export default function LauncherPage() {
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
        <FAQSection />
      </main>
      <SiteFooter />
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
          PulseChain is the primary lane, and the same wallet confirmation
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
        The live product action is the web scanner. Revokes are only submitted
        after you review and confirm them in your own wallet.
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
  const hoverMediaSrc = CHAIN_CARD_HOVER_MEDIA_SRC[row.chain];
  const supportLabel = formatRevokeSupport(row);
  const visual = getChainVisual(row.chain);
  const chainId = Number(row.chainId);
  const cardStyle = {
    "--accent-color": visual.accent,
    "--accent-readable": visual.accentReadable,
    "--accent-soft": visual.accentSoft,
    "--accent-border": visual.accentBorder,
    "--accent-shadow": visual.accentShadow,
    "--chain-card-bg": isPrimary
      ? "rgb(var(--pulse-panel) / 0.88)"
      : "rgb(var(--pulse-panel) / 0.78)",
  } as CSSProperties;

  return (
    <article
      style={cardStyle}
      data-hover-video-card={hoverMediaSrc ? "" : undefined}
      tabIndex={hoverMediaSrc ? 0 : undefined}
      aria-label={hoverMediaSrc ? `${row.chain} live EVM network card` : undefined}
      className="group relative flex min-h-52 flex-col overflow-hidden rounded-2xl border border-[color:var(--accent-border)] bg-[linear-gradient(135deg,var(--accent-soft),var(--chain-card-bg))] p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-glow"
    >
      {hoverMediaSrc ? <HoverVideoLayer src={hoverMediaSrc} /> : null}
      <div
        className="pointer-events-none absolute -right-6 -top-5 text-[color:var(--accent-color)] opacity-[0.10] transition group-hover:opacity-[0.16]"
        aria-hidden
      >
        <ChainLogo chainId={chainId} className="h-28 w-28" tone="muted" />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color:var(--accent-border)] bg-pulse-bg/50 shadow-[0_0_22px_var(--accent-soft)]">
            <ChainLogo chainId={chainId} className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h3 className="brand-accent-text text-base font-semibold">
              {row.chain}
            </h3>
            <p className="mt-1 font-mono text-xs text-pulse-muted">
              <span className="brand-accent-text">Chain ID</span>{" "}
              {row.chainId}
            </p>
          </div>
        </div>
        {isPrimary ? (
          <span className="brand-accent-text shrink-0 rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
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
        <span className="brand-accent-text rounded-full border border-[color:var(--accent-border)] bg-pulse-bg/55 px-2.5 py-1 text-[11px] font-semibold">
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
        body="The product does three things with clear boundaries: read public approval data, verify active state, and prepare revoke transactions that your wallet must confirm."
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

function SiteFooter() {
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
