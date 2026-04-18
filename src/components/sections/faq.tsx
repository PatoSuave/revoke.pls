import { siteConfig } from "@/lib/site";

const QUESTIONS: ReadonlyArray<{ q: string; a: React.ReactNode }> = [
  {
    q: "What is a token approval?",
    a: (
      <>
        An approval is an on-chain permission that lets a specific contract —
        a DEX router, a bridge, a staking pool — move an ERC-20 token on your
        behalf. You grant it once when you first interact with the contract,
        and it remains active until you change or revoke it.
      </>
    ),
  },
  {
    q: "Why are unlimited approvals riskier?",
    a: (
      <>
        An unlimited approval lets a contract transfer every token of that
        type your wallet holds, now and in the future. If the contract is
        ever exploited or replaced with a malicious implementation, the
        attacker can drain the entire balance. A bounded approval caps the
        damage to whatever amount you originally granted.
      </>
    ),
  },
  {
    q: "Does Pulse Revoke control my funds?",
    a: (
      <>
        No. Pulse Revoke is entirely non-custodial. It reads allowances from
        the chain using your public address, and every revoke is a
        transaction signed by your wallet. There is no server holding keys,
        no backend with transfer permissions, and no custody layer.
      </>
    ),
  },
  {
    q: "Why does revoking cost gas?",
    a: (
      <>
        Revoking is an on-chain state change: it writes a new allowance
        value to the token contract. Every state change on PulseChain
        requires a transaction, and every transaction pays gas in PLS.
        Pulse Revoke does not take a fee — you pay only the network cost.
      </>
    ),
  },
  {
    q: "What chains and tokens are supported?",
    a: (
      <>
        PulseChain mainnet (chainId 369). The scanner reads a curated
        registry of tokens and spenders that are verified against{" "}
        <a
          className="underline underline-offset-2 hover:text-pulse-cyan"
          href={siteConfig.links.explorer}
          target="_blank"
          rel="noreferrer"
        >
          PulseScan
        </a>
        . Broader chain-wide discovery will ship in a later milestone.
      </>
    ),
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      className="relative border-t border-pulse-border/60 bg-pulse-bg py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Frequently asked
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Short answers to{" "}
            <span className="text-gradient-pulse">common questions</span>.
          </h2>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {QUESTIONS.map((item) => (
            <li
              key={item.q}
              className="rounded-2xl border border-pulse-border bg-pulse-panel/60 p-5"
            >
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-pulse-text">
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-pulse-border text-pulse-muted transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="mt-3 text-sm leading-relaxed text-pulse-muted">
                  {item.a}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
