import { describe, expect, it } from "vitest";

import {
  CHAIN_VISUALS,
  DEFAULT_CHAIN_VISUAL,
  getChainVisual,
} from "@/lib/chain-visuals";
import { LIVE_SUPPORTED_CHAIN_ROWS } from "@/lib/supported-chain-copy";

describe("chain visuals", () => {
  it("defines readable brand visuals for every live supported chain", () => {
    for (const row of LIVE_SUPPORTED_CHAIN_ROWS) {
      expect(CHAIN_VISUALS[row.chain]).toMatchObject({
        accent: expect.stringMatching(/^#/),
        accentReadable: expect.stringMatching(/^#/),
        accentSoft: expect.stringContaining("rgba("),
        accentBorder: expect.stringContaining("rgba("),
      });
    }
  });

  it("falls back safely for unknown chains", () => {
    expect(getChainVisual("Unknown")).toBe(DEFAULT_CHAIN_VISUAL);
  });
});
