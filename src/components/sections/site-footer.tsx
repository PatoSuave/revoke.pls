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
              {siteConfig.tagline}.
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
            href={siteConfig.links.explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-pulse-text"
          >
            PulseScan
          </a>
          <a
            href={siteConfig.links.bscscan}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-pulse-text"
          >
            BscScan
          </a>
        </nav>

        <div className="flex flex-col gap-1 text-[11px] text-pulse-muted md:items-end">
          <p>Informational and transactional. Not financial advice.</p>
          <p>
            Always verify spender addresses on{" "}
            <a
              href={siteConfig.links.explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pulse-text underline underline-offset-2 hover:text-pulse-cyan"
            >
              PulseScan
            </a>{" "}
            or{" "}
            <a
              href={siteConfig.links.bscscan}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pulse-text underline underline-offset-2 hover:text-pulse-cyan"
            >
              BscScan
            </a>{" "}
            before signing.
          </p>
          <p className="mt-1">
            © {year} {siteConfig.name} · {siteConfig.attribution}
          </p>
        </div>
      </div>
    </footer>
  );
}
