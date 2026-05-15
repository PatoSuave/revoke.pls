"use client";

import { THEME_MODES } from "@/lib/theme";
import { useThemeMode } from "@/components/theme-provider";

export function ThemeModeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useThemeMode();

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={`inline-grid grid-cols-3 rounded-xl border border-pulse-border bg-pulse-panel/45 p-1 text-[11px] font-semibold text-pulse-muted ${className}`}
    >
      {THEME_MODES.map((mode) => {
        const selected = theme === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            aria-pressed={selected}
            onClick={() => setTheme(mode.id)}
            className={`rounded-lg px-2.5 py-1.5 transition ${
              selected
                ? "bg-pulse-gradient text-pulse-on-gradient shadow-glow"
                : "hover:bg-pulse-text/10 hover:text-pulse-text"
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
