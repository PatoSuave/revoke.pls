import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

import {
  ARBITRUM_ONE_PUBLIC_RPC_URL,
  arbitrumOneWalletChain,
} from "@/lib/arbitrum-approval-client";
import { base, bsc, polygon, pulsechain, supportedChains } from "@/lib/chains";
import {
  ETHEREUM_MAINNET_PUBLIC_RPC_URL,
  ethereumMainnetWalletChain,
} from "@/lib/ethereum-approval-client";
import {
  HYPEREVM_PUBLIC_RPC_URL,
  hyperevmWalletChain,
} from "@/lib/hyperevm-approval-client";
import {
  OPTIMISM_PUBLIC_RPC_URL,
  optimismWalletChain,
} from "@/lib/optimism-approval-client";

/**
 * Wagmi client configuration for Pulse Revoke.
 *
 * Supported chains:
 *  - PulseChain mainnet (369)
 *  - BNB Smart Chain mainnet (56)
 *  - Base mainnet (8453)
 *  - Polygon mainnet (137)
 *
 * Ethereum Mainnet (1) is registered as a wallet-only chain for the
 * Ethereum scanner/revoke flow. It is intentionally not part of the active
 * `supportedChains` product list used by the default scanner.
 *
 * Arbitrum One (42161) is registered for wallet chain recognition only. The
 * Arbitrum approval scanner uses the server-side read-only API and only its
 * live-verified ERC-20 and NFT rows may route through controlled single-row
 * revoke hooks. It never routes through the generic scanner/revoke path.
 *
 * OP Mainnet (10) and HyperEVM (999) are registered for wallet chain
 * recognition and verified ERC-20/NFT row revoke only. Their approval scanners
 * use server-side APIs and do not route through the generic scanner/revoke
 * path.
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
    "Review token approvals on PulseChain, BSC, Base, Polygon, Ethereum, Arbitrum, Optimism, and HyperEVM.",
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
  arbitrumOneWalletChain,
  optimismWalletChain,
  hyperevmWalletChain,
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
    [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL ?? undefined),
    [ethereumMainnetWalletChain.id]: http(
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL ??
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ??
        ETHEREUM_MAINNET_PUBLIC_RPC_URL,
    ),
    [arbitrumOneWalletChain.id]: http(ARBITRUM_ONE_PUBLIC_RPC_URL),
    [optimismWalletChain.id]: http(OPTIMISM_PUBLIC_RPC_URL),
    [hyperevmWalletChain.id]: http(HYPEREVM_PUBLIC_RPC_URL),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
