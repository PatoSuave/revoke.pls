/**
 * Build-time runtime target detection.
 *
 * `NEXT_PUBLIC_TAURI_BUILD=1` is set by `npm run build:desktop`. Next.js
 * inlines it as a string literal at build time, so `isDesktopBuild` is a
 * tree-shakeable constant — web builds strip the desktop branches, desktop
 * builds strip the web branches. No runtime probing of `window.__TAURI__`
 * is required for UX copy decisions, which avoids hydration mismatches.
 */
export const isDesktopBuild: boolean =
  process.env.NEXT_PUBLIC_TAURI_BUILD === "1";
