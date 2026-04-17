import Link from "next/link";

import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { PulseMark } from "@/components/pulse-mark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-pulse-border/60 bg-pulse-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-pulse-text"
          aria-label="Pulse Revoke home"
        >
          <PulseMark className="h-8 w-8" />
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            Pulse<span className="text-gradient-pulse"> Revoke</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-pulse-muted md:flex">
          <a href="#scanner" className="hover:text-pulse-text transition">
            Scanner
          </a>
          <a href="#safety" className="hover:text-pulse-text transition">
            Safety
          </a>
          <a href="#faq" className="hover:text-pulse-text transition">
            FAQ
          </a>
        </nav>

        <ConnectWalletButton />
      </div>
    </header>
  );
}
