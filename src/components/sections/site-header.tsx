import Link from "next/link";

import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { PulseMark } from "@/components/pulse-mark";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-pulse-border/60 bg-pulse-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-pulse-text"
          aria-label={`${siteConfig.name} home`}
        >
          <PulseMark className="h-8 w-8" />
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            Pulse<span className="text-gradient-pulse"> Revoke</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-pulse-muted md:flex">
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

        <ConnectWalletButton />
      </div>
    </header>
  );
}
