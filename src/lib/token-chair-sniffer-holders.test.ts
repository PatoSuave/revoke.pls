import { describe, expect, it, vi } from "vitest";
import { getAddress, type Address } from "viem";

import {
  buildConcentrationDetailRows,
  buildContractSniffCards,
  normalizeDexScreenerTokenPairsResponse,
  withTokenChairContractData,
  withTokenChairHolderData,
  type TokenChairContractData,
} from "@/lib/token-chair-sniffer";
import {
  fetchTokenChairHolderData,
  normalizeTokenChairHolderResponse,
} from "@/lib/token-chair-sniffer-holders";

const TOKEN = getAddress("0xcae394005c9c4c309621c53d53db9ceb701fc8d8");
const PAIR = getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9");
const QUOTE = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const HOLDER = getAddress("0x1111111111111111111111111111111111111111");
const LP_HOLDER = getAddress("0x2222222222222222222222222222222222222222");
const OWNER = getAddress("0x3333333333333333333333333333333333333333");
const DEAD = getAddress("0x000000000000000000000000000000000000dEaD");

function holdersPayload({
  holder = HOLDER,
  value = "250",
  totalSupply = "1000",
  holders = "42",
  isContract = false,
  extraItems = [],
}: {
  holder?: Address;
  value?: string;
  totalSupply?: string;
  holders?: string;
  isContract?: boolean;
  extraItems?: Array<{
    holder: Address;
    value: string;
    isContract?: boolean;
  }>;
} = {}) {
  return {
    items: [
      {
        address: {
          hash: holder,
          is_contract: isContract,
        },
        token: {
          holders,
          total_supply: totalSupply,
        },
        value,
      },
      ...extraItems.map((item) => ({
        address: {
          hash: item.holder,
          is_contract: item.isContract ?? false,
        },
        token: {
          holders,
          total_supply: totalSupply,
        },
        value: item.value,
      })),
    ],
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function rawJsonResponse(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function contractData(): TokenChairContractData {
  return {
    tokenAddress: TOKEN,
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
  };
}

function dexPair() {
  return {
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
    txns: { h24: { buys: 5, sells: 3 } },
    volume: { h24: 10000 },
    liquidity: { usd: 50000 },
    fdv: 100000,
    marketCap: 90000,
    pairCreatedAt: 1700000000000,
  };
}

describe("Token Chair Sniffer holder concentration", () => {
  it("normalizes token and LP top-holder concentration", () => {
    const result = normalizeTokenChairHolderResponse({
      tokenPayload: holdersPayload({ value: "250", totalSupply: "1000" }),
      lpPayload: holdersPayload({
        holder: LP_HOLDER,
        value: "750",
        totalSupply: "1000",
      }),
      pairAddress: PAIR,
    });

    expect(result.status).toBe("success");
    expect(result.token.percent).toBe(25);
    expect(result.token.address).toBe(HOLDER);
    expect(result.distribution).toMatchObject({
      top1Percent: 25,
      top5Percent: 25,
      top10Percent: 25,
      burnDeadPercent: 0,
      sampledHolderCount: 1,
      pageCount: 1,
      maxPagesReached: false,
    });
    expect(result.lp.percent).toBe(75);
    expect(result.lp.address).toBe(LP_HOLDER);
    expect(result.lp.pairAddress).toBe(PAIR);

    const cards = buildContractSniffCards({
      contract: { ...contractData(), holders: result },
    });
    expect(cards.find((card) => card.label === "Top holder concentration")).toMatchObject({
      value: "25%",
      status: "warning",
    });
    expect(cards.find((card) => card.label === "LP concentration")).toMatchObject({
      value: "75%",
      status: "warning",
    });
  });

  it("builds sampled top-holder distribution buckets", () => {
    const result = normalizeTokenChairHolderResponse({
      tokenPayload: holdersPayload({
        value: "190",
        totalSupply: "1000",
        extraItems: [
          { holder: OWNER, value: "180" },
          { holder: PAIR, value: "170", isContract: true },
          { holder: DEAD, value: "160" },
          { holder: LP_HOLDER, value: "150" },
          { holder: getAddress("0x5555555555555555555555555555555555555555"), value: "40" },
          { holder: getAddress("0x6666666666666666666666666666666666666666"), value: "30" },
          { holder: getAddress("0x7777777777777777777777777777777777777777"), value: "20" },
          { holder: getAddress("0x8888888888888888888888888888888888888888"), value: "10" },
          { holder: getAddress("0x9999999999999999999999999999999999999999"), value: "5" },
        ],
      }),
      lpPayload: holdersPayload({
        holder: LP_HOLDER,
        value: "250",
        totalSupply: "1000",
      }),
      pairAddress: PAIR,
    });

    expect(result.distribution).toMatchObject({
      sampledHolderCount: 10,
      top1Percent: 19,
      top5Percent: 85,
      top10Percent: 95.5,
      burnDeadPercent: 16,
      selectedPairPercent: 17,
    });
    expect(result.distribution?.topHolders).toHaveLength(10);
    expect(result.distribution?.topHolders[2]).toMatchObject({
      rank: 3,
      address: PAIR,
      percent: 17,
      isContract: true,
    });
  });

  it("fetches bounded holder pages while preserving large cursor values", async () => {
    const requestedUrls: string[] = [];
    const bigCursor = "3000000000000000000000";
    const tokenPageOne = rawJsonResponse(
      `{"items":[${JSON.stringify(
        holdersPayload({
          value: "500",
          totalSupply: "1000",
          extraItems: [{ holder: OWNER, value: "300" }],
        }).items[0],
      )},${JSON.stringify(
        holdersPayload({
          holder: OWNER,
          value: "300",
          totalSupply: "1000",
        }).items[0],
      )}],"next_page_params":{"address_hash":"${OWNER.toLowerCase()}","items_count":2,"value":${bigCursor}}}`,
    );
    const tokenPageTwo = jsonResponse({
      items: [
        holdersPayload({
          holder: DEAD,
          value: "100",
          totalSupply: "1000",
        }).items[0],
        holdersPayload({
          holder: PAIR,
          value: "50",
          totalSupply: "1000",
          isContract: true,
        }).items[0],
      ],
      next_page_params: null,
    });
    const fetchImpl = vi.fn(async (url: string) => {
      requestedUrls.push(url);
      const parsed = new URL(url);
      if (parsed.pathname.toLowerCase().includes(PAIR.toLowerCase())) {
        return jsonResponse(holdersPayload({
          holder: LP_HOLDER,
          value: "900",
          totalSupply: "1000",
        }));
      }
      if (parsed.searchParams.has("value")) {
        expect(parsed.searchParams.get("value")).toBe(bigCursor);
        return tokenPageTwo;
      }
      return tokenPageOne;
    }) as unknown as typeof fetch;

    const result = await fetchTokenChairHolderData(TOKEN, PAIR, {
      fetchImpl,
      maxPages: 2,
    });

    expect(result.status).toBe("success");
    expect(result.distribution).toMatchObject({
      sampledHolderCount: 4,
      pageCount: 2,
      maxPagesReached: false,
      top1Percent: 50,
      top5Percent: 95,
      top10Percent: 95,
      burnDeadPercent: 10,
      selectedPairPercent: 5,
    });
    expect(result.lpDistribution).toMatchObject({
      sampledHolderCount: 1,
      top1Percent: 90,
    });
    expect(requestedUrls).toHaveLength(3);
  });

  it("marks holder pagination as capped when the page limit is reached", async () => {
    const fetchImpl = vi.fn(async () =>
      rawJsonResponse(
        `{"items":[${JSON.stringify(holdersPayload({ value: "500" }).items[0])}],"next_page_params":{"address_hash":"${HOLDER.toLowerCase()}","items_count":1,"value":500}}`,
      ),
    ) as unknown as typeof fetch;

    const result = await fetchTokenChairHolderData(TOKEN, PAIR, {
      fetchImpl,
      maxPages: 1,
    });

    expect(result.status).toBe("partial");
    expect(result.distribution).toMatchObject({
      sampledHolderCount: 1,
      pageCount: 1,
      maxPagesReached: true,
    });
    expect(result.lpDistribution).toMatchObject({
      maxPagesReached: true,
    });
    expect(result.warnings.join(" ")).toContain("capped");
  });

  it("keeps LP concentration unable when PulseScan does not index the pair as a token", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes(TOKEN)) return jsonResponse(holdersPayload());
      return jsonResponse({ message: "Not found" }, { status: 404 });
    }) as unknown as typeof fetch;

    const result = await fetchTokenChairHolderData(TOKEN, PAIR, { fetchImpl });

    expect(result.status).toBe("partial");
    expect(result.token.percent).toBe(25);
    expect(result.lp.percent).toBeNull();
    expect(result.warnings.join(" ")).toContain("HTTP 404");
  });

  it("uses clear copy when PulseScan rate-limits holder data", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ message: "Too many requests" }, { status: 429 }),
    ) as unknown as typeof fetch;

    const result = await fetchTokenChairHolderData(TOKEN, PAIR, { fetchImpl });

    expect(result.status).toBe("unable-to-verify");
    expect([...result.warnings, ...result.errors].join(" ")).toContain(
      "rate-limited holder data",
    );
    expect([...result.warnings, ...result.errors].join(" ")).toContain(
      "Holder and LP distribution checks are temporarily unavailable",
    );
  });

  it("adds address context and PulseScan links to concentration cards", () => {
    const holders = normalizeTokenChairHolderResponse({
      tokenPayload: holdersPayload({
        holder: OWNER,
        value: "300",
        totalSupply: "1000",
      }),
      lpPayload: holdersPayload({
        holder: PAIR,
        value: "600",
        totalSupply: "1000",
        isContract: true,
      }),
      pairAddress: PAIR,
    });
    const cards = buildContractSniffCards({
      contract: {
        ...contractData(),
        ownerAddress: OWNER,
        ownershipRenounced: false,
        holders,
      },
    });
    const topHolder = cards.find((card) => card.label === "Top holder concentration");
    const lpHolder = cards.find((card) => card.label === "LP concentration");

    expect(topHolder).toMatchObject({
      value: "30%",
      status: "warning",
      href: `https://scan.pulsechain.com/address/${OWNER}`,
    });
    expect(topHolder?.detail).toContain("Owner");
    expect(lpHolder).toMatchObject({
      value: "60%",
      status: "warning",
      href: `https://scan.pulsechain.com/address/${PAIR}`,
    });
    expect(lpHolder?.detail).toContain("Selected DEX pair");
  });

  it("explains burn/dead LP concentration without treating it like wallet concentration", () => {
    const marketResponse = normalizeDexScreenerTokenPairsResponse(
      [dexPair()],
      TOKEN,
    );
    const holders = normalizeTokenChairHolderResponse({
      tokenPayload: holdersPayload({
        value: "100",
        totalSupply: "1000",
      }),
      lpPayload: holdersPayload({
        holder: DEAD,
        value: "900",
        totalSupply: "1000",
      }),
      pairAddress: PAIR,
    });
    const contract = { ...contractData(), holders };
    const cards = buildContractSniffCards({ contract });
    const rows = buildConcentrationDetailRows({ contract });
    const response = withTokenChairHolderData(
      withTokenChairContractData(marketResponse, contractData()),
      holders,
    );
    const verdictText = response.verdict.notes.join(" ").toLowerCase();

    expect(cards.find((card) => card.label === "LP concentration")).toMatchObject({
      value: "90%",
      status: "checked",
    });
    expect(rows.find((row) => row.kind === "lp-holder")).toMatchObject({
      value: "Burn/dead LP holder",
      status: "checked",
      classificationLabel: "Burn address",
    });
    expect(rows.find((row) => row.kind === "lp-holder")?.detail).toContain(
      "not proof of an LP lock",
    );
    expect(verdictText).not.toContain("lp-token holder concentration");
    expect(verdictText).not.toMatch(/\bsafe\b|guaranteed|certified/);
  });

  it("adds concentration warnings to the conservative verdict without safe claims", () => {
    const marketResponse = normalizeDexScreenerTokenPairsResponse(
      [dexPair()],
      TOKEN,
    );
    const holders = normalizeTokenChairHolderResponse({
      tokenPayload: holdersPayload({ value: "500", totalSupply: "1000" }),
      lpPayload: holdersPayload({ value: "100", totalSupply: "1000" }),
      pairAddress: PAIR,
    });
    const response = withTokenChairHolderData(
      withTokenChairContractData(marketResponse, contractData()),
      holders,
    );
    const verdictText = [
      response.verdict.label,
      response.verdict.displayLabel,
      ...response.verdict.notes,
    ].join(" ");

    expect(response.verdict.label).toBe("Some warnings");
    expect(verdictText).toContain("top-holder concentration");
    expect(verdictText.toLowerCase()).not.toMatch(/\bsafe\b/);
  });
});
