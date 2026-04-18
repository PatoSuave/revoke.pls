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
  contracts: {
    // Canonical Multicall3 is deployed at the same deterministic address
    // on PulseChain as on other EVM chains, which lets wagmi/viem batch
    // the scanner's allowance + metadata reads into a single RPC call.
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const supportedChains = [pulsechain] as const;
