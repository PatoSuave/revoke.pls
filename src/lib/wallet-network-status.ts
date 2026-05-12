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
import {
  OPTIMISM_CLIENT_CHAIN_ID,
  resolveOptimismReadOnlyChainId,
} from "@/lib/optimism-approval-client";

export const ARBITRUM_HEADER_STATUS_LABEL = "Arbitrum verified-row";
export const ARBITRUM_HEADER_STATUS_SHORT_HELPER =
  "ERC-20 and NFT rows only. Batch off.";
export const ARBITRUM_HEADER_STATUS_HELPER =
  "Verified ERC-20 and NFT rows can be revoked on Arbitrum. Batch revoke is not enabled.";
export const OPTIMISM_HEADER_STATUS_LABEL = "Optimism NFT row revoke";
export const OPTIMISM_HEADER_STATUS_SHORT_HELPER =
  "NFT rows only. ERC-20 and batch off.";
export const OPTIMISM_HEADER_STATUS_HELPER =
  "Verified NFT rows can be revoked on Optimism. ERC-20 and batch revoke are not enabled.";

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
      shortHelper: typeof ARBITRUM_HEADER_STATUS_SHORT_HELPER;
      helper: typeof ARBITRUM_HEADER_STATUS_HELPER;
    }
  | {
      kind: "optimism";
      chainId: typeof OPTIMISM_CLIENT_CHAIN_ID;
      label: typeof OPTIMISM_HEADER_STATUS_LABEL;
      shortHelper: typeof OPTIMISM_HEADER_STATUS_SHORT_HELPER;
      helper: typeof OPTIMISM_HEADER_STATUS_HELPER;
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
      shortHelper: ARBITRUM_HEADER_STATUS_SHORT_HELPER,
      helper: ARBITRUM_HEADER_STATUS_HELPER,
    };
  }

  const optimismChainId = resolveOptimismReadOnlyChainId({
    walletChainId,
    wagmiChainId,
  });
  if (optimismChainId === OPTIMISM_CLIENT_CHAIN_ID) {
    return {
      kind: "optimism",
      chainId: OPTIMISM_CLIENT_CHAIN_ID,
      label: OPTIMISM_HEADER_STATUS_LABEL,
      shortHelper: OPTIMISM_HEADER_STATUS_SHORT_HELPER,
      helper: OPTIMISM_HEADER_STATUS_HELPER,
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
