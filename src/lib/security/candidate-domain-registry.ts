import { normalizeRegistryHostname } from "@/lib/security/official-domain-registry";

export type CandidateDomainSource = {
  id: string;
  label: string;
  sourceUrl: string;
  sourceRepositoryUrl: string;
  capturedAt: string;
};

export type CandidateDomainEntry = {
  hostname: string;
  source: CandidateDomainSource;
  lastReviewedAt: string;
  confidence: "candidate-source";
};

export const PLSTART_CANDIDATE_SOURCE: CandidateDomainSource = {
  id: "plstart-eth-limo",
  label: "plstart.me GitHub mirror",
  sourceUrl:
    "https://raw.githubusercontent.com/0xWhankFrite/plstart.eth.limo/6417ee6c6b86ab9fa79417e9cc532f70edc19446/index.html",
  sourceRepositoryUrl: "https://github.com/0xWhankFrite/plstart.eth.limo",
  capturedAt: "2026-05-30",
};

export const CANDIDATE_DOMAIN_HOSTNAMES = [
  "0xbarista.io",
  "0xbistro.io",
  "0xcoast.com",
  "0xstakehouse.io",
  "369.routescan.io",
  "9x.9mm.pro",
  "agproject.io",
  "amplifier-earn.powercity.io",
  "amplifier-ll.powercity.io",
  "app.2phux.io",
  "app.9inch.io",
  "app.actuator.finance",
  "app.dedaub.com",
  "app.dextop.pro",
  "app.hexpool.party",
  "app.hocuspocus.finance",
  "app.icosa.pro",
  "app.piteas.io",
  "app.pulse.domains",
  "app.pulseln.com",
  "app.pulsex.com",
  "app.vouch.run",
  "apphex.win",
  "beatbox.market",
  "beta.0xtide.com",
  "bitcointry.com",
  "bridge.pulsechain.com",
  "bridged.aff.icu",
  "carpediempension.com",
  "changenow.app.link",
  "chapulse.info",
  "chromewebstore.google.com",
  "coin.quest",
  "communis.app",
  "cryptoparadise.net",
  "crypto-stickers.com",
  "ct.app",
  "dapp.phiat.io",
  "degenprotocol.io",
  "dex.9mm.pro",
  "dex.dextop.pro",
  "dex.functionisland.com",
  "dexscreener.com",
  "dextop.pro",
  "drdoge.net",
  "emit.farm",
  "experiment0x.xyz",
  "frenkabal.com",
  "functionisland.com",
  "gibs.finance",
  "github.com",
  "gitlab.com",
  "gladiatorgamescrypto.net",
  "go.hex.com",
  "go.liquidloans.io",
  "hex.com",
  "hexcombinator.com",
  "hexscout.com",
  "houdiniswap.com",
  "impls.finance",
  "incprinter.com",
  "internetmoney.io",
  "ipfs.app.pulsex.com",
  "kilobyte.farm",
  "launchpad.pulsechain.com",
  "lending.axel.win",
  "libertyswap.finance",
  "liquidity-pools.vercel.app",
  "loganonpulse.com",
  "lpx.plusx.app",
  "megaswap.io",
  "midgard.wtf",
  "mineshafts.xyz",
  "minimeal.com",
  "mint.aff.icu",
  "multicall.exchange",
  "nanswap.com",
  "news.treeofalpha.com",
  "nexionpulse.com",
  "nexus.hyperlane.xyz",
  "nowpayments.io",
  "otter.pulsechain.com",
  "pdex.vision",
  "perpetuals.maximus.cash",
  "phame.io",
  "phux.io",
  "pls.aff.icu",
  "pls.basic-defi.xyz",
  "pls.to",
  "pls369.com",
  "plsmempool.vercel.app",
  "plstart.me",
  "plstart.win",
  "portalxswap.io",
  "poseidonpls.vercel.app",
  "powhr.xyz",
  "pulsechain.com",
  "pulsechain.thegrayscurrency.com",
  "pulsechaintablet.com",
  "pulsecoinlist.com",
  "pulseium.com",
  "pulselitecoin.app",
  "pulsemarket.app",
  "pulsesend.io",
  "pulseswap.io",
  "pulsicanstore.com",
  "pump.tires",
  "r3wardr.vercel.app",
  "radon-pls.netlify.app",
  "rhinofi.win",
  "rhmemes.com",
  "robsidedstaking.netlify.app",
  "safe.powercity.io",
  "safetrade.com",
  "scan.pulsechain.box",
  "scan.pulsechain.com",
  "scan.vf.at",
  "shop.ledger.com",
  "spinetracker.vercel.app",
  "squirrels.pro",
  "strategicplsreserve.xyz",
  "swap.hedron.pro",
  "swap.win",
  "switch.win",
  "t.me",
  "telegram.org",
  "tesseractx.com",
  "thepulsewallet.org",
  "thestakerclass.com",
  "tokensex.link",
  "tokentrader.win",
  "top.dextop.pro",
  "trade.kanga.exchange",
  "treasurysystem.win",
  "venice.ai",
  "vfat.io",
  "vox.finance",
  "vx.plusx.app",
  "web3.okx.com",
  "wonderland.cool",
  "www.0xbuffet.io",
  "www.0xcurv.win",
  "www.404.monster",
  "www.bullscope.com",
  "www.coingecko.com",
  "www.coinsbee.com",
  "www.core.powercity.io",
  "www.earn.powercity.io",
  "www.empseal.xyz",
  "www.fetchoracle.com",
  "www.flex.powercity.io",
  "www.g4mm4.io",
  "www.gas.zip",
  "www.geckoterminal.com",
  "www.google.com",
  "www.hexfire.io",
  "www.hexstats.com",
  "www.lookintohex.com",
  "www.lunarshard.limo",
  "www.moretokens.com",
  "www.overtimemarkets.xyz",
  "www.pipools.xyz",
  "www.plscharts.com",
  "www.plsfolio.com",
  "www.projectpilabs.com",
  "www.publish0x.com",
  "www.pulsechainstats.com",
  "www.puptoken.xyz",
  "www.rhinofi.win",
  "www.smartcontractgui.xyz",
  "www.solidx.win",
  "www.strategicethreserve.xyz",
  "www.unity.win",
  "www.x-usd.net",
  "www.yeponpulse.com",
  "x.com",
  "xtime-app.xyz",
  "zkpulse.app",
] as const;

export const CANDIDATE_DOMAIN_REGISTRY: readonly CandidateDomainEntry[] =
  CANDIDATE_DOMAIN_HOSTNAMES.map((hostname) => ({
    hostname,
    source: PLSTART_CANDIDATE_SOURCE,
    lastReviewedAt: PLSTART_CANDIDATE_SOURCE.capturedAt,
    confidence: "candidate-source",
  }));

export function findCandidateDomainMatches(
  hostname: string,
): CandidateDomainEntry[] {
  const normalizedHostname = normalizeCandidateHostname(hostname);
  const comparableHostname = stripWwwPrefix(normalizedHostname);

  return CANDIDATE_DOMAIN_REGISTRY.filter((entry) => {
    const candidateHostname = normalizeCandidateHostname(entry.hostname);
    return (
      normalizedHostname === candidateHostname ||
      comparableHostname === stripWwwPrefix(candidateHostname)
    );
  });
}

function normalizeCandidateHostname(hostname: string): string {
  return normalizeRegistryHostname(hostname);
}

function stripWwwPrefix(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}
