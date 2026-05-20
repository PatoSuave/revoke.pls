import { describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

import {
  createTokenChairApiResponse,
  type TokenChairContractData,
  type TokenChairExplorerData,
  type TokenChairHolderData,
  type TokenChairMarketData,
  type TokenChairPairContractData,
} from "@/lib/token-chair-sniffer";
import { fetchTokenChairContractData } from "@/lib/token-chair-sniffer-contract";
import { fetchDextoolsTokenChairData } from "@/lib/token-chair-sniffer-dextools";
import { fetchTokenChairExplorerData } from "@/lib/token-chair-sniffer-explorer";
import { fetchTokenChairHolderData } from "@/lib/token-chair-sniffer-holders";
import { fetchTokenChairPairContractData } from "@/lib/token-chair-sniffer-pair";
import { fetchTokenChairPulseXPairs } from "@/lib/token-chair-sniffer-pulsex";
import { fetchTokenChairScan } from "@/lib/token-chair-sniffer-scan";
import { fetchDexScreenerTokenPairs } from "@/lib/token-chair-sniffer-server";

vi.mock("@/lib/token-chair-sniffer-contract", () => ({
  fetchTokenChairContractData: vi.fn(),
}));

vi.mock("@/lib/token-chair-sniffer-dextools", () => ({
  fetchDextoolsTokenChairData: vi.fn(),
}));

vi.mock("@/lib/token-chair-sniffer-explorer", () => ({
  fetchTokenChairExplorerData: vi.fn(),
}));

vi.mock("@/lib/token-chair-sniffer-holders", () => ({
  fetchTokenChairHolderData: vi.fn(),
}));

vi.mock("@/lib/token-chair-sniffer-pair", () => ({
  fetchTokenChairPairContractData: vi.fn(),
}));

vi.mock("@/lib/token-chair-sniffer-pulsex", () => ({
  fetchTokenChairPulseXPairs: vi.fn(),
}));

vi.mock("@/lib/token-chair-sniffer-server", () => ({
  fetchDexScreenerTokenPairs: vi.fn(),
}));

const TOKEN = getAddress("0xcae394005c9c4c309621c53d53db9ceb701fc8d8");
const PAIR = getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9");
const QUOTE = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");

describe("Token Chair scan orchestration", () => {
  it("starts holder and pair reads as soon as market data selects a pair", async () => {
    const events: string[] = [];
    let resolveContract:
      | ((contract: TokenChairContractData) => void)
      | undefined;

    vi.mocked(fetchDexScreenerTokenPairs).mockResolvedValue(
      createTokenChairApiResponse({
        status: "success",
        tokenAddress: TOKEN,
        pairs: [marketData()],
      }),
    );
    vi.mocked(fetchTokenChairContractData).mockImplementation(
      () =>
        new Promise((resolve) => {
          events.push("contract-start");
          resolveContract = resolve;
        }),
    );
    vi.mocked(fetchTokenChairExplorerData).mockImplementation(async () => {
      events.push("explorer-start");
      return explorerData();
    });
    vi.mocked(fetchTokenChairHolderData).mockImplementation(async () => {
      events.push("holder-start");
      return holderData();
    });
    vi.mocked(fetchTokenChairPairContractData).mockImplementation(async () => {
      events.push("pair-start");
      return pairContractData();
    });
    vi.mocked(fetchTokenChairPulseXPairs).mockImplementation(async () => {
      events.push("pulsex-start");
      return [];
    });
    vi.mocked(fetchDextoolsTokenChairData).mockImplementation(async () => {
      events.push("dextools-start");
      return dextoolsData();
    });

    const scan = fetchTokenChairScan(TOKEN);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(events).toEqual([
      "contract-start",
      "explorer-start",
      "pulsex-start",
      "dextools-start",
      "holder-start",
      "pair-start",
    ]);
    expect(fetchTokenChairHolderData).toHaveBeenCalledWith(
      TOKEN,
      PAIR,
      expect.objectContaining({ maxPages: 2 }),
    );

    resolveContract?.(contractData());
    const response = await scan;

    expect(response.status).toBe("success");
    expect(response.dextools?.status).toBe("success");
    expect(response.pairContract?.containsScannedToken).toBe(true);
    expect(response.contract?.holders?.token.percent).toBe(12.5);
  });
});

function marketData(): TokenChairMarketData {
  return {
    tokenAddress: TOKEN,
    tokenName: "Chair Token",
    tokenSymbol: "CHAIR",
    pairAddress: PAIR,
    dexName: "PulseX",
    dexId: "pulsex",
    priceUsd: "0.01",
    liquidityUsd: 10_000,
    volume24h: 100,
    txns24h: { buys: 1, sells: 1, total: 2 },
    fdv: 100_000,
    marketCap: 90_000,
    pairCreatedAt: 1_700_000_000_000,
    pairAgeMs: 1_000,
    pairAgeLabel: "1s",
    dexScreenerUrl: `https://dexscreener.com/pulsechain/${PAIR}`,
    quoteTokenSymbol: "WPLS",
    quoteTokenName: "Wrapped Pulse",
    pairCount: 1,
  };
}

function dextoolsData() {
  return {
    status: "success" as const,
    sourceLabel: "DEXTools" as const,
    tokenAddress: TOKEN,
    pairAddress: PAIR,
    priceUsd: "0.01",
    liquidityUsd: 10_000,
    volume24h: 100,
    dextScore: 75,
    holderCount: 100,
    tokenUrl: `https://www.dextools.io/app/en/pulse/pair-explorer/${PAIR}`,
    pairUrl: `https://www.dextools.io/app/en/pulse/pair-explorer/${PAIR}`,
    websiteUrl: null,
    socials: [],
    warnings: [],
    errors: [],
  };
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
      publicImplementationAddress: null,
      publicAdminAddress: null,
      detectedKinds: [],
      checks: [],
    },
    pendingOwner: { address: null, functionName: null },
    adminGetters: [],
    explorer: null,
    holders: null,
    warnings: [],
    errors: [],
  };
}

