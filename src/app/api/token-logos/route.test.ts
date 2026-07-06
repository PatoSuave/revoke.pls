import { afterEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BSC_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  SONIC_CHAIN_ID,
} from "@/lib/chains";
import {
  TOKEN_LOGO_API_RATE_LIMIT,
  resetTokenLogoApiRateLimitForTests,
} from "@/lib/token-logo-api-controls";
import {
  ARBITRUM_TOKEN_LOGO_CHAIN_ID,
  ETHEREUM_TOKEN_LOGO_CHAIN_ID,
  HYPEREVM_TOKEN_LOGO_CHAIN_ID,
  OPTIMISM_TOKEN_LOGO_CHAIN_ID,
  tokenLogoAddressKey,
} from "@/lib/token-logos";
import { GET } from "./route";

const WPLS = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PLSX = getAddress("0x95B303987A60C71504D99Aa1b13B4DA07b0790ab");
const WBNB = getAddress("0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
const WPOL = getAddress("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");
const WETH = getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
const WAVAX = getAddress("0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7");
const WMNT = getAddress("0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8");
const BERA_TOKEN = getAddress("0x6969696969696969696969696969696969696969");

afterEach(() => {
  vi.unstubAllGlobals();
  resetTokenLogoApiRateLimitForTests();
});

describe("token logo API route", () => {
  it("rejects unsupported logo requests without hitting Dex Screener", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=11155111&addresses=${WPLS}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("Base chainId=8453");
    expect(body.errors.join(" ")).toContain("Sonic chainId=146");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns an empty no-store result when no token addresses are provided", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=${PULSECHAIN_CHAIN_ID}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
    expect(body.status).toBe("empty");
    expect(body.logos).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches PulseChain token logos through the capped Dex Screener token endpoint", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));

      expect(url.origin + url.pathname).toBe(
        `https://api.dexscreener.com/tokens/v1/pulsechain/${WPLS},${PLSX}`,
      );
      expect(init?.headers).toEqual({ Accept: "application/json" });

      return Response.json([
        {
          url: "https://dexscreener.com/pulsechain/0xpair",
          baseToken: { address: WPLS.toLowerCase() },
          quoteToken: { address: PLSX },
          info: { imageUrl: "https://cdn.dexscreener.com/wpls.png" },
        },
        {
          url: "https://dexscreener.com/pulsechain/0xpair2",
          baseToken: { address: PLSX },
          info: { imageUrl: "https://cdn.dexscreener.com/plsx.png" },
        },
      ]);
    });
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=${PULSECHAIN_CHAIN_ID}&addresses=${WPLS.toLowerCase()},${PLSX},${WPLS}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
    expect(body.status).toBe("complete");
    expect(body.requested).toBe(2);
    expect(body.logos[tokenLogoAddressKey(WPLS)]).toMatchObject({
      tokenAddress: WPLS,
      imageUrl: "https://cdn.dexscreener.com/wpls.png",
      source: "dexscreener",
    });
    expect(body.logos[tokenLogoAddressKey(PLSX)]).toMatchObject({
      tokenAddress: PLSX,
      imageUrl: "https://cdn.dexscreener.com/plsx.png",
      source: "dexscreener",
    });
  });

  it("fills missing PulseChain logos from the 9mm token list fallback", async () => {
    const fallbackLogo =
      "https://raw.githubusercontent.com/9mm-exchange/app-tokens/main/token-logo/wpls.png";
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.hostname === "api.dexscreener.com") {
        return Response.json([]);
      }

      expect(url.href).toBe(
        "https://raw.githubusercontent.com/9mm-exchange/app-tokens/main/9mm-tokenlist.json",
      );
      return Response.json({
        tokens: [
          {
            chainId: PULSECHAIN_CHAIN_ID,
            address: WPLS.toLowerCase(),
            logoURI: fallbackLogo,
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=${PULSECHAIN_CHAIN_ID}&addresses=${WPLS}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("complete");
    expect(body.sources).toEqual(["dexscreener", "9mm-tokenlist"]);
    expect(body.logos[tokenLogoAddressKey(WPLS)]).toMatchObject({
      tokenAddress: WPLS,
      imageUrl: fallbackLogo,
      source: "9mm-tokenlist",
      sourceUrl:
        "https://raw.githubusercontent.com/9mm-exchange/app-tokens/main/9mm-tokenlist.json",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uses the 9mm token list fallback when Dex Screener is unavailable", async () => {
    const fallbackLogo =
      "https://raw.githubusercontent.com/9mm-exchange/app-tokens/main/base-logos/weth.png";
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.hostname === "api.dexscreener.com") {
        return new Response("nope", { status: 503 });
      }

      expect(url.href).toBe(
        "https://raw.githubusercontent.com/9mm-exchange/app-tokens/main/base-tokenlist.json",
      );
      return Response.json({
        tokens: [
          {
            chainId: BASE_CHAIN_ID,
            address: WETH,
            logoURI: fallbackLogo,
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=${BASE_CHAIN_ID}&addresses=${WETH}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
    expect(body.source).toBe("9mm-tokenlist");
    expect(body.sources).toEqual(["9mm-tokenlist"]);
    expect(body.logos[tokenLogoAddressKey(WETH)]).toMatchObject({
      tokenAddress: WETH,
      imageUrl: fallbackLogo,
      source: "9mm-tokenlist",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fetches BSC token logos through the Dex Screener token endpoint", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      expect(url.origin + url.pathname).toBe(
        `https://api.dexscreener.com/tokens/v1/bsc/${WBNB}`,
      );

      return Response.json([
        {
          url: "https://dexscreener.com/bsc/0xpair",
          baseToken: { address: WBNB.toLowerCase() },
          info: { imageUrl: "https://cdn.dexscreener.com/wbnb.png" },
        },
      ]);
    });
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=${BSC_CHAIN_ID}&addresses=${WBNB}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("complete");
    expect(body.requested).toBe(1);
    expect(body.logos[tokenLogoAddressKey(WBNB)]).toMatchObject({
      tokenAddress: WBNB,
      imageUrl: "https://cdn.dexscreener.com/wbnb.png",
      source: "dexscreener",
    });
  });

  it.each([
    [ETHEREUM_TOKEN_LOGO_CHAIN_ID, "ethereum", WETH],
    [BASE_CHAIN_ID, "base", WETH],
    [SONIC_CHAIN_ID, "sonic", WETH],
    [AVALANCHE_CHAIN_ID, "avalanche", WAVAX],
    [MANTLE_CHAIN_ID, "mantle", WMNT],
    [LINEA_CHAIN_ID, "linea", WETH],
    [BLAST_CHAIN_ID, "blast", WETH],
    [BERACHAIN_CHAIN_ID, "berachain", BERA_TOKEN],
    [ARBITRUM_TOKEN_LOGO_CHAIN_ID, "arbitrum", WETH],
    [OPTIMISM_TOKEN_LOGO_CHAIN_ID, "optimism", WETH],
    [HYPEREVM_TOKEN_LOGO_CHAIN_ID, "hyperevm", WETH],
  ])(
    "fetches token logos through the %s Dex Screener slug",
    async (chainId, slug, token) => {
      const fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));

        expect(url.origin + url.pathname).toBe(
          `https://api.dexscreener.com/tokens/v1/${slug}/${token}`,
        );

        return Response.json([
          {
            url: `https://dexscreener.com/${slug}/0xpair`,
            baseToken: { address: token.toLowerCase() },
            info: { imageUrl: `https://cdn.dexscreener.com/${slug}.png` },
          },
        ]);
      });
      vi.stubGlobal("fetch", fetch);

      const response = await GET(
        new Request(
          `https://pulserevoke.test/api/token-logos?chainId=${chainId}&addresses=${token}`,
        ),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("complete");
      expect(body.logos[tokenLogoAddressKey(token)]).toMatchObject({
        tokenAddress: token,
        imageUrl: `https://cdn.dexscreener.com/${slug}.png`,
        source: "dexscreener",
      });
    },
  );

  it("fetches Polygon token logos through the Dex Screener token endpoint", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      expect(url.origin + url.pathname).toBe(
        `https://api.dexscreener.com/tokens/v1/polygon/${WPOL}`,
      );

      return Response.json([
        {
          url: "https://dexscreener.com/polygon/0xpair",
          baseToken: { address: WPOL.toLowerCase() },
          info: { imageUrl: "https://cdn.dexscreener.com/wpol.png" },
        },
      ]);
    });
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=${POLYGON_CHAIN_ID}&addresses=${WPOL}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("complete");
    expect(body.requested).toBe(1);
    expect(body.logos[tokenLogoAddressKey(WPOL)]).toMatchObject({
      tokenAddress: WPOL,
      imageUrl: "https://cdn.dexscreener.com/wpol.png",
      source: "dexscreener",
    });
  });

  it("returns a non-cached upstream failure when Dex Screener errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 503 })),
    );

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=${PULSECHAIN_CHAIN_ID}&addresses=${WPLS}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body.status).toBe("upstream-failure");
    expect(body.logos).toEqual({});
  });

  it("rate-limits repeated token logo lookups before hitting Dex Screener", async () => {
    const fetch = vi.fn(async () => Response.json([]));
    vi.stubGlobal("fetch", fetch);

    let response: Response | null = null;
    for (let i = 0; i <= TOKEN_LOGO_API_RATE_LIMIT.maxRequests; i++) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/token-logos?chainId=${PULSECHAIN_CHAIN_ID}&addresses=${WPLS}`,
          { headers: { "x-forwarded-for": "203.0.113.10" } },
        ),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Cache-Control")).toContain("no-store");
    expect(response?.headers.get("Retry-After")).toBeTruthy();
    const body = await response!.json();
    expect(body).toMatchObject({
      ok: false,
      status: "upstream-failure",
      rateLimited: true,
      logos: {},
    });
    expect(fetch).toHaveBeenCalledTimes(TOKEN_LOGO_API_RATE_LIMIT.maxRequests * 2);
  });
});
