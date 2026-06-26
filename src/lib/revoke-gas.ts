import { formatUnits } from "viem";

import { getChainCapability } from "@/lib/chain-capabilities";
import { BSC_CHAIN_ID } from "@/lib/chains";
import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  ETHEREUM_MAINNET_NATIVE_SYMBOL,
} from "@/lib/ethereum-approval-client";

export type RevokeGasCallKind = "erc20" | "nft-token" | "nft-operator";
export type GasWarningLevel =
  | "none"
  | "high"
  | "severe"
  | "extreme"
  | "unavailable";

export interface RevokeGasThresholds {
  reference?: bigint;
  high?: bigint;
  severe?: bigint;
  extreme?: bigint;
}

export const ETHEREUM_ERC20_APPROVE_ZERO_REFERENCE_GAS = 45_000n;

export const ETHEREUM_REVOKE_GAS_THRESHOLDS: Record<
  RevokeGasCallKind,
  RevokeGasThresholds
> = {
  erc20: {
    reference: ETHEREUM_ERC20_APPROVE_ZERO_REFERENCE_GAS,
    high: 150_000n,
    severe: 300_000n,
    extreme: 500_000n,
  },
  "nft-token": {
    high: 150_000n,
    severe: 300_000n,
  },
  "nft-operator": {
    high: 150_000n,
    severe: 300_000n,
  },
};

export const ETHEREUM_GAS_PAID_TO_NETWORK_COPY =
  "Gas is paid to the Ethereum network, not to Pulse Revoke or the approved protocol.";
export const WALLET_HIGHER_FEE_CANCEL_COPY =
  "If your wallet shows a much higher fee than this app estimates, cancel and try again later.";
export const WALLET_PROMPT_SAFETY_COPY =
  "Review the wallet prompt carefully. Revoke should not transfer tokens or ETH. It should only reset an approval. If the wallet shows a token transfer, ETH transfer, or an unreasonable fee, cancel.";
export const WALLET_ESTIMATE_MAY_DIFFER_COPY =
  "Wallet gas estimate may differ from this app's read-only estimate.";

export function shouldEstimateRevokeGas(chainId: number | undefined): boolean {
  return (
    chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID ||
    chainId === BSC_CHAIN_ID ||
    Boolean(getRevokeMaxTransactionGas(chainId))
  );
}

export function getRevokeMaxTransactionGas(
  chainId: number | undefined,
): bigint | undefined {
  return getChainCapability(chainId)?.perTxGasCap;
}

export function getRevokeGasThresholds({
  chainId,
  kind,
  highGasWarningThreshold,
}: {
  chainId: number | undefined;
  kind: RevokeGasCallKind;
  highGasWarningThreshold?: bigint;
}): RevokeGasThresholds {
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ETHEREUM_REVOKE_GAS_THRESHOLDS[kind];
  }

  if (highGasWarningThreshold) {
    return { high: highGasWarningThreshold };
  }

  return {};
}

export function getNativeGasSymbol({
  chainId,
  fallback,
}: {
  chainId: number | undefined;
  fallback?: string;
}): string | undefined {
  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return ETHEREUM_MAINNET_NATIVE_SYMBOL;
  }
  return fallback;
}

export function getGasWarningLevel({
  chainId,
  kind,
  estimatedGas,
  highGasWarningThreshold,
}: {
  chainId: number | undefined;
  kind: RevokeGasCallKind;
  estimatedGas: bigint | undefined;
  highGasWarningThreshold?: bigint;
}): GasWarningLevel {
  if (estimatedGas === undefined) return "unavailable";

  const thresholds = getRevokeGasThresholds({
    chainId,
    kind,
    highGasWarningThreshold,
  });

  if (thresholds.extreme && estimatedGas > thresholds.extreme) {
    return "extreme";
  }
  if (thresholds.severe && estimatedGas > thresholds.severe) {
    return "severe";
  }
  if (thresholds.high && estimatedGas > thresholds.high) {
    return "high";
  }
  return "none";
}

export function isGasWarningLevel(level: GasWarningLevel | undefined): boolean {
  return level === "high" || level === "severe" || level === "extreme";
}

export function requiresGasWarningAcknowledgement(
  level: GasWarningLevel | undefined,
): boolean {
  return level === "severe" || level === "extreme";
}

export function gasWarningTitle(level: GasWarningLevel | undefined): string {
  if (level === "extreme") return "Extreme gas estimate";
  if (level === "severe") return "Severe gas estimate";
  return "Unusually high gas estimate";
}

export function gasWarningBody({
  level,
  chainName,
}: {
  level: GasWarningLevel | undefined;
  chainName: string;
}): string {
  if (level === "extreme") {
    return `This revoke estimated extremely high gas on ${chainName}. It may still be a valid approval reset, but review the wallet fee and call details carefully before signing.`;
  }
  if (level === "severe") {
    return `This revoke estimated very high gas on ${chainName}. It is abnormal for a standard approval reset and requires extra review before the wallet opens.`;
  }
  return `This revoke estimated higher-than-normal gas on ${chainName}. That does not make the live approval invalid, but it deserves careful wallet review.`;
}

export function formatGasAmount(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatNativeFee(valueWei: bigint, symbol: string): string {
  const formatted = formatUnits(valueWei, 18);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmedFraction = fraction.slice(0, 6).replace(/0+$/, "");
  const value = trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
  return `${value} ${symbol}`;
}
