import { PulseMark } from "@/components/pulse-mark";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-pulse-border/60 bg-pulse-bg py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <PulseMark className="h-7 w-7" />
          <div>
            <p className="text-sm font-semibold text-pulse-text">
              {siteConfig.name}
            </p>
            <p className="text-xs text-pulse-muted">
              {siteConfig.tagline}
            </p>
            <p className="mt-1 font-mono text-[11px] text-pulse-muted/80">
              {siteConfig.domain}
            </p>
          </div>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-pulse-muted"
        >
          {siteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition hover:text-pulse-text"
            >
              {item.label}
            </a>
          ))}
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-pulse-text"
          >
            GitHub
          </a>
          <a
            href={siteConfig.links.x}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-pulse-text"
          >
            X
          </a>
        </nav>

        <div className="flex flex-col gap-1 text-[11px] text-pulse-muted md:items-end">
          <p>Informational and transactional. Not financial advice.</p>
          <p>
            Always verify spender addresses on the relevant explorer for
            PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle,
            Ethereum, Arbitrum, Optimism, or HyperEVM before signing.
          </p>
          <p className="mt-1">
            Copyright {year} {siteConfig.name} - {siteConfig.attribution}
          </p>
        </div>
      </div>
    </footer>
  );
}
