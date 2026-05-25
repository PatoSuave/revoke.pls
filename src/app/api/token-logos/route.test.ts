import { afterEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
} from "@/lib/chains";
import { tokenLogoAddressKey } from "@/lib/token-logos";
import { GET } from "./route";

const WPLS = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PLSX = getAddress("0x95B303987A60C71504D99Aa1b13B4DA07b0790ab");
const WBNB = getAddress("0xBB4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");
const WPOL = getAddress("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("token logo API route", () => {
  it("rejects unsupported logo requests without hitting Dex Screener", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=${BASE_CHAIN_ID}&addresses=${WPLS}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("Polygon chainId=137");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns an empty cached result when no token addresses are provided", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=${PULSECHAIN_CHAIN_ID}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=21600");
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
});
