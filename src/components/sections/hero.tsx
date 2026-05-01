const HERO_BULLETS = [
  "Read-only until you revoke",
  "Live on-chain checks",
  "Curated spender labels",
  "One transaction per revoke",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-pulse-border/40">
      <div className="absolute inset-0 bg-pulse-radial opacity-90" aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-pulse-bg to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-9 sm:px-6 sm:pt-14 sm:pb-12">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-pulse-cyan/30 bg-pulse-panel/70 px-3 py-1 text-xs font-semibold text-pulse-cyan shadow-glow">
            <span
              className="h-1.5 w-1.5 rounded-full bg-pulse-green"
              aria-hidden
            />
            PulseChain and Ethereum approval safety
          </span>

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
            Review token permissions before they become{" "}
            <span className="text-gradient-pulse">wallet risk</span>.
          </h1>

          <p className="mt-4 text-base leading-7 text-pulse-muted sm:text-lg">
            Pulse Revoke checks your public wallet history, verifies active
            allowances live on-chain, and helps you clear permissions you no
            longer need. You approve every revoke in your own wallet.
          </p>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-pulse-muted">
            {HERO_BULLETS.map((b) => (
              <li
                key={b}
                className="inline-flex items-center gap-1.5 rounded-full border border-pulse-border/70 bg-pulse-panel/55 px-3 py-1"
              >
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
