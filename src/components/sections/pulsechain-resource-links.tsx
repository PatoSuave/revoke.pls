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
            PulseChain resources
          </p>
          <h2 className="mt-2 text-2xl font-bold text-pulse-text sm:text-3xl">
            Trusted PulseChain links
          </h2>
          <p className="mt-3 text-sm leading-6 text-pulse-muted">
            {PULSECHAIN_RESOURCE_NOTICE}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PULSECHAIN_RESOURCE_LINKS.map((resource) => {
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
              <a
                key={resource.href}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                style={cardStyle}
                className="group relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-pulse-border/75 bg-pulse-panel/50 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.03)] transition hover:border-[color:var(--accent-border)] hover:bg-pulse-panel/70 sm:min-h-48"
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
                      <Image
                        src={resource.logoSrc}
                        alt=""
                        width={34}
                        height={34}
                        sizes="34px"
                        className="h-[34px] w-[34px] object-contain"
                      />
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
                  <span className="shrink-0 text-xs font-semibold text-pulse-cyan transition group-hover:text-pulse-text">
                    Open
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
