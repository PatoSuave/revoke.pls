import { describe, expect, it } from "vitest";

import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  getSupportedChainShortNames,
  isSupportedChainId,
} from "@/lib/chains";
import { resolveActiveChain, scannerSessionKey } from "./active-chain";

describe("active chain resolution", () => {
  it("resolves a connected PulseChain wallet to PulseChain", () => {
    const result = resolveActiveChain({
      isConnected: true,
      walletChainId: PULSECHAIN_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });

    expect(result.status).toBe("supported");
    expect(result.activeChainId).toBe(PULSECHAIN_CHAIN_ID);
    expect(result.activeChainConfig?.displayName).toBe("PulseChain");
    expect(result.walletMatchesActiveChain).toBe(true);
  });

  it("resolves a connected BSC wallet to BSC", () => {
    const result = resolveActiveChain({
      isConnected: true,
      walletChainId: BSC_CHAIN_ID,
      wagmiChainId: BSC_CHAIN_ID,
    });

    expect(result.status).toBe("supported");
    expect(result.activeChainId).toBe(BSC_CHAIN_ID);
    expect(result.activeChainConfig?.shortName).toBe("BSC");
    expect(result.walletMatchesActiveChain).toBe(true);
  });

  it("resolves a connected Base wallet to Base without falling back to PulseChain", () => {
    const result = resolveActiveChain({
      isConnected: true,
      walletChainId: BASE_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });

    expect(result.status).toBe("supported");
    expect(result.activeChainId).toBe(BASE_CHAIN_ID);
    expect(result.activeChainConfig?.displayName).toBe("Base");
    expect(result.walletMatchesActiveChain).toBe(true);
  });

  it("resolves a connected Polygon wallet to Polygon without falling back to PulseChain", () => {
    const result = resolveActiveChain({
      isConnected: true,
      walletChainId: POLYGON_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });

    expect(result.status).toBe("supported");
    expect(result.activeChainId).toBe(POLYGON_CHAIN_ID);
    expect(result.activeChainConfig?.displayName).toBe("Polygon");
    expect(result.walletMatchesActiveChain).toBe(true);
  });

  it("resolves connected Avalanche and Mantle wallets without falling back to PulseChain", () => {
    const avalancheResult = resolveActiveChain({
      isConnected: true,
      walletChainId: AVALANCHE_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const mantleResult = resolveActiveChain({
      isConnected: true,
      walletChainId: MANTLE_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });

    expect(avalancheResult.status).toBe("supported");
    expect(avalancheResult.activeChainId).toBe(AVALANCHE_CHAIN_ID);
    expect(avalancheResult.activeChainConfig?.displayName).toBe(
      "Avalanche C-Chain",
    );
    expect(mantleResult.status).toBe("supported");
    expect(mantleResult.activeChainId).toBe(MANTLE_CHAIN_ID);
    expect(mantleResult.activeChainConfig?.displayName).toBe("Mantle");
  });

  it("does not default to PulseChain when disconnected", () => {
    const result = resolveActiveChain({
      isConnected: false,
      walletChainId: undefined,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });

    expect(result.status).toBe("disconnected");
    expect(result.activeChainId).toBeUndefined();
    expect(result.activeChainConfig).toBeUndefined();
  });

  it("treats unsupported wallet chains as unsupported", () => {
    const result = resolveActiveChain({
      isConnected: true,
      walletChainId: 1,
      wagmiChainId: 1,
    });

    expect(result.status).toBe("unsupported");
    expect(result.activeChainId).toBeUndefined();
    expect(result.walletChainSupported).toBe(false);
    expect(result.walletMatchesActiveChain).toBe(false);
    expect(isSupportedChainId(1)).toBe(false);
  });

  it("uses all generic supported chains in supported-network copy", () => {
    expect(getSupportedChainShortNames()).toBe(
      "PulseChain, BSC, Base, Polygon, Avalanche, or Mantle",
    );
  });

  it("changes scanner session keys when the wallet chain changes", () => {
    const owner = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

    expect(scannerSessionKey(owner, PULSECHAIN_CHAIN_ID)).not.toBe(
      scannerSessionKey(owner, BASE_CHAIN_ID),
    );
    expect(scannerSessionKey(owner, BSC_CHAIN_ID)).not.toBe(
      scannerSessionKey(owner, BASE_CHAIN_ID),
    );
  });
});
