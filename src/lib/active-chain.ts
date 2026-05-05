import {
  getChainConfig,
  isSupportedChainId,
  type SupportedChainConfig,
  type SupportedChainId,
} from "@/lib/chains";

export type ActiveChainStatus = "disconnected" | "supported" | "unsupported";

export interface ActiveChainResolution {
  status: ActiveChainStatus;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  activeChainId: SupportedChainId | undefined;
  activeChainConfig: SupportedChainConfig | undefined;
  walletChainConfig: SupportedChainConfig | undefined;
  walletChainSupported: boolean;
  walletMatchesActiveChain: boolean | null;
}

export function resolveActiveChain({
  isConnected,
  walletChainId,
  wagmiChainId,
}: {
  isConnected: boolean;
  walletChainId: number | undefined;
  wagmiChainId?: number | undefined;
}): ActiveChainResolution {
  const walletChainConfig = getChainConfig(walletChainId);

  if (!isConnected) {
    return {
      status: "disconnected",
      walletChainId,
      wagmiChainId,
      activeChainId: undefined,
      activeChainConfig: undefined,
      walletChainConfig,
      walletChainSupported: Boolean(walletChainConfig),
      walletMatchesActiveChain: null,
    };
  }

  if (isSupportedChainId(walletChainId)) {
    const activeChainConfig = getChainConfig(walletChainId);
    return {
      status: "supported",
      walletChainId,
      wagmiChainId,
      activeChainId: walletChainId,
      activeChainConfig,
      walletChainConfig: activeChainConfig,
      walletChainSupported: true,
      walletMatchesActiveChain: true,
    };
  }

  return {
    status: "unsupported",
    walletChainId,
    wagmiChainId,
    activeChainId: undefined,
    activeChainConfig: undefined,
    walletChainConfig: undefined,
    walletChainSupported: false,
    walletMatchesActiveChain: false,
  };
}

export function scannerSessionKey(
  owner: `0x${string}` | undefined,
  chainId: number | undefined,
): string {
  return `${owner?.toLowerCase() ?? "no-owner"}:${chainId ?? "no-chain"}`;
}
