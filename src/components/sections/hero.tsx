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
          <span className="flex w-full max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-pulse-cyan/30 bg-pulse-panel/70 px-3 py-1 text-center text-xs font-semibold leading-5 text-pulse-cyan shadow-glow sm:inline-flex sm:w-auto sm:flex-nowrap">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-green"
              aria-hidden
            />
            <span className="min-w-0 max-w-[15rem] break-words">
              PulseChain, BSC, Base, Polygon, Avalanche, Mantle, Ethereum,
              Arbitrum, Optimism, and HyperEVM approval review
            </span>
          </span>

          <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-5xl">
            Review token permissions before they become{" "}
            <span className="text-gradient-pulse">wallet risk</span>.
          </h1>

          <p className="mx-auto mt-4 max-w-[18rem] break-words text-sm leading-7 text-pulse-muted sm:max-w-none sm:text-lg">
            Pulse Revoke checks your public wallet history, verifies active
            allowances live on-chain, and helps you clear permissions you no
            longer need. You approve every revoke in your own wallet.
          </p>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-pulse-muted">
            {HERO_BULLETS.map((b) => (
              <li
                key={b}
                className="inline-flex w-full max-w-full items-center justify-center gap-1.5 rounded-full border border-pulse-border/70 bg-pulse-panel/55 px-3 py-1 sm:w-auto"
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-cyan/80"
                />
                <span className="min-w-0 break-words">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