function explorerData(): TokenChairExplorerData {
  return {
    status: "success",
    sourceVerified: true,
    abiAvailable: true,
    sourceCodeAvailable: true,
    contractName: "Chair Token",
    compilerVersion: "v0.8.24",
    verifiedAt: "2026-01-01T00:00:00Z",
    deployerAddress: null,
    creationTxHash: null,
    explorerAddressUrl: `https://scan.pulsechain.com/address/${TOKEN}`,
    explorerTokenUrl: `https://scan.pulsechain.com/token/${TOKEN}`,
    explorerTxUrl: null,
    sourceSignals: [],
    warnings: [],
    errors: [],
  };
}

function holderData(): TokenChairHolderData {
  return {
    status: "success",
    token: {
      percent: 12.5,
      address: getAddress("0x3333333333333333333333333333333333333333"),
      isContract: false,
      holdersCount: 100,
      sampledHolderCount: 10,
      totalSupplyRaw: "1000000",
      valueRaw: "125000",
    },
    lp: {
      percent: 24.25,
      address: getAddress("0x4444444444444444444444444444444444444444"),
      isContract: true,
      holdersCount: 42,
      sampledHolderCount: 10,
      totalSupplyRaw: "100000",
      valueRaw: "24250",
      pairAddress: PAIR,
    },
    distribution: null,
    lpDistribution: null,
    warnings: [],
    errors: [],
  };
}

function pairContractData(): TokenChairPairContractData {
  return {
    status: "success",
    pairAddress: PAIR,
    token0: TOKEN,
    token1: QUOTE,
    containsScannedToken: true,
    reserve0Raw: "1000",
    reserve1Raw: "2000",
    scannedTokenReserveRaw: "1000",
    quoteTokenReserveRaw: "2000",
    totalSupplyRaw: "3000",
    warnings: [],
    errors: [],
  };
}
