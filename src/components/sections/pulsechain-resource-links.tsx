import Image from "next/image";
import type { CSSProperties } from "react";

import {
  PULSECHAIN_RESOURCE_LINKS,
  PULSECHAIN_RESOURCE_NOTICE,
} from "@/lib/pulsechain-resources";

export function PulseChainResourceLinks({
  compact = false,
}: {
  compact?: boolean;
} = {}) {
  return (
    <section
      id="pulsechain-resources"
      className={`border-b border-pulse-border/45 bg-transparent ${
        compact ? "py-8 sm:py-10" : "py-12 sm:py-16"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Curated resources
          </p>
          <h2 className="mt-2 text-2xl font-bold text-pulse-text sm:text-3xl">
            Curated links
          </h2>
          <p className="mt-3 text-sm leading-6 text-pulse-muted">
            {PULSECHAIN_RESOURCE_NOTICE}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PULSECHAIN_RESOURCE_LINKS.map((resource) => {
            const actions = resource.actions ?? [
              {
                label: "Open",
                href: resource.href,
                domain: resource.domain,
                kind: "primary" as const,
              },
            ];
            const cardStyle = {
              "--accent-color": resource.accentColor,
              "--accent-readable": resource.accentReadable,
              "--accent-soft": resource.accentSoft,
              "--accent-border": resource.accentBorder,
              "--accent-shadow": `0 0 18px ${resource.accentColor}`,
            } as CSSProperties;
            const logoPlateClass =
              "logoPlate" in resource && resource.logoPlate === "dark"
                ? "resource-logo-plate-dark"
                : "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)]";

            return (
              <article
                key={resource.href}
                style={cardStyle}
                className="group relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-pulse-border/75 bg-pulse-panel/50 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.03)] transition hover:border-[color:var(--accent-border)] hover:bg-pulse-panel/70 sm:min-h-52"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[color:var(--accent-border)] opacity-70 transition group-hover:opacity-100"
                  aria-hidden
                />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${logoPlateClass}`}
                      aria-hidden
                    >
                      {resource.logoSrc ? (
                        <Image
                          src={resource.logoSrc}
                          alt=""
                          width={34}
                          height={34}
                          sizes="34px"
                          className="h-[34px] w-[34px] object-contain"
                        />
                      ) : (
                        <span className="text-lg font-bold text-[color:var(--accent-readable)]">
                          {resource.fallbackMark ?? resource.label.charAt(0)}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-semibold text-pulse-text">
                        {resource.label}
                      </p>
                      <p className="brand-accent-text mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                        {resource.category}
                      </p>
                    </div>
                  </div>
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pulse-green shadow-[0_0_14px_rgba(28,229,161,0.65)]"
                    aria-hidden
                  />
                </div>

                <p className="relative z-10 mt-4 flex-1 text-xs leading-5 text-pulse-muted">
                  {resource.description}
                </p>

                <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
                  <span className="min-w-0 break-all font-mono text-[11px] text-pulse-muted">
                    {resource.domain}
                  </span>
                  {actions.length > 1 ? (
                    <span className="shrink-0 rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent-readable)]">
                      Options
                    </span>
                  ) : null}
                </div>
                <div className="relative z-10 mt-4 grid gap-2">
                  {actions.map((action) => {
                    const isSecondary = action.kind === "secondary";

                    return (
                      <a
                        key={action.href}
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          isSecondary
                            ? "border border-pulse-border bg-pulse-bg/45 text-pulse-text hover:border-[color:var(--accent-border)] hover:bg-pulse-bg/70"
                            : "border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-[color:var(--accent-readable)] hover:bg-pulse-panel/80"
                        }`}
                        aria-label={`${action.label} for ${resource.label} (${action.domain})`}
                      >
                        {action.label}
                      </a>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
