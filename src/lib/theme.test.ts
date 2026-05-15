import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_MODE,
  THEME_MODES,
  isThemeMode,
  resolveThemeMode,
} from "@/lib/theme";

describe("theme modes", () => {
  it("supports dark, dim, and light modes with dark as the fallback", () => {
    expect(THEME_MODES.map((mode) => mode.id)).toEqual([
      "dark",
      "dim",
      "light",
    ]);
    expect(DEFAULT_THEME_MODE).toBe("dark");
    expect(isThemeMode("dim")).toBe(true);
    expect(resolveThemeMode("light")).toBe("light");
    expect(resolveThemeMode("unknown")).toBe("dark");
    expect(resolveThemeMode(null)).toBe("dark");
  });

  it("defines CSS token blocks for every theme", () => {
    const css = readFileSync(
      join(process.cwd(), "src", "app", "globals.css"),
      "utf8",
    );

    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toContain('html[data-theme="dim"]');
    expect(css).toContain('html[data-theme="light"]');
    expect(css).toContain("--pulse-on-gradient");
    expect(css).toContain("--pulse-mark-stroke");
  });
});
