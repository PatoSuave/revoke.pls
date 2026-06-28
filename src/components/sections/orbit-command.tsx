import Link from "next/link";
import type { CSSProperties } from "react";

import { ChainLogo } from "@/components/chains/chain-logo";
import { getChainVisual } from "@/lib/chain-visuals";
import {
  LIVE_SUPPORTED_CHAIN_COUNT,
  LIVE_SUPPORTED_CHAIN_ROWS,
} from "@/lib/supported-chain-copy";

const orbitChains = [
  "Ethereum Mainnet",
  "Arbitrum One",
  "Optimism",
  "Base",
  "Polygon",
  "BNB Smart Chain",
  "Avalanche C-Chain",
  "PulseChain",
] as const;

const orbitNodeSettings: Record<
  (typeof orbitChains)[number],
  {
    pathX: number;
    pathY: number;
    offset: string;
    fallbackLeft: string;
    fallbackTop: string;
    duration: string;
    label: string;
  }
> = {
  "Ethereum Mainnet": {
    pathX: 238,
    pathY: 102,
    offset: "78%",
    fallbackLeft: "49%",
    fallbackTop: "20%",
    duration: "98s",
    label: "Ethereum",
  },
  "Arbitrum One": {
    pathX: 250,
    pathY: 128,
    offset: "63%",
    fallbackLeft: "26%",
    fallbackTop: "32%",
    duration: "122s",
    label: "Arbitrum",
  },
  Optimism: {
    pathX: 250,
    pathY: 128,
    offset: "1%",
    fallbackLeft: "75%",
    fallbackTop: "50%",
    duration: "122s",
    label: "Optimism",
  },
  Base: {
    pathX: 230,
    pathY: 104,
    offset: "16%",
    fallbackLeft: "66%",
    fallbackTop: "69%",
    duration: "104s",
    label: "Base",
  },
  Polygon: {
    pathX: 214,
    pathY: 94,
    offset: "35%",
    fallbackLeft: "43%",
    fallbackTop: "74%",
    duration: "112s",
    label: "Polygon",
  },
  "BNB Smart Chain": {
    pathX: 252,
    pathY: 146,
    offset: "28%",
    fallbackLeft: "29%",
    fallbackTop: "78%",
    duration: "148s",
    label: "BNB Chain",
  },
  "Avalanche C-Chain": {
    pathX: 252,
    pathY: 146,
    offset: "45%",
    fallbackLeft: "18%",
    fallbackTop: "57%",
    duration: "148s",
    label: "Avalanche",
  },
  PulseChain: {
    pathX: 252,
    pathY: 112,
    offset: "89%",
    fallbackLeft: "52%",
    fallbackTop: "27%",
    duration: "116s",
    label: "PulseChain",
  },
};

const trustItems = [
  { title: "No seed phrase", body: "We never ask for it." },
  { title: "No custody", body: "You keep control." },
  { title: "Wallet-confirmed revokes", body: "You sign every transaction." },
  {
    title: "Verification can be incomplete",
    body: "Checks can fail or be rate-limited.",
  },
] as const;

const previewRows = [
  {
    chain: "Ethereum Mainnet",
    asset: "USDT",
    spender: "Unknown contract",
    allowance: "Unlimited",
    risk: "High",
    status: "Live",
  },
  {
    chain: "Base",
    asset: "USDC",
    spender: "Circle",
    allowance: "Unlimited",
    risk: "Medium",
    status: "Live",
  },
  {
    chain: "PulseChain",
    asset: "PLSX",
    spender: "Protocol router",
    allowance: "25,000",
    risk: "Review",
    status: "Live",
  },
] as const;

const orbitRows = orbitChains
  .map((name) => LIVE_SUPPORTED_CHAIN_ROWS.find((row) => row.chain === name))
  .filter((row): row is (typeof LIVE_SUPPORTED_CHAIN_ROWS)[number] =>
    Boolean(row),
  );

