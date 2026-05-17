import { describe, expect, it, vi } from "vitest";
import { getAddress, type Address } from "viem";

import {
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

function holdersPayload({
  holder = HOLDER,
  value = "250",
  totalSupply = "1000",
  holders = "42",
  isContract = false,
}: {
  holder?: Address;
  value?: string;
  totalSupply?: string;
  holders?: string;
  isContract?: boolean;
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
