import { describe, expect, it, vi } from "vitest";
import { getAddress, type Address } from "viem";

import { fetchDexScreenerTokenPairs } from "@/lib/token-chair-sniffer-server";
import {
  TOKEN_CHAIR_CHAIN_ID,
  TOKEN_CHAIR_SNIFFER_ROUTE,
  buildContractSniffCards,
  buildEventHistoryDetailRows,
  buildPairCandidateRows,
  buildTokenChairSnifferUrl,
  buildQuickSniffRows,
  classifyTokenChairAddress,
  formatPairAge,
  getTokenChairVerdict,
  normalizeDexScreenerTokenPairsResponse,
  normalizeTokenChairAddress,
  normalizeTokenChairQueryToken,
  type TokenChairContractData,
} from "@/lib/token-chair-sniffer";

const TOKEN = getAddress("0xcae394005c9c4c309621c53d53db9ceb701fc8d8");
const QUOTE = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PAIR = getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9");
const CREATED_AT = 1_700_000_000_000;

function dexPair(overrides: Record<string, unknown> = {}) {
  return {
    chainId: TOKEN_CHAIR_CHAIN_ID,
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
    priceUsd: "0.012345",
    txns: {
      h24: {
        buys: 12,
        sells: 8,
      },
    },
    volume: {
      h24: 12345.67,
    },
    liquidity: {
      usd: 50000,
      base: 1,
      quote: 2,
    },
    fdv: 2500000,
    marketCap: 2100000,
    pairCreatedAt: CREATED_AT,
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("Token Chair Sniffer helpers", () => {
  it("normalizes valid token addresses and rejects invalid input", () => {
    expect(normalizeTokenChairAddress(`  ${TOKEN.toLowerCase()}  `)).toBe(TOKEN);
    expect(normalizeTokenChairAddress("")).toBeNull();
    expect(normalizeTokenChairAddress("not-an-address")).toBeNull();
    expect(normalizeTokenChairAddress("0x1234")).toBeNull();
  });

  it("normalizes share-link token params and builds canonical sniffer URLs", () => {
    expect(normalizeTokenChairQueryToken(TOKEN.toLowerCase())).toBe(TOKEN);
    expect(normalizeTokenChairQueryToken([TOKEN.toLowerCase(), QUOTE])).toBe(TOKEN);
    expect(normalizeTokenChairQueryToken(["not-an-address"])).toBeNull();
    expect(normalizeTokenChairQueryToken(undefined)).toBeNull();
    expect(buildTokenChairSnifferUrl(TOKEN.toLowerCase())).toBe(
      `${TOKEN_CHAIR_SNIFFER_ROUTE}?token=${TOKEN}`,
    );
    expect(buildTokenChairSnifferUrl("not-an-address")).toBe(
      TOKEN_CHAIR_SNIFFER_ROUTE,
    );
  });

  it("classifies visible addresses without implying audit certainty", () => {
    const owner = getAddress("0x3333333333333333333333333333333333333333");
    const deployer = getAddress("0x4444444444444444444444444444444444444444");
    const contract = getAddress("0x5555555555555555555555555555555555555555");

    expect(classifyTokenChairAddress("not-an-address")).toBeNull();
    expect(
      classifyTokenChairAddress(
        "0x0000000000000000000000000000000000000000",
      )?.kind,
    ).toBe("zero-address");
    expect(
      classifyTokenChairAddress(
        "0x000000000000000000000000000000000000dEaD",
      )?.kind,
    ).toBe("burn-address");
    expect(
      classifyTokenChairAddress(PAIR, {
        tokenAddress: TOKEN,
        pairAddress: PAIR,
        ownerAddress: owner,
        deployerAddress: deployer,
        isContract: true,
      })?.kind,
    ).toBe("selected-pair");
    expect(
      classifyTokenChairAddress(owner, {
        tokenAddress: TOKEN,
        pairAddress: PAIR,
        ownerAddress: owner,
        deployerAddress: deployer,
        isContract: false,
      })?.kind,
    ).toBe("owner");
    expect(
      classifyTokenChairAddress(deployer, {
        tokenAddress: TOKEN,
        deployerAddress: deployer,
        isContract: false,
      })?.kind,
    ).toBe("deployer");
    expect(classifyTokenChairAddress(contract, { isContract: true })?.kind).toBe(
      "contract",
    );
    expect(classifyTokenChairAddress(contract, { isContract: false })?.kind).toBe(
      "wallet",
    );
  });

  it("normalizes DEX Screener token-pairs responses", () => {
    const result = normalizeDexScreenerTokenPairsResponse([dexPair()], TOKEN, {
      now: CREATED_AT + 2 * 24 * 60 * 60 * 1000,
    });

    expect(result.status).toBe("success");
    expect(result.ok).toBe(true);
    expect(result.market).toMatchObject({
      tokenAddress: TOKEN,
      tokenName: "Chair Token",
      tokenSymbol: "CHAIR",
      pairAddress: PAIR,
      dexName: "PulseX",
      priceUsd: "0.012345",
      liquidityUsd: 50000,
      volume24h: 12345.67,
      fdv: 2500000,
      marketCap: 2100000,
      dexScreenerUrl: `https://dexscreener.com/pulsechain/${PAIR}`,
      pairAgeLabel: "2d",
      quoteTokenSymbol: "WPLS",
      quoteTokenName: "Wrapped Pulse",
    });
    expect(result.market?.txns24h).toEqual({ buys: 12, sells: 8, total: 20 });
    expect(formatPairAge(result.market?.pairCreatedAt ?? null, CREATED_AT + 2 * 24 * 60 * 60 * 1000)).toBe("2d");
  });

  it("selects the most liquid PulseChain pair as the primary market", () => {
    const lowerLiquidityPair = dexPair({
      pairAddress: getAddress("0x0000000000000000000000000000000000000001"),
      liquidity: { usd: 10 },
      volume: { h24: 999999 },
    });
    const higherLiquidityPair = dexPair({
      pairAddress: getAddress("0x0000000000000000000000000000000000000002"),
      liquidity: { usd: 10000 },
      volume: { h24: 1 },
    });

    const result = normalizeDexScreenerTokenPairsResponse(
      [lowerLiquidityPair, higherLiquidityPair],
      TOKEN,
    );

    expect(result.status).toBe("success");
    expect(result.market?.pairAddress).toBe(
      getAddress("0x0000000000000000000000000000000000000002"),
    );
    expect(result.market?.pairCount).toBe(2);
  });

  it("builds conservative pair candidate rows from normalized DEX Screener pairs", () => {
    const selectedPair = dexPair({
      liquidity: { usd: 10000 },
      pairCreatedAt: CREATED_AT - 3 * 24 * 60 * 60 * 1000,
    });
    const lowLiquidityPair = dexPair({
      pairAddress: getAddress("0x0000000000000000000000000000000000000003"),
      liquidity: { usd: 500 },
    });
    const noTxnPair = dexPair({
      pairAddress: getAddress("0x0000000000000000000000000000000000000004"),
      liquidity: { usd: 12000 },
      txns: { h24: { buys: 0, sells: 0 } },
    });
    const response = normalizeDexScreenerTokenPairsResponse(
      [selectedPair, lowLiquidityPair, noTxnPair],
      TOKEN,
      { now: CREATED_AT },
    );
    const rows = buildPairCandidateRows(response.pairs);
    const rowText = rows.map((row) => row.statusLabel).join(" ").toLowerCase();

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      rank: 1,
      status: "selected",
      statusLabel: "Selected pair",
      liquidityUsd: "$12,000",
    });
    expect(rows[1]).toMatchObject({
      status: "available",
      statusLabel: "Visible market data",
    });
    expect(rows[2]).toMatchObject({
      status: "warning",
      statusLabel: "Very low liquidity",
    });
    expect(rowText).not.toMatch(/\bsafe\b/);
  });

  it("reports no-pair and malformed response states without false market data", () => {
    const noPair = normalizeDexScreenerTokenPairsResponse([], TOKEN);
    const malformedTopLevel = normalizeDexScreenerTokenPairsResponse(
      { pairs: [] },
      TOKEN,
    );
    const malformedPair = normalizeDexScreenerTokenPairsResponse(
      [{ chainId: TOKEN_CHAIR_CHAIN_ID, baseToken: { address: TOKEN } }],
      TOKEN,
    );

    expect(noPair.status).toBe("no-pair-found");
    expect(noPair.market).toBeNull();
    expect(malformedTopLevel.status).toBe("malformed-response");
    expect(malformedPair.status).toBe("malformed-response");
  });

  it("maps upstream HTTP failures to upstream-unavailable", async () => {
    const fetchImpl = vi.fn(
      async () => jsonResponse([], { status: 503 }),
    ) as unknown as typeof fetch;
    const result = await fetchDexScreenerTokenPairs(TOKEN, { fetchImpl });

    expect(result.status).toBe("upstream-unavailable");
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("HTTP 503");
  });

  it("maps invalid upstream JSON to malformed-response", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("not-json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch;
    const result = await fetchDexScreenerTokenPairs(TOKEN, { fetchImpl });

    expect(result.status).toBe("malformed-response");
    expect(result.ok).toBe(false);
  });

  it("keeps verdict copy away from safe claims and defaults complete-looking Phase 1 results to unable", () => {
    const success = normalizeDexScreenerTokenPairsResponse([dexPair()], TOKEN);
    const highRisk = normalizeDexScreenerTokenPairsResponse(
      [dexPair({ liquidity: { usd: 0 } })],
      TOKEN,
    );
    const unable = getTokenChairVerdict({
      status: "upstream-unavailable",
      market: null,
      pairContract: null,
      contract: null,
    });
    const combined = [
      success.verdict,
      highRisk.verdict,
      unable,
    ]
      .flatMap((verdict) => [
        verdict.label,
        verdict.displayLabel,
        ...verdict.notes,
      ])
      .join(" ")
      .toLowerCase();

    expect(combined).not.toMatch(/\bsafe\b/);
    expect(success.verdict.label).toBe("Unable to fully verify");
    expect(highRisk.verdict.label).toBe("High risk");
  });

  it("marks selected-pair contract token mismatches as high risk", () => {
    const response = normalizeDexScreenerTokenPairsResponse([dexPair()], TOKEN);
    const verdict = getTokenChairVerdict({
      status: response.status,
      market: response.market,
      pairContract: {
        status: "partial",
        pairAddress: PAIR,
        token0: getAddress("0x0000000000000000000000000000000000000001"),
        token1: getAddress("0x0000000000000000000000000000000000000002"),
        containsScannedToken: false,
        reserve0Raw: "1000",
        reserve1Raw: "2000",
        scannedTokenReserveRaw: null,
        quoteTokenReserveRaw: null,
        totalSupplyRaw: "3000",
        warnings: [
          "Selected pair token0/token1 did not include the scanned token address.",
        ],
        errors: [],
      },
      contract: null,
    });

    expect(verdict.label).toBe("High risk");
    expect(verdict.notes.join(" ")).toContain("did not report the scanned token");
  });

  it("marks all-missing liquidity pair selection as weak", () => {
    const result = normalizeDexScreenerTokenPairsResponse(
      [
        dexPair({
          pairAddress: getAddress("0x0000000000000000000000000000000000000001"),
          liquidity: {},
        }),
        dexPair({
          pairAddress: getAddress("0x0000000000000000000000000000000000000002"),
          liquidity: {},
        }),
      ],
      TOKEN,
    );

    expect(result.status).toBe("success");
    expect(result.market?.pairAddress).toBe(
      getAddress("0x0000000000000000000000000000000000000001"),
    );
    expect(result.warnings.join(" ")).toContain("pair selection is weak");
    expect(result.verdict.label).toBe("Some warnings");
  });

  it("keeps unchecked Quick Sniff and Contract Sniff rows explicit", () => {
    const quickRows = buildQuickSniffRows();
    const unableRows = buildQuickSniffRows({ unableToVerify: true });
    const contractCards = buildContractSniffCards();

    expect(quickRows.map((row) => row.value)).toContain("Not checked yet");
    expect(quickRows.every((row) => row.value === "Not checked yet")).toBe(true);
    expect(unableRows.every((row) => row.value === "Unable to verify")).toBe(true);
    expect(contractCards.every((row) => row.value === "Not checked yet")).toBe(
      true,
    );
    expect(
      [...quickRows, ...unableRows, ...contractCards].map((row) => row.value),
    ).not.toContain("No");
  });

  it("accepts a quote-side token match without inventing contract signals", () => {
    const quoteSideToken = normalizeDexScreenerTokenPairsResponse(
      [dexPair()],
      QUOTE as Address,
    );

    expect(quoteSideToken.status).toBe("success");
    expect(quoteSideToken.market?.tokenSymbol).toBe("WPLS");
    expect(buildQuickSniffRows()[0].value).toBe("Not checked yet");
  });

  it("builds visible recent event-history rows without broad safety claims", () => {
    const rows = buildEventHistoryDetailRows({
      contract: {
        eventHistory: {
          status: "success",
          fromBlock: "19000000",
          toBlock: "20000000",
          lookbackBlocks: "1000000",
          ownershipTransferred: {
            count: 2,
            latestBlockNumber: "19900000",
          },
          roleGranted: { count: 0, latestBlockNumber: null },
          roleRevoked: { count: 0, latestBlockNumber: null },
          paused: { count: 1, latestBlockNumber: "19800000" },
          unpaused: { count: 0, latestBlockNumber: null },
          warnings: [],
          errors: [],
        },
      } as unknown as TokenChairContractData,
    });
    const rowText = rows.flatMap((row) => [row.value, row.detail]).join(" ");

    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({
      label: "Ownership transfers",
      value: "2 recent events",
      status: "warning",
      latestBlockNumber: "19900000",
    });
    expect(rows[1]).toMatchObject({
      value: "No recent events",
      status: "checked",
    });
    expect(rowText.toLowerCase()).not.toMatch(/\bsafe\b|guaranteed|certified/);
  });
});
