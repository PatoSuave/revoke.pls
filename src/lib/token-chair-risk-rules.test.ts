import { describe, expect, it } from "vitest";
import { getAddress } from "viem";

import {
  buildTokenChairRiskQueue,
  getTokenChairRiskCounts,
  getTokenChairRiskReadiness,
} from "@/lib/token-chair-risk-rules";
import type {
  TokenChairApiResponse,
  TokenChairContractData,
  TokenChairMarketData,
  TokenChairVerdict,
} from "@/lib/token-chair-sniffer";

const TOKEN = getAddress("0x95B303987A60C71504D99Aa1b13B4DA07b0790ab");
const PAIR = getAddress("0x1b45b9148791d3a104184Cd5DFE5CE57193a3ee9");
const OWNER = getAddress("0x1111111111111111111111111111111111111111");
const ADMIN = getAddress("0x2222222222222222222222222222222222222222");
const HOLDER = getAddress("0x3333333333333333333333333333333333333333");

const VERDICT: TokenChairVerdict = {
  kind: "some-warnings",
  label: "Some warnings",
  displayLabel: "Chair Verdict: Something Smells Funny",
  tone: "warning",
  notes: [],
  reasons: [],
};

function response(overrides: Partial<TokenChairApiResponse> = {}): TokenChairApiResponse {
  return {
    ok: true,
    status: "success",
    chainId: "pulsechain",
    tokenAddress: TOKEN,
    market: market(),
    pairContract: null,
    pulsexPairs: [],
    contract: contract(),
    pairs: [],
    verdict: VERDICT,
    warnings: [],
    errors: [],
    ...overrides,
  };
}

function market(overrides: Partial<TokenChairMarketData> = {}): TokenChairMarketData {
  return {
    tokenAddress: TOKEN,
    tokenName: "PulseX",
    tokenSymbol: "PLSX",
    pairAddress: PAIR,
    dexName: "PulseX",
    dexId: "pulsex",
    priceUsd: "0.000005",
    liquidityUsd: 1_000_000,
    volume24h: 100_000,
    txns24h: { buys: 10, sells: 8, total: 18 },
    fdv: 1_000_000,
    marketCap: 900_000,
    pairCreatedAt: 1_683_944_275_000,
    pairAgeMs: 1_000_000,
    pairAgeLabel: "3.0y",
    dexScreenerUrl: `https://dexscreener.com/pulsechain/${PAIR}`,
    quoteTokenSymbol: "WPLS",
    quoteTokenName: "Wrapped Pulse",
    pairCount: 1,
    ...overrides,
  };
}

