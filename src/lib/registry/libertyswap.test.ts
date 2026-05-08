import type { Address } from "viem";
import { describe, expect, it } from "vitest";

import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
} from "@/lib/chains";

import {
  ARBITRUM_ONE_CHAIN_ID,
  ETHEREUM_MAINNET_CHAIN_ID,
  LIBERTYSWAP_LEGACY_NOTE,
  LIBERTYSWAP_SOURCE_LABEL,
  LIBERTYSWAP_SOURCE_URL,
  LIBERTYSWAP_SPENDER_METADATA_REGISTRY,
  getSpenderMetadataEntry,
  getSpendersForChain,
} from ".";

const PULSECHAIN_CURRENT_USDC =
  "0xe7EE706a6708b691a232452c9cb267d186942F09" as const;
const BASE_CURRENT_USDC =
  "0x8871de4668D3CF1FB7F93Baf4a78FEB0d1E13869" as const;
const ETHEREUM_LEGACY =
  "0x317DD5Ab50C6948f6486b9Ed65c4Ba1eb678a529" as const;
const MULTICHAIN_LEGACY =
  "0xC1fBB3a198917FF62342d2D00407Eab56Ee4c99A" as const;
const ARBITRUM_CURRENT_USDC =
  "0x05216280d45Bb8E8dcb863186E4762090bab7b6F" as const;
const UNKNOWN_ADDRESS =
  "0x000000000000000000000000000000000000dEaD" as const;

describe("LibertySwap spender metadata registry", () => {
  it("looks up current LibertySwap addresses with source-grounded metadata", () => {
    const entry = getSpenderMetadataEntry(
      PULSECHAIN_CHAIN_ID,
      PULSECHAIN_CURRENT_USDC.toLowerCase() as Address,
    );

    expect(entry).toMatchObject({
      address: PULSECHAIN_CURRENT_USDC,
      label: "LibertySwap USDC",
      protocol: "LibertySwap",
      category: "bridge",
      isTrusted: true,
      source: LIBERTYSWAP_SOURCE_URL,
      protocolMetadata: {
        protocolName: "LibertySwap",
        contractStatus: "current",
        sourceLabel: LIBERTYSWAP_SOURCE_LABEL,
        sourceUrl: LIBERTYSWAP_SOURCE_URL,
        assetLabel: "USDC",
      },
    });
  });

  it("looks up legacy LibertySwap addresses with the old-address note", () => {
    const entry = getSpenderMetadataEntry(
      ETHEREUM_MAINNET_CHAIN_ID,
      ETHEREUM_LEGACY,
    );

    expect(entry?.protocolMetadata).toMatchObject({
      protocolName: "LibertySwap",
      contractStatus: "legacy",
      sourceLabel: LIBERTYSWAP_SOURCE_LABEL,
      sourceUrl: LIBERTYSWAP_SOURCE_URL,
      note: LIBERTYSWAP_LEGACY_NOTE,
    });
  });

  it("keeps lookup case-insensitive and chain-aware", () => {
    expect(
      getSpenderMetadataEntry(BASE_CHAIN_ID, BASE_CURRENT_USDC.toLowerCase() as Address)
        ?.protocolMetadata?.contractStatus,
    ).toBe("current");
    expect(
      getSpenderMetadataEntry(PULSECHAIN_CHAIN_ID, MULTICHAIN_LEGACY)
        ?.protocolMetadata?.contractStatus,
    ).toBe("legacy");
    expect(
      getSpenderMetadataEntry(BASE_CHAIN_ID, MULTICHAIN_LEGACY)
        ?.protocolMetadata?.contractStatus,
    ).toBe("legacy");
    expect(getSpenderMetadataEntry(BSC_CHAIN_ID, MULTICHAIN_LEGACY)).toBeUndefined();
    expect(getSpenderMetadataEntry(PULSECHAIN_CHAIN_ID, BASE_CURRENT_USDC)).toBeUndefined();
  });

  it("keeps unknown addresses unlabeled", () => {
    expect(getSpenderMetadataEntry(BASE_CHAIN_ID, UNKNOWN_ADDRESS)).toBeUndefined();
  });

  it("stores Arbitrum metadata without enabling Arbitrum scanner targets", () => {
    expect(
      getSpenderMetadataEntry(ARBITRUM_ONE_CHAIN_ID, ARBITRUM_CURRENT_USDC)
        ?.protocolMetadata?.contractStatus,
    ).toBe("current");
    expect(getSpendersForChain(ARBITRUM_ONE_CHAIN_ID)).toEqual([]);
  });

  it("does not expand active registry scan target lists", () => {
    expect(getSpendersForChain(BSC_CHAIN_ID)).toEqual([]);
    expect(getSpendersForChain(BASE_CHAIN_ID)).toEqual([]);
    expect(
      getSpendersForChain(PULSECHAIN_CHAIN_ID).some(
        (entry) => entry.protocol === "LibertySwap",
      ),
    ).toBe(false);
  });

  it("excludes Solana program IDs and non-spender wallet addresses", () => {
    const registry = JSON.stringify(LIBERTYSWAP_SPENDER_METADATA_REGISTRY);

    expect(LIBERTYSWAP_SPENDER_METADATA_REGISTRY).toHaveLength(26);
    expect(registry).not.toContain("LBSarUewo4GFr8z8ekaCewLK2daJfTzV13h9GSkkSb3");
    expect(registry).not.toContain("HG3XyB1ZvR3DQB6a5gmK9w6bpcVwiXS7tXv6wJze5bpE");
    expect(registry).not.toContain("0xDB8AA76f4B32Ed107d47983261f91178fEeafC0c");
    expect(registry).not.toContain("0x42ec2a5fc5a23553a353a4219a42dea765877160");
    expect(registry).not.toContain("0xc4459301147058872013f34e2ada930e7217543b");
  });

  it("does not use the word safe in LibertySwap display metadata", () => {
    const displayText = LIBERTYSWAP_SPENDER_METADATA_REGISTRY.map((entry) =>
      [
        entry.label,
        entry.notes,
        entry.verificationMethod,
        entry.protocolMetadata?.protocolName,
        entry.protocolMetadata?.sourceLabel,
        entry.protocolMetadata?.note,
      ].join(" "),
    ).join(" ");

    expect(displayText.toLowerCase()).not.toMatch(/\bsafe\b/);
  });
});
