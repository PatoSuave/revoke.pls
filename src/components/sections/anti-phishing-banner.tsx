import Link from "next/link";

import { OFFICIAL_DOMAIN } from "@/lib/security-content";

export function AntiPhishingBanner() {
  return (
    <aside className="border-b border-pulse-border/60 bg-pulse-bg">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-pulse-cyan/25 bg-pulse-panel/70 px-4 py-3 text-sm shadow-glow sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-2 h-2 w-2 shrink-0 rounded-full bg-pulse-green"
              aria-hidden
            />
            <p className="min-w-0 max-w-[18rem] break-words leading-6 text-pulse-muted sm:max-w-none">
              <span className="font-semibold text-pulse-text">
                Official site: {OFFICIAL_DOMAIN}.
              </span>{" "}
              Revoke.PLS will never ask for your seed phrase or private key.
              Avoid wallet links from DMs, Telegram, Discord, ads, or
              misspelled domains.
            </p>
          </div>
          <Link
            href="/security"
            className="inline-flex w-full shrink-0 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 sm:w-auto"
          >
            Security &amp; Trust
          </Link>
        </div>
      </div>
    </aside>
  );
}
