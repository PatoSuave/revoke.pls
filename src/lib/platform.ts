/**
 * Build-time runtime target detection.
 *
 * The local-server desktop beta is a static export, but it opens in the
 * user's normal browser. That means browser wallet extensions can still work.
 *
 * Keep static-export behavior separate from Tauri WebView behavior:
 * - static export: no hosted API routes are available
 * - Tauri WebView: browser extensions are unavailable
 */
export const isStaticExportBuild: boolean =
  process.env.NEXT_PUBLIC_STATIC_EXPORT_BUILD === "1" ||
  process.env.NEXT_PUBLIC_TAURI_BUILD === "1";

export const isDesktopLocalServerBuild: boolean =
  process.env.NEXT_PUBLIC_DESKTOP_LOCAL_SERVER_BUILD === "1";

export const isTauriWebViewBuild: boolean =
  process.env.NEXT_PUBLIC_TAURI_WEBVIEW_BUILD === "1";

export const isDesktopBuild: boolean =
  isDesktopLocalServerBuild || isTauriWebViewBuild;
