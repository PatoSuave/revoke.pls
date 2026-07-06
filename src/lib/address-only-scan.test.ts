import { describe, expect, it } from "vitest";

import {
  ADDRESS_ONLY_SCAN_ALL_CONCURRENCY,
  addressOnlyScanOptions,
  getAddressOnlyActiveScanChainIds,
  resolveDefaultAddressOnlyScanChainId,
} from "@/lib/address-only-scan";
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
} from "@/lib/chains";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";
import { HYPEREVM_CLIENT_CHAIN_ID } from "@/lib/hyperevm-approval-client";
import { OPTIMISM_CLIENT_CHAIN_ID } from "@/lib/optimism-approval-client";

describe("address-only scan selection", () => {
  it("defaults to Ethereum when no wallet chain is available", () => {
    expect(
      resolveDefaultAddressOnlyScanChainId({
        walletChainId: undefined,
        wagmiChainId: undefined,
      }),
    ).toBe(ETHEREUM_MAINNET_CLIENT_CHAIN_ID);
  });

  it("defaults to the connected app chain when supported", () => {
    expect(
      resolveDefaultAddressOnlyScanChainId({
        walletChainId: BSC_CHAIN_ID,
        wagmiChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      }),
    ).toBe(BSC_CHAIN_ID);
  });

  it("defaults to Arbitrum when the connected wallet is on Arbitrum One", () => {
    expect(
      resolveDefaultAddressOnlyScanChainId({
        walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
        wagmiChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      }),
    ).toBe(ARBITRUM_ONE_CLIENT_CHAIN_ID);
  });

  it("defaults to Optimism when the connected wallet is on OP Mainnet", () => {
    expect(
      resolveDefaultAddressOnlyScanChainId({
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        wagmiChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      }),
    ).toBe(OPTIMISM_CLIENT_CHAIN_ID);
  });

  it("defaults to HyperEVM when the connected wallet is on HyperEVM", () => {
    expect(
      resolveDefaultAddressOnlyScanChainId({
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        wagmiChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      }),
    ).toBe(HYPEREVM_CLIENT_CHAIN_ID);
  });

  it("scans only the selected chain by default", () => {
    expect(
      getAddressOnlyActiveScanChainIds({
        selectedChainId: BASE_CHAIN_ID,
        scanAllStarted: false,
        scanAllIndex: 0,
      }),
    ).toEqual([BASE_CHAIN_ID]);
  });

  it("requires explicit scan-all state before multiple chains are active", () => {
    expect(addressOnlyScanOptions.map((option) => option.chainId)).toEqual([
      ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      ARBITRUM_ONE_CLIENT_CHAIN_ID,
      OPTIMISM_CLIENT_CHAIN_ID,
      HYPEREVM_CLIENT_CHAIN_ID,
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
    expect(ADDRESS_ONLY_SCAN_ALL_CONCURRENCY).toBe(1);
    expect(
      getAddressOnlyActiveScanChainIds({
        selectedChainId: BASE_CHAIN_ID,
        scanAllStarted: true,
        scanAllIndex: 0,
      }),
    ).toEqual([ETHEREUM_MAINNET_CLIENT_CHAIN_ID]);
    expect(
      getAddressOnlyActiveScanChainIds({
        selectedChainId: BASE_CHAIN_ID,
        scanAllStarted: true,
        scanAllIndex: 1,
      }),
    ).toEqual([ETHEREUM_MAINNET_CLIENT_CHAIN_ID, ARBITRUM_ONE_CLIENT_CHAIN_ID]);
    expect(
      getAddressOnlyActiveScanChainIds({
        selectedChainId: BASE_CHAIN_ID,
        scanAllStarted: true,
        scanAllIndex: 2,
      }),
    ).toEqual([
      ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      ARBITRUM_ONE_CLIENT_CHAIN_ID,
      OPTIMISM_CLIENT_CHAIN_ID,
    ]);
    expect(
      getAddressOnlyActiveScanChainIds({
        selectedChainId: BASE_CHAIN_ID,
        scanAllStarted: true,
        scanAllIndex: 3,
      }),
    ).toEqual([
      ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      ARBITRUM_ONE_CLIENT_CHAIN_ID,
      OPTIMISM_CLIENT_CHAIN_ID,
      HYPEREVM_CLIENT_CHAIN_ID,
    ]);
  });
});
