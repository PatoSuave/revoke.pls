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
      className={`border-b border-pulse-border/60 bg-pulse-bg ${
        compact ? "py-8 sm:py-10" : "py-12 sm:py-16"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            PulseChain resources
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-pulse-text sm:text-3xl">
            Curated links for common PulseChain destinations.
          </h2>
          <p className="mt-3 text-sm leading-6 text-pulse-muted">
            {PULSECHAIN_RESOURCE_NOTICE}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PULSECHAIN_RESOURCE_LINKS.map((resource) => (
            <a
              key={resource.href}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-0 flex-col rounded-xl border border-pulse-border bg-pulse-panel/55 p-4 transition hover:border-pulse-cyan/45 hover:bg-pulse-panel/75 sm:min-h-44"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {resource.label}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-cyan">
                    {resource.category}
                  </p>
                </div>
                <span
                  className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-pulse-green"
                  aria-hidden
                />
              </div>

              <p className="mt-3 flex-1 text-xs leading-5 text-pulse-muted">
                {resource.description}
              </p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="min-w-0 break-all font-mono text-[11px] text-pulse-muted">
                  {resource.domain}
                </span>
                <span className="shrink-0 text-xs font-semibold text-pulse-cyan transition group-hover:text-pulse-text">
                  Open
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
