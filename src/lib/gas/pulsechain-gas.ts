import {
  DEFAULT_GAS_TRACKER_CHAIN_ID,
  getGasTrackerChainConfig,
} from "@/lib/gas/gas-chains";
import {
  fetchEvmGasSample,
  fetchGasData,
  resolveGasRpcUrl,
  unavailableGasResponseForChain,
  type EvmGasSample,
  type GasRpcOptions,
} from "@/lib/gas/evm-gas";
import type { GasApiResponse } from "@/lib/gas/gas-types";

const pulsechainGasConfig = getRequiredPulseChainGasConfig();

export async function fetchPulseChainGasData(
  options: GasRpcOptions = {},
): Promise<GasApiResponse> {
  return fetchGasData(pulsechainGasConfig, options);
}

export function resolvePulseChainGasRpcUrl(): string {
  return resolveGasRpcUrl(pulsechainGasConfig);
}

export async function fetchPulseChainGasSample(
  options: GasRpcOptions = {},
): Promise<EvmGasSample> {
  return fetchEvmGasSample(pulsechainGasConfig, options);
}

export function unavailableGasResponse(
  updatedAt = new Date().toISOString(),
  errors: string[] = ["PulseChain gas data is unavailable."],
): GasApiResponse {
  return unavailableGasResponseForChain(pulsechainGasConfig, updatedAt, errors);
}

function getRequiredPulseChainGasConfig() {
  const config = getGasTrackerChainConfig(DEFAULT_GAS_TRACKER_CHAIN_ID);
  if (!config) throw new Error("PulseChain gas config is missing.");
  return config;
}
