import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

import { base, bsc, pulsechain, supportedChains } from "@/lib/chains";
import {
  ETHEREUM_MAINNET_PUBLIC_RPC_URL,
  ethereumMainnetWalletChain,
} from "@/lib/ethereum-approval-client";

/**
 * Wagmi client configuration for Pulse Revoke.
 *
 * Supported chains:
 *  - PulseChain mainnet (369)
 *  - BNB Smart Chain mainnet (56)
 *  - Base mainnet (8453)
 *
 * Ethereum Mainnet (1) is registered as a wallet-only chain for the gated
 * Ethereum scanner/revoke flow. It is intentionally not part of the active
 * `supportedChains` product list used by the default scanner.
 *
 * Connectors:
 *  - Injected (MetaMask, Rabby, Brave, etc.)
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
  description:
    "Review and revoke token approvals on PulseChain, BSC, Base, and Ethereum.",
  url: "https://pulserevoke.com",
  icons: ["https://pulserevoke.com/icon.png"],
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

export const walletChains = [
  ...supportedChains,
  ethereumMainnetWalletChain,
] as const;

export const wagmiConfig = createConfig({
  chains: walletChains,
  connectors,
  transports: {
    [pulsechain.id]: http(
      process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL ?? undefined,
    ),
    [bsc.id]: http(process.env.NEXT_PUBLIC_BSC_RPC_URL ?? undefined),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? undefined),
    [ethereumMainnetWalletChain.id]: http(
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL ??
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ??
        ETHEREUM_MAINNET_PUBLIC_RPC_URL,
    ),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
