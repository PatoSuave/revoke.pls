import { describe, expect, it } from "vitest";

import {
  CHAIN_CAPABILITIES,
  CHAIN_CAPABILITY_CHAIN_IDS,
  chainRequiresPreconfirmAwareCopy,
  getChainCapability,
} from "@/lib/chain-capabilities";
import {
  ABSTRACT_CHAIN_ID,
  APECHAIN_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BSC_CHAIN_ID,
  BSC_OSAKA_MAX_TRANSACTION_GAS,
  CELO_CHAIN_ID,
  EIP_7825_MAX_TRANSACTION_GAS,
  FRAXTAL_CHAIN_ID,
  GNOSIS_CHAIN_ID,
  KATANA_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  MONAD_CHAIN_ID,
  MOONBEAM_CHAIN_ID,
  OPBNB_CHAIN_ID,
  PLASMA_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  ROBINHOOD_CHAIN_ID,
  SEI_CHAIN_ID,
  SONIC_CHAIN_ID,
  TAIKO_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
  XDC_CHAIN_ID,
} from "@/lib/chains";
import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "@/lib/arbitrum-approval-client";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";
import {
  HYPEREVM_CORE_WRITER_ADDRESS,
  HYPEREVM_HYPE_SYSTEM_ADDRESS,
  HYPEREVM_WHYPE_ADDRESS,
} from "@/lib/hyperevm-system-contracts";
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
        SONIC_CHAIN_ID,
        AVALANCHE_CHAIN_ID,
        MANTLE_CHAIN_ID,
        LINEA_CHAIN_ID,
        BLAST_CHAIN_ID,
        BERACHAIN_CHAIN_ID,
        CELO_CHAIN_ID,
        GNOSIS_CHAIN_ID,
        UNICHAIN_CHAIN_ID,
        WORLDCHAIN_CHAIN_ID,
        ROBINHOOD_CHAIN_ID,
        MONAD_CHAIN_ID,
        KATANA_CHAIN_ID,
        SEI_CHAIN_ID,
        PLASMA_CHAIN_ID,
        ABSTRACT_CHAIN_ID,
        FRAXTAL_CHAIN_ID,
        TAIKO_CHAIN_ID,
        OPBNB_CHAIN_ID,
        MOONBEAM_CHAIN_ID,
        APECHAIN_CHAIN_ID,
        XDC_CHAIN_ID,
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
    expect(CHAIN_CAPABILITIES[SONIC_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[AVALANCHE_CHAIN_ID].batchRevokeEnabled).toBe(
      true,
    );
    expect(CHAIN_CAPABILITIES[MANTLE_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[LINEA_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[BLAST_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[BERACHAIN_CHAIN_ID].batchRevokeEnabled).toBe(
      true,
    );
    expect(CHAIN_CAPABILITIES[CELO_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[GNOSIS_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[UNICHAIN_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[WORLDCHAIN_CHAIN_ID].batchRevokeEnabled).toBe(
      true,
    );
    expect(CHAIN_CAPABILITIES[ROBINHOOD_CHAIN_ID].batchRevokeEnabled).toBe(
      true,
    );
    expect(CHAIN_CAPABILITIES[MONAD_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[KATANA_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[SEI_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[PLASMA_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[ABSTRACT_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[FRAXTAL_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[TAIKO_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[OPBNB_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[MOONBEAM_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[APECHAIN_CHAIN_ID].batchRevokeEnabled).toBe(true);
    expect(CHAIN_CAPABILITIES[XDC_CHAIN_ID].batchRevokeEnabled).toBe(true);
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
    expect(CHAIN_CAPABILITIES[SONIC_CHAIN_ID].supportsEip7702).toBe("unknown");
    expect(CHAIN_CAPABILITIES[MANTLE_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[LINEA_CHAIN_ID].supportsEip7702).toBe(
      "confirmed",
    );
    expect(CHAIN_CAPABILITIES[BLAST_CHAIN_ID].supportsEip7702).toBe("unknown");
    expect(CHAIN_CAPABILITIES[BERACHAIN_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[CELO_CHAIN_ID].supportsEip7702).toBe(
      "confirmed",
    );
    expect(CHAIN_CAPABILITIES[GNOSIS_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[UNICHAIN_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[WORLDCHAIN_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[ROBINHOOD_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[MONAD_CHAIN_ID].supportsEip7702).toBe("unknown");
    expect(CHAIN_CAPABILITIES[KATANA_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[SEI_CHAIN_ID].supportsEip7702).toBe("unknown");
    expect(CHAIN_CAPABILITIES[PLASMA_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[ABSTRACT_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[FRAXTAL_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[TAIKO_CHAIN_ID].supportsEip7702).toBe("unknown");
    expect(CHAIN_CAPABILITIES[OPBNB_CHAIN_ID].supportsEip7702).toBe("unknown");
    expect(CHAIN_CAPABILITIES[MOONBEAM_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[APECHAIN_CHAIN_ID].supportsEip7702).toBe(
      "unknown",
    );
    expect(CHAIN_CAPABILITIES[XDC_CHAIN_ID].supportsEip7702).toBe("unknown");
  });

  it("records confirmed gas caps as chain metadata", () => {
    expect(
      CHAIN_CAPABILITIES[ETHEREUM_MAINNET_CLIENT_CHAIN_ID].perTxGasCap,
    ).toBe(EIP_7825_MAX_TRANSACTION_GAS);
    expect(CHAIN_CAPABILITIES[BSC_CHAIN_ID].perTxGasCap).toBe(
      BSC_OSAKA_MAX_TRANSACTION_GAS,
    );
    expect(CHAIN_CAPABILITIES[BASE_CHAIN_ID].perTxGasCap).toBe(
      EIP_7825_MAX_TRANSACTION_GAS,
    );
    expect(CHAIN_CAPABILITIES[BASE_CHAIN_ID].hasPerTxGasMaximum).toBe(true);
    expect(CHAIN_CAPABILITIES[POLYGON_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[SONIC_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[AVALANCHE_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[MANTLE_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[LINEA_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[BLAST_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[BERACHAIN_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[CELO_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[GNOSIS_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[UNICHAIN_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(
      CHAIN_CAPABILITIES[WORLDCHAIN_CHAIN_ID].perTxGasCap,
    ).toBeUndefined();
    expect(
      CHAIN_CAPABILITIES[ROBINHOOD_CHAIN_ID].perTxGasCap,
    ).toBeUndefined();
    expect(CHAIN_CAPABILITIES[MONAD_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[KATANA_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[SEI_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[PLASMA_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[ABSTRACT_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[FRAXTAL_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[TAIKO_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[OPBNB_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[MOONBEAM_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[APECHAIN_CHAIN_ID].perTxGasCap).toBeUndefined();
    expect(CHAIN_CAPABILITIES[XDC_CHAIN_ID].perTxGasCap).toBeUndefined();
  });

  it("records planned gas caps without treating them as active caps", () => {
    for (const chainId of [OPTIMISM_CLIENT_CHAIN_ID, UNICHAIN_CHAIN_ID]) {
      expect(CHAIN_CAPABILITIES[chainId].plannedPerTxGasCap).toBe(true);
      expect(CHAIN_CAPABILITIES[chainId].plannedPerTxGasCapValue).toBe(
        EIP_7825_MAX_TRANSACTION_GAS,
      );
      expect(CHAIN_CAPABILITIES[chainId].perTxGasCap).toBeUndefined();
    }
  });

  it("records RPC and explorer reliability flags from the capability refresh", () => {
    expect(CHAIN_CAPABILITIES[AVALANCHE_CHAIN_ID].rpcBatchLimit).toBe(40);
    expect(CHAIN_CAPABILITIES[AVALANCHE_CHAIN_ID].websocketSupport).toBe("yes");
    expect(CHAIN_CAPABILITIES[POLYGON_CHAIN_ID].requiresChunkedLogs).toBe(true);
    expect(CHAIN_CAPABILITIES[GNOSIS_CHAIN_ID].requiresChunkedLogs).toBe(true);
    expect(CHAIN_CAPABILITIES[MANTLE_CHAIN_ID].supportsEstimateTotalFee).toBe(
      true,
    );
    expect(CHAIN_CAPABILITIES[CELO_CHAIN_ID].supportsCustomFeeCurrency).toBe(
      true,
    );
    expect(CHAIN_CAPABILITIES[WORLDCHAIN_CHAIN_ID].mayUsePaymasters).toBe(true);
    expect(CHAIN_CAPABILITIES[WORLDCHAIN_CHAIN_ID].gasLimit).toBe(80_000_000n);
    expect(CHAIN_CAPABILITIES[WORLDCHAIN_CHAIN_ID].gasTarget).toBe(40_000_000n);
    expect(CHAIN_CAPABILITIES[TAIKO_CHAIN_ID].websocketSupport).toBe("yes");
    expect(CHAIN_CAPABILITIES[MOONBEAM_CHAIN_ID].websocketSupport).toBe("yes");
    expect(CHAIN_CAPABILITIES[APECHAIN_CHAIN_ID].websocketSupport).toBe("yes");
  });

  it("identifies preconfirmation-aware chains for receipt copy", () => {
    expect(chainRequiresPreconfirmAwareCopy(BASE_CHAIN_ID)).toBe(true);
    expect(chainRequiresPreconfirmAwareCopy(UNICHAIN_CHAIN_ID)).toBe(true);
    expect(chainRequiresPreconfirmAwareCopy(OPTIMISM_CLIENT_CHAIN_ID)).toBe(
      true,
    );
    expect(chainRequiresPreconfirmAwareCopy(BSC_CHAIN_ID)).toBe(false);
    expect(getChainCapability(123456)).toBeUndefined();
  });

  it("records L2 and HyperEVM confirmation strategies", () => {
    for (const chainId of [
      MANTLE_CHAIN_ID,
      LINEA_CHAIN_ID,
      BLAST_CHAIN_ID,
      WORLDCHAIN_CHAIN_ID,
      ROBINHOOD_CHAIN_ID,
      KATANA_CHAIN_ID,
      ABSTRACT_CHAIN_ID,
      FRAXTAL_CHAIN_ID,
      TAIKO_CHAIN_ID,
      OPBNB_CHAIN_ID,
      APECHAIN_CHAIN_ID,
    ]) {
      expect(CHAIN_CAPABILITIES[chainId].confirmationStrategy).toBe(
        "rollup-safe-finalized-aware",
      );
    }

    expect(CHAIN_CAPABILITIES[HYPEREVM_CLIENT_CHAIN_ID].confirmationStrategy).toBe(
      "hyperevm-dual-block-awareness",
    );
  });

  it("reuses existing HyperEVM system contract metadata", () => {
    const contracts =
      CHAIN_CAPABILITIES[HYPEREVM_CLIENT_CHAIN_ID].systemContracts ?? [];
    const addresses = contracts.map((contract) => contract.address);

    expect(addresses).toEqual(
      expect.arrayContaining([
        HYPEREVM_CORE_WRITER_ADDRESS,
        HYPEREVM_HYPE_SYSTEM_ADDRESS,
        HYPEREVM_WHYPE_ADDRESS,
      ]),
    );
    expect(contracts.map((contract) => contract.label).join(" ")).not.toMatch(
      /\b(safe|trusted|guaranteed)\b/i,
    );
  });
});
