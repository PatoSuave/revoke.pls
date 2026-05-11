import {
  getChainConfig,
  supportedChainConfigList,
  type SupportedChainId,
} from "@/lib/chains";
import {
  ARBITRUM_ONE_CLIENT_CHAIN_ID,
  ARBITRUM_ONE_DISPLAY_NAME,
  ARBITRUM_ONE_SHORT_NAME,
} from "@/lib/arbitrum-approval-client";
import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  ETHEREUM_MAINNET_DISPLAY_NAME,
  ETHEREUM_MAINNET_SHORT_NAME,
} from "@/lib/ethereum-approval-client";

export type AddressOnlyScanChainId =
  | typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID
  | typeof ARBITRUM_ONE_CLIENT_CHAIN_ID
  | SupportedChainId;

export interface AddressOnlyScanOption {
  chainId: AddressOnlyScanChainId;
  displayName: string;
  shortName: string;
  kind: "ethereum" | "arbitrum" | "supported";
}

export const ADDRESS_ONLY_SCAN_ALL_CONCURRENCY = 1;

export const addressOnlyScanOptions: readonly AddressOnlyScanOption[] = [
  {
    chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    displayName: ETHEREUM_MAINNET_DISPLAY_NAME,
    shortName: ETHEREUM_MAINNET_SHORT_NAME,
    kind: "ethereum",
  },
  {
    chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    displayName: ARBITRUM_ONE_DISPLAY_NAME,
    shortName: ARBITRUM_ONE_SHORT_NAME,
    kind: "arbitrum",
  },
  ...supportedChainConfigList.map((chain) => ({
    chainId: chain.chainId,
    displayName: chain.displayName,
    shortName: chain.shortName,
    kind: "supported" as const,
  })),
];

export function isAddressOnlyScanChainId(
  chainId: number | undefined,
): chainId is AddressOnlyScanChainId {
  return addressOnlyScanOptions.some((option) => option.chainId === chainId);
}

export function resolveDefaultAddressOnlyScanChainId({
  walletChainId,
  wagmiChainId,
}: {
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
}): AddressOnlyScanChainId {
  if (isAddressOnlyScanChainId(walletChainId)) return walletChainId;
  if (isAddressOnlyScanChainId(wagmiChainId)) return wagmiChainId;
  return ETHEREUM_MAINNET_CLIENT_CHAIN_ID;
}

export function getAddressOnlyScanOption(
  chainId: AddressOnlyScanChainId,
): AddressOnlyScanOption {
  return (
    addressOnlyScanOptions.find((option) => option.chainId === chainId) ??
    addressOnlyScanOptions[0]
  );
}

export function getAddressOnlyActiveScanChainIds({
  selectedChainId,
  scanAllStarted,
  scanAllIndex,
}: {
  selectedChainId: AddressOnlyScanChainId;
  scanAllStarted: boolean;
  scanAllIndex: number;
}): AddressOnlyScanChainId[] {
  if (!scanAllStarted) return [selectedChainId];
  const maxIndex = Math.max(0, Math.floor(scanAllIndex));
  return addressOnlyScanOptions
    .slice(0, maxIndex + ADDRESS_ONLY_SCAN_ALL_CONCURRENCY)
    .map((option) => option.chainId);
}

export function getSupportedAddressOnlyChainConfig(
  chainId: AddressOnlyScanChainId,
) {
  return getChainConfig(chainId);
}
