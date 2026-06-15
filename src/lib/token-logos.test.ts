import { describe, expect, it } from "vitest";
import { getAddress } from "viem";

import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  SONIC_CHAIN_ID,
} from "@/lib/chains";
import {
  ARBITRUM_TOKEN_LOGO_CHAIN_ID,
  ETHEREUM_TOKEN_LOGO_CHAIN_ID,
  HYPEREVM_TOKEN_LOGO_CHAIN_ID,
  OPTIMISM_TOKEN_LOGO_CHAIN_ID,
  TOKEN_LOGO_MAX_ADDRESSES,
  extractTokenLogosFromDexScreenerPairs,
  getDexScreenerChainSlugForTokenLogos,
  isAllowedTokenLogoUrl,
  isTokenLogoSupportedChain,
  normalizeLogoAddress,
  normalizeLogoAddresses,
  tokenLogoAddressKey,
} from "@/lib/token-logos";

const WPLS = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PLSX = getAddress("0x95B303987A60C71504D99Aa1b13B4DA07b0790ab");
const WBNB = getAddress("0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
const WPOL = getAddress("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");
const WAVAX = getAddress("0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7");
const WMNT = getAddress("0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8");

describe("token logo helpers", () => {
  it("keeps logo lookup scoped to explicitly enabled chains", () => {
    expect(isTokenLogoSupportedChain(ETHEREUM_TOKEN_LOGO_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(ETHEREUM_TOKEN_LOGO_CHAIN_ID)).toBe(
      "ethereum",
    );
    expect(isTokenLogoSupportedChain(OPTIMISM_TOKEN_LOGO_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(OPTIMISM_TOKEN_LOGO_CHAIN_ID)).toBe(
      "optimism",
    );
    expect(isTokenLogoSupportedChain(PULSECHAIN_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(PULSECHAIN_CHAIN_ID)).toBe(
      "pulsechain",
    );
    expect(isTokenLogoSupportedChain(BSC_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(BSC_CHAIN_ID)).toBe("bsc");
    expect(isTokenLogoSupportedChain(BASE_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(BASE_CHAIN_ID)).toBe("base");
    expect(isTokenLogoSupportedChain(POLYGON_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(POLYGON_CHAIN_ID)).toBe(
      "polygon",
    );
    expect(isTokenLogoSupportedChain(SONIC_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(SONIC_CHAIN_ID)).toBe("sonic");
    expect(isTokenLogoSupportedChain(AVALANCHE_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(AVALANCHE_CHAIN_ID)).toBe(
      "avalanche",
    );
    expect(isTokenLogoSupportedChain(MANTLE_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(MANTLE_CHAIN_ID)).toBe(
      "mantle",
    );
    expect(isTokenLogoSupportedChain(ARBITRUM_TOKEN_LOGO_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(ARBITRUM_TOKEN_LOGO_CHAIN_ID)).toBe(
      "arbitrum",
    );
    expect(isTokenLogoSupportedChain(HYPEREVM_TOKEN_LOGO_CHAIN_ID)).toBe(true);
    expect(getDexScreenerChainSlugForTokenLogos(HYPEREVM_TOKEN_LOGO_CHAIN_ID)).toBe(
      "hyperevm",
    );
    expect(isTokenLogoSupportedChain(11155111)).toBe(false);
    expect(getDexScreenerChainSlugForTokenLogos(11155111)).toBeNull();
  });

  it("normalizes, dedupes, and caps token addresses", () => {
    const extras = Array.from({ length: TOKEN_LOGO_MAX_ADDRESSES + 3 }, (_, i) =>
      `0x${(i + 1).toString(16).padStart(40, "0")}`,
    );
    const normalized = normalizeLogoAddresses([
      WPLS.toLowerCase(),
      WPLS,
      "not-an-address",
      ...extras,
    ]);

    expect(normalized[0]).toBe(WPLS);
    expect(normalized).toHaveLength(TOKEN_LOGO_MAX_ADDRESSES);
  });

  it("rejects malformed addresses and non-HTTPS image URLs", () => {
    expect(normalizeLogoAddress("nope")).toBeNull();
    expect(normalizeLogoAddress(WPLS.toLowerCase())).toBe(WPLS);
    expect(isAllowedTokenLogoUrl("https://cdn.dexscreener.com/token.png")).toBe(
      true,
    );
    expect(isAllowedTokenLogoUrl("http://cdn.dexscreener.com/token.png")).toBe(
      false,
    );
    expect(isAllowedTokenLogoUrl("javascript:alert(1)")).toBe(false);
  });

  it("extracts first valid Dex Screener logo per requested token", () => {
    const logos = extractTokenLogosFromDexScreenerPairs({
      chainId: PULSECHAIN_CHAIN_ID,
      requestedAddresses: [WPLS, PLSX],
      payload: [
        {
          url: "https://dexscreener.com/pulsechain/0xpair1",
          baseToken: { address: WPLS.toLowerCase() },
          quoteToken: { address: PLSX },
          info: { imageUrl: "https://cdn.dexscreener.com/wpls.png" },
        },
        {
          url: "https://dexscreener.com/pulsechain/0xpair2",
          baseToken: { address: PLSX },
          info: { imageUrl: "http://example.com/plsx.png" },
        },
        {
          url: "https://dexscreener.com/pulsechain/0xpair3",
          baseToken: { address: PLSX },
          info: { imageUrl: "https://cdn.dexscreener.com/plsx.png" },
        },
      ],
    });

    expect(logos[tokenLogoAddressKey(WPLS)]).toMatchObject({
      tokenAddress: WPLS,
      imageUrl: "https://cdn.dexscreener.com/wpls.png",
      source: "dexscreener",
      sourceUrl: "https://dexscreener.com/pulsechain/0xpair1",
    });
    expect(logos[tokenLogoAddressKey(PLSX)]).toMatchObject({
      tokenAddress: PLSX,
      imageUrl: "https://cdn.dexscreener.com/plsx.png",
      source: "dexscreener",
    });
  });

  it("extracts BSC logos from Dex Screener token pairs", () => {
    const logos = extractTokenLogosFromDexScreenerPairs({
      chainId: BSC_CHAIN_ID,
      requestedAddresses: [WBNB],
      payload: [
        {
          url: "https://dexscreener.com/bsc/0xpair1",
          baseToken: { address: WBNB.toLowerCase() },
          info: { imageUrl: "https://cdn.dexscreener.com/wbnb.png" },
        },
      ],
    });

    expect(logos[tokenLogoAddressKey(WBNB)]).toMatchObject({
      chainId: BSC_CHAIN_ID,
      tokenAddress: WBNB,
      imageUrl: "https://cdn.dexscreener.com/wbnb.png",
      source: "dexscreener",
      sourceUrl: "https://dexscreener.com/bsc/0xpair1",
    });
  });

  it("extracts Polygon logos from Dex Screener token pairs", () => {
    const logos = extractTokenLogosFromDexScreenerPairs({
      chainId: POLYGON_CHAIN_ID,
      requestedAddresses: [WPOL],
      payload: [
        {
          url: "https://dexscreener.com/polygon/0xpair1",
          baseToken: { address: WPOL.toLowerCase() },
          info: { imageUrl: "https://cdn.dexscreener.com/wpol.png" },
        },
      ],
    });

    expect(logos[tokenLogoAddressKey(WPOL)]).toMatchObject({
      chainId: POLYGON_CHAIN_ID,
      tokenAddress: WPOL,
      imageUrl: "https://cdn.dexscreener.com/wpol.png",
      source: "dexscreener",
      sourceUrl: "https://dexscreener.com/polygon/0xpair1",
    });
  });

  it("extracts Sonic, Avalanche, and Mantle logos from Dex Screener token pairs", () => {
    const sonicLogos = extractTokenLogosFromDexScreenerPairs({
      chainId: 146,
      requestedAddresses: [WPOL],
      payload: [
        {
          url: "https://dexscreener.com/sonic/0xpair1",
          baseToken: { address: WPOL.toLowerCase() },
          info: { imageUrl: "https://cdn.dexscreener.com/sonic-token.png" },
        },
      ],
    });
    const avalancheLogos = extractTokenLogosFromDexScreenerPairs({
      chainId: AVALANCHE_CHAIN_ID,
      requestedAddresses: [WAVAX],
      payload: [
        {
          url: "https://dexscreener.com/avalanche/0xpair1",
          baseToken: { address: WAVAX.toLowerCase() },
          info: { imageUrl: "https://cdn.dexscreener.com/wavax.png" },
        },
      ],
    });
    const mantleLogos = extractTokenLogosFromDexScreenerPairs({
      chainId: MANTLE_CHAIN_ID,
      requestedAddresses: [WMNT],
      payload: [
        {
          url: "https://dexscreener.com/mantle/0xpair1",
          baseToken: { address: WMNT.toLowerCase() },
          info: { imageUrl: "https://cdn.dexscreener.com/wmnt.png" },
        },
      ],
    });

    expect(sonicLogos[tokenLogoAddressKey(WPOL)]).toMatchObject({
      chainId: 146,
      tokenAddress: WPOL,
      imageUrl: "https://cdn.dexscreener.com/sonic-token.png",
      source: "dexscreener",
      sourceUrl: "https://dexscreener.com/sonic/0xpair1",
    });
    expect(avalancheLogos[tokenLogoAddressKey(WAVAX)]).toMatchObject({
      chainId: AVALANCHE_CHAIN_ID,
      tokenAddress: WAVAX,
      imageUrl: "https://cdn.dexscreener.com/wavax.png",
      source: "dexscreener",
      sourceUrl: "https://dexscreener.com/avalanche/0xpair1",
    });
    expect(mantleLogos[tokenLogoAddressKey(WMNT)]).toMatchObject({
      chainId: MANTLE_CHAIN_ID,
      tokenAddress: WMNT,
      imageUrl: "https://cdn.dexscreener.com/wmnt.png",
      source: "dexscreener",
      sourceUrl: "https://dexscreener.com/mantle/0xpair1",
    });
  });
});
