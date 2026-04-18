import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

import { pulsechain } from "@/lib/chains";

/**
 * Wagmi client configuration for Pulse Revoke.
 *
 * Keeps MVP surface minimal:
 *  - PulseChain only
 *  - Injected connector (MetaMask, Rabby, Brave, etc.)
 *  - WalletConnect v2 when NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set
 *
 * SSR is enabled so wagmi state hydrates safely under the Next.js App Router.
 * If the WalletConnect project ID is absent the connector is simply omitted,
 * the app still runs, and injected wallets continue to work.
 */
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * Feature flag for UI code. True when a WalletConnect project ID is configured
 * at build time and the WalletConnect connector has been registered.
 */
export const hasWalletConnect: boolean = Boolean(walletConnectProjectId);

const WALLETCONNECT_METADATA = {
  name: "Pulse Revoke",
  description: "Review and revoke ERC-20 token approvals on PulseChain.",
  url: "https://pulse-revoke.app",
  icons: ["https://pulse-revoke.app/icon.png"],
};

const connectors = [
  injected({ shimDisconnect: true }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          metadata: WALLETCONNECT_METADATA,
          showQrModal: true,
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [pulsechain],
  connectors,
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
