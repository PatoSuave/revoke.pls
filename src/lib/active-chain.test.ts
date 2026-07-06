import { describe, expect, it } from "vitest";

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

  it("resolves connected generic EVM wallets without falling back to PulseChain", () => {
    const sonicResult = resolveActiveChain({
      isConnected: true,
      walletChainId: SONIC_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
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
    const lineaResult = resolveActiveChain({
      isConnected: true,
      walletChainId: LINEA_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const blastResult = resolveActiveChain({
      isConnected: true,
      walletChainId: BLAST_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const berachainResult = resolveActiveChain({
      isConnected: true,
      walletChainId: BERACHAIN_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const celoResult = resolveActiveChain({
      isConnected: true,
      walletChainId: CELO_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const gnosisResult = resolveActiveChain({
      isConnected: true,
      walletChainId: GNOSIS_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const unichainResult = resolveActiveChain({
      isConnected: true,
      walletChainId: UNICHAIN_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const worldchainResult = resolveActiveChain({
      isConnected: true,
      walletChainId: WORLDCHAIN_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const robinhoodResult = resolveActiveChain({
      isConnected: true,
      walletChainId: ROBINHOOD_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const monadResult = resolveActiveChain({
      isConnected: true,
      walletChainId: MONAD_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const katanaResult = resolveActiveChain({
      isConnected: true,
      walletChainId: KATANA_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const seiResult = resolveActiveChain({
      isConnected: true,
      walletChainId: SEI_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const plasmaResult = resolveActiveChain({
      isConnected: true,
      walletChainId: PLASMA_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const abstractResult = resolveActiveChain({
      isConnected: true,
      walletChainId: ABSTRACT_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const fraxtalResult = resolveActiveChain({
      isConnected: true,
      walletChainId: FRAXTAL_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const taikoResult = resolveActiveChain({
      isConnected: true,
      walletChainId: TAIKO_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const opbnbResult = resolveActiveChain({
      isConnected: true,
      walletChainId: OPBNB_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const moonbeamResult = resolveActiveChain({
      isConnected: true,
      walletChainId: MOONBEAM_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const apechainResult = resolveActiveChain({
      isConnected: true,
      walletChainId: APECHAIN_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });
    const xdcResult = resolveActiveChain({
      isConnected: true,
      walletChainId: XDC_CHAIN_ID,
      wagmiChainId: PULSECHAIN_CHAIN_ID,
    });

    expect(sonicResult.status).toBe("supported");
    expect(sonicResult.activeChainId).toBe(SONIC_CHAIN_ID);
    expect(sonicResult.activeChainConfig?.displayName).toBe("Sonic Mainnet");
    expect(avalancheResult.status).toBe("supported");
    expect(avalancheResult.activeChainId).toBe(AVALANCHE_CHAIN_ID);
    expect(avalancheResult.activeChainConfig?.displayName).toBe(
      "Avalanche C-Chain",
    );
    expect(mantleResult.status).toBe("supported");
    expect(mantleResult.activeChainId).toBe(MANTLE_CHAIN_ID);
    expect(mantleResult.activeChainConfig?.displayName).toBe("Mantle");
    expect(lineaResult.status).toBe("supported");
    expect(lineaResult.activeChainId).toBe(LINEA_CHAIN_ID);
    expect(lineaResult.activeChainConfig?.displayName).toBe("Linea");
    expect(blastResult.status).toBe("supported");
    expect(blastResult.activeChainId).toBe(BLAST_CHAIN_ID);
    expect(blastResult.activeChainConfig?.displayName).toBe("Blast");
    expect(berachainResult.status).toBe("supported");
    expect(berachainResult.activeChainId).toBe(BERACHAIN_CHAIN_ID);
    expect(berachainResult.activeChainConfig?.displayName).toBe("Berachain");
    expect(celoResult.status).toBe("supported");
    expect(celoResult.activeChainId).toBe(CELO_CHAIN_ID);
    expect(celoResult.activeChainConfig?.displayName).toBe("Celo");
    expect(gnosisResult.status).toBe("supported");
    expect(gnosisResult.activeChainId).toBe(GNOSIS_CHAIN_ID);
    expect(gnosisResult.activeChainConfig?.displayName).toBe("Gnosis");
    expect(unichainResult.status).toBe("supported");
    expect(unichainResult.activeChainId).toBe(UNICHAIN_CHAIN_ID);
    expect(unichainResult.activeChainConfig?.displayName).toBe("Unichain");
    expect(worldchainResult.status).toBe("supported");
    expect(worldchainResult.activeChainId).toBe(WORLDCHAIN_CHAIN_ID);
    expect(worldchainResult.activeChainConfig?.displayName).toBe("World Chain");
    expect(robinhoodResult.status).toBe("supported");
    expect(robinhoodResult.activeChainId).toBe(ROBINHOOD_CHAIN_ID);
    expect(robinhoodResult.activeChainConfig?.displayName).toBe(
      "Robinhood Chain",
    );
    expect(monadResult.status).toBe("supported");
    expect(monadResult.activeChainId).toBe(MONAD_CHAIN_ID);
    expect(monadResult.activeChainConfig?.displayName).toBe("Monad");
    expect(katanaResult.status).toBe("supported");
    expect(katanaResult.activeChainId).toBe(KATANA_CHAIN_ID);
    expect(katanaResult.activeChainConfig?.displayName).toBe("Katana");
    expect(seiResult.status).toBe("supported");
    expect(seiResult.activeChainId).toBe(SEI_CHAIN_ID);
    expect(seiResult.activeChainConfig?.displayName).toBe("Sei");
    expect(plasmaResult.status).toBe("supported");
    expect(plasmaResult.activeChainId).toBe(PLASMA_CHAIN_ID);
    expect(plasmaResult.activeChainConfig?.displayName).toBe("Plasma");
    expect(abstractResult.status).toBe("supported");
    expect(abstractResult.activeChainId).toBe(ABSTRACT_CHAIN_ID);
    expect(abstractResult.activeChainConfig?.displayName).toBe("Abstract");
    expect(fraxtalResult.status).toBe("supported");
    expect(fraxtalResult.activeChainId).toBe(FRAXTAL_CHAIN_ID);
    expect(fraxtalResult.activeChainConfig?.displayName).toBe("Fraxtal");
    expect(taikoResult.status).toBe("supported");
    expect(taikoResult.activeChainId).toBe(TAIKO_CHAIN_ID);
    expect(taikoResult.activeChainConfig?.displayName).toBe("Taiko Mainnet");
    expect(opbnbResult.status).toBe("supported");
    expect(opbnbResult.activeChainId).toBe(OPBNB_CHAIN_ID);
    expect(opbnbResult.activeChainConfig?.displayName).toBe("opBNB");
    expect(moonbeamResult.status).toBe("supported");
    expect(moonbeamResult.activeChainId).toBe(MOONBEAM_CHAIN_ID);
    expect(moonbeamResult.activeChainConfig?.displayName).toBe("Moonbeam");
    expect(apechainResult.status).toBe("supported");
    expect(apechainResult.activeChainId).toBe(APECHAIN_CHAIN_ID);
    expect(apechainResult.activeChainConfig?.displayName).toBe("ApeChain");
    expect(xdcResult.status).toBe("supported");
    expect(xdcResult.activeChainId).toBe(XDC_CHAIN_ID);
    expect(xdcResult.activeChainConfig?.displayName).toBe("XDC Network");
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
      "PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast, Berachain, Celo, Gnosis, Unichain, World, Robinhood, Monad, Katana, Sei, Plasma, Abstract, Fraxtal, Taiko, opBNB, Moonbeam, ApeChain, or XDC",
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
    expect(scannerSessionKey(owner, SONIC_CHAIN_ID)).not.toBe(
      scannerSessionKey(owner, BASE_CHAIN_ID),
    );
  });
});
