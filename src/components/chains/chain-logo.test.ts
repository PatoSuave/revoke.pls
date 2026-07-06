import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ABSTRACT_CHAIN_ID,
  APECHAIN_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  CELO_CHAIN_ID,
  FRAXTAL_CHAIN_ID,
  GNOSIS_CHAIN_ID,
  KATANA_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  LINEA_CHAIN_ID,
  MONAD_CHAIN_ID,
  MOONBEAM_CHAIN_ID,
  OPBNB_CHAIN_ID,
  PLASMA_CHAIN_ID,
  ROBINHOOD_CHAIN_ID,
  SEI_CHAIN_ID,
  TAIKO_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
  XDC_CHAIN_ID,
} from "@/lib/chains";

const SOURCE = readFileSync(new URL("./chain-logo.tsx", import.meta.url), "utf8");
const ROBINHOOD_MARK_ASSET = new URL(
  "../../../public/protocol-logos/robinhood-chain-mark.png",
  import.meta.url,
);

describe("ChainLogo source", () => {
  it("uses the original PulseChain vector mark instead of the generated fallback", () => {
    expect(PULSECHAIN_CHAIN_ID).toBe(369);
    expect(SOURCE).toContain("PULSECHAIN_LOGO_PATH");
    expect(SOURCE).toContain("PulseChain-Logo-Shape");
    expect(SOURCE).toContain("#00EAFF");
    expect(SOURCE).toContain("#FF0000");
    expect(SOURCE).not.toContain('d="M8 24h10l4-9 6 20 4-11h8"');
  });

  it("labels newer generic chains explicitly", () => {
    expect(SOURCE).toContain(`[LINEA_CHAIN_ID]: "Linea"`);
    expect(SOURCE).toContain(`[BLAST_CHAIN_ID]: "Blast"`);
    expect(SOURCE).toContain(`[BERACHAIN_CHAIN_ID]: "Berachain"`);
    expect(SOURCE).toContain(`[CELO_CHAIN_ID]: "Celo"`);
    expect(SOURCE).toContain(`[GNOSIS_CHAIN_ID]: "Gnosis"`);
    expect(SOURCE).toContain(`[UNICHAIN_CHAIN_ID]: "Unichain"`);
    expect(SOURCE).toContain(`[WORLDCHAIN_CHAIN_ID]: "World Chain"`);
    expect(SOURCE).toContain(`[ROBINHOOD_CHAIN_ID]: "Robinhood Chain"`);
    expect(SOURCE).toContain(`[MONAD_CHAIN_ID]: "Monad"`);
    expect(SOURCE).toContain(`[KATANA_CHAIN_ID]: "Katana"`);
    expect(SOURCE).toContain(`[SEI_CHAIN_ID]: "Sei"`);
    expect(SOURCE).toContain(`[PLASMA_CHAIN_ID]: "Plasma"`);
    expect(SOURCE).toContain(`[ABSTRACT_CHAIN_ID]: "Abstract"`);
    expect(SOURCE).toContain(`[FRAXTAL_CHAIN_ID]: "Fraxtal"`);
    expect(SOURCE).toContain(`[TAIKO_CHAIN_ID]: "Taiko Mainnet"`);
    expect(SOURCE).toContain(`[OPBNB_CHAIN_ID]: "opBNB"`);
    expect(SOURCE).toContain(`[MOONBEAM_CHAIN_ID]: "Moonbeam"`);
    expect(SOURCE).toContain(`[APECHAIN_CHAIN_ID]: "ApeChain"`);
    expect(SOURCE).toContain(`[XDC_CHAIN_ID]: "XDC Network"`);
  });

  it("routes newer generic chains away from the default mark", () => {
    expect(LINEA_CHAIN_ID).toBe(59144);
    expect(BLAST_CHAIN_ID).toBe(81457);
    expect(BERACHAIN_CHAIN_ID).toBe(80094);
    expect(CELO_CHAIN_ID).toBe(42220);
    expect(GNOSIS_CHAIN_ID).toBe(100);
    expect(UNICHAIN_CHAIN_ID).toBe(130);
    expect(WORLDCHAIN_CHAIN_ID).toBe(480);
    expect(ROBINHOOD_CHAIN_ID).toBe(4663);
    expect(MONAD_CHAIN_ID).toBe(143);
    expect(KATANA_CHAIN_ID).toBe(747474);
    expect(SEI_CHAIN_ID).toBe(1329);
    expect(PLASMA_CHAIN_ID).toBe(9745);
    expect(ABSTRACT_CHAIN_ID).toBe(2741);
    expect(FRAXTAL_CHAIN_ID).toBe(252);
    expect(TAIKO_CHAIN_ID).toBe(167000);
    expect(OPBNB_CHAIN_ID).toBe(204);
    expect(MOONBEAM_CHAIN_ID).toBe(1284);
    expect(APECHAIN_CHAIN_ID).toBe(33139);
    expect(XDC_CHAIN_ID).toBe(50);

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
    expect(SOURCE).toContain("case ROBINHOOD_CHAIN_ID:");
    expect(SOURCE).toContain("return <RobinhoodMark muted={muted} />");
    expect(SOURCE).toContain("case MONAD_CHAIN_ID:");
    expect(SOURCE).toContain("return <MonadMark muted={muted} />");
    expect(SOURCE).toContain("case KATANA_CHAIN_ID:");
    expect(SOURCE).toContain("return <KatanaMark muted={muted} />");
    expect(SOURCE).toContain("case SEI_CHAIN_ID:");
    expect(SOURCE).toContain("return <SeiMark muted={muted} />");
    expect(SOURCE).toContain("case PLASMA_CHAIN_ID:");
    expect(SOURCE).toContain("return <PlasmaMark muted={muted} />");
    expect(SOURCE).toContain("case ABSTRACT_CHAIN_ID:");
    expect(SOURCE).toContain("return <AbstractMark muted={muted} />");
    expect(SOURCE).toContain("case FRAXTAL_CHAIN_ID:");
    expect(SOURCE).toContain("return <FraxtalMark muted={muted} />");
    expect(SOURCE).toContain("case TAIKO_CHAIN_ID:");
    expect(SOURCE).toContain("return <TaikoMark muted={muted} />");
    expect(SOURCE).toContain("case OPBNB_CHAIN_ID:");
    expect(SOURCE).toContain("return <OpBnbMark muted={muted} />");
    expect(SOURCE).toContain("case MOONBEAM_CHAIN_ID:");
    expect(SOURCE).toContain("return <MoonbeamMark muted={muted} />");
    expect(SOURCE).toContain("case APECHAIN_CHAIN_ID:");
    expect(SOURCE).toContain("return <ApeChainMark muted={muted} />");
    expect(SOURCE).toContain("case XDC_CHAIN_ID:");
    expect(SOURCE).toContain("return <XdcMark muted={muted} />");
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
    expect(SOURCE).toContain("function RobinhoodMark");
    expect(SOURCE).toContain("ROBINHOOD_CHAIN_MARK_PATH");
    expect(SOURCE).toContain("/protocol-logos/robinhood-chain-mark.png");
    expect(SOURCE).toContain("#050505");
    expect(SOURCE).toContain("function MonadMark");
    expect(SOURCE).toContain("#7C3AED");
    expect(SOURCE).toContain("function KatanaMark");
    expect(SOURCE).toContain("#F97316");
    expect(SOURCE).toContain("function SeiMark");
    expect(SOURCE).toContain("#E11D48");
    expect(SOURCE).toContain("function PlasmaMark");
    expect(SOURCE).toContain("#22C55E");
    expect(SOURCE).toContain("function AbstractMark");
    expect(SOURCE).toContain("#111827");
    expect(SOURCE).toContain("#F8FAFC");
    expect(SOURCE).toContain("function FraxtalMark");
    expect(SOURCE).toContain("#00E5A8");
    expect(SOURCE).toContain("function TaikoMark");
    expect(SOURCE).toContain("#FF5A8A");
    expect(SOURCE).toContain("function OpBnbMark");
    expect(SOURCE).toContain("#F0B90B");
    expect(SOURCE).toContain("function MoonbeamMark");
    expect(SOURCE).toContain("#53CBC8");
    expect(SOURCE).toContain("function ApeChainMark");
    expect(SOURCE).toContain("#2D6BFF");
    expect(SOURCE).toContain("function XdcMark");
    expect(SOURCE).toContain("#31D6FF");
    expect(SOURCE).not.toContain('d="M15 13h13');
    expect(existsSync(ROBINHOOD_MARK_ASSET)).toBe(true);
  });
});
