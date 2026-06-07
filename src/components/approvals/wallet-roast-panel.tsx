"use client";

import { shouldRevealRoastLines } from "@/lib/approval-age/roasts";

export function WalletRoastPanel({
  completed,
  revealed,
  roastLines,
  onReveal,
}: {
  completed: boolean;
  revealed: boolean;
  roastLines: readonly string[];
  onReveal: () => void;
}) {
  if (!completed) return null;
  const showLines = shouldRevealRoastLines({ completed, optedIn: revealed });

  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Wallet roasting mode
          </p>
          <h3 className="mt-1 text-lg font-semibold text-pulse-text">
            Approval personality check
          </h3>
        </div>
        {!showLines ? (
          <button
            type="button"
            onClick={onReveal}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-4 py-2 text-sm font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
          >
            Roast my wallet
          </button>
        ) : null}
      </div>

      {showLines ? (
        <ul className="mt-4 grid gap-2 text-sm leading-6 text-pulse-muted">
          {roastLines.map((line) => (
            <li
              key={line}
              className="rounded-xl border border-pulse-border/70 bg-pulse-panel/55 px-3 py-2"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-pulse-muted">
          PG, scan-only, and mildly judgmental.
        </p>
      )}
    </section>
  );
}
