const PILLARS = [
  {
    title: "Non-custodial by design",
    body: "Pulse Revoke never holds your funds or your keys. Every action is signed locally by your wallet and broadcast directly to the chain it targets (PulseChain or Ethereum).",
  },
  {
    title: "No seed phrases. Ever.",
    body: "Connection uses the standard wallet protocols — injected or WalletConnect. You will never be asked for a seed phrase or private key.",
  },
  {
    title: "Minimal, legible transactions",
    body: "Every revoke calls approve(spender, 0) on the token contract itself. There are no proxy rewrites, no hidden calls, and no custom routing.",
  },
  {
    title: "Verifiable spenders",
    body: "Each row links out to the connected chain's block explorer so you can confirm the spender contract before signing. Trust is a naming claim here, not a safety claim.",
  },
];

const NON_GOALS = [
  "No seed-phrase entry, ever.",
  "No custody of funds or approvals on our side.",
  "No analytics, tracking scripts, or cookies.",
  "No fee on top of network gas.",
];

export function TrustSafety() {
  return (
    <section
      id="safety"
      className="relative border-t border-pulse-border/60 bg-pulse-bg py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Trust &amp; safety
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Boring, predictable,{" "}
            <span className="text-gradient-pulse">under your control</span>.
          </h2>
          <p className="mt-4 text-pulse-muted">
            Approval management should feel like checking a list, not running
            a risk. Pulse Revoke is deliberately narrow: it reads your
            allowances, explains them, and lets you clear the ones you do
            not need.
          </p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <li
              key={pillar.title}
              className="relative overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/60 p-6"
            >
              <h3 className="text-base font-semibold text-pulse-text">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-pulse-muted">
                {pillar.body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-2xl border border-pulse-border/70 bg-pulse-bg/60 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse-text">
            What Pulse Revoke does not do
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-pulse-muted sm:grid-cols-2">
            {NON_GOALS.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-red/70"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