export function OrbitCommandHero() {
  return (
    <section className="orbit-command-section relative overflow-hidden border-b border-pulse-border/50">
      <div className="orbit-command-space" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-pulse-cyan/35 bg-pulse-panel/75 px-3 py-1 text-xs font-semibold text-pulse-cyan">
              <span
                className="h-1.5 w-1.5 rounded-full bg-pulse-green"
                aria-hidden
              />
              <span>{LIVE_SUPPORTED_CHAIN_COUNT} live EVM networks</span>
            </div>

            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.04] sm:text-6xl">
              Trace approvals across every{" "}
              <span className="text-gradient-pulse">orbit</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-pulse-muted sm:text-lg">
              Address-first scanning across supported EVM chains. Connect your
              wallet only when a verified active row is ready to review.
            </p>

            <ul className="mt-7 grid gap-3 text-sm text-pulse-muted sm:grid-cols-2">
              {trustItems.map((item) => (
                <li
                  key={item.title}
                  className="flex min-w-0 gap-2.5 rounded-lg border border-pulse-border/55 bg-pulse-panel/35 px-3 py-2.5"
                >
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-cyan shadow-[0_0_12px_rgb(var(--pulse-cyan)/0.72)]"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-pulse-text">
                      {item.title}
                    </span>
                    <span className="block text-xs leading-5 text-pulse-muted">
                      {item.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <OrbitMap variant="hero" />
        </div>

        <OrbitCommandBar />
        <OrbitScannerPreview />
      </div>
    </section>
  );
}

export function OrbitCommandAppIntro() {
  return (
    <section className="orbit-command-section relative overflow-hidden border-b border-pulse-border/45">
      <div className="orbit-command-space" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Approval scanner
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-pulse-text sm:text-4xl">
              Review approvals across every orbit
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-pulse-muted sm:text-base">
              Paste a wallet address to review approvals without connecting.
              Connect only the matching wallet when you are ready to revoke a
              verified active row.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-pulse-muted">
              {trustItems.map((item) => (
                <span
                  key={item.title}
                  className="rounded-full border border-pulse-border/70 bg-pulse-panel/55 px-2.5 py-1 font-semibold"
                >
                  {item.title}
                </span>
              ))}
            </div>
          </div>

          <OrbitMap variant="compact" />
        </div>
      </div>
    </section>
  );
}

function OrbitCommandBar() {
  return (
    <div className="orbit-command-bar relative z-10 mt-8 rounded-lg border border-pulse-border/80 bg-pulse-panel/80 p-3 shadow-[0_24px_80px_-54px_rgb(var(--pulse-cyan)/0.72)] backdrop-blur-xl">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0 rounded-md border border-pulse-border/80 bg-pulse-bg/70 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pulse-muted">
            Paste EVM wallet address
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-pulse-green shadow-[0_0_14px_rgb(var(--pulse-green)/0.72)]" />
            <code className="truncate font-mono text-sm text-pulse-text">
              0x96A17f3d7c8E9A135b886F42e1D3C9a8bE74f219aD8
            </code>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-pulse-green/30 bg-pulse-green/10 px-3 py-2 text-xs font-semibold text-pulse-green">
            Read-only scan
          </span>
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-md bg-pulse-gradient px-5 py-2.5 text-sm font-semibold text-pulse-on-gradient shadow-glow transition hover:brightness-110"
          >
            Scan approvals
          </Link>
        </div>
      </div>

      <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 text-xs">
        <span className="shrink-0 rounded-md border border-pulse-cyan/45 bg-pulse-cyan/10 px-2.5 py-1 font-semibold text-pulse-cyan">
          All 18
        </span>
        {orbitRows.slice(0, 7).map((row) => (
          <OrbitChainChip key={row.chain} row={row} />
        ))}
      </div>
    </div>
  );
}

function OrbitScannerPreview() {
  return (
    <div className="orbit-scanner-preview relative z-10 mt-4 grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)_19rem]">
      <div className="rounded-lg border border-pulse-border/80 bg-pulse-panel/72 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse-muted">
            Chain orbits
          </p>
          <span className="rounded bg-pulse-text/10 px-2 py-0.5 font-mono text-[11px] text-pulse-muted">
            18
          </span>
        </div>
        <div className="mt-4 grid gap-2">
          {orbitRows.slice(0, 6).map((row) => (
            <OrbitChainRailItem key={row.chain} row={row} />
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-pulse-muted">
          +{LIVE_SUPPORTED_CHAIN_COUNT - 6} more chains available in the live
          scanner.
        </p>
      </div>

      <div className="min-w-0 rounded-lg border border-pulse-border/80 bg-pulse-panel/78">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pulse-border/70 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-pulse-text">Overview</p>
            <p className="text-xs text-pulse-muted">
              Showing active approvals after live verification
            </p>
          </div>
          <span className="rounded-md border border-pulse-green/30 bg-pulse-green/10 px-2.5 py-1 text-xs font-semibold text-pulse-green">
            Live data
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[42rem] w-full text-left text-xs">
            <thead className="text-pulse-muted">
              <tr className="border-b border-pulse-border/60">
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Spender</th>
                <th className="px-4 py-3 font-medium">Allowance</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Verification</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => (
                <tr key={`${row.chain}-${row.asset}`} className="border-b border-pulse-border/45 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-pulse-text">{row.asset}</p>
                    <p className="text-pulse-muted">{row.chain}</p>
                  </td>
                  <td className="px-4 py-3 text-pulse-muted">{row.spender}</td>
                  <td className="px-4 py-3 text-pulse-text">{row.allowance}</td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-pulse-yellow/35 bg-pulse-yellow/10 px-2 py-0.5 font-semibold text-pulse-yellow">
                      {row.risk}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-pulse-green">
                      <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-pulse-border/80 bg-pulse-panel/72 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse-muted">
              Spender details
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-pulse-text">
              0xA...eC7B
            </p>
          </div>
          <span className="rounded border border-pulse-red/35 bg-pulse-red/10 px-2 py-1 text-xs font-semibold text-pulse-red">
            High risk
          </span>
        </div>
        <div className="mt-4 grid gap-3 text-xs">
          <PreviewDetail label="EIP-7702 account-code check" value="Read-only diagnostic available" />
          <PreviewDetail label="Live verification" value="Active allowance confirmed" />
          <PreviewDetail label="Gas preflight" value="Estimated before wallet opens" />
          <PreviewDetail label="Action gate" value="Matching wallet required" />
        </div>
        <Link
          href="/app"
          className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-pulse-gradient px-4 py-2.5 text-sm font-semibold text-pulse-on-gradient transition hover:brightness-110"
        >
          Connect wallet to revoke
        </Link>
      </div>
    </div>
  );
}

function OrbitMap({ variant }: { variant: "hero" | "compact" }) {
  const visibleRows = variant === "hero" ? orbitRows : orbitRows.slice(0, 6);

  return (
    <div
      className={`orbit-command-map ${variant === "compact" ? "orbit-command-map-compact" : ""}`}
      aria-label="Supported chain orbit map"
    >
      <div className="orbit-command-rings" aria-hidden>
        <span className="orbit-command-ring orbit-command-ring-outer" />
        <span className="orbit-command-ring orbit-command-ring-middle" />
        <span className="orbit-command-ring orbit-command-ring-inner" />
      </div>

      <div className="orbit-command-core">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-pulse-muted">
          Scanning address
        </p>
        <p className="mt-2 font-mono text-lg font-semibold text-pulse-text sm:text-xl">
          0x96A1...9aD8
        </p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-pulse-green/30 bg-pulse-green/10 px-2.5 py-1 text-[11px] font-semibold text-pulse-green">
          <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" />
          Read-only
        </span>
      </div>

      {visibleRows.map((row) => {
        const settings = orbitNodeSettings[row.chain as (typeof orbitChains)[number]];
        if (!settings) return null;
        const visual = getChainVisual(row.chain);
        const scale = variant === "compact" ? 0.72 : 1;
        const style = {
          "--orbit-rx": `${settings.pathX * scale}px`,
          "--orbit-ry": `${settings.pathY * scale}px`,
          "--orbit-offset": settings.offset,
          "--orbit-duration": settings.duration,
          "--node-left": settings.fallbackLeft,
          "--node-top": settings.fallbackTop,
          "--accent-color": visual.accent,
          "--accent-readable": visual.accentReadable,
          "--accent-soft": visual.accentSoft,
          "--accent-border": visual.accentBorder,
          "--accent-shadow": visual.accentShadow,
        } as CSSProperties;

        return (
          <div
            key={row.chain}
            className="orbit-command-node"
            style={style}
          >
            <div className="orbit-command-node-card">
              <ChainLogo
                chainId={Number(row.chainId)}
                className="h-5 w-5 shrink-0"
              />
              <span className="truncate">{settings.label}</span>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-green shadow-[0_0_10px_rgb(var(--pulse-green)/0.8)]" />
            </div>
          </div>
        );
      })}

      <div className="orbit-command-more">+{LIVE_SUPPORTED_CHAIN_COUNT - visibleRows.length} more</div>
    </div>
  );
}

function OrbitChainChip({
  row,
}: {
  row: (typeof LIVE_SUPPORTED_CHAIN_ROWS)[number];
}) {
  const visual = getChainVisual(row.chain);
  const style = {
    "--accent-color": visual.accent,
    "--accent-readable": visual.accentReadable,
    "--accent-soft": visual.accentSoft,
    "--accent-border": visual.accentBorder,
  } as CSSProperties;

  return (
    <span
      style={style}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[color:var(--accent-border)] bg-pulse-bg/60 px-2.5 py-1 font-semibold text-pulse-muted"
    >
      <ChainLogo chainId={Number(row.chainId)} className="h-3.5 w-3.5" />
      <span className="brand-accent-text">{row.chain}</span>
    </span>
  );
}

function OrbitChainRailItem({
  row,
}: {
  row: (typeof LIVE_SUPPORTED_CHAIN_ROWS)[number];
}) {
  const visual = getChainVisual(row.chain);
  const style = {
    "--accent-color": visual.accent,
    "--accent-readable": visual.accentReadable,
    "--accent-soft": visual.accentSoft,
    "--accent-border": visual.accentBorder,
  } as CSSProperties;

  return (
    <div
      style={style}
      className="flex items-center gap-2 rounded-md border border-[color:var(--accent-border)] bg-pulse-bg/45 px-2.5 py-2"
    >
      <ChainLogo chainId={Number(row.chainId)} className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-pulse-text">
          {row.chain}
        </p>
        <p className="font-mono text-[11px] text-pulse-muted">
          ID {row.chainId}
        </p>
      </div>
      <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" />
    </div>
  );
}

function PreviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-pulse-border/45 pb-2 last:border-0 last:pb-0">
      <p className="text-pulse-muted">{label}</p>
      <p className="mt-1 font-semibold text-pulse-text">{value}</p>
    </div>
  );
}
