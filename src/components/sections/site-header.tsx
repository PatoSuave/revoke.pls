import Link from "next/link";

import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { PulseMark } from "@/components/pulse-mark";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-pulse-border/60 bg-pulse-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-pulse-text md:flex-none"
          aria-label={`${siteConfig.name} home`}
        >
          <PulseMark className="h-8 w-8 shrink-0" />
          <span className="truncate text-base font-semibold tracking-tight sm:text-lg">
            Pulse<span className="text-gradient-pulse"> Revoke</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-pulse-muted lg:flex">
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition hover:text-pulse-text"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <ConnectWalletButton className="min-w-0" />
      </div>
    </header>
  );
}
