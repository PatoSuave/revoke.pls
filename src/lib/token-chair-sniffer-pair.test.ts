import { describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

import type { TokenChairContractReader } from "@/lib/token-chair-sniffer-contract";
import { fetchTokenChairPairContractData } from "@/lib/token-chair-sniffer-pair";

const TOKEN = getAddress("0xcae394005c9c4c309621c53d53db9ceb701fc8d8");
const QUOTE = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PAIR = getAddress("0x165C3410fC91EF562C50559f7d2289fEbed552d9");

function mockPairReader(
  overrides: {
    token0?: string;
    token1?: string;
    reserves?: readonly [bigint, bigint, bigint];
    totalSupply?: bigint;
    code?: `0x${string}` | undefined;
  } = {},
): TokenChairContractReader {
  const token0 = overrides.token0 ?? TOKEN;
  const token1 = overrides.token1 ?? QUOTE;
  const reserves = overrides.reserves ?? [1000n, 2000n, 123n];
  const totalSupply = overrides.totalSupply ?? 3000n;

  return {
    readContract: vi.fn(async ({ functionName }) => {
      if (functionName === "token0") return token0;
      if (functionName === "token1") return token1;
      if (functionName === "getReserves") return reserves;
      if (functionName === "totalSupply") return totalSupply;
      throw new Error(`Unexpected read: ${functionName}`);
    }),
    getCode: vi.fn(async () => overrides.code ?? "0x1234"),
    getStorageAt: vi.fn(async (): Promise<`0x${string}`> => "0x"),
    getBlockNumber: vi.fn(async () => 1n),
    getLogs: vi.fn(async () => []),
  };
}

describe("Token Chair selected pair contract reads", () => {
  it("reads token addresses, reserves, and LP supply from the selected pair", async () => {
    const result = await fetchTokenChairPairContractData(TOKEN, PAIR, {
      reader: mockPairReader(),
    });

    expect(result.status).toBe("success");
    expect(result.pairAddress).toBe(PAIR);
    expect(result.token0).toBe(TOKEN);
    expect(result.token1).toBe(QUOTE);
    expect(result.containsScannedToken).toBe(true);
    expect(result.reserve0Raw).toBe("1000");
    expect(result.reserve1Raw).toBe("2000");
    expect(result.scannedTokenReserveRaw).toBe("1000");
    expect(result.quoteTokenReserveRaw).toBe("2000");
    expect(result.totalSupplyRaw).toBe("3000");
    expect(result.warnings).toEqual([]);
  });

  it("maps quote-side scanned tokens to the second reserve", async () => {
    const result = await fetchTokenChairPairContractData(QUOTE, PAIR, {
      reader: mockPairReader(),
    });

    expect(result.containsScannedToken).toBe(true);
    expect(result.scannedTokenReserveRaw).toBe("2000");
    expect(result.quoteTokenReserveRaw).toBe("1000");
  });

  it("warns when token0 and token1 do not include the scanned token", async () => {
    const result = await fetchTokenChairPairContractData(TOKEN, PAIR, {
      reader: mockPairReader({
        token0: "0x0000000000000000000000000000000000000001",
        token1: "0x0000000000000000000000000000000000000002",
      }),
    });

    expect(result.status).toBe("partial");
    expect(result.containsScannedToken).toBe(false);
    expect(result.scannedTokenReserveRaw).toBeNull();
    expect(result.warnings.join(" ")).toContain("did not include");
  });

  it("returns unable-to-verify when no usable pair address or code is available", async () => {
    const missingAddress = await fetchTokenChairPairContractData(TOKEN, null, {
      reader: mockPairReader(),
    });
    const missingCode = await fetchTokenChairPairContractData(TOKEN, PAIR, {
      reader: mockPairReader({ code: "0x" }),
    });

    expect(missingAddress.status).toBe("unable-to-verify");
    expect(missingAddress.pairAddress).toBeNull();
    expect(missingCode.status).toBe("unable-to-verify");
    expect(missingCode.pairAddress).toBe(PAIR);
  });
});
