export const THEME_STORAGE_KEY = "pulse-revoke-theme";

export const THEME_MODES = [
  { id: "dark", label: "Dark" },
  { id: "dim", label: "Dim" },
  { id: "light", label: "Light" },
] as const;

export type ThemeMode = (typeof THEME_MODES)[number]["id"];

export const DEFAULT_THEME_MODE: ThemeMode = "dark";

export const THEME_MODE_IDS = THEME_MODES.map((mode) => mode.id);

export function isThemeMode(value: string | null): value is ThemeMode {
  return THEME_MODE_IDS.includes(value as ThemeMode);
}

export function resolveThemeMode(value: string | null): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_THEME_MODE;
}
