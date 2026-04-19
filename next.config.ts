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
};

export default nextConfig;
