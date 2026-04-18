import { ConnectWalletButton } from "@/components/connect-wallet-button";

const HERO_BULLETS = [
  "Non-custodial — your wallet signs every action",
  "Read-only until you choose to revoke",
  "Open source and auditable",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-pulse-radial" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 sm:px-6 sm:pt-28 sm:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-pulse-border bg-pulse-panel/60 px-3 py-1 text-xs font-medium text-pulse-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" aria-hidden />
            PulseChain · Mainnet (369)
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Review and revoke your{" "}
            <span className="text-gradient-pulse">PulseChain approvals</span>.
          </h1>

          <p className="mt-6 text-lg text-pulse-muted sm:text-xl">
            Every ERC-20 approval you sign stays on-chain until you revoke it.
            Pulse Revoke shows exactly which spenders can move your tokens, so
            you can clear old permissions and keep unlimited approvals in check.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ConnectWalletButton />
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-pulse-border bg-white/5 px-4 py-2.5 text-sm font-semibold text-pulse-text transition hover:bg-white/10"
            >
              How it works
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-pulse-muted">
            {HERO_BULLETS.map((b) => (
              <li key={b} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-pulse-cyan/80"
                />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
