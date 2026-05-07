import { getAddress, isAddress, type Address } from "viem";

export type ScanMode =
  | "connected-wallet"
  | "address-only"
  | "connected-wallet-matches-scanned-address";

export interface ScanTarget {
  scanMode: ScanMode;
  scanTargetAddress: Address | undefined;
  connectedWalletAddress: Address | undefined;
  isConnectedWalletSameAsScanTarget: boolean;
}

export function normalizeScanInputAddress(input: string): Address | null {
  const value = input.trim();
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function resolveScanTarget({
  connectedWalletAddress,
  activeAddressOnlyAddress,
}: {
  connectedWalletAddress: Address | undefined;
  activeAddressOnlyAddress: Address | null;
}): ScanTarget {
  const scanTargetAddress = activeAddressOnlyAddress ?? connectedWalletAddress;
  const isConnectedWalletSameAsScanTarget = addressesEqual(
    connectedWalletAddress,
    scanTargetAddress,
  );
  const scanMode: ScanMode = activeAddressOnlyAddress
    ? isConnectedWalletSameAsScanTarget
      ? "connected-wallet-matches-scanned-address"
      : "address-only"
    : "connected-wallet";

  return {
    scanMode,
    scanTargetAddress,
    connectedWalletAddress,
    isConnectedWalletSameAsScanTarget,
  };
}

export function scanTargetSessionKey(target: ScanTarget): string {
  return `${target.scanMode}:${
    target.scanTargetAddress?.toLowerCase() ?? "no-target"
  }`;
}

export function getScanTargetRevokeDisabledReason({
  scanTargetAddress,
  connectedWalletAddress,
  walletChainId,
  rowChainId,
  chainName,
}: {
  scanTargetAddress: Address;
  connectedWalletAddress: Address | undefined;
  walletChainId: number | undefined;
  rowChainId: number;
  chainName: string;
}): string | null {
  if (!connectedWalletAddress) return "Connect this wallet to revoke.";
  if (!addressesEqual(connectedWalletAddress, scanTargetAddress)) {
    return "Connected wallet does not match scanned address.";
  }
  if (walletChainId !== rowChainId) return `Switch to ${chainName}.`;
  return null;
}

export function addressesEqual(
  left: Address | undefined,
  right: Address | undefined,
): boolean {
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}
