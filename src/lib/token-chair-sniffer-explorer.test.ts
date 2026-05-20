import { describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

import {
  buildContractSniffCards,
  buildQuickSniffRows,
  buildSourceSignalDetailRows,
  normalizeDexScreenerTokenPairsResponse,
  withTokenChairContractData,
  withTokenChairExplorerData,
  type TokenChairContractData,
} from "@/lib/token-chair-sniffer";
import {
  fetchTokenChairExplorerData,
  normalizeTokenChairExplorerResponse,
} from "@/lib/token-chair-sniffer-explorer";

const TOKEN = getAddress("0xcae394005c9c4c309621c53d53db9ceb701fc8d8");
const DEPLOYER = getAddress("0x1111111111111111111111111111111111111111");
const PAIR = getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9");
const QUOTE = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const TX =
  "0x2222222222222222222222222222222222222222222222222222222222222222" as const;

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

describe("Token Chair Sniffer PulseScan explorer integration", () => {
  it("normalizes verified source, ABI, deployer, and lightweight source signals", () => {
    const result = normalizeTokenChairExplorerResponse({
      tokenAddress: TOKEN,
      addressPayload: {
        is_contract: true,
        is_verified: true,
        name: "ChairToken",
        creator_address_hash: DEPLOYER,
        creation_tx_hash: TX,
      },
      contractPayload: {
        is_verified: true,
        name: "ChairToken",
        compiler_version: "v0.8.24+commit.e11b9ed9",
        verified_at: "2026-01-01T00:00:00Z",
        abi: [
          { type: "function", name: "mint" },
          { type: "function", name: "pauseTrading" },
          { type: "function", name: "enableTrading" },
          { type: "function", name: "rescueTokens" },
          { type: "function", name: "setAuthorized" },
          { type: "function", name: "transfer" },
        ],
        source_code: "contract ChairToken { function setBlacklist(address user) external {} function setTax(uint256 fee) external {} function route(address user) external { assembly {} } }",
      },
    });

    expect(result.status).toBe("success");
    expect(result.sourceVerified).toBe(true);
    expect(result.abiAvailable).toBe(true);
    expect(result.sourceCodeAvailable).toBe(true);
    expect(result.contractName).toBe("ChairToken");
    expect(result.deployerAddress).toBe(DEPLOYER);
    expect(result.creationTxHash).toBe(TX);
    expect(result.sourceSignals.find((signal) => signal.key === "mintable")).toMatchObject({
      found: true,
      severity: "warning",
      matches: ["mint"],
    });
    expect(result.sourceSignals.find((signal) => signal.key === "blacklist")).toMatchObject({
      found: true,
      severity: "high",
      matches: ["blacklist"],
    });
    expect(result.sourceSignals.find((signal) => signal.key === "trading-gates")).toMatchObject({
      found: true,
      severity: "high",
      matches: ["enableTrading"],
    });
    expect(result.sourceSignals.find((signal) => signal.key === "fee-controls")).toMatchObject({
      found: true,
      severity: "warning",
      matches: ["setTax"],
    });
    expect(result.sourceSignals.find((signal) => signal.key === "rescue-functions")).toMatchObject({
      found: true,
      severity: "warning",
      matches: ["rescueTokens"],
    });
    expect(result.sourceSignals.find((signal) => signal.key === "hidden-owner")).toMatchObject({
      found: true,
      severity: "high",
      matches: ["authorized", "setAuthorized"],
    });
    expect(result.sourceSignals.find((signal) => signal.key === "obfuscated-address")).toMatchObject({
      found: true,
      severity: "warning",
      matches: ["assembly"],
    });

    const details = buildSourceSignalDetailRows({
      contract: { ...contractData(), explorer: result },
    });
    expect(details.find((row) => row.label === "Mintable")).toMatchObject({
      value: "Source signal found",
      status: "warning",
      matches: ["mint"],
    });
    expect(details.find((row) => row.label === "Blacklist")).toMatchObject({
      value: "High source signal",
      status: "danger",
      matches: ["blacklist"],
    });
    expect(details.find((row) => row.label === "Hidden owner")).toMatchObject({
      value: "High source signal",
      status: "danger",
      matches: ["authorized", "setAuthorized"],
    });
    expect(details.find((row) => row.label === "Obfuscated address")).toMatchObject({
      value: "Source signal found",
      status: "warning",
      matches: ["assembly"],
    });
    const quickRows = buildQuickSniffRows({
      contract: { ...contractData(), explorer: result },
    });
    expect(quickRows.find((row) => row.label === "Hidden owner")).toMatchObject({
      value: "High source signal",
      status: "danger",
    });
    expect(quickRows.find((row) => row.label === "Obfuscated address")).toMatchObject({
      value: "Source signal found",
      status: "warning",
    });
    expect(
      details.find((row) => row.label === "Trading cooldown"),
    ).toMatchObject({
      value: "Not flagged by source scan",
      status: "checked",
      matches: [],
    });
    expect(details.map((row) => row.detail).join(" ").toLowerCase()).not.toMatch(
      /\bsafe\b|not\s+a\s+scam/,
    );
  });

  it("marks unverified source rows unable instead of inventing clean results", () => {
    const explorer = normalizeTokenChairExplorerResponse({
      tokenAddress: TOKEN,
      addressPayload: {
        is_contract: true,
        is_verified: false,
      },
      contractPayload: null,
    });
    const contract = { ...contractData(), explorer };
    const quickRows = buildQuickSniffRows({ contract });
    const detailRows = buildSourceSignalDetailRows({ contract });
    const sourceCards = buildContractSniffCards({ contract });

    expect(explorer.status).toBe("partial");
    expect(explorer.sourceVerified).toBe(false);
    expect(quickRows.find((row) => row.label === "Mintable")).toMatchObject({
      value: "Unable to verify",
      status: "unable-to-verify",
    });
    expect(detailRows).toHaveLength(12);
    expect(detailRows.every((row) => row.value === "Unable to verify")).toBe(
      true,
    );
    expect(sourceCards.find((card) => card.label === "Source verified")).toMatchObject({
      value: "Not verified on PulseScan",
      status: "warning",
    });
  });

  it("maps PulseScan fetch failures to unable-to-verify explorer status", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/addresses/")) {
        return jsonResponse("not-json", { status: 503 });
      }
      return jsonResponse({}, { status: 404 });
    }) as unknown as typeof fetch;

    const result = await fetchTokenChairExplorerData(TOKEN, { fetchImpl });

    expect(result.status).toBe("unable-to-verify");
    expect(result.errors.join(" ")).toContain("HTTP 503");
    expect(result.sourceSignals.every((signal) => signal.found === null)).toBe(true);

    const quickRows = buildQuickSniffRows({
      contract: { ...contractData(), explorer: result },
    });
    expect(quickRows.find((row) => row.label === "Mintable")).toMatchObject({
      value: "Unable to verify",
      status: "unable-to-verify",
    });
  });

  it("uses clear copy when PulseScan rate-limits explorer metadata", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ message: "Too many requests" }, { status: 429 }),
    ) as unknown as typeof fetch;

    const result = await fetchTokenChairExplorerData(TOKEN, { fetchImpl });

    expect(result.status).toBe("unable-to-verify");
    expect([...result.warnings, ...result.errors].join(" ")).toContain(
      "rate-limited explorer metadata",
    );
    expect([...result.warnings, ...result.errors].join(" ")).toContain(
      "Source and deployer checks are temporarily unavailable",
    );
  });

  it("adds source signals to the conservative verdict without safe claims", () => {
    const marketResponse = normalizeDexScreenerTokenPairsResponse(
      [dexPair()],
      TOKEN,
    );
    const explorer = normalizeTokenChairExplorerResponse({
      tokenAddress: TOKEN,
      addressPayload: {
        is_contract: true,
        is_verified: true,
        creator_address_hash: DEPLOYER,
      },
      contractPayload: {
        is_verified: true,
        abi: [{ type: "function", name: "setTax" }],
        source_code: "contract ChairToken {}",
      },
    });
    const response = withTokenChairExplorerData(
      withTokenChairContractData(marketResponse, contractData()),
      explorer,
    );
    const verdictText = [
      response.verdict.label,
      response.verdict.displayLabel,
      ...response.verdict.notes,
    ].join(" ");

    expect(response.verdict.label).toBe("High risk");
    expect(verdictText).toContain(
      "Suspicious functions higher-severity source signal found",
    );
    expect(verdictText.toLowerCase()).not.toMatch(/\bsafe\b/);
  });
});
