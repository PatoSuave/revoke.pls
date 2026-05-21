import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AntiPhishingBanner } from "@/components/sections/anti-phishing-banner";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { SupportedChainStatusMatrix } from "@/components/sections/supported-chain-status-matrix";
import {
  DATA_MINIMIZATION_COPY,
  OFFICIAL_DOMAIN,
  SECURITY_CAN_DO,
  SECURITY_CANNOT_DO,
  WALLET_SAFETY_RECOMMENDATIONS,
  WALLET_VERIFICATION_ITEMS,
} from "@/lib/security-content";
import { absoluteUrl, siteConfig } from "@/lib/site";

const title = "Security & Trust";
const description =
  "Official Pulse Revoke safety guidance, supported-chain status, wallet connection limits, revoke transaction expectations, and anti-phishing reminders.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/security",
  },
  openGraph: {
    type: "website",
    title: `${title} - ${siteConfig.shortName}`,
    description,
    url: absoluteUrl("/security"),
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} - ${siteConfig.shortName}`,
    description,
  },
};

export default function SecurityPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <SecurityHero />
        <AntiPhishingBanner />
        <CorePromises />
        <ConnectionAndRevoke />
        <VerificationSection />
        <PrivacySection />
        <SupportedChainsSection />
        <AddressOnlySection />
      </main>
      <SiteFooter />
    </>
  );
}

function SecurityHero() {
  return (
    <section className="relative overflow-hidden border-b border-pulse-border/50">
      <div className="absolute inset-0 bg-pulse-radial opacity-85" aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-pulse-bg to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Security &amp; Trust
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Verify the site, then verify every transaction.
          </h1>
          <p className="mt-5 text-base leading-7 text-pulse-muted sm:text-lg">
            Pulse Revoke is intentionally narrow: it helps you review wallet
            approvals, understand what can still spend assets, and prepare
            revoke transactions that you must confirm in your own wallet.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-xl bg-pulse-gradient px-5 py-3 text-sm font-semibold text-pulse-on-gradient shadow-glow transition hover:brightness-110"
            >
              Launch Scanner
            </Link>
            <a
              href={`https://${OFFICIAL_DOMAIN}`}
              className="inline-flex items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-5 py-3 text-sm font-semibold text-pulse-text transition hover:bg-pulse-text/10"
            >
              {OFFICIAL_DOMAIN}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function CorePromises() {
  return (
    <section className="border-b border-pulse-border/60 bg-pulse-bg py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
        <CopyPanel title="What Pulse Revoke can do" items={SECURITY_CAN_DO} />
        <CopyPanel title="What Pulse Revoke cannot do" items={SECURITY_CANNOT_DO} />
      </div>
    </section>
  );
}

function ConnectionAndRevoke() {
  return (
    <section className="border-b border-pulse-border/60 bg-pulse-bg py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-3">
        <InfoBlock title="Official site warning">
          <p>
            The official site is{" "}
            <span className="font-mono text-pulse-text">{OFFICIAL_DOMAIN}</span>.
            Bookmark it and be careful with links from DMs, Telegram, Discord,
            fake ads, search ads, and misspelled domains. Pulse Revoke will never
            ask for a seed phrase or private key.
          </p>
        </InfoBlock>
        <InfoBlock title="What connect wallet means">
          <p>
            Connecting lets the app see your public address and current chain
            through your wallet provider. It does not give Pulse Revoke custody
            of funds, private keys, or permission to move assets. A write
            request appears only after you choose a revoke action.
          </p>
        </InfoBlock>
        <InfoBlock title="What a revoke transaction does">
          <p>
            A standard token revoke usually calls{" "}
            <span className="font-mono text-pulse-text">
              approve(spender, 0)
            </span>
            . NFT revokes usually clear an operator with{" "}
            <span className="font-mono text-pulse-text">
              setApprovalForAll(operator, false)
            </span>{" "}
            or clear a per-token approval with{" "}
            <span className="font-mono text-pulse-text">approve(0x0, tokenId)</span>.
          </p>
        </InfoBlock>
      </div>
    </section>
  );
}

