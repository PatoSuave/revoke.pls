import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LIVE_SUPPORTED_CHAIN_COMPACT_LIST,
  LIVE_SUPPORTED_CHAIN_COUNT,
  LIVE_SUPPORTED_CHAIN_LIST,
  LIVE_SUPPORTED_CHAIN_ROWS,
  VERIFIED_ROW_SUPPORT_NOTE,
  formatRevokeSupport,
} from "@/lib/supported-chain-copy";

describe("supported chain copy", () => {
  it("lists every live supported chain in product display order", () => {
    expect(LIVE_SUPPORTED_CHAIN_ROWS.map((row) => row.chain)).toEqual([
      "PulseChain",
      "BNB Smart Chain",
      "Base",
      "Polygon",
      "Ethereum Mainnet",
      "Arbitrum One",
      "Optimism",
    ]);
    expect(LIVE_SUPPORTED_CHAIN_COUNT).toBe(7);
    expect(LIVE_SUPPORTED_CHAIN_LIST).toBe(
      "PulseChain, BNB Smart Chain, Base, Polygon, Ethereum Mainnet, Arbitrum One, and Optimism",
    );
    expect(LIVE_SUPPORTED_CHAIN_COMPACT_LIST).toBe(
      "PulseChain, BSC, Base, Polygon, Ethereum, Arbitrum, and Optimism",
    );
  });

  it("keeps verified-row limitations explicit for Arbitrum and Optimism", () => {
    expect(VERIFIED_ROW_SUPPORT_NOTE).toContain("Arbitrum One and Optimism");
    expect(VERIFIED_ROW_SUPPORT_NOTE).toContain("row-level ERC-20/NFT revoke");
    expect(VERIFIED_ROW_SUPPORT_NOTE).toContain("batch revoke is not enabled");
  });

  it("formats revoke support labels without overstating row-level lanes", () => {
    expect(
      formatRevokeSupport(
        LIVE_SUPPORTED_CHAIN_ROWS.find((row) => row.chain === "PulseChain")!,
      ),
    ).toBe("Scan + revoke");
    expect(
      formatRevokeSupport(
        LIVE_SUPPORTED_CHAIN_ROWS.find(
          (row) => row.chain === "Ethereum Mainnet",
        )!,
      ),
    ).toBe("Live-verified revoke");
    expect(
      formatRevokeSupport(
        LIVE_SUPPORTED_CHAIN_ROWS.find((row) => row.chain === "Optimism")!,
      ),
    ).toBe("ERC-20/NFT verified rows only");
  });

  it("keeps landing and app pages wired to the shared live-chain copy", () => {
    const landingPage = readFileSync(
      join(process.cwd(), "src", "app", "page.tsx"),
      "utf8",
    );
    const appPage = readFileSync(
      join(process.cwd(), "src", "app", "app", "page.tsx"),
      "utf8",
    );

    expect(landingPage).toContain("LIVE_SUPPORTED_CHAIN_ROWS");
    expect(appPage).toContain("LIVE_SUPPORTED_CHAIN_ROWS");
  });
});
