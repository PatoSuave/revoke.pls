import Link from "next/link";

import {
  INTEL_SURFACES,
  type IntelSurfaceHref,
} from "@/lib/intel/suite-navigation";

type IntelRouteSwitcherProps = {
  activeHref: IntelSurfaceHref;
  className?: string;
  variant?: "cards" | "chips";
};

export function IntelRouteSwitcher({
  activeHref,
  className = "",
  variant = "cards",
}: IntelRouteSwitcherProps) {
  if (variant === "chips") {
    return (
      <nav
        aria-label="Intelligence Suite sections"
        className={`flex gap-1 overflow-x-auto rounded-xl border border-pulse-border bg-pulse-panel/50 p-1 ${className}`}
      >
        {INTEL_SURFACES.map((surface) => {
          const isActive = surface.href === activeHref;

          return (
            <Link
              key={surface.href}
              href={surface.href}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-pulse-cyan text-pulse-bg"
                  : "text-pulse-muted hover:bg-pulse-text/5 hover:text-pulse-text"
              }`}
            >
              {surface.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Intelligence Suite sections"
      className={`rounded-3xl border border-pulse-cyan/20 bg-pulse-panel/55 p-3 shadow-glow ${className}`}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {INTEL_SURFACES.map((surface) => {
          const isActive = surface.href === activeHref;

          return (
            <Link
              key={surface.href}
              href={surface.href}
              aria-current={isActive ? "page" : undefined}
              className={`group rounded-2xl border p-4 transition ${
                isActive
                  ? "border-pulse-cyan/70 bg-pulse-cyan/10 text-pulse-text"
                  : "border-pulse-border bg-pulse-bg/45 text-pulse-muted hover:border-pulse-cyan/40 hover:bg-pulse-bg/70 hover:text-pulse-text"
              }`}
            >
              <p className="text-xs font-semibold text-pulse-cyan">
                {surface.eyebrow}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{surface.label}</h2>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isActive ? "bg-pulse-cyan" : "bg-pulse-border"
                  }`}
                  aria-hidden
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-pulse-muted">
                {surface.body}
              </p>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
