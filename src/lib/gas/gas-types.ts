export const PULSECHAIN_GAS_CHAIN_ID = 369;
export const PULSECHAIN_GAS_CHAIN_NAME = "PulseChain";
export const PULSECHAIN_GAS_NATIVE_CURRENCY = "PLS";

export type GasDataSource =
  | "rpc-fee-history"
  | "rpc-gas-price"
  | "unavailable";

export type GasStatus = "normal" | "elevated" | "high" | "unavailable";

export interface GasAdvisoryTier {
  label: "Low" | "Medium" | "High";
  acceptance: number;
  gasPriceGwei: string;
}

export interface GasAdvisory {
  provider: "owlracle";
  updatedAt: string;
  avgBlockTimeSeconds: number | null;
  avgTransactionsPerBlock: number | null;
  tiers: GasAdvisoryTier[];
}

export interface TypicalGasTransaction {
  label: string;
  gasUnits: number;
  costNative: string;
  nativeCurrency: string;
}

export interface GasApiResponse {
  chainId: number;
  chainName: string;
  nativeCurrency: string;
  blockNumber: string | null;
  source: GasDataSource;
  status: GasStatus;
  updatedAt: string;
  available: boolean;
  gasPriceGwei: string | null;
  baseFeeGwei: string | null;
  priorityFeeGwei: string | null;
  typicalTransactions: TypicalGasTransaction[];
  estimateNote?: string;
  advisory?: GasAdvisory;
  errors?: string[];
}

export interface GasChartSample {
  blockNumber: string;
  gasPriceGwei: number;
  updatedAt: string;
  status: GasStatus;
}
