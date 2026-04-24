import type { NextConfig } from "next";

// When TAURI_BUILD=1, produce a fully-static export that Tauri can serve
// from the `out/` directory. Web deployments omit `output` and keep SSR.
const isDesktopBuild = process.env.TAURI_BUILD === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isDesktopBuild && {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  webpack: (config) => {
    // Silences benign "module not found" warnings from optional peers pulled in
    // by wagmi/connectors (MetaMask SDK, WalletConnect logger, etc.) that we
    // don't use in the injected-only MVP.
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "@react-native-async-storage/async-storage",
    );
    return config;
  },
  async headers() {
    // Tauri desktop builds are served from local files/webview and do not use
    // HTTP response headers. Keep hardening headers for web deployments only.
    if (isDesktopBuild) return [];

    const csp = [
      "default-src 'self'",
      // Next.js runtime and some wallet providers rely on inline script/style.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Wallet/RPC connectivity + explorer/discovery APIs.
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
