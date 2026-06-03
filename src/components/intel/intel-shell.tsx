import Link from "next/link";

import { PulseMark } from "@/components/pulse-mark";
import { ThemeModeToggle } from "@/components/theme-mode-toggle";

export function IntelShellHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-pulse-border/60 bg-pulse-bg/85 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:py-0">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 text-pulse-text"
          aria-label="Pulse Revoke home"
        >
          <PulseMark className="h-8 w-8 shrink-0" />
          <span className="truncate text-base font-semibold sm:text-lg">
            Pulse<span className="text-gradient-pulse"> Revoke</span>
          </span>
        </Link>

        <nav className="order-3 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-1 text-xs text-pulse-muted sm:text-sm lg:order-2 lg:justify-center lg:gap-6 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0">
          <Link
            href="/intel"
            className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition hover:bg-pulse-text/5 hover:text-pulse-text lg:px-0 lg:py-0 lg:hover:bg-transparent"
          >
            Intelligence
          </Link>
          <Link
            href="/intel/wallet"
            className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition hover:bg-pulse-text/5 hover:text-pulse-text lg:px-0 lg:py-0 lg:hover:bg-transparent"
          >
            Wallet demo
          </Link>
          <Link
            href="/intel/visualizer"
            className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition hover:bg-pulse-text/5 hover:text-pulse-text lg:px-0 lg:py-0 lg:hover:bg-transparent"
          >
            Visualizer
          </Link>
          <Link
            href="/security"
            className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition hover:bg-pulse-text/5 hover:text-pulse-text lg:px-0 lg:py-0 lg:hover:bg-transparent"
          >
            Security
          </Link>
          <Link
            href="/app"
            className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition hover:bg-pulse-text/5 hover:text-pulse-text lg:px-0 lg:py-0 lg:hover:bg-transparent"
          >
            Scanner
          </Link>
        </nav>

        <div className="order-2 flex items-center gap-2 lg:order-3">
          <ThemeModeToggle className="shrink-0" />
        </div>
      </div>
    </header>
  );
}

export function IntelStatusBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-1 text-xs font-semibold text-pulse-cyan">
      <span className="h-1.5 w-1.5 rounded-full bg-pulse-cyan" aria-hidden />
      {children}
    </span>
  );
}
