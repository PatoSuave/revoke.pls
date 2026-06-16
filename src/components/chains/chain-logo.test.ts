import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  LINEA_CHAIN_ID,
} from "@/lib/chains";

const SOURCE = readFileSync(new URL("./chain-logo.tsx", import.meta.url), "utf8");

describe("ChainLogo source", () => {
  it("labels Linea, Blast, and Berachain explicitly", () => {
    expect(SOURCE).toContain(`[LINEA_CHAIN_ID]: "Linea"`);
    expect(SOURCE).toContain(`[BLAST_CHAIN_ID]: "Blast"`);
    expect(SOURCE).toContain(`[BERACHAIN_CHAIN_ID]: "Berachain"`);
  });

  it("routes Linea, Blast, and Berachain away from the default mark", () => {
    expect(LINEA_CHAIN_ID).toBe(59144);
    expect(BLAST_CHAIN_ID).toBe(81457);
    expect(BERACHAIN_CHAIN_ID).toBe(80094);

    expect(SOURCE).toContain("case LINEA_CHAIN_ID:");
    expect(SOURCE).toContain("return <LineaMark muted={muted} />");
    expect(SOURCE).toContain("case BLAST_CHAIN_ID:");
    expect(SOURCE).toContain("return <BlastMark muted={muted} />");
    expect(SOURCE).toContain("case BERACHAIN_CHAIN_ID:");
    expect(SOURCE).toContain("return <BerachainMark muted={muted} />");
  });

  it("keeps branded full-color marks for the three new chains", () => {
    expect(SOURCE).toContain("function LineaMark");
    expect(SOURCE).toContain("#FFFFFF");
    expect(SOURCE).toContain("function BlastMark");
    expect(SOURCE).toContain("#FCFF00");
    expect(SOURCE).toContain("function BerachainMark");
    expect(SOURCE).toContain("#FF7A1A");
  });
});
