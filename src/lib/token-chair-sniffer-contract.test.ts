import { describe, expect, it, vi } from "vitest";
import { getAddress, type Address, type Hex } from "viem";

import {
  buildContractSniffCards,
  buildQuickSniffRows,
  normalizeDexScreenerTokenPairsResponse,
  withTokenChairContractData,
  type TokenChairContractData,
} from "@/lib/token-chair-sniffer";
import {
  fetchTokenChairContractData,
  type TokenChairContractReader,
} from "@/lib/token-chair-sniffer-contract";

const TOKEN = getAddress("0xcae394005c9c4c309621c53d53db9ceb701fc8d8");
const OWNER = getAddress("0x1111111111111111111111111111111111111111");
const IMPLEMENTATION = getAddress("0x2222222222222222222222222222222222222222");
const PENDING_OWNER = getAddress("0x3333333333333333333333333333333333333333");
const PAIR = getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9");
const QUOTE = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const ZERO_SLOT = `0x${"0".repeat(64)}` as Hex;
const ZERO_ROLE = `0x${"0".repeat(64)}` as Hex;

function buildReader({
  code = "0x60806040" as Hex,
  readContract,
  getStorageAt,
}: {
  code?: Hex;
  readContract?: TokenChairContractReader["readContract"];
  getStorageAt?: TokenChairContractReader["getStorageAt"];
} = {}): TokenChairContractReader {
  return {
    readContract:
      readContract ??
      vi.fn(async ({ functionName }) => {
        if (functionName === "name") return "Chair Token";
        if (functionName === "symbol") return "CHAIR";
        if (functionName === "decimals") return 18;
        if (functionName === "owner") {
          return "0x0000000000000000000000000000000000000000";
        }
        throw new Error(`Unexpected read ${functionName}`);
      }),
    getCode: vi.fn(async () => code),
    getStorageAt: getStorageAt ?? vi.fn(async () => ZERO_SLOT),
  };
}

function storageSlotAddress(address: Address): Hex {
  return `0x${"0".repeat(24)}${address.slice(2).toLowerCase()}` as Hex;
}

