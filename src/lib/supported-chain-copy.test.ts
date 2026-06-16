import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LIVE_SUPPORTED_CHAIN_COMPACT_LIST,
  LIVE_SUPPORTED_CHAIN_COUNT,
  LIVE_SUPPORTED_CHAIN_LIST,
  LIVE_SUPPORTED_CHAIN_ROWS,
  HYPEREVM_LIVE_NETWORK_NOTE,
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
      "Sonic Mainnet",
      "Avalanche C-Chain",
      "Mantle",
      "Linea",
      "Blast",
      "Berachain",
      "Ethereum Mainnet",
      "Arbitrum One",
      "Optimism",
      "HyperEVM",
    ]);
    expect(LIVE_SUPPORTED_CHAIN_COUNT).toBe(14);
    expect(LIVE_SUPPORTED_CHAIN_LIST).toBe(
      "PulseChain, BNB Smart Chain, Base, Polygon, Sonic Mainnet, Avalanche C-Chain, Mantle, Linea, Blast, Berachain, Ethereum Mainnet, Arbitrum One, Optimism, and HyperEVM",
    );
    expect(LIVE_SUPPORTED_CHAIN_COMPACT_LIST).toBe(
      "PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast, Berachain, Ethereum, Arbitrum, Optimism, and HyperEVM",
    );
  });

  it("keeps verified-row limitations explicit for Arbitrum, Optimism, and HyperEVM", () => {
    expect(VERIFIED_ROW_SUPPORT_NOTE).toContain(
      "Arbitrum One, Optimism, and HyperEVM",
    );
    expect(VERIFIED_ROW_SUPPORT_NOTE).toContain("row-level ERC-20/NFT revoke");
    expect(VERIFIED_ROW_SUPPORT_NOTE).toContain("batch revoke is not enabled");
    expect(HYPEREVM_LIVE_NETWORK_NOTE).toContain("HyperEVM is live");
    expect(HYPEREVM_LIVE_NETWORK_NOTE).toContain("chain ID 999");
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

  it("keeps product-facing surfaces wired to the shared live-chain copy", () => {
    const sources = [
      join(process.cwd(), "src", "app", "page.tsx"),
      join(process.cwd(), "src", "app", "app", "page.tsx"),
      join(process.cwd(), "src", "components", "sections", "approval-scanner.tsx"),
      join(process.cwd(), "src", "components", "sections", "faq.tsx"),
      join(process.cwd(), "src", "components", "sections", "how-it-works.tsx"),
      join(process.cwd(), "src", "components", "sections", "scanner-diagnostics.tsx"),
      join(process.cwd(), "src", "components", "sections", "trust-safety.tsx"),
    ].map((path) => readFileSync(path, "utf8"));

    expect(sources[0]).toContain("LIVE_SUPPORTED_CHAIN_ROWS");
    expect(sources[1]).toContain("LIVE_SUPPORTED_CHAIN_ROWS");
    for (const source of sources.slice(2)) {
      expect(source).toContain("LIVE_SUPPORTED_CHAIN");
    }
  });
});
