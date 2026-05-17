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

import { GET } from "./route";

const TOKEN = getAddress("0xcae394005c9c4c309621c53d53db9ceb701fc8d8");
const QUOTE = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PAIR = getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9");

afterEach(() => {
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
    expect(body.status).toBe("no-pair-found");
    expect(body.market).toBeNull();
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
