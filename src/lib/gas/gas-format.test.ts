import { describe, expect, it } from "vitest";

import {
  buildTypicalGasTransactions,
  calculateNativeCostWei,
  formatGweiNumber,
  formatNativeCost,
  gweiStringToWei,
  weiToGweiString,
} from "@/lib/gas/gas-format";

describe("gas formatting", () => {
  it("formats wei values as Gwei strings", () => {
    expect(weiToGweiString(123_450_000_000n)).toBe("123.45");
    expect(weiToGweiString(1_000_000_000n)).toBe("1");
    expect(weiToGweiString(128_000n)).toBe("0.000128");
    expect(formatGweiNumber(625_641.8319)).toBe("625641.83");
    expect(formatGweiNumber(1_817_438.7)).toBe("1817438.7");
  });

  it("calculates native cost from gas price times gas units", () => {
    const cost = calculateNativeCostWei({
      gasPriceWei: gweiStringToWei("123.45"),
      gasUnits: 21_000,
    });

    expect(formatNativeCost(cost)).toBe("0.00259245");
  });

  it("keeps useful precision for low-cost L2 estimates", () => {
    const cost = calculateNativeCostWei({
      gasPriceWei: gweiStringToWei("0.02"),
      gasUnits: 21_000,
    });

    expect(formatNativeCost(cost)).toBe("0.00000042");
  });

  it("builds typical PulseChain transaction estimate rows", () => {
    const estimates = buildTypicalGasTransactions({
      gasPriceWei: gweiStringToWei("100"),
      nativeCurrency: "PLS",
    });

    expect(estimates.map((estimate) => estimate.label)).toEqual([
      "Native transfer",
      "Token approval / revoke",
      "Token transfer",
      "NFT approval",
      "Contract interaction",
    ]);
    expect(estimates[0]).toMatchObject({
      gasUnits: 21_000,
      costNative: "0.0021",
      nativeCurrency: "PLS",
    });
    expect(estimates[1]).toMatchObject({
      gasUnits: 65_000,
      costNative: "0.0065",
      nativeCurrency: "PLS",
    });
  });
});
