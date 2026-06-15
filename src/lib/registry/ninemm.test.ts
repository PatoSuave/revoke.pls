import type { Address } from "viem";
import { describe, expect, it } from "vitest";

import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  SONIC_CHAIN_ID,
  isSupportedChainId,
} from "@/lib/chains";
import { classifyApprovalRisk } from "@/lib/risk";

import {
  ETHEREUM_MAINNET_CHAIN_ID,
  NINEMM_DEPLOYMENTS_SOURCE_LABEL,
  NINEMM_DEPLOYMENTS_SOURCE_URL,
  NINEMM_SPENDER_METADATA_REGISTRY,
  getSpenderMetadataEntry,
  getSpendersForChain,
} from ".";

const PULSECHAIN_V2_ROUTER =
  "0xcC73b59F8D7b7c532703bDfea2808a28a488cF47" as const;
const SONIC_V4_UNIVERSAL_ROUTER =
  "0x81afd4c90422c8351ac8265900173ed240d929e3" as const;
const BSC_DEPLOYMENTS_V4_UNIVERSAL_ROUTER =
  "0x10266742333613ca86692e20e0b9ae4c3723277c";
const BSC_INFINITY_UNIVERSAL_ROUTER =
  "0xd9c500dff816a1da21a48a732d3498bf09dc9aeb";
const BSC_V4_PERMIT2 = "0x73870990681bfd96488941d117E43380513FEc4a";
const SONIC_V4_PERMIT2 = "0x97D143Ef1223e90Ce50b5910eA5aACABFe4e1152";

describe("9mm spender metadata registry", () => {
  it("looks up 9mm deployment labels with source-grounded metadata", () => {
    const entry = getSpenderMetadataEntry(
      PULSECHAIN_CHAIN_ID,
      PULSECHAIN_V2_ROUTER.toLowerCase() as Address,
    );

    expect(entry).toMatchObject({
      address: PULSECHAIN_V2_ROUTER,
      label: "9mm v2 Router",
      protocol: "9mm",
      protocolSlug: "9mm",
      category: "router",
      isTrusted: false,
      source: `${NINEMM_DEPLOYMENTS_SOURCE_URL}/blob/main/pulsechain/v2.json`,
      protocolMetadata: {
        protocolName: "9mm",
        contractStatus: "current",
        sourceLabel: NINEMM_DEPLOYMENTS_SOURCE_LABEL,
        sourceUrl: `${NINEMM_DEPLOYMENTS_SOURCE_URL}/blob/main/pulsechain/v2.json`,
      },
    });
  });

  it("includes Sonic 9mm enrichment as an existing supported scanner chain", () => {
    expect(isSupportedChainId(SONIC_CHAIN_ID)).toBe(true);

    expect(
      getSpenderMetadataEntry(SONIC_CHAIN_ID, SONIC_V4_UNIVERSAL_ROUTER),
    ).toMatchObject({
      label: "9mm v4 Universal Router",
      protocol: "9mm",
      category: "router",
      isTrusted: false,
    });
  });

  it("keeps 9mm labels from weakening unknown-spender risk warnings", () => {
    const entry = getSpenderMetadataEntry(
      PULSECHAIN_CHAIN_ID,
      PULSECHAIN_V2_ROUTER,
    );
    const risk = classifyApprovalRisk({
      trusted: entry?.isTrusted ?? false,
      unlimited: true,
    });

    expect(entry?.verificationMethod).toBeUndefined();
    expect(risk).toMatchObject({
      level: "high",
      reason:
        "Unknown spender with an unlimited allowance. Verify the address before leaving it in place.",
      drivers: ["Unknown spender", "Unlimited approval"],
    });
  });

  it("does not expand active registry scan target lists", () => {
    expect(
      getSpendersForChain(PULSECHAIN_CHAIN_ID).some(
        (entry) => entry.protocol === "9mm",
      ),
    ).toBe(false);
    expect(getSpendersForChain(BSC_CHAIN_ID)).toEqual([]);
    expect(getSpendersForChain(BASE_CHAIN_ID)).toEqual([]);
    expect(getSpendersForChain(SONIC_CHAIN_ID)).toEqual([]);
  });

  it("excludes chains and v4 Permit2 behavior that were not verified", () => {
    const registry = JSON.stringify(NINEMM_SPENDER_METADATA_REGISTRY).toLowerCase();
    const chainIds = new Set(
      NINEMM_SPENDER_METADATA_REGISTRY.map((entry) => entry.chainId),
    );

    expect(NINEMM_SPENDER_METADATA_REGISTRY).toHaveLength(31);
    expect(chainIds).toEqual(
      new Set([
        PULSECHAIN_CHAIN_ID,
        BSC_CHAIN_ID,
        BASE_CHAIN_ID,
        SONIC_CHAIN_ID,
        ETHEREUM_MAINNET_CHAIN_ID,
      ]),
    );
    expect(chainIds.has(POLYGON_CHAIN_ID)).toBe(false);
    expect(chainIds.has(AVALANCHE_CHAIN_ID)).toBe(false);
    expect(chainIds.has(MANTLE_CHAIN_ID)).toBe(false);
    expect(registry).not.toContain(BSC_DEPLOYMENTS_V4_UNIVERSAL_ROUTER);
    expect(registry).not.toContain(BSC_INFINITY_UNIVERSAL_ROUTER);
    expect(registry).not.toContain(BSC_V4_PERMIT2.toLowerCase());
    expect(registry).not.toContain(SONIC_V4_PERMIT2.toLowerCase());
  });

  it("does not use the word safe in 9mm display metadata", () => {
    const displayText = NINEMM_SPENDER_METADATA_REGISTRY.map((entry) =>
      [
        entry.label,
        entry.notes,
        entry.protocolMetadata?.protocolName,
        entry.protocolMetadata?.sourceLabel,
        entry.protocolMetadata?.note,
      ].join(" "),
    ).join(" ");

    expect(displayText.toLowerCase()).not.toMatch(/\bsafe\b/);
  });
});
