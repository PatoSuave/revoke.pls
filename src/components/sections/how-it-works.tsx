const STEPS = [
  {
    n: "01",
    title: "Connect your wallet",
    body: "Use an injected wallet or WalletConnect. Pulse Revoke only reads your address to look up allowances — it never asks for a seed phrase or signs anything until you revoke.",
  },
  {
    n: "02",
    title: "Review your approvals",
    body: "Pulse Revoke pulls your wallet's historical Approval events from the PulseChain explorer, re-verifies every allowance live on-chain, and labels known spenders from a curated registry so you can judge risk at a glance.",
  },
  {
    n: "03",
    title: "Revoke what you don't need",
    body: "Clear approvals one at a time, or select several and run them as a sequential batch. Each revoke is a standard approve(spender, 0) transaction on the token contract, submitted on-chain and paid in PLS gas — there is no fee on top.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-t border-pulse-border/60 bg-pulse-bg py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Three steps,{" "}
            <span className="text-gradient-pulse">no surprises</span>.
          </h2>
          <p className="mt-4 text-pulse-muted">
            Pulse Revoke is built around the minimum surface area needed to
            manage approvals safely. No account, no tracking, no custody.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 sm:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="relative overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/60 p-6"
            >
              <span className="font-mono text-xs font-semibold text-pulse-muted">
                {step.n}
              </span>
              <h3 className="mt-2 text-base font-semibold text-pulse-text">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-pulse-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
