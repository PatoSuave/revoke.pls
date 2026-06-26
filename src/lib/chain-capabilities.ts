import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BSC_CHAIN_ID,
  BSC_OSAKA_MAX_TRANSACTION_GAS,
  CELO_CHAIN_ID,
  EIP_7825_MAX_TRANSACTION_GAS,
  GNOSIS_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  SONIC_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
} from "@/lib/chains";
import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "@/lib/arbitrum-approval-client";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";
import { HYPEREVM_CLIENT_CHAIN_ID } from "@/lib/hyperevm-approval-client";
import { OPTIMISM_CLIENT_CHAIN_ID } from "@/lib/optimism-approval-client";

export type Eip7702Support = "confirmed" | "unknown" | "unsupported";
export type WebsocketSupport = "yes" | "no" | "flashblocks" | "unknown";
export type ConfirmationStrategy =
  | "receipt-plus-live-recheck"
  | "preconfirm-aware-receipt-plus-live-recheck";

export interface ChainCapability {
  chainId: number;
  name: string;
  supportsEip7702: Eip7702Support;
  batchRevokeEnabled: boolean;
  websocketSupport: WebsocketSupport;
  confirmationStrategy: ConfirmationStrategy;
  perTxGasCap?: bigint;
  hasPerTxGasMaximum?: boolean;
  plannedPerTxGasCap?: boolean;
  plannedGasCapEffectiveAfter?: string;
  notes: readonly string[];
}

