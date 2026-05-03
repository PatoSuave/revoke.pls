import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PulseMark } from "@/components/pulse-mark";
import {
  currentRelease,
  isPlaceholderCid,
  isPlaceholderUrl,
  type ReleaseArtifact,
  type ReleaseManifest,
} from "@/lib/release";
import { absoluteUrl, siteConfig } from "@/lib/site";

const productName = "Pulse Revoke";
const launcherTitle = `${productName} - PulseChain approval safety`;
const launcherDescription =
  "Launch the Pulse Revoke scanner or track desktop release status. Review and revoke token approvals on PulseChain and BSC without custody.";

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
    title: "Non-custodial",
    body: "Pulse Revoke never holds wallet funds.",
  },
  {
    title: "User-signed",
    body: "Every revoke is confirmed in your wallet.",
  },
  {
    title: "No hidden writes",
    body: "Write transactions appear only after you click revoke.",
  },
  {
    title: "Curated labels",
    body: "Registry names help, but users should still verify.",
  },
] as const;

const HERO_STATS = [
  { label: "Supported chains", value: "PulseChain + BSC" },
  { label: "Scanner", value: "Live at /app" },
  { label: "Desktop", value: "Pending release" },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Connect wallet",
    body: "Use a browser wallet or WalletConnect. The scanner reads public chain data for your address.",
  },
  {
    step: "02",
    title: "Review approvals",
    body: "See active token allowances and NFT operator approvals, with risk cues and spender labels.",
  },
  {
    step: "03",
    title: "Revoke what you do not trust",
    body: "Each revoke is a wallet-confirmed on-chain transaction that clears an approval.",
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
      "For BEP-20 and PRC-20 tokens, revoking sets the spender allowance to zero. For NFTs, it clears the relevant operator or per-token approval.",
  },
  {
    question: "Is the desktop app available yet?",
    answer:
      "Not yet. The Tauri desktop path is scaffolded, but public desktop artifacts are still pending release.",
  },
  {
    question: "What chains are supported?",
    answer:
      "PulseChain mainnet (369) and BSC / BNB Smart Chain (56). Results should still be checked on PulseScan or BscScan before signing.",
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
      <SiteHeader desktopReady={desktopReady} />
      <main>
        <Hero desktopReady={desktopReady} />
        <TrustStrip />
        <HowItWorks />
        <DesktopSection release={release} desktopReady={desktopReady} />
        <IpfsSection release={release} ipfsReady={ipfsReady} />
        <FAQSection />
      </main>
      <SiteFooter desktopReady={desktopReady} />
    </div>
  );
}

