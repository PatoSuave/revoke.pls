import { formatUnits, parseUnits } from "viem";

import type { TypicalGasTransaction } from "@/lib/gas/gas-types";

export const TYPICAL_GAS_TRANSACTIONS = [
  { label: "Native transfer", gasUnits: 21_000 },
  { label: "Token approval / revoke", gasUnits: 65_000 },
  { label: "Token transfer", gasUnits: 65_000 },
  { label: "NFT approval", gasUnits: 85_000 },
  { label: "Contract interaction", gasUnits: 150_000 },
] as const;

export function weiToGweiString(valueWei: bigint, decimals?: number): string {
  const valueGwei = formatUnits(valueWei, 9);
  const numericValue = Number(valueGwei);
  const displayDecimals =
    decimals ?? (numericValue > 0 && numericValue < 1 ? 6 : 2);
  return trimDecimal(valueGwei, displayDecimals);
}

export function formatGweiNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  return trimDecimal(value.toFixed(decimals), decimals);
}

export function gweiStringToWei(valueGwei: string): bigint {
  return parseUnits(valueGwei, 9);
}

export function calculateNativeCostWei({
  gasPriceWei,
  gasUnits,
}: {
  gasPriceWei: bigint;
  gasUnits: number;
}): bigint {
  return gasPriceWei * BigInt(gasUnits);
}

export function formatNativeCost(valueWei: bigint, decimals = 9): string {
  return trimDecimal(formatUnits(valueWei, 18), decimals);
}

export function formatUsdPrice(valueUsd: number): string | null {
  if (!Number.isFinite(valueUsd) || valueUsd < 0) return null;
  if (valueUsd === 0) return "$0.00";
  if (valueUsd < 0.000001) return "<$0.000001";
  const maximumFractionDigits = valueUsd < 0.01 ? 8 : valueUsd < 1 ? 6 : 2;
  return usdFormatter(maximumFractionDigits).format(valueUsd);
}

export function formatUsdCost(valueUsd: number): string | null {
  if (!Number.isFinite(valueUsd) || valueUsd < 0) return null;
  if (valueUsd === 0) return "$0.00";
  if (valueUsd < 0.000001) return "<$0.000001";
  const maximumFractionDigits = valueUsd < 0.01 ? 6 : valueUsd < 1 ? 4 : 2;
  return usdFormatter(maximumFractionDigits).format(valueUsd);
}

export function formatNativeCostUsd({
  valueWei,
  nativeTokenPriceUsd,
}: {
  valueWei: bigint;
  nativeTokenPriceUsd: number | null | undefined;
}): string | null {
  if (
    nativeTokenPriceUsd === null ||
    nativeTokenPriceUsd === undefined ||
    !Number.isFinite(nativeTokenPriceUsd) ||
    nativeTokenPriceUsd < 0
  ) {
    return null;
  }
  return formatUsdCost(Number(formatUnits(valueWei, 18)) * nativeTokenPriceUsd);
}

export function buildTypicalGasTransactions({
  gasPriceWei,
  nativeCurrency,
  nativeTokenPriceUsd,
}: {
  gasPriceWei: bigint;
  nativeCurrency: string;
  nativeTokenPriceUsd?: number | null;
}): TypicalGasTransaction[] {
  return TYPICAL_GAS_TRANSACTIONS.map((transaction) => {
    const costWei = calculateNativeCostWei({
      gasPriceWei,
      gasUnits: transaction.gasUnits,
    });
    return {
      label: transaction.label,
      gasUnits: transaction.gasUnits,
      costNative: formatNativeCost(costWei),
      nativeCurrency,
      costUsd: formatNativeCostUsd({
        valueWei: costWei,
        nativeTokenPriceUsd,
      }),
    };
  });
}

export function formatBlockNumber(value: string | null): string {
  if (!value) return "Unavailable";
  return Number(value).toLocaleString("en-US");
}

export function formatRelativeTime(value: string | null, now = Date.now()): string {
  if (!value) return "Unavailable";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Unavailable";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function trimDecimal(value: string, decimals: number): string {
  const [whole, fraction = ""] = value.split(".");
  if (decimals <= 0 || !fraction) return whole;
  const trimmed = fraction.slice(0, decimals).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

function usdFormatter(maximumFractionDigits: number): Intl.NumberFormat {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });
}
