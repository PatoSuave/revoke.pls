import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { pulsechain } from "@/lib/chains";

/**
 * Wagmi client configuration for Pulse Revoke.
 *
 * Keeps MVP surface minimal:
 *  - PulseChain only
 *  - Injected connector (MetaMask, Rabby, Brave, etc.)
 *
 * SSR is enabled so wagmi state hydrates safely under the Next.js App Router.
 * Additional connectors (WalletConnect, Coinbase) can be added later behind env flags.
 */
export const wagmiConfig = createConfig({
  chains: [pulsechain],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [pulsechain.id]: http(
      process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL ?? undefined,
    ),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
