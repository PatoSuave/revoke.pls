import { describe, expect, it } from "vitest";

import {
  CHAIN_CAPABILITIES,
  CHAIN_CAPABILITY_CHAIN_IDS,
  chainRequiresPreconfirmAwareCopy,
  getChainCapability,
} from "@/lib/chain-capabilities";
import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  BSC_OSAKA_MAX_TRANSACTION_GAS,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
} from "@/lib/chains";
import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "@/lib/arbitrum-approval-client";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";
import { HYPEREVM_CLIENT_CHAIN_ID } from "@/lib/hyperevm-approval-client";
import { OPTIMISM_CLIENT_CHAIN_ID } from "@/lib/optimism-approval-client";

describe("chain capability metadata", () => {
  it("covers every live Pulse Revoke chain", () => {
    expect([...CHAIN_CAPABILITY_CHAIN_IDS].sort((a, b) => a - b)).toEqual(
      [
        ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        OPTIMISM_CLIENT_CHAIN_ID,
        BSC_CHAIN_ID,
        POLYGON_CHAIN_ID,
        AVALANCHE_CHAIN_ID,
        MANTLE_CHAIN_ID,
        PULSECHAIN_CHAIN_ID,
        BASE_CHAIN_ID,
        HYPEREVM_CLIENT_CHAIN_ID,
        ARBITRUM_ONE_CLIENT_CHAIN_ID,
      ].sort((a, b) => a - b),
    );
  });

  it("keeps conservative batch revoke availability", () => {
    expect(
      CHAIN_CAPABILITIES[ARBITRUM_ONE_CLIENT_CHAIN_ID].batchRevokeEnabled,
    ).toBe(false);
    expect(CHAIN_CAPABILITIES[OPTIMISM_CLIENT_CHAIN_ID].batchRevokeEnabled).toBe(
      false,
    );
    expect(CHAIN_CAPABILITIES[HYPEREVM_CLIENT_CHAIN_ID].batchRevokeEnabled).toBe(
      false,
    );
    expect(CHAIN_CAPABILITIES[BSC_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[AVALANCHE_CHAIN_ID].batchRevokeEnabled).toBe(
      true,
    );
    expect(CHAIN_CAPABILITIES[MANTLE_CHAIN_ID].batchRevokeEnabled).toBe(true);
  });

  it("records EIP-7702 support without overclaiming unknown chains", () => {
    expect(
      CHAIN_CAPABILITIES[ETHEREUM_MAINNET_CLIENT_CHAIN_ID].supportsEip7702,
    ).toBe("confirmed");
    expect(CHAIN_CAPABILITIES[BSC_CHAIN_ID].supportsEip7702).toBe("confirmed");
    expect(CHAIN_CAPABILITIES[PULSECHAIN_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[HYPEREVM_CLIENT_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[AVALANCHE_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[MANTLE_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
  });

  it("records confirmed gas caps as chain metadata", () => {
    expect(CHAIN_CAPABILITIES[BSC_CHAIN_ID].perTxGasCap).toBe(
      BSC_OSAKA_MAX_TRANSACTION_GAS,
    );
    expect(CHAIN_CAPABILITIES[BASE_CHAIN_ID].perTxGasCap).toBe(
      BSC_OSAKA_MAX_TRANSACTION_GAS,
    );
    expect(CHAIN_CAPABILITIES[BASE_CHAIN_ID].hasPerTxGasMaximum).toBe(true);
    expect(CHAIN_CAPABILITIES[POLYGON_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[AVALANCHE_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[MANTLE_CHAIN_ID].perTxGasCap).toBeUndefined();
  });

  it("identifies preconfirmation-aware chains for receipt copy", () => {
    expect(chainRequiresPreconfirmAwareCopy(BASE_CHAIN_ID)).toBe(true);
    expect(chainRequiresPreconfirmAwareCopy(OPTIMISM_CLIENT_CHAIN_ID)).toBe(
      true,
    );
    expect(chainRequiresPreconfirmAwareCopy(BSC_CHAIN_ID)).toBe(false);
    expect(getChainCapability(123456)).toBeUndefined();
  });
});