function VerificationSection() {
  return (
    <section className="border-b border-pulse-border/60 bg-pulse-bg py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <SectionKicker>Before signing</SectionKicker>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Your wallet prompt is the final checkpoint.
          </h2>
          <p className="mt-4 text-sm leading-7 text-pulse-muted">
            Pulse Revoke prepares a transaction, but your wallet decides what you
            actually sign. Cancel if the prompt shows a transfer, swap, bridge,
            unknown approval, unexpected function, or unreasonable fee.
          </p>
          <p className="mt-4 text-sm leading-7 text-pulse-muted">
            Pulse Revoke does not add an app-level fee. Your wallet should show
            the network gas cost before confirmation, and you can reject the
            transaction if the cost or call data looks wrong.
          </p>
          <p className="mt-4 text-sm leading-7 text-pulse-muted">
            Transaction hashes should remain independently auditable. After a
            revoke confirms, use the chain explorer link or your wallet history
            to inspect the on-chain transaction yourself.
          </p>
        </div>
        <Checklist items={WALLET_VERIFICATION_ITEMS} />
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section className="border-b border-pulse-border/60 bg-pulse-bg py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-2">
        <InfoBlock title="Wallet safety recommendations">
          <ul className="grid gap-3">
            {WALLET_SAFETY_RECOMMENDATIONS.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-green"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </InfoBlock>
        <InfoBlock title="Data minimization and privacy">
          <p>{DATA_MINIMIZATION_COPY}</p>
          <p className="mt-3">
            The app avoids seed phrase entry, private key handling, app-level
            approval history accounts, and custom custody services. Public
            blockchain data is still public, and normal infrastructure metadata
            can exist outside the app.
          </p>
        </InfoBlock>
      </div>
    </section>
  );
}

function SupportedChainsSection() {
  return (
    <section className="border-b border-pulse-border/60 bg-pulse-bg py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <SectionKicker>Supported chains and current status</SectionKicker>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Current production scope, not future promises.
          </h2>
          <p className="mt-4 text-sm leading-7 text-pulse-muted">
            The matrix reflects the scanner and revoke paths present in the
            app today. It does not enable any new network, mark any spender as
            safe, or imply support for chains that need separate approval
            mechanics.
          </p>
        </div>
        <div className="mt-8">
          <SupportedChainStatusMatrix />
        </div>
      </div>
    </section>
  );
}

function AddressOnlySection() {
  return (
    <section className="bg-pulse-bg py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <SectionKicker>Address-only scan</SectionKicker>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Scan first, connect only when you are ready to revoke.
          </h2>
        </div>
        <div className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-6 text-sm leading-7 text-pulse-muted">
          <p>
            Approval state is public blockchain data, so Pulse Revoke can scan a
            pasted EVM address without a wallet connection. That mode is useful
            for review, triage, and comparing chains before you expose a wallet
            connection to any site.
          </p>
          <p className="mt-3">
            Revoke stays unavailable until the connected wallet exactly matches
            the scanned address and is on the required chain. This preserves
            the same wallet-side ownership and network checks as connected
            scanning.
          </p>
        </div>
      </div>
    </section>
  );
}

function CopyPanel({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-6">
      <h2 className="text-xl font-semibold text-pulse-text">{title}</h2>
      <ul className="mt-5 grid gap-3 text-sm leading-6 text-pulse-muted">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-cyan"
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-6 text-sm leading-7 text-pulse-muted">
      <h2 className="text-base font-semibold text-pulse-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Checklist({ items }: { items: readonly string[] }) {
  return (
    <ol className="grid gap-3 rounded-2xl border border-pulse-border bg-pulse-panel/65 p-6 text-sm text-pulse-muted">
      {items.map((item, index) => (
        <li key={item} className="grid grid-cols-[auto_1fr] gap-3">
          <span className="font-mono text-xs font-semibold text-pulse-cyan">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="leading-6">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
      {children}
    </p>
  );
}
