import { describe, expect, it } from "vitest";

import { appendGasHistorySample } from "@/lib/gas/gas-history";
import type { GasApiResponse } from "@/lib/gas/gas-types";

function sample(blockNumber: string, gasPriceGwei: string): GasApiResponse {
  return {
    chainId: 369,
    chainName: "PulseChain",
    nativeCurrency: "PLS",
    blockNumber,
    source: "rpc-gas-price",
    status: "normal",
    updatedAt: "2026-05-27T00:00:00.000Z",
    available: true,
    gasPriceGwei,
    baseFeeGwei: null,
    priorityFeeGwei: null,
    typicalTransactions: [],
  };
}

describe("gas chart history", () => {
  it("keeps a rolling in-memory history with block dedupe", () => {
    const first = appendGasHistorySample({
      history: [],
      sample: sample("1", "10"),
      limit: 2,
    });
    const deduped = appendGasHistorySample({
      history: first,
      sample: sample("1", "11"),
      limit: 2,
    });
    const second = appendGasHistorySample({
      history: deduped,
      sample: sample("2", "12"),
      limit: 2,
    });
    const third = appendGasHistorySample({
      history: second,
      sample: sample("3", "13"),
      limit: 2,
    });

    expect(deduped).toHaveLength(1);
    expect(deduped[0].gasPriceGwei).toBe(11);
    expect(third.map((entry) => entry.blockNumber)).toEqual(["2", "3"]);
  });

  it("ignores unavailable samples", () => {
    const history = appendGasHistorySample({
      history: [],
      sample: { ...sample("1", "10"), available: false },
    });

    expect(history).toEqual([]);
  });
});
