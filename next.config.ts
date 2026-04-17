import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