function successfulContract(
  overrides: Partial<TokenChairContractData> = {},
): TokenChairContractData {
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
    ...overrides,
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

describe("Token Chair Sniffer contract reads", () => {
  it("reads token metadata, renounced ownership, and empty common proxy signals", async () => {
    const result = await fetchTokenChairContractData(TOKEN, {
      reader: buildReader(),
    });

    expect(result.status).toBe("success");
    expect(result.tokenName).toBe("Chair Token");
    expect(result.tokenSymbol).toBe("CHAIR");
    expect(result.decimals).toBe(18);
    expect(result.ownershipRenounced).toBe(true);
    expect(result.ownerAddress).toBeNull();
    expect(result.proxy.detected).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it("surfaces non-renounced ownership and common proxy signals without broad safety claims", async () => {
    let storageReadCount = 0;
    const result = await fetchTokenChairContractData(TOKEN, {
      reader: buildReader({
        readContract: vi.fn(async ({ functionName }) => {
          if (functionName === "name") return "Proxy Chair";
          if (functionName === "symbol") return "PCHAIR";
          if (functionName === "decimals") return 18n;
          if (functionName === "owner") return OWNER;
          throw new Error(`Unexpected read ${functionName}`);
        }),
        getStorageAt: vi.fn(async () => {
          storageReadCount += 1;
          return storageReadCount === 1
            ? storageSlotAddress(IMPLEMENTATION)
            : ZERO_SLOT;
        }),
      }),
    });

    expect(result.status).toBe("success");
    expect(result.ownerAddress).toBe(OWNER);
    expect(result.ownershipRenounced).toBe(false);
    expect(result.proxy.detected).toBe(true);
    expect(result.proxy.implementationAddress).toBe(IMPLEMENTATION);

    const quickRows = buildQuickSniffRows({ contract: result });
    expect(quickRows.find((row) => row.label === "Ownership renounced")).toMatchObject({
      value: "Not renounced",
      status: "warning",
    });
    expect(quickRows.find((row) => row.label === "Proxy contract")).toMatchObject({
      value: "Proxy signal found",
      status: "warning",
    });
  });

  it("reads pending owner, AccessControl, and public tax getters as limited signals", async () => {
    const result = await fetchTokenChairContractData(TOKEN, {
      reader: buildReader({
        readContract: vi.fn(async ({ functionName }) => {
          if (functionName === "name") return "Admin Chair";
          if (functionName === "symbol") return "ACHR";
          if (functionName === "decimals") return 18;
          if (functionName === "owner") return OWNER;
          if (functionName === "pendingOwner") return PENDING_OWNER;
          if (functionName === "DEFAULT_ADMIN_ROLE") return ZERO_ROLE;
          if (functionName === "getRoleAdmin") return ZERO_ROLE;
          if (functionName === "buyTax") return 5n;
          if (functionName === "sellTax") return 0n;
          throw new Error(`Unexpected read ${functionName}`);
        }),
      }),
    });

    expect(result.pendingOwner).toMatchObject({
      address: PENDING_OWNER,
      functionName: "pendingOwner",
    });
    expect(result.accessControl).toMatchObject({
      detected: true,
      defaultAdminRole: ZERO_ROLE,
      roleAdmin: ZERO_ROLE,
    });
    expect(result.taxes?.buy).toMatchObject({
      status: "found",
      valueRaw: "5",
      functionName: "buyTax",
    });
    expect(result.taxes?.sell).toMatchObject({
      status: "found",
      valueRaw: "0",
      functionName: "sellTax",
    });

    const quickRows = buildQuickSniffRows({ contract: result });
    expect(quickRows.find((row) => row.label === "Buy tax")).toMatchObject({
      value: "Getter returned 5",
      status: "warning",
    });
    expect(quickRows.find((row) => row.label === "Sell tax")).toMatchObject({
      value: "Getter returned 0",
      status: "checked",
    });
    expect(
      quickRows
        .filter((row) => row.label === "Buy tax" || row.label === "Sell tax")
        .map((row) => row.detail)
        .join(" ")
        .toLowerCase(),
    ).not.toMatch(/\bsafe\b|guaranteed|certified/);
  });

  it("keeps tax rows pending when common public tax getters are absent", async () => {
    const result = await fetchTokenChairContractData(TOKEN, {
      reader: buildReader(),
    });
    const quickRows = buildQuickSniffRows({ contract: result });

    expect(result.taxes?.buy.status).toBe("not-found");
    expect(result.taxes?.sell.status).toBe("not-found");
    expect(quickRows.find((row) => row.label === "Buy tax")).toMatchObject({
      value: "Not checked yet",
      status: "not-checked",
    });
    expect(quickRows.find((row) => row.label === "Sell tax")).toMatchObject({
      value: "Not checked yet",
      status: "not-checked",
    });
  });

  it("reads common token mechanics getters without simulating trades", async () => {
    const result = await fetchTokenChairContractData(TOKEN, {
      reader: buildReader({
        readContract: vi.fn(async ({ functionName }) => {
          if (functionName === "name") return "Limit Chair";
          if (functionName === "symbol") return "LCHR";
          if (functionName === "decimals") return 18;
          if (functionName === "owner") {
            return "0x0000000000000000000000000000000000000000";
          }
          if (functionName === "paused") return true;
          if (functionName === "tradingEnabled") return false;
          if (functionName === "limitsInEffect") return true;
          if (functionName === "maxTxAmount") return 1000n;
          if (functionName === "maxWalletAmount") return 2500n;
          throw new Error(`Unexpected read ${functionName}`);
        }),
      }),
    });
    const quickRows = buildQuickSniffRows({ contract: result });
    const response = withTokenChairContractData(
      normalizeDexScreenerTokenPairsResponse([dexPair()], TOKEN),
      result,
    );
    const verdictText = [
      response.verdict.label,
      response.verdict.displayLabel,
      ...response.verdict.notes,
    ].join(" ");

    expect(result.mechanics?.paused).toMatchObject({
      status: "found",
      value: true,
      functionName: "paused",
    });
    expect(result.mechanics?.tradingEnabled).toMatchObject({
      status: "found",
      value: false,
      functionName: "tradingEnabled",
    });
    expect(result.mechanics?.maxTx).toMatchObject({
      status: "found",
      valueRaw: "1000",
      functionName: "maxTxAmount",
    });
    expect(quickRows.find((row) => row.label === "Transfer pausable")).toMatchObject({
      value: "Paused getter true",
      status: "warning",
    });
    expect(quickRows.find((row) => row.label === "Trading cooldown")).toMatchObject({
      value: "Limit getter true",
      status: "warning",
    });
    expect(verdictText).toContain("pause-state getter");
    expect(verdictText).toContain("trading-state getter");
    expect(verdictText.toLowerCase()).not.toMatch(/\bsafe\b|guaranteed|certified/);
  });

  it("returns unable-to-verify when no contract bytecode is present", async () => {
    const result = await fetchTokenChairContractData(TOKEN, {
      reader: buildReader({ code: "0x" }),
    });

    expect(result.status).toBe("unable-to-verify");
    expect(result.tokenName).toBeNull();
    expect(result.errors.join(" ")).toContain("No contract bytecode");
    expect(buildContractSniffCards({ contract: result })[1]).toMatchObject({
      value: "Unable to verify",
      status: "unable-to-verify",
    });
  });

  it("keeps verdict language conservative when contract warnings are present", () => {
    const marketResponse = normalizeDexScreenerTokenPairsResponse(
      [dexPair()],
      TOKEN,
    );
    const response = withTokenChairContractData(
      marketResponse,
      successfulContract({
        ownerAddress: OWNER,
        ownershipRenounced: false,
        proxy: {
          detected: true,
          implementationAddress: IMPLEMENTATION,
          adminAddress: null,
          beaconAddress: null,
          minimalProxyTarget: null,
          checks: [`EIP-1967 implementation slot points to ${IMPLEMENTATION}.`],
        },
      }),
    );
    const verdictText = [
      response.verdict.label,
      response.verdict.displayLabel,
      ...response.verdict.notes,
    ].join(" ");

    expect(response.verdict.label).toBe("Some warnings");
    expect(verdictText.toLowerCase()).not.toMatch(/\bsafe\b/);
    expect(verdictText).toContain("non-zero owner");
  });
});
