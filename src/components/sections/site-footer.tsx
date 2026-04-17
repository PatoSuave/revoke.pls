import { PulseMark } from "@/components/pulse-mark";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      id="faq"
      className="border-t border-pulse-border/60 bg-pulse-bg py-12"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <PulseMark className="h-7 w-7" />
          <div>
            <p className="text-sm font-semibold text-pulse-text">
              Pulse Revoke
            </p>
            <p className="text-xs text-pulse-muted">
              Approval management for PulseChain.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-xs text-pulse-muted md:items-end">
          <p>
            This tool is informational and transactional, not financial advice.
          </p>
          <p>
            Always verify spender addresses on{" "}
            <a
              href="https://scan.pulsechain.com"
              target="_blank"
              rel="noreferrer"
              className="text-pulse-text underline underline-offset-2 hover:text-pulse-cyan"
            >
              PulseScan
            </a>{" "}
            before signing.
          </p>
          <p className="mt-1">© {year} Pulse Revoke</p>
        </div>
      </div>
    </footer>
  );
}
