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
  ETHEREUM_MAINNET_DISPLAY_NAME,
  ETHEREUM_MAINNET_STATUS_LABEL,
  resolveEthereumReadOnlyChainId,
} from "@/lib/ethereum-approval-client";
import {
  HYPEREVM_CLIENT_CHAIN_ID,
  HYPEREVM_DISPLAY_NAME,
  resolveHyperEVMReadOnlyChainId,
} from "@/lib/hyperevm-approval-client";
import {
  OPTIMISM_CLIENT_CHAIN_ID,
  OPTIMISM_DISPLAY_NAME,
  resolveOptimismReadOnlyChainId,
} from "@/lib/optimism-approval-client";

export type HeaderSwitchChainId =
  | SupportedChainId
  | typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID
  | typeof ARBITRUM_ONE_CLIENT_CHAIN_ID
  | typeof OPTIMISM_CLIENT_CHAIN_ID
  | typeof HYPEREVM_CLIENT_CHAIN_ID;

export interface HeaderSwitchChainOption {
  chainId: HeaderSwitchChainId;
  displayName: string;
}

export const headerSwitchChainOptions: readonly HeaderSwitchChainOption[] = [
  ...supportedChainConfigList.map((chain) => ({
    chainId: chain.chainId,
    displayName: chain.displayName,
  })),
  {
    chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    displayName: ETHEREUM_MAINNET_DISPLAY_NAME,
  },
  {
    chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    displayName: "Arbitrum One",
  },
  {
    chainId: OPTIMISM_CLIENT_CHAIN_ID,
    displayName: OPTIMISM_DISPLAY_NAME,
  },
  {
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    displayName: HYPEREVM_DISPLAY_NAME,
  },
];

export const ARBITRUM_HEADER_STATUS_LABEL = "Arbitrum One";
export const ARBITRUM_HEADER_STATUS_SHORT_HELPER =
  "Verified rows only. Batch off.";
export const ARBITRUM_HEADER_STATUS_HELPER =
  "Verified ERC-20 and NFT rows can be revoked on Arbitrum. Batch revoke is not enabled.";
export const OPTIMISM_HEADER_STATUS_LABEL = "Optimism";
export const OPTIMISM_HEADER_STATUS_SHORT_HELPER =
  "Verified rows only. Batch off.";
export const OPTIMISM_HEADER_STATUS_HELPER =
  "Verified ERC-20 and NFT rows can be revoked on Optimism. Batch revoke is not enabled.";
export const HYPEREVM_HEADER_STATUS_LABEL = "HyperEVM";
export const HYPEREVM_HEADER_STATUS_SHORT_HELPER =
  "Verified rows only. Batch off.";
export const HYPEREVM_HEADER_STATUS_HELPER =
  "Verified ERC-20 and NFT rows can be revoked on HyperEVM. Batch revoke is not enabled.";

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
      kind: "hyperevm";
      chainId: typeof HYPEREVM_CLIENT_CHAIN_ID;
      label: typeof HYPEREVM_HEADER_STATUS_LABEL;
      shortHelper: typeof HYPEREVM_HEADER_STATUS_SHORT_HELPER;
      helper: typeof HYPEREVM_HEADER_STATUS_HELPER;
    }
  | {
      kind: "unsupported";
      label: "Unsupported network";
      switchChains: typeof headerSwitchChainOptions;
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

  const hyperevmChainId = resolveHyperEVMReadOnlyChainId({
    walletChainId,
    wagmiChainId,
  });
  if (hyperevmChainId === HYPEREVM_CLIENT_CHAIN_ID) {
    return {
      kind: "hyperevm",
      chainId: HYPEREVM_CLIENT_CHAIN_ID,
      label: HYPEREVM_HEADER_STATUS_LABEL,
      shortHelper: HYPEREVM_HEADER_STATUS_SHORT_HELPER,
      helper: HYPEREVM_HEADER_STATUS_HELPER,
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
    switchChains: headerSwitchChainOptions,
  };
}
