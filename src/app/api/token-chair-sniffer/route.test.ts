import { afterEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

vi.mock("@/lib/token-chair-sniffer-contract", () => ({
  fetchTokenChairContractData: vi.fn(async (tokenAddress: string) => ({
    tokenAddress,
    status: "success",
    tokenName: "Chair Token",
    tokenSymbol: "CHAIR",
    decimals: 18,
    ownerAddress: null,
    ownerFunction: "owner",
    ownershipRenounced: true,
    proxy: {
      detected: false,
      implementationAddress: null,
      adminAddress: null,
      beaconAddress: null,
      minimalProxyTarget: null,
      checks: [],
    },
    explorer: null,
    holders: null,
    warnings: [],
    errors: [],
  })),
}));

vi.mock("@/lib/token-chair-sniffer-explorer", () => ({
  fetchTokenChairExplorerData: vi.fn(async (tokenAddress: string) => ({
    status: "success",
    sourceVerified: true,
    abiAvailable: true,
    sourceCodeAvailable: true,
    contractName: "Chair Token",
    compilerVersion: "v0.8.24+commit.e11b9ed9",
    verifiedAt: "2026-01-01T00:00:00Z",
    deployerAddress: "0x1111111111111111111111111111111111111111",
    creationTxHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    explorerAddressUrl: `https://scan.pulsechain.com/address/${tokenAddress}`,
    explorerTokenUrl: `https://scan.pulsechain.com/token/${tokenAddress}`,
    explorerTxUrl:
      "https://scan.pulsechain.com/tx/0x2222222222222222222222222222222222222222222222222222222222222222",
    sourceSignals: [],
    warnings: [],
    errors: [],
  })),
}));

vi.mock("@/lib/token-chair-sniffer-holders", () => ({
  fetchTokenChairHolderData: vi.fn(async () => ({
    status: "success",
    token: {
      percent: 12.5,
      address: "0x3333333333333333333333333333333333333333",
      isContract: false,
      holdersCount: 1234,
      sampledHolderCount: 50,
      totalSupplyRaw: "1000000",
      valueRaw: "125000",
    },
    lp: {
      percent: 24.25,
      address: "0x4444444444444444444444444444444444444444",
      isContract: true,
      holdersCount: 42,
      sampledHolderCount: 42,
      totalSupplyRaw: "100000",
      valueRaw: "24250",
      pairAddress: "0x165C3410fC91EF562C50559f7d2289fEbed552d9",
    },
    distribution: {
      sampledHolderCount: 10,
      pageCount: 1,
      maxPagesReached: false,
      holdersCount: 1234,
      totalSupplyRaw: "1000000",
      top1Percent: 12.5,
      top5Percent: 31.5,
      top10Percent: 48,
      burnDeadPercent: 0,
      selectedPairPercent: 8.5,
      topHolders: [
        {
          rank: 1,
          address: "0x3333333333333333333333333333333333333333",
          percent: 12.5,
          isContract: false,
          valueRaw: "125000",
        },
      ],
    },
    lpDistribution: {
      sampledHolderCount: 6,
      pageCount: 1,
      maxPagesReached: false,
      holdersCount: 42,
      totalSupplyRaw: "100000",
      top1Percent: 24.25,
      top5Percent: 40,
      top10Percent: 40,
      burnDeadPercent: 0,
      selectedPairPercent: null,
      topHolders: [
        {
          rank: 1,
          address: "0x4444444444444444444444444444444444444444",
          percent: 24.25,
          isContract: true,
          valueRaw: "24250",
        },
      ],
    },
    warnings: [],
    errors: [],
  })),
}));

import { GET } from "./route";
import { resetTokenChairApiRateLimitForTests } from "@/lib/token-chair-sniffer-controls";

const TOKEN = getAddress("0xcae394005c9c4c309621c53d53db9ceb701fc8d8");
const QUOTE = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PAIR = getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9");

afterEach(() => {
  resetTokenChairApiRateLimitForTests();
  vi.unstubAllGlobals();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("Token Chair Sniffer API route", () => {
  it("rejects invalid token addresses before upstream fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request("https://pulserevoke.test/api/token-chair-sniffer?token=nope"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects non-PulseChain chain IDs", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-chair-sniffer?token=${TOKEN}&chainId=ethereum`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("chainId=pulsechain");
  });

  it("rejects caller-controlled read ranges before scanning", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-chair-sniffer?token=${TOKEN}&fromBlock=1`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("server-bounded read windows");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns no-pair-found from an empty DEX Screener response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([])),
    );

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-chair-sniffer?token=${TOKEN}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expectNoStore(response);
    expect(response.headers.get("X-Token-Chair-Timeout-Ms")).toBe("10000");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("20");
    expect(body.status).toBe("no-pair-found");
    expect(body.market).toBeNull();
  });

  it("rate-limits repeated public Token Chair scans", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([])),
    );

    let response: Response | null = null;
    for (let i = 0; i < 21; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/token-chair-sniffer?token=${TOKEN}`,
          { headers: { "x-forwarded-for": "203.0.113.22" } },
        ),
      );
    }

    expect(response?.status).toBe(429);
    expectNoStore(response!);
    expect(response?.headers.get("Retry-After")).toBeTruthy();
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("20");
    const body = await response!.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe("upstream-unavailable");
    expect(body.errors.join(" ")).toContain("rate limit exceeded");
  });

  it("returns success for normalized PulseChain market data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          {
            chainId: "pulsechain",
            dexId: "pulsex",
            url: `https://dexscreener.com/pulsechain/${PAIR}`,
            pairAddress: PAIR,
            baseToken: {
              address: TOKEN,
              name: "Chair Token",
              symbol: "CHAIR",
            },
            quoteToken: {
              address: QUOTE,
              name: "Wrapped Pulse",
              symbol: "WPLS",
            },
            priceUsd: "0.01",
            txns: { h24: { buys: 1, sells: 2 } },
            volume: { h24: 99 },
            liquidity: { usd: 10000 },
            fdv: 100000,
            marketCap: 90000,
            pairCreatedAt: 1700000000000,
          },
        ]),
      ),
    );

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-chair-sniffer?token=${TOKEN}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("success");
    expect(body.market.tokenSymbol).toBe("CHAIR");
    expect(body.market.dexName).toBe("PulseX");
    expect(body.contract.tokenSymbol).toBe("CHAIR");
    expect(body.contract.ownershipRenounced).toBe(true);
    expect(body.contract.explorer.sourceVerified).toBe(true);
    expect(body.contract.explorer.deployerAddress).toBe(
      "0x1111111111111111111111111111111111111111",
    );
    expect(body.contract.holders.token.percent).toBe(12.5);
    expect(body.contract.holders.lp.percent).toBe(24.25);
    expect(body.contract.holders.distribution.top10Percent).toBe(48);
    expect(body.contract.holders.lpDistribution.top1Percent).toBe(24.25);
  });

  it("returns malformed-response as an upstream failure HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ pairs: [] })),
    );

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/token-chair-sniffer?token=${TOKEN}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(502);
    expectNoStore(response);
    expect(body.status).toBe("malformed-response");
  });
});