function contract(overrides: Partial<TokenChairContractData> = {}): TokenChairContractData {
  return {
    tokenAddress: TOKEN,
    status: "success",
    tokenName: "PulseX",
    tokenSymbol: "PLSX",
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
    pendingOwner: {
      address: null,
      functionName: null,
    },
    adminGetters: [],
    accessControl: {
      detected: false,
      defaultAdminRole: null,
      roleAdmin: null,
      checks: [],
    },
    taxes: {
      buy: {
        status: "not-found",
        valueRaw: null,
        functionName: null,
        checkedFunctions: [],
      },
      sell: {
        status: "not-found",
        valueRaw: null,
        functionName: null,
        checkedFunctions: [],
      },
    },
    mechanics: {
      paused: { status: "not-found", value: null, functionName: null, checkedFunctions: [] },
      tradingEnabled: { status: "not-found", value: null, functionName: null, checkedFunctions: [] },
      limitsInEffect: { status: "not-found", value: null, functionName: null, checkedFunctions: [] },
      maxTx: { status: "not-found", valueRaw: null, functionName: null, checkedFunctions: [] },
      maxWallet: { status: "not-found", valueRaw: null, functionName: null, checkedFunctions: [] },
    },
    eventHistory: undefined,
    explorer: {
      status: "success",
      sourceVerified: true,
      abiAvailable: true,
      sourceCodeAvailable: true,
      contractName: "PulseX",
      compilerVersion: "v0.8.12",
      verifiedAt: null,
      deployerAddress: OWNER,
      creationTxHash: null,
      explorerAddressUrl: `https://scan.pulsechain.com/address/${TOKEN}`,
      explorerTokenUrl: `https://scan.pulsechain.com/token/${TOKEN}`,
      explorerTxUrl: null,
      sourceSignals: [],
      warnings: [],
      errors: [],
    },
    holders: {
      status: "success",
      token: {
        percent: 8,
        address: HOLDER,
        isContract: false,
        holdersCount: 1000,
        sampledHolderCount: 100,
        totalSupplyRaw: "1000",
        valueRaw: "80",
      },
      lp: {
        percent: 12,
        address: HOLDER,
        isContract: false,
        holdersCount: 50,
        sampledHolderCount: 100,
        totalSupplyRaw: "1000",
        valueRaw: "120",
        pairAddress: PAIR,
      },
      distribution: {
        sampledHolderCount: 100,
        pageCount: 2,
        maxPagesReached: false,
        holdersCount: 1000,
        totalSupplyRaw: "1000",
        top1Percent: 8,
        top5Percent: 20,
        top10Percent: 30,
        burnDeadPercent: 0,
        selectedPairPercent: null,
        topHolders: [],
      },
      lpDistribution: {
        sampledHolderCount: 100,
        pageCount: 2,
        maxPagesReached: false,
        holdersCount: 50,
        totalSupplyRaw: "1000",
        top1Percent: 12,
        top5Percent: 18,
        top10Percent: 24,
        burnDeadPercent: 0,
        selectedPairPercent: null,
        topHolders: [],
      },
      warnings: [],
      errors: [],
    },
    lpLocker: null,
    warnings: [],
    errors: [],
    ...overrides,
  };
}