export const CHAIN_CAPABILITIES: Record<number, ChainCapability> = {
  [ETHEREUM_MAINNET_CLIENT_CHAIN_ID]: {
    chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    name: "Ethereum Mainnet",
    supportsEip7702: "confirmed",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    perTxGasCap: EIP_7825_MAX_TRANSACTION_GAS,
    notes: [
      "Ethereum Pectra activated EIP-7702 on mainnet.",
      "Ethereum Fusaka/EIP-7825 enforces a 16,777,216 gas per-transaction cap.",
    ],
  },
  [BSC_CHAIN_ID]: {
    chainId: BSC_CHAIN_ID,
    name: "BNB Smart Chain",
    supportsEip7702: "confirmed",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    perTxGasCap: BSC_OSAKA_MAX_TRANSACTION_GAS,
    notes: [
      "BSC Pascal added EIP-7702 compatibility.",
      "BSC Mendel adds a 16,777,216 gas per-transaction cap.",
    ],
  },
  [BASE_CHAIN_ID]: {
    chainId: BASE_CHAIN_ID,
    name: "Base",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "flashblocks",
    confirmationStrategy: "preconfirm-aware-receipt-plus-live-recheck",
    perTxGasCap: EIP_7825_MAX_TRANSACTION_GAS,
    hasPerTxGasMaximum: true,
    notes: [
      "Base Flashblocks can expose fast preconfirmation signals.",
      "Final revoke state still requires receipt and live re-check.",
    ],
  },
  [POLYGON_CHAIN_ID]: {
    chainId: POLYGON_CHAIN_ID,
    name: "Polygon",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: ["Use standard RPC methods where possible."],
  },
  [SONIC_CHAIN_ID]: {
    chainId: SONIC_CHAIN_ID,
    name: "Sonic Mainnet",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: ["Use standard RPC methods where possible."],
  },
  [AVALANCHE_CHAIN_ID]: {
    chainId: AVALANCHE_CHAIN_ID,
    name: "Avalanche C-Chain",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: ["Use standard RPC methods where possible."],
  },
  [MANTLE_CHAIN_ID]: {
    chainId: MANTLE_CHAIN_ID,
    name: "Mantle",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: [
      "Mantle wallet estimates may include L1 data fees beyond gas-price estimates.",
    ],
  },
  [LINEA_CHAIN_ID]: {
    chainId: LINEA_CHAIN_ID,
    name: "Linea",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: [
      "Linea wallet estimates may include L1 data fees beyond gas-price estimates.",
      "Use standard RPC methods where possible.",
    ],
  },
  [BLAST_CHAIN_ID]: {
    chainId: BLAST_CHAIN_ID,
    name: "Blast",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: [
      "Blast wallet estimates may include L1 data fees beyond gas-price estimates.",
      "Use standard RPC methods where possible.",
    ],
  },
  [BERACHAIN_CHAIN_ID]: {
    chainId: BERACHAIN_CHAIN_ID,
    name: "Berachain",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: ["Use standard RPC methods where possible."],
  },
  [CELO_CHAIN_ID]: {
    chainId: CELO_CHAIN_ID,
    name: "Celo",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: ["Use standard RPC methods where possible."],
  },
  [GNOSIS_CHAIN_ID]: {
    chainId: GNOSIS_CHAIN_ID,
    name: "Gnosis",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: ["Use standard RPC methods where possible."],
  },
  [UNICHAIN_CHAIN_ID]: {
    chainId: UNICHAIN_CHAIN_ID,
    name: "Unichain",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: [
      "Unichain wallet estimates may include L1 data fees beyond gas-price estimates.",
      "Use standard RPC methods where possible.",
    ],
  },
  [WORLDCHAIN_CHAIN_ID]: {
    chainId: WORLDCHAIN_CHAIN_ID,
    name: "World Chain",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: [
      "World Chain wallet estimates may include L1 data fees beyond gas-price estimates.",
      "Use standard RPC methods where possible.",
    ],
  },
  [ARBITRUM_ONE_CLIENT_CHAIN_ID]: {
    chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    name: "Arbitrum One",
    supportsEip7702: "unknown",
    batchRevokeEnabled: false,
    websocketSupport: "no",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: [
      "Public RPC websockets are not supported.",
      "Gas pricing assumptions should remain chain-specific.",
    ],
  },
  [OPTIMISM_CLIENT_CHAIN_ID]: {
    chainId: OPTIMISM_CLIENT_CHAIN_ID,
    name: "Optimism",
    supportsEip7702: "unknown",
    batchRevokeEnabled: false,
    websocketSupport: "flashblocks",
    confirmationStrategy: "preconfirm-aware-receipt-plus-live-recheck",
    plannedPerTxGasCap: true,
    plannedGasCapEffectiveAfter: "2026-07-08-if-approved",
    notes: [
      "Karst/Upgrade 19 includes planned per-transaction gas cap behavior.",
      "Flashblocks should not be treated as final revoke confirmation.",
    ],
  },
  [HYPEREVM_CLIENT_CHAIN_ID]: {
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    name: "HyperEVM",
    supportsEip7702: "unknown",
    batchRevokeEnabled: false,
    websocketSupport: "no",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: [
      "Official HyperEVM RPC has no websocket JSON-RPC support.",
      "HyperCore actions may not appear as standard token approvals.",
    ],
  },
  [PULSECHAIN_CHAIN_ID]: {
    chainId: PULSECHAIN_CHAIN_ID,
    name: "PulseChain",
    supportsEip7702: "unknown",
    batchRevokeEnabled: true,
    websocketSupport: "unknown",
    confirmationStrategy: "receipt-plus-live-recheck",
    notes: ["Monitor go-pulse releases for confirmed EIP support."],
  },
};

export const CHAIN_CAPABILITY_CHAIN_IDS = Object.keys(CHAIN_CAPABILITIES).map(
  Number,
) as readonly number[];

export function getChainCapability(
  chainId: number | undefined,
): ChainCapability | undefined {
  if (chainId === undefined) return undefined;
  return CHAIN_CAPABILITIES[chainId];
}

export function chainRequiresPreconfirmAwareCopy(
  chainId: number | undefined,
): boolean {
  return (
    getChainCapability(chainId)?.confirmationStrategy ===
    "preconfirm-aware-receipt-plus-live-recheck"
  );
}
