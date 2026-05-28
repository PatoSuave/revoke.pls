import type { GasStatus } from "@/lib/gas/gas-types";

export interface GasStatusThresholds {
  elevatedGwei: number;
  highGwei: number;
}

export const PULSECHAIN_GAS_STATUS_THRESHOLDS: GasStatusThresholds = {
  elevatedGwei: 750_000,
  highGwei: 2_000_000,
};

export function classifyGasStatus({
  gasPriceGwei,
  thresholds = PULSECHAIN_GAS_STATUS_THRESHOLDS,
}: {
  gasPriceGwei: number | null | undefined;
  thresholds?: GasStatusThresholds;
}): GasStatus {
  if (
    gasPriceGwei === null ||
    gasPriceGwei === undefined ||
    !Number.isFinite(gasPriceGwei) ||
    gasPriceGwei < 0
  ) {
    return "unavailable";
  }
  if (gasPriceGwei >= thresholds.highGwei) return "high";
  if (gasPriceGwei >= thresholds.elevatedGwei) return "elevated";
  return "normal";
}

export function gasStatusLabel(status: GasStatus): string {
  if (status === "normal") return "Normal";
  if (status === "elevated") return "Elevated";
  if (status === "high") return "High";
  return "Unavailable";
}

export function gasStatusCopy(status: GasStatus, chainName = "this network"): string {
  if (status === "normal") return `Gas is in the lower ${chainName} range.`;
  if (status === "elevated") return `Gas is in the medium ${chainName} range.`;
  if (status === "high") return `Gas is unusually high for ${chainName}.`;
  return `${chainName} gas data is unavailable right now.`;
}

export function gasStatusChartColor(status: GasStatus): string {
  if (status === "normal") return "#00e5a0";
  if (status === "elevated") return "#fbbf24";
  if (status === "high") return "#ff4d6d";
  return "#8a8db8";
}
