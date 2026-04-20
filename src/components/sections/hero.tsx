const HERO_BULLETS = [
  "Non-custodial",
  "Live on-chain validation",
  "ERC-20 + NFT approvals",
  "One transaction per revoke",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-pulse-radial" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-12">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-pulse-border bg-pulse-panel/60 px-3 py-1 text-xs font-medium text-pulse-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" aria-hidden />
            PulseChain · Mainnet (369)
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Review and revoke your{" "}
            <span className="text-gradient-pulse">PulseChain approvals</span>.
          </h1>

          <p className="mt-4 text-base text-pulse-muted sm:text-lg">
            Every ERC-20 allowance and NFT operator approval you sign stays
            on-chain until you revoke it. Connect your wallet below to see who
            can still move your tokens and clear the ones you no longer need.
          </p>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-pulse-muted">
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
