const pillars = [
  {
    title: "Non-custodial",
    body: "Pulse Revoke never holds your funds. Every action is signed by your wallet.",
  },
  {
    title: "No seed phrases. Ever.",
    body: "We only use standard wallet connection. You will never be asked for a seed phrase or private key.",
  },
  {
    title: "Clear, minimal transactions",
    body: "Revokes call approve(spender, 0) on the token itself — no hidden calls, no proxy rewrites.",
  },
  {
    title: "Verifiable spenders",
    body: "Every spender address links to PulseScan so you can verify what you are granting access to.",
  },
];

export function TrustSafety() {
  return (
    <section
      id="safety"
      className="relative border-t border-pulse-border/60 bg-pulse-bg py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built with{" "}
            <span className="text-gradient-pulse">safety first</span>.
          </h2>
          <p className="mt-4 text-pulse-muted">
            Approval management should be boring and predictable. Pulse Revoke
            sticks to the minimum surface needed to keep your wallet safe.
          </p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2">
          {pillars.map((pillar) => (
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
      </div>
    </section>
  );
}
