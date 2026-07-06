import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

import {
  ARBITRUM_ONE_PUBLIC_RPC_URL,
  arbitrumOneWalletChain,
} from "@/lib/arbitrum-approval-client";
import {
  abstract,
  apechain,
  avalanche,
  base,
  berachain,
  blast,
  bsc,
  celo,
  fraxtal,
  gnosis,
  katana,
  linea,
  mantle,
  monad,
  moonbeam,
  opbnb,
  plasma,
  polygon,
  pulsechain,
  robinhood,
  sei,
  sonic,
  taiko,
  supportedChains,
  unichain,
  worldchain,
  xdc,
} from "@/lib/chains";
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
 *  - Sonic Mainnet (146)
 *  - Avalanche C-Chain (43114)
 *  - Mantle mainnet (5000)
 *  - Linea mainnet (59144)
 *  - Blast mainnet (81457)
 *  - Berachain mainnet (80094)
 *  - Celo mainnet (42220)
 *  - Gnosis (100)
 *  - Unichain mainnet (130)
 *  - World Chain (480)
 *  - Robinhood Chain (4663)
 *  - Monad (143)
 *  - Katana (747474)
 *  - Sei (1329)
 *  - Plasma (9745)
 *  - Abstract (2741)
 *  - Fraxtal (252)
 *  - Taiko Mainnet (167000)
 *  - opBNB (204)
 *  - Moonbeam (1284)
 *  - ApeChain (33139)
 *  - XDC Network (50)
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
    "Review token approvals on PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast, Berachain, Celo, Gnosis, Unichain, World Chain, Robinhood, Monad, Katana, Sei, Plasma, Abstract, Fraxtal, Taiko, opBNB, Moonbeam, ApeChain, XDC, Ethereum, Arbitrum, Optimism, and HyperEVM.",
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
    [sonic.id]: http(process.env.NEXT_PUBLIC_SONIC_RPC_URL ?? undefined),
    [avalanche.id]: http(
      process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL ?? undefined,
    ),
    [mantle.id]: http(process.env.NEXT_PUBLIC_MANTLE_RPC_URL ?? undefined),
    [linea.id]: http(process.env.NEXT_PUBLIC_LINEA_RPC_URL ?? undefined),
    [blast.id]: http(process.env.NEXT_PUBLIC_BLAST_RPC_URL ?? undefined),
    [berachain.id]: http(
      process.env.NEXT_PUBLIC_BERACHAIN_RPC_URL ?? undefined,
    ),
    [celo.id]: http(process.env.NEXT_PUBLIC_CELO_RPC_URL ?? undefined),
    [gnosis.id]: http(process.env.NEXT_PUBLIC_GNOSIS_RPC_URL ?? undefined),
    [unichain.id]: http(
      process.env.NEXT_PUBLIC_UNICHAIN_RPC_URL ?? undefined,
    ),
    [worldchain.id]: http(
      process.env.NEXT_PUBLIC_WORLDCHAIN_RPC_URL ?? undefined,
    ),
    [robinhood.id]: http(
      process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ?? undefined,
    ),
    [monad.id]: http(process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? undefined),
    [katana.id]: http(process.env.NEXT_PUBLIC_KATANA_RPC_URL ?? undefined),
    [sei.id]: http(process.env.NEXT_PUBLIC_SEI_RPC_URL ?? undefined),
    [plasma.id]: http(process.env.NEXT_PUBLIC_PLASMA_RPC_URL ?? undefined),
    [abstract.id]: http(
      process.env.NEXT_PUBLIC_ABSTRACT_RPC_URL ?? undefined,
    ),
    [fraxtal.id]: http(process.env.NEXT_PUBLIC_FRAXTAL_RPC_URL ?? undefined),
    [taiko.id]: http(process.env.NEXT_PUBLIC_TAIKO_RPC_URL ?? undefined),
    [opbnb.id]: http(process.env.NEXT_PUBLIC_OPBNB_RPC_URL ?? undefined),
    [moonbeam.id]: http(
      process.env.NEXT_PUBLIC_MOONBEAM_RPC_URL ?? undefined,
    ),
    [apechain.id]: http(
      process.env.NEXT_PUBLIC_APECHAIN_RPC_URL ?? undefined,
    ),
    [xdc.id]: http(process.env.NEXT_PUBLIC_XDC_RPC_URL ?? undefined),
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