describe("Token Chair risk rules", () => {
  it("returns a conservative first step before a scan runs", () => {
    const queue = buildTokenChairRiskQueue({ response: null });

    expect(queue).toEqual([
      expect.objectContaining({
        id: "scan-not-run",
        severity: "info",
        title: "Run a scan first",
      }),
    ]);
  });

  it("prioritizes high source signals and proxy controls as critical review items", () => {
    const queue = buildTokenChairRiskQueue({
      response: response({
        contract: contract({
          proxy: {
            detected: true,
            implementationAddress: getAddress("0x4444444444444444444444444444444444444444"),
            adminAddress: ADMIN,
            beaconAddress: null,
            minimalProxyTarget: null,
            detectedKinds: ["eip1967"],
            checks: ["implementation"],
          },
          explorer: {
            ...contract().explorer!,
            sourceSignals: [
              {
                key: "hidden-owner",
                label: "Hidden owner",
                severity: "high",
                found: true,
                matches: ["_ownerSlot"],
                detail: "Hidden owner signal found.",
              },
            ],
          },
        }),
      }),
    });

    expect(queue.map((item) => item.id)).toContain("proxy-detected");
    expect(queue.map((item) => item.id)).toContain("source-hidden-owner");
    expect(getTokenChairRiskCounts(queue).critical).toBeGreaterThanOrEqual(2);
    expect(queue[0]?.severity).toBe("critical");
  });

  it("flags LP and holder concentration without calling the token safe or unsafe", () => {
    const queue = buildTokenChairRiskQueue({
      response: response({
        contract: contract({
          holders: {
            ...contract().holders!,
            token: {
              ...contract().holders!.token,
              percent: 55,
            },
            lp: {
              ...contract().holders!.lp,
              percent: 93,
            },
            distribution: {
              ...contract().holders!.distribution!,
              top1Percent: 55,
              top10Percent: 78,
            },
            lpDistribution: {
              ...contract().holders!.lpDistribution!,
              top1Percent: 93,
            },
          },
        }),
      }),
    });
    const text = queue.map((item) => `${item.title} ${item.evidence}`).join(" ");

    expect(queue.map((item) => item.id)).toContain("top-holder-concentration");
    expect(queue.map((item) => item.id)).toContain("lp-holder-concentration");
    expect(text.toLowerCase()).not.toContain("safe");
    expect(text.toLowerCase()).not.toContain("scam");
  });

  it("adds coverage items for not-live checks", () => {
    const queue = buildTokenChairRiskQueue({
      response: response(),
    });

    expect(queue.map((item) => item.id)).toContain("honeypot-not-live");
  });

  it("keeps buy tax, sell tax, and honeypot as explicit review items", () => {
    const queue = buildTokenChairRiskQueue({
      response: response({
        contract: contract({
          taxes: {
            buy: {
              status: "not-found",
              valueRaw: null,
              functionName: null,
              checkedFunctions: ["buyTax", "buyFee"],
            },
            sell: {
              status: "found",
              valueRaw: "0",
              functionName: "sellTax",
              checkedFunctions: ["sellTax", "sellFee"],
            },
          },
        }),
      }),
    });

    expect(queue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "buy-tax-getter-not-found",
          title: "No public buy tax getter responded",
        }),
        expect.objectContaining({
          id: "sell-tax-getter-zero",
          title: "Public sell tax getter returned zero",
        }),
        expect.objectContaining({
          id: "honeypot-not-live",
          title: "Honeypot simulation is not live",
        }),
      ]),
    );
  });

  it("flags selected pair mismatches as critical", () => {
    const queue = buildTokenChairRiskQueue({
      response: response({
        pairContract: {
          status: "success",
          pairAddress: PAIR,
          token0: OWNER,
          token1: ADMIN,
          containsScannedToken: false,
          reserve0Raw: "1",
          reserve1Raw: "2",
          scannedTokenReserveRaw: null,
          quoteTokenReserveRaw: null,
          totalSupplyRaw: "3",
          warnings: [],
          errors: [],
        },
      }),
    });

    expect(queue).toContainEqual(
      expect.objectContaining({
        id: "pair-contract-mismatch",
        severity: "critical",
      }),
    );
    expect(getTokenChairRiskReadiness(queue)).toEqual(
      expect.objectContaining({
        label: "Critical review first",
        tone: "danger",
      }),
    );
  });

  it("summarizes multiple degraded evidence sources for rate-limited scans", () => {
    const queue = buildTokenChairRiskQueue({
      response: response({
        warnings: [
          "PulseScan rate-limited explorer metadata.",
          "PulseScan rate-limited holder data.",
        ],
        pairContract: {
          status: "partial",
          pairAddress: PAIR,
          token0: TOKEN,
          token1: null,
          containsScannedToken: true,
          reserve0Raw: null,
          reserve1Raw: null,
          scannedTokenReserveRaw: null,
          quoteTokenReserveRaw: null,
          totalSupplyRaw: null,
          warnings: ["Reserve read failed."],
          errors: [],
        },
        contract: contract({
          explorer: {
            ...contract().explorer!,
            status: "unable-to-verify",
            sourceVerified: null,
            abiAvailable: null,
            sourceCodeAvailable: null,
          },
          holders: {
            ...contract().holders!,
            status: "partial",
          },
        }),
      }),
    });
    const readiness = getTokenChairRiskReadiness(queue);

    expect(queue.map((item) => item.id)).toContain("multiple-data-sources-degraded");
    expect(readiness.coverageGapCount).toBeGreaterThan(1);
    expect(readiness.tone).toBe("warning");
  });

  it("keeps all risk queue copy away from safe and scam claims", () => {
    const queue = buildTokenChairRiskQueue({
      response: response({
        contract: contract({
          ownerAddress: OWNER,
          ownershipRenounced: false,
          proxy: {
            detected: true,
            implementationAddress: null,
            adminAddress: ADMIN,
            beaconAddress: null,
            minimalProxyTarget: null,
            checks: [],
          },
        }),
      }),
    });
    const allCopy = queue
      .map((item) =>
        [
          item.title,
          item.evidence,
          item.whyItMatters,
          item.manualReview,
          item.sourceLabel ?? "",
        ].join(" "),
      )
      .join(" ")
      .toLowerCase();

    expect(allCopy).not.toMatch(/\bsafe\b/);
    expect(allCopy).not.toMatch(/\bscam\b/);
    expect(allCopy).not.toContain("guarantee");
    expect(allCopy).not.toContain("certified");
  });
});
