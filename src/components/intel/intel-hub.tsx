import Link from "next/link";

import { IntelShellHeader, IntelStatusBadge } from "@/components/intel/intel-shell";
import { SiteFooter } from "@/components/sections/site-footer";
import { INTEL_FEATURES } from "@/lib/intel/feature-catalog";
import type { IntelFeature } from "@/lib/intel/types";

export function IntelHub() {
  return (
    <div className="min-h-dvh bg-pulse-bg text-pulse-text">
      <IntelShellHeader />
      <main>
        <section className="relative overflow-hidden border-b border-pulse-border/60">
          <ConstellationBackdrop />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.02fr)_minmax(340px,0.98fr)] lg:items-center">
            <div className="min-w-0">
              <IntelStatusBadge>Read-only first pass</IntelStatusBadge>
              <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.06] sm:text-6xl">
                PulseChain intelligence, built for careful review.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-pulse-muted sm:text-lg">
                Explore wallet context, network relationships, token analytics,
                and research workflows from a local demo foundation. Live chain
                reads stay disabled until a capped API phase is approved.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/intel/wallet"
                  className="inline-flex items-center justify-center rounded-xl bg-pulse-gradient px-6 py-3 text-sm font-semibold text-pulse-on-gradient shadow-glow transition hover:brightness-110"
                >
                  Open Wallet Intelligence Demo
                </Link>
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-6 py-3 text-sm font-semibold text-pulse-text transition hover:bg-pulse-text/10"
                >
                  Return to Revoke Scanner
                </Link>
              </div>
              <ul className="mt-6 grid max-w-3xl gap-2 text-sm text-pulse-muted sm:grid-cols-3">
                {["No wallet connection", "No live fetching", "Demo data labeled"].map(
                  (item) => (
                    <li
                      key={item}
                      className="flex min-w-0 items-center gap-2 rounded-xl border border-pulse-border/70 bg-pulse-panel/45 px-3 py-2"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-green"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <HubPreviewPanel />
          </div>
        </section>

        <section className="border-b border-pulse-border/60 py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-pulse-cyan">
                Intelligence modules
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                Seven surfaces, one read-only foundation.
              </h2>
              <p className="mt-3 text-sm leading-7 text-pulse-muted sm:text-base">
                The first pass ships the shell and wallet demo. The remaining
                modules stay as visible roadmap cards until live data limits,
                review language, and validation gates are approved.
              </p>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              {INTEL_FEATURES.map((feature, index) => (
                <FeatureCard key={feature.key} feature={feature} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-pulse-cyan">
                Product boundary
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                Intelligence without execution.
              </h2>
              <p className="mt-4 text-sm leading-7 text-pulse-muted sm:text-base">
                This suite is designed to organize public and on-chain context.
                It does not connect wallets, submit transactions, move assets,
                or promise outcomes. Labels are research context, not proof.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Local demo data only in this pass.",
                "No API route or live RPC call was added.",
                "Research Assistant is a future planning surface.",
                "Revoke scanner behavior remains separate.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-pulse-border bg-pulse-panel/55 p-5 text-sm leading-6 text-pulse-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: IntelFeature;
  index: number;
}) {
  const content = (
    <article className="group flex h-full min-h-72 flex-col rounded-2xl border border-pulse-border bg-pulse-panel/60 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-pulse-cyan/45 hover:bg-pulse-panel/80 hover:shadow-glow xl:col-span-1">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-pulse-cyan/25 bg-pulse-cyan/10 font-mono text-sm font-bold text-pulse-cyan">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="rounded-full border border-pulse-border bg-pulse-bg/60 px-2.5 py-1 text-[11px] font-semibold text-pulse-muted">
          {feature.statusLabel}
        </span>
      </div>
      <p className="mt-5 text-xs font-semibold text-pulse-cyan">
        {feature.eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-semibold leading-7 text-pulse-text">
        {feature.title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-pulse-muted">
        {feature.body}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {feature.metrics.map((metric) => (
          <span
            key={metric}
            className="rounded-full border border-pulse-border bg-pulse-bg/55 px-2.5 py-1 text-[11px] font-medium text-pulse-muted"
          >
            {metric}
          </span>
        ))}
      </div>
    </article>
  );

  return feature.href ? (
    <Link href={feature.href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}

function HubPreviewPanel() {
  const rows = [
    ["Wallet", "0xA0b8...eB48", "Center node"],
    ["Approval", "PulseX router", "Demo edge"],
    ["Stake", "HEX context", "Read-only"],
    ["Liquidity", "PLSX-LP", "Preview"],
  ] as const;

  return (
    <aside className="rounded-3xl border border-pulse-cyan/25 bg-pulse-panel/70 p-4 shadow-glow">
      <div className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-pulse-cyan">
              Demo console
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-pulse-text">
              Wallet map preview
            </h2>
          </div>
          <span className="rounded-full border border-pulse-green/30 bg-pulse-green/10 px-3 py-1 text-xs font-semibold text-pulse-green">
            Local
          </span>
        </div>

        <div className="mt-6 aspect-[16/11] rounded-2xl border border-pulse-border bg-pulse-bg/70 p-4">
          <svg viewBox="0 0 100 70" className="h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="hub-edge" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--pulse-cyan))" />
                <stop offset="100%" stopColor="rgb(var(--pulse-pink))" />
              </linearGradient>
            </defs>
            <path
              d="M50 35 L18 19 M50 35 L78 18 M50 35 L82 55 M50 35 L22 56"
              stroke="url(#hub-edge)"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.75"
            />
            {[
              { cx: 50, cy: 35, r: 8, color: "rgb(var(--pulse-pink))" },
              { cx: 18, cy: 19, r: 5, color: "rgb(var(--pulse-cyan))" },
              { cx: 78, cy: 18, r: 5, color: "rgb(var(--pulse-green))" },
              { cx: 82, cy: 55, r: 5, color: "rgb(var(--pulse-purple))" },
              { cx: 22, cy: 56, r: 5, color: "rgb(var(--pulse-yellow))" },
            ].map(({ cx, cy, r, color }) => (
              <circle
                key={`${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                opacity="0.86"
              />
            ))}
          </svg>
        </div>

        <div className="mt-5 grid gap-2">
          {rows.map(([kind, subject, status]) => (
            <div
              key={`${kind}-${subject}`}
              className="grid grid-cols-[86px_minmax(0,1fr)_auto] gap-3 rounded-xl border border-pulse-border bg-pulse-panel/50 px-3 py-2 text-xs"
            >
              <span className="font-semibold text-pulse-cyan">{kind}</span>
              <span className="min-w-0 truncate text-pulse-text">{subject}</span>
              <span className="text-pulse-muted">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ConstellationBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-pulse-radial opacity-90" />
      <svg
        className="absolute right-[-6rem] top-6 h-[34rem] w-[48rem] max-w-none opacity-30"
        viewBox="0 0 720 520"
      >
        <path
          d="M100 320 C190 160 300 420 404 190 S610 242 650 118"
          fill="none"
          stroke="rgb(var(--pulse-cyan))"
          strokeWidth="1.5"
        />
        <path
          d="M180 110 C250 260 385 90 520 330"
          fill="none"
          stroke="rgb(var(--pulse-pink))"
          strokeWidth="1.5"
        />
        {[110, 190, 305, 404, 520, 650].map((cx, index) => (
          <circle
            key={cx}
            cx={cx}
            cy={[320, 142, 338, 190, 330, 118][index]}
            r={index === 3 ? 9 : 5}
            fill="rgb(var(--pulse-text))"
            opacity="0.68"
          />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-pulse-bg to-transparent" />
    </div>
  );
}
