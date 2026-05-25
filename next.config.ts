import type { NextConfig } from "next";

// When TAURI_BUILD=1, produce a fully-static export that Tauri can serve
// from the `out/` directory. Web deployments omit `output` and keep SSR.
const isDesktopBuild = process.env.TAURI_BUILD === "1";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "report-uri /api/csp-report",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicyReportOnly,
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), clipboard-read=(), clipboard-write=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isDesktopBuild && {
    // Desktop export only needs TSX app pages. Omitting `.ts` route files keeps
    // hosted-only server APIs out of the static Tauri bundle.
    pageExtensions: ["tsx", "jsx"],
  }),
  ...(!isDesktopBuild && {
    async headers() {
      return [
        {
          source: "/:path*",
          headers: securityHeaders,
        },
      ];
    },
    async redirects() {
      const canonicalHosts = [
        "www.pulserevoke.com",
        "revoke-pls.vercel.app",
        "revoke-pls-squikyus-8256s-projects.vercel.app",
      ];

      return canonicalHosts.map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        destination: "https://pulserevoke.com/:path*",
        permanent: true,
      }));
    },
  }),
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
};

export default nextConfig;
