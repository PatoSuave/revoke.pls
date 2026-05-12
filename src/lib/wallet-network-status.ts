import {
  ARBITRUM_ONE_CLIENT_CHAIN_ID,
  resolveArbitrumReadOnlyChainId,
} from "@/lib/arbitrum-approval-client";
import {
  getChainConfig,
  isSupportedChainId,
  supportedChainConfigList,
  type SupportedChainConfig,
  type SupportedChainId,
} from "@/lib/chains";
import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  ETHEREUM_MAINNET_STATUS_LABEL,
  resolveEthereumReadOnlyChainId,
} from "@/lib/ethereum-approval-client";

export const ARBITRUM_HEADER_STATUS_LABEL = "Arbitrum One ERC-20 beta";
export const ARBITRUM_HEADER_STATUS_HELPER =
  "Verified ERC-20 rows can be revoked on Arbitrum. NFT and batch revoke are not enabled.";

export type HeaderNetworkStatus =
  | {
      kind: "supported";
      chainId: SupportedChainId;
      label: string;
      config: SupportedChainConfig;
    }
  | {
      kind: "ethereum";
      chainId: typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID;
      label: typeof ETHEREUM_MAINNET_STATUS_LABEL;
    }
  | {
      kind: "arbitrum";
      chainId: typeof ARBITRUM_ONE_CLIENT_CHAIN_ID;
      label: typeof ARBITRUM_HEADER_STATUS_LABEL;
      helper: typeof ARBITRUM_HEADER_STATUS_HELPER;
    }
  | {
      kind: "unsupported";
      label: "Unsupported network";
      switchChains: typeof supportedChainConfigList;
    };

export function resolveHeaderNetworkStatus({
  walletChainId,
  wagmiChainId,
}: {
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
}): HeaderNetworkStatus {
  const ethereumChainId = resolveEthereumReadOnlyChainId({
    walletChainId,
    wagmiChainId,
  });
  if (ethereumChainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return {
      kind: "ethereum",
      chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      label: ETHEREUM_MAINNET_STATUS_LABEL,
    };
  }

  const arbitrumChainId = resolveArbitrumReadOnlyChainId({
    walletChainId,
    wagmiChainId,
  });
  if (arbitrumChainId === ARBITRUM_ONE_CLIENT_CHAIN_ID) {
    return {
      kind: "arbitrum",
      chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
      label: ARBITRUM_HEADER_STATUS_LABEL,
      helper: ARBITRUM_HEADER_STATUS_HELPER,
    };
  }

  const connectedChainId = walletChainId ?? wagmiChainId;
  if (isSupportedChainId(connectedChainId)) {
    const config = getChainConfig(connectedChainId)!;
    return {
      kind: "supported",
      chainId: connectedChainId,
      label: config.displayName,
      config,
    };
  }

  return {
    kind: "unsupported",
    label: "Unsupported network",
    switchChains: supportedChainConfigList,
  };
}
