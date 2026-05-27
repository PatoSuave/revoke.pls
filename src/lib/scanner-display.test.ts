import { describe, expect, it } from "vitest";

import {
  getPipelineHealthDisplay,
  getScanPhaseDisplay,
  getScannerModeDisplay,
} from "./scanner-display";

describe("scanner display helpers", () => {
  it("keeps read-only mode explicit when no wallet is connected", () => {
    expect(
      getScannerModeDisplay({
        scanMode: "address-only",
        walletConnected: false,
        walletMatchesScanTarget: null,
        walletMatchesActiveChain: null,
      }),
    ).toMatchObject({
      label: "Read-only scan",
      tone: "info",
    });
  });

  it("keeps wallet mismatch separate from wrong-network state", () => {
    expect(
      getScannerModeDisplay({
        scanMode: "address-only",
        walletConnected: true,
        walletMatchesScanTarget: false,
        walletMatchesActiveChain: true,
      }).label,
    ).toBe("Wallet mismatch");

    expect(
      getScannerModeDisplay({
        scanMode: "connected-wallet-matches-scanned-address",
        walletConnected: true,
        walletMatchesScanTarget: true,
        walletMatchesActiveChain: false,
      }).label,
    ).toBe("Wrong network");
  });

  it("uses active management only for connected-wallet scans", () => {
    expect(
      getScannerModeDisplay({
        scanMode: "connected-wallet",
        walletConnected: true,
        walletMatchesScanTarget: true,
        walletMatchesActiveChain: true,
      }),
    ).toMatchObject({
      label: "Active management",
      tone: "success",
    });
  });

  it("describes pending discovery and live verification phases", () => {
    expect(
      getScanPhaseDisplay({
        status: "pending",
        candidateCount: 0,
        standardLabel: "PRC-20",
      }).label,
    ).toBe("Discovering history");

    expect(
      getScanPhaseDisplay({
        status: "pending",
        candidateCount: 7,
        standardLabel: "PRC-20",
      }),
    ).toMatchObject({
      label: "Live verification",
      tone: "info",
    });
  });

  it("marks health as limited or degraded without calling it online", () => {
    expect(
      getPipelineHealthDisplay({
        status: "success",
        truncated: true,
        failureCount: 0,
        error: null,
      }).label,
    ).toBe("Limited");

    expect(
      getPipelineHealthDisplay({
        status: "success",
        truncated: false,
        failureCount: 2,
        error: null,
      }).label,
    ).toBe("Degraded");
  });
});

