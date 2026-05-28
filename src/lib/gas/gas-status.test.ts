import { describe, expect, it } from "vitest";

import {
  classifyGasStatus,
  gasStatusCopy,
  gasStatusChartColor,
  PULSECHAIN_GAS_STATUS_THRESHOLDS,
} from "@/lib/gas/gas-status";

describe("gas status classification", () => {
  it("classifies unavailable gas data", () => {
    expect(classifyGasStatus({ gasPriceGwei: null })).toBe("unavailable");
    expect(classifyGasStatus({ gasPriceGwei: Number.NaN })).toBe("unavailable");
  });

  it("classifies normal, elevated, and high gas levels", () => {
    const thresholds = { elevatedGwei: 100, highGwei: 300 };

    expect(classifyGasStatus({ gasPriceGwei: 99, thresholds })).toBe("normal");
    expect(classifyGasStatus({ gasPriceGwei: 100, thresholds })).toBe(
      "elevated",
    );
    expect(classifyGasStatus({ gasPriceGwei: 300, thresholds })).toBe("high");
  });

  it("uses PulseChain fixed low, medium, and high bands", () => {
    expect(PULSECHAIN_GAS_STATUS_THRESHOLDS).toEqual({
      elevatedGwei: 750_000,
      highGwei: 2_000_000,
    });
    expect(classifyGasStatus({ gasPriceGwei: 749_999 })).toBe("normal");
    expect(classifyGasStatus({ gasPriceGwei: 750_000 })).toBe("elevated");
    expect(classifyGasStatus({ gasPriceGwei: 2_000_000 })).toBe("high");
  });

  it("maps chart colors to low, medium, high, and unavailable states", () => {
    expect(gasStatusChartColor("normal")).toBe("#00e5a0");
    expect(gasStatusChartColor("elevated")).toBe("#fbbf24");
    expect(gasStatusChartColor("high")).toBe("#ff4d6d");
    expect(gasStatusChartColor("unavailable")).toBe("#8a8db8");
  });

  it("uses the selected chain name in status copy", () => {
    expect(gasStatusCopy("elevated", "Base")).toBe(
      "Gas is in the medium Base range.",
    );
    expect(gasStatusCopy("unavailable", "HyperEVM")).toBe(
      "HyperEVM gas data is unavailable right now.",
    );
  });
});
