import { describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

import { fetchTokenChairPulseXPairs } from "@/lib/token-chair-sniffer-pulsex";

const TOKEN = getAddress("0x1111111111111111111111111111111111111111");
const WPLS = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const PULSEX_V2_FACTORY = getAddress("0x29eA7545DEf87022BAdc76323F373EA1e707C523");
const PAIR = getAddress("0x2222222222222222222222222222222222222222");

function reader() {
  return {
    getCode: vi.fn(),
    getStorageAt: vi.fn(),
    getBlockNumber: vi.fn(),
    getLogs: vi.fn(),
    readContract: vi.fn(async ({ address, functionName, args }) => {
      if (functionName === "getPair") {
        const [, quote] = args ?? [];
        return address === PULSEX_V2_FACTORY && quote === WPLS
          ? PAIR
          : "0x0000000000000000000000000000000000000000";
      }
      if (address !== PAIR) throw new Error(`Unexpected pair read ${address}`);
      if (functionName === "token0") return TOKEN;
      if (functionName === "token1") return WPLS;
      if (functionName === "getReserves") return [123n, 456n, 0];
      if (functionName === "totalSupply") return 789n;
      throw new Error(`Unexpected read ${functionName}`);
    }),
  };
}

describe("Token Chair PulseX pair discovery", () => {
  it("discovers PulseX factory pairs and reads raw LP context", async () => {
    const fakeReader = reader();
    const result = await fetchTokenChairPulseXPairs(TOKEN, {
      reader: fakeReader,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      status: "success",
      version: "v2",
      label: "PulseX V2",
      factoryAddress: PULSEX_V2_FACTORY,
      pairAddress: PAIR,
      quoteTokenAddress: WPLS,
      quoteTokenSymbol: "WPLS",
      token0: TOKEN,
      token1: WPLS,
      containsScannedToken: true,
      reserve0Raw: "123",
      reserve1Raw: "456",
      scannedTokenReserveRaw: "123",
      quoteTokenReserveRaw: "456",
      totalSupplyRaw: "789",
    });
    expect(fakeReader.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: PULSEX_V2_FACTORY,
        functionName: "getPair",
        args: [TOKEN, WPLS],
      }),
    );
  });

  it("returns an empty list when checked PulseX quotes have no pair", async () => {
    const fakeReader = reader();
    fakeReader.readContract = vi.fn(async ({ functionName }) => {
      if (functionName === "getPair") {
        return "0x0000000000000000000000000000000000000000";
      }
      throw new Error(`Unexpected read ${functionName}`);
    });

    await expect(
      fetchTokenChairPulseXPairs(TOKEN, { reader: fakeReader }),
    ).resolves.toEqual([]);
  });
});
