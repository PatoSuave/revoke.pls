import { describe, expect, it } from "vitest";

import {
  ADDRESS_ONLY_SCAN_ALL_CONCURRENCY,
  addressOnlyScanOptions,
  getAddressOnlyActiveScanChainIds,
  resolveDefaultAddressOnlyScanChainId,
} from "@/lib/address-only-scan";
import { BASE_CHAIN_ID, BSC_CHAIN_ID, PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";

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
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
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
    ).toEqual([ETHEREUM_MAINNET_CLIENT_CHAIN_ID, PULSECHAIN_CHAIN_ID]);
  });
});
