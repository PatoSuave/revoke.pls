import { defineChain } from "viem";

/**
 * PulseChain mainnet (chainId 369).
 * RPC is overridable via NEXT_PUBLIC_PULSECHAIN_RPC_URL for Vercel deployments.
 */
export const pulsechain = defineChain({
  id: 369,
  name: "PulseChain",
  nativeCurrency: {
    name: "Pulse",
    symbol: "PLS",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL ??
          "https://rpc.pulsechain.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "PulseScan",
      url: "https://scan.pulsechain.com",
    },
  },
  testnet: false,
});

export const supportedChains = [pulsechain] as const;