function SiteHeader({ desktopReady }: { desktopReady: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-pulse-border/60 bg-pulse-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label={`${productName} home`}
        >
          <PulseMark className="h-8 w-8" />
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            Pulse <span className="text-gradient-pulse">Revoke</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-pulse-muted md:flex">
          <a href="#how-it-works" className="transition hover:text-pulse-text">
            How it works
          </a>
          <a href="#desktop" className="transition hover:text-pulse-text">
            Desktop
          </a>
          <a href="#ipfs" className="transition hover:text-pulse-text">
            IPFS
          </a>
          <a href="#faq" className="transition hover:text-pulse-text">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <StatusPill className="hidden sm:inline-flex">
            {desktopReady ? "Desktop ready" : "Desktop pending"}
          </StatusPill>
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-xl bg-pulse-gradient px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            Launch Scanner
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero({ desktopReady }: { desktopReady: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-pulse-border/50">
      <div className="absolute inset-0 bg-pulse-radial opacity-90" aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-pulse-bg to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-pulse-cyan/35 bg-pulse-panel/75 px-3 py-1 text-xs font-semibold text-pulse-cyan">
            <span
              className="h-1.5 w-1.5 rounded-full bg-pulse-green"
              aria-hidden
            />
            PulseChain approval safety
          </div>

          <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-7xl">
            Pulse <span className="text-gradient-pulse">Revoke</span>
          </h1>

          <p className="mt-5 max-w-2xl text-xl font-semibold leading-8 text-pulse-text sm:text-2xl">
            Revoke risky approvals on PulseChain with a scanner built for
            careful wallet review.
          </p>

          <p className="mt-4 max-w-2xl text-base leading-7 text-pulse-muted">
            Review token allowances and NFT operator approvals, then clear the
            permissions you do not trust. The app stays read-only until you
            choose a revoke action and confirm it in your own wallet.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-xl bg-pulse-gradient px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
            >
              Launch Scanner
            </Link>
            <a
              href="#desktop"
              className="inline-flex items-center justify-center rounded-xl border border-pulse-border bg-white/5 px-6 py-3 text-sm font-semibold text-pulse-text transition hover:bg-white/10"
            >
              Desktop App {desktopReady ? "" : "/ Coming Soon"}
            </a>
          </div>

          <dl className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {HERO_STATS.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-pulse-border bg-pulse-panel/55 p-4"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-muted">
                  {item.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-pulse-text">
                  {desktopReady && item.label === "Desktop"
                    ? "Release ready"
                    : item.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 max-w-xl text-xs leading-5 text-pulse-muted">
            Always verify spender addresses on PulseScan or BscScan before
            signing. Registry labels are curated, not a guarantee of safety.
          </p>
        </div>

        <LaunchChoicePanel desktopReady={desktopReady} />
      </div>
    </section>
  );
}

function LaunchChoicePanel({ desktopReady }: { desktopReady: boolean }) {
  return (
    <aside aria-label="Launch options" className="grid gap-3">
      <div className="rounded-2xl border border-pulse-border bg-pulse-panel/70 p-5 shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
          Choose your path
        </p>
        <p className="mt-2 text-2xl font-semibold text-pulse-text">
          Scan now in the browser. Use desktop when a signed build is released.
        </p>
        <p className="mt-3 text-sm leading-6 text-pulse-muted">
          Both paths use the same wallet-confirmed revoke model. The desktop
          download stays inactive until release artifacts are real.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ChoiceCard
          eyebrow="Web app"
          status={<StatusPill tone="success">Available now</StatusPill>}
          title="Launch web scanner"
          body="Use the hosted scanner in your browser. Browser wallets and WalletConnect continue to work here."
          action={
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-xl bg-pulse-gradient px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Open /app
            </Link>
          }
        />

        <ChoiceCard
          eyebrow="Desktop app"
          status={
            <StatusPill tone={desktopReady ? "success" : "neutral"}>
              {desktopReady ? "Ready" : "Coming soon"}
            </StatusPill>
          }
          title="Download local desktop app"
          body={
            desktopReady
              ? "Download a signed desktop build from the current release."
              : "Desktop builds are planned for local use, but no public artifact is published in this repo yet."
          }
          action={
            <a
              href="#desktop"
              className="inline-flex items-center justify-center rounded-xl border border-pulse-border bg-white/5 px-4 py-2.5 text-sm font-semibold text-pulse-text transition hover:bg-white/10"
            >
              View status
            </a>
          }
        />
      </div>
    </aside>
  );
}

function ChoiceCard({
  eyebrow,
  status,
  title,
  body,
  action,
}: {
  eyebrow: string;
  status: ReactNode;
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-pulse-border bg-pulse-bg/65 p-5 transition hover:border-pulse-cyan/45">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
          {eyebrow}
        </p>
        {status}
      </div>
      <h2 className="mt-2 text-xl font-semibold text-pulse-text">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-pulse-muted">{body}</p>
      <div className="mt-4">{action}</div>
    </article>
  );
}

function TrustStrip() {
  return (
    <section className="border-b border-pulse-border/60 bg-pulse-bg py-8">
      <div className="mx-auto grid max-w-6xl gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {TRUST_POINTS.map((point) => (
          <div
            key={point.title}
            className="rounded-2xl border border-pulse-border bg-pulse-panel/55 p-4"
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
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-pulse-border/60 py-16 sm:py-20">
      <SectionHeader
        eyebrow="How it works"
        title="A narrow flow for approval review"
        body="The product does three things: connect, review, and revoke. Nothing else needs custody or hidden signing."
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
          <SectionKicker>Desktop app</SectionKicker>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            A local app path for users who prefer not to rely on a hosted
            frontend.
          </h2>
          <p className="mt-4 text-sm leading-7 text-pulse-muted">
            The desktop build is designed to run the same scanner locally in a
            Tauri shell. It keeps the same wallet-confirmed revoke flow: every
            write still appears in your wallet before you sign.
          </p>
          <div className="mt-5 grid gap-2 text-sm text-pulse-muted">
            <CheckLine>Run the interface locally after installation.</CheckLine>
            <CheckLine>Use WalletConnect for desktop pairing.</CheckLine>
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
                    : "No public desktop artifact is published yet."}
                </p>
              </div>
              <StatusPill tone={desktopReady ? "success" : "neutral"}>
                {desktopReady ? release.version : "Coming soon"}
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
          <SectionKicker>Decentralized distribution</SectionKicker>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            IPFS-ready distribution path.
          </h2>
          <p className="mt-4 text-sm leading-7 text-pulse-muted">
            The release manifest already models IPFS gateways and checksums so
            builds can be pinned after release. The final CID is pending until a
            real artifact is published and verified.
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
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-pulse-text"
          >
            GitHub
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
  body: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
      <SectionKicker>{eyebrow}</SectionKicker>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-pulse-muted">{body}</p>
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
