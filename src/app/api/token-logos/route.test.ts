import { afterEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import { tokenLogoAddressKey } from "@/lib/token-logos";
import { GET } from "./route";

const WPLS = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PLSX = getAddress("0x95B303987A60C71504D99Aa1b13B4DA07b0790ab");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("token logo API route", () => {
  it("rejects non-PulseChain logo requests without hitting Dex Screener", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-logos?chainId=56&addresses=${WPLS}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body.status).toBe("bad-request");
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
