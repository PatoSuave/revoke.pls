import { describe, expect, it } from "vitest";

import { classifyGasStatus } from "@/lib/gas/gas-status";

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
});
