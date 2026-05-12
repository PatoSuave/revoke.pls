import { describe, expect, it } from "vitest";

import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "@/lib/arbitrum-approval-client";
import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  supportedChainConfigList,
} from "@/lib/chains";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";
import {
  ARBITRUM_HEADER_STATUS_LABEL,
  resolveHeaderNetworkStatus,
} from "@/lib/wallet-network-status";

describe("wallet header network status", () => {
  it("shows Arbitrum One as ERC-20 beta instead of unsupported", () => {
    const status = resolveHeaderNetworkStatus({
      walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
      wagmiChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    });

    expect(status.kind).toBe("arbitrum");
    expect(status.label).toBe(ARBITRUM_HEADER_STATUS_LABEL);
    expect(JSON.stringify(status)).not.toContain("Unsupported network");
    expect(status).toMatchObject({
      helper:
        "Verified ERC-20 rows can be revoked on Arbitrum. NFT and batch revoke are not enabled.",
    });
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
      ]);
    }
  });

  it("keeps Ethereum header behavior on the existing special lane", () => {
    const status = resolveHeaderNetworkStatus({
      walletChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      wagmiChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    });

    expect(status.kind).toBe("ethereum");
    expect(status.label).toBe("Ethereum Mainnet");
  });

  it("keeps PulseChain, BSC, and Base as generic supported product chains", () => {
    expect(
      [PULSECHAIN_CHAIN_ID, BSC_CHAIN_ID, BASE_CHAIN_ID].map((chainId) =>
        resolveHeaderNetworkStatus({
          walletChainId: chainId,
          wagmiChainId: chainId,
        }),
      ),
    ).toEqual([
      expect.objectContaining({ kind: "supported", label: "PulseChain" }),
      expect.objectContaining({ kind: "supported", label: "BNB Smart Chain" }),
      expect.objectContaining({ kind: "supported", label: "Base" }),
    ]);
  });

  it("keeps Arbitrum out of the generic supported chain config list", () => {
    expect(supportedChainConfigList.map((chain) => chain.chainId)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
    ]);
    expect(supportedChainConfigList.map((chain) => chain.chainId)).not.toContain(
      ARBITRUM_ONE_CLIENT_CHAIN_ID,
    );
  });
});
