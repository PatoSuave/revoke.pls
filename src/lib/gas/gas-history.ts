import type { GasApiResponse, GasChartSample } from "@/lib/gas/gas-types";

export const DEFAULT_GAS_HISTORY_LIMIT = 45;

export function appendGasHistorySample({
  history,
  sample,
  limit = DEFAULT_GAS_HISTORY_LIMIT,
}: {
  history: readonly GasChartSample[];
  sample: GasApiResponse;
  limit?: number;
}): GasChartSample[] {
  if (!sample.available || !sample.blockNumber || !sample.gasPriceGwei) {
    return [...history];
  }

  const gasPriceGwei = Number(sample.gasPriceGwei);
  if (!Number.isFinite(gasPriceGwei)) return [...history];

  const next: GasChartSample = {
    blockNumber: sample.blockNumber,
    gasPriceGwei,
    updatedAt: sample.updatedAt,
    status: sample.status,
  };
  const deduped = history.filter(
    (entry) => entry.blockNumber !== next.blockNumber,
  );
  return [...deduped, next].slice(-Math.max(1, limit));
}
