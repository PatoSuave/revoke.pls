import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { getAddress, type Address } from "viem";

import {
  ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY,
  WALLET_MISMATCH_SCAN_TARGET_COPY,
  addressesEqual,
  getScanTargetRevokeDisabledReason,
  normalizeScanInputAddress,
  resolveScanTarget,
  scanTargetSessionKey,
} from "@/lib/scan-target";

const OWNER =
  "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as Address;
const OTHER =
  "0x165C3410fC91EF562C50559f7d2289fEbed552d9" as Address;

describe("scan target state", () => {
  it("rejects invalid pasted addresses", () => {
    expect(normalizeScanInputAddress("")).toBeNull();
    expect(normalizeScanInputAddress("not-an-address")).toBeNull();
    expect(normalizeScanInputAddress("0x1234")).toBeNull();
  });

  it("normalizes valid pasted EVM addresses", () => {
    expect(normalizeScanInputAddress(`  ${OWNER}  `)).toBe(getAddress(OWNER));
  });

  it("preserves connected-wallet mode when no pasted address is active", () => {
    const target = resolveScanTarget({
      connectedWalletAddress: OWNER,
      activeAddressOnlyAddress: null,
    });

    expect(target.scanMode).toBe("connected-wallet");
    expect(target.scanTargetAddress).toBe(OWNER);
    expect(target.isConnectedWalletSameAsScanTarget).toBe(true);
  });

  it("enters address-only mode for a pasted address without a matching wallet", () => {
    const noWallet = resolveScanTarget({
      connectedWalletAddress: undefined,
      activeAddressOnlyAddress: OWNER,
    });
    const mismatch = resolveScanTarget({
      connectedWalletAddress: OTHER,
      activeAddressOnlyAddress: OWNER,
    });

    expect(noWallet.scanMode).toBe("address-only");
    expect(noWallet.scanTargetAddress).toBe(OWNER);
    expect(noWallet.isConnectedWalletSameAsScanTarget).toBe(false);
    expect(mismatch.scanMode).toBe("address-only");
    expect(mismatch.isConnectedWalletSameAsScanTarget).toBe(false);
  });

  it("identifies connected-wallet-matches-scanned-address mode", () => {
    const target = resolveScanTarget({
      connectedWalletAddress: OWNER,
      activeAddressOnlyAddress: OWNER,
    });

    expect(target.scanMode).toBe("connected-wallet-matches-scanned-address");
    expect(target.isConnectedWalletSameAsScanTarget).toBe(true);
  });

  it("disables revoke until wallet address and chain match the scan target", () => {
    expect(
      getScanTargetRevokeDisabledReason({
        scanTargetAddress: OWNER,
        connectedWalletAddress: undefined,
        walletChainId: undefined,
        rowChainId: 1,
        chainName: "Ethereum Mainnet",
      }),
    ).toBe(ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY);
    expect(
      getScanTargetRevokeDisabledReason({
        scanTargetAddress: OWNER,
        connectedWalletAddress: OTHER,
        walletChainId: 1,
        rowChainId: 1,
        chainName: "Ethereum Mainnet",
      }),
    ).toBe(WALLET_MISMATCH_SCAN_TARGET_COPY);
    expect(
      getScanTargetRevokeDisabledReason({
        scanTargetAddress: OWNER,
        connectedWalletAddress: OWNER,
        walletChainId: 369,
        rowChainId: 1,
        chainName: "Ethereum Mainnet",
      }),
    ).toBe("Switch to Ethereum Mainnet to revoke.");
    expect(
      getScanTargetRevokeDisabledReason({
        scanTargetAddress: OWNER,
        connectedWalletAddress: OWNER,
        walletChainId: 1,
        rowChainId: 1,
        chainName: "Ethereum Mainnet",
      }),
    ).toBeNull();
  });

  it("changes session keys when the active address changes to avoid stale results", () => {
    const first = resolveScanTarget({
      connectedWalletAddress: undefined,
      activeAddressOnlyAddress: OWNER,
    });
    const second = resolveScanTarget({
      connectedWalletAddress: undefined,
      activeAddressOnlyAddress: OTHER,
    });

    expect(scanTargetSessionKey(first)).not.toBe(scanTargetSessionKey(second));
    expect(addressesEqual(OWNER, OWNER.toUpperCase() as Address)).toBe(true);
  });

  it("keeps address-only scanning gated by selected explicit-owner pipelines", () => {
    const scanner = readFileSync(
      join(process.cwd(), "src", "components", "sections", "approval-scanner.tsx"),
      "utf8",
    );

    expect(scanner).toContain("AddressOnlyChainSelector");
    expect(scanner).toContain("getAddressOnlyActiveScanChainIds");
    expect(scanner).toContain("scanAllStarted");
    expect(scanner).toContain("useApprovalDiscovery({ owner, chainId");
    expect(scanner).toContain("useNftApprovalDiscovery({ owner, chainId");
    expect(scanner).toContain("EthereumReadOnlyScanner");
    expect(scanner).toContain("ArbitrumReadOnlyScanner");
    expect(scanner).toContain("owner={owner}");
    expect(scanner).toContain("connectedAddress={connectedAddress}");
    expect(scanner).toContain("getScanTargetRevokeDisabledReason");
    expect(scanner).not.toContain("{supportedChainConfigList.map((chainConfig)");
  });

  it("keeps address-only debug labels separate from scanner failures", () => {
    const diagnostics = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "sections",
        "scanner-diagnostics.tsx",
      ),
      "utf8",
    );

    expect(diagnostics).toContain('"Scan mode"');
    expect(diagnostics).toContain('"Scan target address"');
    expect(diagnostics).toContain('"Wallet connected"');
    expect(diagnostics).toContain('"Wallet matches scan target"');
    expect(diagnostics).toContain('"Revoke disabled reason"');
    expect(diagnostics).toContain('"Discovery target chain"');
    expect(diagnostics).toContain('"Scanner chain supported"');
  });

  it("does not add address-only API transaction submission or signing helpers", () => {
    const ethereumRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "ethereum",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );
    const arbitrumRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "arbitrum",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );

    expect(`${ethereumRoute}\n${arbitrumRoute}`).not.toMatch(
      /writeContract|sendTransaction|signTransaction|privateKey|mnemonic|seed/i,
    );
  });
});
