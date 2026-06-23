import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  CELO_CHAIN_ID,
  GNOSIS_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  LINEA_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
} from "@/lib/chains";

const SOURCE = readFileSync(new URL("./chain-logo.tsx", import.meta.url), "utf8");

describe("ChainLogo source", () => {
  it("uses the original PulseChain vector mark instead of the generated fallback", () => {
    expect(PULSECHAIN_CHAIN_ID).toBe(369);
    expect(SOURCE).toContain("PULSECHAIN_LOGO_PATH");
    expect(SOURCE).toContain("PulseChain-Logo-Shape");
    expect(SOURCE).toContain("#00EAFF");
    expect(SOURCE).toContain("#FF0000");
    expect(SOURCE).not.toContain('d="M8 24h10l4-9 6 20 4-11h8"');
  });

  it("labels Etherscan V2 generic chains explicitly", () => {
    expect(SOURCE).toContain(`[LINEA_CHAIN_ID]: "Linea"`);
    expect(SOURCE).toContain(`[BLAST_CHAIN_ID]: "Blast"`);
    expect(SOURCE).toContain(`[BERACHAIN_CHAIN_ID]: "Berachain"`);
    expect(SOURCE).toContain(`[CELO_CHAIN_ID]: "Celo"`);
    expect(SOURCE).toContain(`[GNOSIS_CHAIN_ID]: "Gnosis"`);
    expect(SOURCE).toContain(`[UNICHAIN_CHAIN_ID]: "Unichain"`);
    expect(SOURCE).toContain(`[WORLDCHAIN_CHAIN_ID]: "World Chain"`);
  });

  it("routes Etherscan V2 generic chains away from the default mark", () => {
    expect(LINEA_CHAIN_ID).toBe(59144);
    expect(BLAST_CHAIN_ID).toBe(81457);
    expect(BERACHAIN_CHAIN_ID).toBe(80094);
    expect(CELO_CHAIN_ID).toBe(42220);
    expect(GNOSIS_CHAIN_ID).toBe(100);
    expect(UNICHAIN_CHAIN_ID).toBe(130);
    expect(WORLDCHAIN_CHAIN_ID).toBe(480);

    expect(SOURCE).toContain("case LINEA_CHAIN_ID:");
    expect(SOURCE).toContain("return <LineaMark muted={muted} />");
    expect(SOURCE).toContain("case BLAST_CHAIN_ID:");
    expect(SOURCE).toContain("return <BlastMark muted={muted} />");
    expect(SOURCE).toContain("case BERACHAIN_CHAIN_ID:");
    expect(SOURCE).toContain("return <BerachainMark muted={muted} />");
    expect(SOURCE).toContain("case CELO_CHAIN_ID:");
    expect(SOURCE).toContain("return <CeloMark muted={muted} />");
    expect(SOURCE).toContain("case GNOSIS_CHAIN_ID:");
    expect(SOURCE).toContain("return <GnosisMark muted={muted} />");
    expect(SOURCE).toContain("case UNICHAIN_CHAIN_ID:");
    expect(SOURCE).toContain("return <UnichainMark muted={muted} />");
    expect(SOURCE).toContain("case WORLDCHAIN_CHAIN_ID:");
    expect(SOURCE).toContain("return <WorldChainMark muted={muted} />");
  });

  it("keeps branded full-color marks for new generic chains", () => {
    expect(SOURCE).toContain("function LineaMark");
    expect(SOURCE).toContain("#FFFFFF");
    expect(SOURCE).toContain("function BlastMark");
    expect(SOURCE).toContain("#FCFF00");
    expect(SOURCE).toContain("function BerachainMark");
    expect(SOURCE).toContain("#FF7A1A");
    expect(SOURCE).toContain("function CeloMark");
    expect(SOURCE).toContain("#35D07F");
    expect(SOURCE).toContain("function GnosisMark");
    expect(SOURCE).toContain("#103C3C");
    expect(SOURCE).toContain("function UnichainMark");
    expect(SOURCE).toContain("#FF007A");
    expect(SOURCE).toContain("function WorldChainMark");
    expect(SOURCE).toContain("#6EE7F9");
  });
});
