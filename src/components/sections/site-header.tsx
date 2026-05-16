import Link from "next/link";

import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { PulseMark } from "@/components/pulse-mark";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-pulse-border/60 bg-pulse-bg/80 backdrop-blur">
      <div className="mx-auto grid min-h-16 w-full min-w-0 max-w-6xl grid-cols-1 gap-3 px-3 py-3 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-5 lg:py-0">
        <Link
          href="/"
          className="order-1 flex min-w-0 items-center gap-2.5 text-pulse-text"
          aria-label={`${siteConfig.name} home`}
        >
          <PulseMark className="h-8 w-8 shrink-0" />
          <span className="truncate text-base font-semibold tracking-tight sm:text-lg">
            Pulse<span className="text-gradient-pulse"> Revoke</span>
          </span>
        </Link>

        <nav className="order-3 flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-1 text-xs text-pulse-muted sm:text-sm lg:order-2 lg:justify-center lg:gap-6 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0">
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition hover:bg-pulse-text/5 hover:text-pulse-text lg:px-0 lg:py-0 lg:hover:bg-transparent"
            >
              {item.label}
            </a>
          ))}
          <a
            href={siteConfig.links.x}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow Pulse Revoke on X"
            className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition hover:bg-pulse-text/5 hover:text-pulse-text lg:px-0 lg:py-0 lg:hover:bg-transparent"
          >
            X
          </a>
        </nav>

        <div className="order-2 flex min-w-0 flex-wrap items-center gap-2 lg:order-3 lg:justify-end">
          <ThemeModeToggle className="shrink-0" />
          <ConnectWalletButton className="max-w-full justify-start lg:justify-end" />
        </div>
      </div>
    </header>
  );
}
