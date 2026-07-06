import { describe, expect, it } from "vitest";

import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "@/lib/arbitrum-approval-client";
import {
  ABSTRACT_CHAIN_ID,
  APECHAIN_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BSC_CHAIN_ID,
  CELO_CHAIN_ID,
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
  supportedChainConfigList,
} from "@/lib/chains";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";
import { HYPEREVM_CLIENT_CHAIN_ID } from "@/lib/hyperevm-approval-client";
import {
  ARBITRUM_HEADER_STATUS_LABEL,
  ARBITRUM_HEADER_STATUS_SHORT_HELPER,
  HYPEREVM_HEADER_STATUS_LABEL,
  HYPEREVM_HEADER_STATUS_SHORT_HELPER,
  OPTIMISM_HEADER_STATUS_LABEL,
  OPTIMISM_HEADER_STATUS_SHORT_HELPER,
  resolveHeaderNetworkStatus,
} from "@/lib/wallet-network-status";
import { OPTIMISM_CLIENT_CHAIN_ID } from "@/lib/optimism-approval-client";

describe("wallet header network status", () => {
  it("shows Arbitrum One as verified-row instead of unsupported", () => {
    const status = resolveHeaderNetworkStatus({
      walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
      wagmiChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    });

    expect(status.kind).toBe("arbitrum");
    expect(status.label).toBe(ARBITRUM_HEADER_STATUS_LABEL);
    expect(JSON.stringify(status)).not.toContain("Unsupported network");
    expect(status).toMatchObject({
      shortHelper: ARBITRUM_HEADER_STATUS_SHORT_HELPER,
      helper:
        "Verified ERC-20 and NFT rows can be revoked on Arbitrum. Batch revoke is not enabled.",
    });
    expect(ARBITRUM_HEADER_STATUS_LABEL).toBe("Arbitrum One");
    expect(ARBITRUM_HEADER_STATUS_SHORT_HELPER).toBe("Verified rows only. Batch off.");
  });

  it("keeps truly unsupported chains unsupported", () => {
    const status = resolveHeaderNetworkStatus({
      walletChainId: 999999,
      wagmiChainId: 999999,
    });

    expect(status.kind).toBe("unsupported");
    expect(status.label).toBe("Unsupported network");
    if (status.kind === "unsupported") {
      expect(status.switchChains.map((chain) => chain.chainId)).toEqual([
        PULSECHAIN_CHAIN_ID,
        BSC_CHAIN_ID,
        BASE_CHAIN_ID,
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
        ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        ARBITRUM_ONE_CLIENT_CHAIN_ID,
        OPTIMISM_CLIENT_CHAIN_ID,
        HYPEREVM_CLIENT_CHAIN_ID,
      ]);
    }
  });

  it("shows Optimism as verified-row revoke instead of unsupported", () => {
    const status = resolveHeaderNetworkStatus({
      walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
      wagmiChainId: OPTIMISM_CLIENT_CHAIN_ID,
    });

    expect(status.kind).toBe("optimism");
    expect(status.label).toBe(OPTIMISM_HEADER_STATUS_LABEL);
    expect(JSON.stringify(status)).not.toContain("Unsupported network");
    expect(status).toMatchObject({
      shortHelper: OPTIMISM_HEADER_STATUS_SHORT_HELPER,
      helper:
        "Verified ERC-20 and NFT rows can be revoked on Optimism. Batch revoke is not enabled.",
    });
    expect(OPTIMISM_HEADER_STATUS_LABEL).toBe("Optimism");
    expect(OPTIMISM_HEADER_STATUS_SHORT_HELPER).toBe("Verified rows only. Batch off.");
  });

  it("shows HyperEVM as verified-row revoke instead of unsupported", () => {
    const status = resolveHeaderNetworkStatus({
      walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
      wagmiChainId: HYPEREVM_CLIENT_CHAIN_ID,
    });

    expect(status.kind).toBe("hyperevm");
    expect(status.label).toBe(HYPEREVM_HEADER_STATUS_LABEL);
    expect(JSON.stringify(status)).not.toContain("Unsupported network");
    expect(status).toMatchObject({
      shortHelper: HYPEREVM_HEADER_STATUS_SHORT_HELPER,
      helper:
        "Verified ERC-20 and NFT rows can be revoked on HyperEVM. Batch revoke is not enabled.",
    });
    expect(HYPEREVM_HEADER_STATUS_LABEL).toBe("HyperEVM");
    expect(HYPEREVM_HEADER_STATUS_SHORT_HELPER).toBe("Verified rows only. Batch off.");
  });

  it("keeps Ethereum header behavior on the existing special lane", () => {
    const status = resolveHeaderNetworkStatus({
      walletChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      wagmiChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    });

    expect(status.kind).toBe("ethereum");
    expect(status.label).toBe("Ethereum Mainnet");
  });

  it("keeps the generic scanner chains as supported product chains", () => {
    expect(
      [
        PULSECHAIN_CHAIN_ID,
        BSC_CHAIN_ID,
        BASE_CHAIN_ID,
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
      ].map((chainId) =>
        resolveHeaderNetworkStatus({
          walletChainId: chainId,
          wagmiChainId: chainId,
        }),
      ),
    ).toEqual([
      expect.objectContaining({ kind: "supported", label: "PulseChain" }),
      expect.objectContaining({ kind: "supported", label: "BNB Smart Chain" }),
      expect.objectContaining({ kind: "supported", label: "Base" }),
      expect.objectContaining({ kind: "supported", label: "Polygon" }),
      expect.objectContaining({ kind: "supported", label: "Sonic Mainnet" }),
      expect.objectContaining({ kind: "supported", label: "Avalanche C-Chain" }),
      expect.objectContaining({ kind: "supported", label: "Mantle" }),
      expect.objectContaining({ kind: "supported", label: "Linea" }),
      expect.objectContaining({ kind: "supported", label: "Blast" }),
      expect.objectContaining({ kind: "supported", label: "Berachain" }),
      expect.objectContaining({ kind: "supported", label: "Celo" }),
      expect.objectContaining({ kind: "supported", label: "Gnosis" }),
      expect.objectContaining({ kind: "supported", label: "Unichain" }),
      expect.objectContaining({ kind: "supported", label: "World Chain" }),
      expect.objectContaining({ kind: "supported", label: "Robinhood Chain" }),
      expect.objectContaining({ kind: "supported", label: "Monad" }),
      expect.objectContaining({ kind: "supported", label: "Katana" }),
      expect.objectContaining({ kind: "supported", label: "Sei" }),
      expect.objectContaining({ kind: "supported", label: "Plasma" }),
      expect.objectContaining({ kind: "supported", label: "Abstract" }),
      expect.objectContaining({ kind: "supported", label: "Fraxtal" }),
      expect.objectContaining({ kind: "supported", label: "Taiko Mainnet" }),
      expect.objectContaining({ kind: "supported", label: "opBNB" }),
      expect.objectContaining({ kind: "supported", label: "Moonbeam" }),
      expect.objectContaining({ kind: "supported", label: "ApeChain" }),
      expect.objectContaining({ kind: "supported", label: "XDC Network" }),
    ]);
  });

  it("keeps Arbitrum, Optimism, and HyperEVM out of the generic supported chain config list", () => {
    expect(supportedChainConfigList.map((chain) => chain.chainId)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
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
    ]);
    expect(supportedChainConfigList.map((chain) => chain.chainId)).not.toContain(
      ARBITRUM_ONE_CLIENT_CHAIN_ID,
    );
    expect(supportedChainConfigList.map((chain) => chain.chainId)).not.toContain(
      OPTIMISM_CLIENT_CHAIN_ID,
    );
    expect(supportedChainConfigList.map((chain) => chain.chainId)).not.toContain(
      HYPEREVM_CLIENT_CHAIN_ID,
    );
  });
});
