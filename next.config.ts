import type { NextConfig } from "next";

// When TAURI_BUILD=1, produce a fully-static export that Tauri can serve
// from the `out/` directory. Web deployments omit `output` and keep SSR.
const isDesktopBuild = process.env.TAURI_BUILD === "1";

const securityHeaders = [
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
  poweredByHeader: false,
  // The Solidity parser reads its generated ANTLR token table at runtime.
  // Keep the package external so Next preserves the package-relative asset.
  serverExternalPackages: ["@solidity-parser/parser"],
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
