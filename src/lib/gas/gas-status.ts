import type { GasStatus } from "@/lib/gas/gas-types";

export interface GasStatusThresholds {
  elevatedGwei: number;
  highGwei: number;
}

export const PULSECHAIN_GAS_STATUS_THRESHOLDS: GasStatusThresholds = {
  elevatedGwei: 250_000,
  highGwei: 750_000,
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

export function gasStatusCopy(status: GasStatus): string {
  if (status === "normal") return "Gas is within the current PulseChain range.";
  if (status === "elevated") return "Gas is higher than the PulseChain baseline.";
  if (status === "high") return "Gas is unusually high for PulseChain.";
  return "PulseChain gas data is unavailable right now.";
}
