import { describe, expect, it } from "vitest";

import {
  analyzeDustTrap,
  sanitizeDustMetadataText,
  type DustTrapTransferInput,
} from "@/lib/lifeboat/dust-trap";

const OWNER = "0x1111111111111111111111111111111111111111";
const SENDER = "0x2222222222222222222222222222222222222222";
const TOKEN = "0x3333333333333333333333333333333333333333";

function transfer(
  overrides: Partial<DustTrapTransferInput> = {},
): DustTrapTransferInput {
  return {
    id: "token:0xtx:0x3333333333333333333333333333333333333333",
    assetType: "token",
    txHash: "0xtx",
    timestamp: 1_779_999_000,
    occurredAt: "2026-05-29T18:03:00.000Z",
    from: SENDER,
    to: OWNER,
    contractAddress: TOKEN,
    tokenId: null,
    rawValue: 1n,
    decimals: 18,
    amount: "0.000000000000000001 DUST",
    metadata: {
      rawName: "Reward claim https://bad.example",
      rawSymbol: "DUST",
    },
    tokenExplorerUrl: "https://example.com/token",
    txExplorerUrl: "https://example.com/tx",
    ...overrides,
  };
}

describe("Wallet Lifeboat dust trap diagnostic", () => {
  it("strips URL-like and HTML-like metadata before display", () => {
    const sanitized = sanitizeDustMetadataText(
      '<b>Claim reward</b> at https://bad.example/path',
    );

    expect(sanitized.displayText).toBe("Claim reward at [link removed]");
    expect(sanitized.removedUrlCount).toBe(1);
    expect(sanitized.suspiciousKeywordCount).toBeGreaterThan(0);
    expect(sanitized.warnings).toContain("HTML-like metadata was stripped.");
    expect(sanitized.displayText).not.toContain("https://bad.example");
    expect(sanitized.displayText).not.toContain("<b>");
  });

  it("flags URL and claim wording as bait context without calling it a scam", () => {
    const analysis = analyzeDustTrap({
      owner: OWNER,
      chainId: 1,
      transfers: [transfer()],
    });

    expect(analysis.riskLevel).toBe("elevated");
    expect(analysis.summary.urlMetadataCount).toBe(1);
    expect(analysis.summary.keywordMetadataCount).toBe(1);
    expect(analysis.evidence.map((item) => item.title)).toContain(
      "Metadata contained URL-like text",
    );
    expect(analysis.evidence.map((item) => item.title)).toContain(
      "Claim or reward wording found",
    );
    expect(
      analysis.evidence.map((item) => item.description).join(" ").toLowerCase(),
    ).not.toContain("is a scam");
  });

  it("treats reviewed registry matches as context rather than dust evidence", () => {
    const analysis = analyzeDustTrap({
      owner: OWNER,
      chainId: 369,
      transfers: [
        transfer({
          contractAddress: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
          metadata: { rawName: "HEX", rawSymbol: "HEX" },
          rawValue: 1_000_000_000n,
          decimals: 8,
          amount: "10 HEX",
        }),
      ],
    });

    expect(analysis.summary.reviewedRegistryMatchCount).toBe(1);
    expect(analysis.evidence).toEqual([]);
    expect(analysis.riskLevel).toBe("none_detected");
  });

  it("surfaces unsolicited NFTs as informational when no stronger signal exists", () => {
    const analysis = analyzeDustTrap({
      owner: OWNER,
      chainId: 1,
      transfers: [
        transfer({
          id: "nft:0xnft:1",
          assetType: "nft",
          tokenId: "1",
          rawValue: null,
          decimals: null,
          amount: "NFT #1",
          metadata: { rawName: "Unknown NFT", rawSymbol: "UNFT" },
        }),
      ],
    });

    expect(analysis.riskLevel).toBe("informational");
    expect(analysis.summary.inboundNftCount).toBe(1);
    expect(analysis.evidence[0]?.title).toBe("Unsolicited inbound NFT");
  });

  it("keeps warnings read-only and avoids asset action language", () => {
    const warnings = analyzeDustTrap({
      owner: OWNER,
      chainId: 1,
      transfers: [transfer()],
    })
      .warnings.join(" ")
      .toLowerCase();

    expect(warnings).toContain("read-only");
    expect(warnings).toContain("never fetches token-provided websites");
    expect(warnings).not.toContain("burn");
    expect(warnings).not.toContain("transfer it");
    expect(warnings).not.toContain("approve");
  });
});
