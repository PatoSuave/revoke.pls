import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  "src/components/gas/pulsechain-gas-tracker.tsx",
  "utf8",
);

describe("PulseChain gas tracker component source", () => {
  it("includes loading, available, and unavailable user states", () => {
    expect(SOURCE).toContain("Waiting for PulseChain gas data");
    expect(SOURCE).toContain("Typical Transaction Costs");
    expect(SOURCE).toContain("PulseChain gas data is unavailable");
  });

  it("keeps gas tracking informational and block-driven", () => {
    expect(SOURCE).toContain("watchBlockNumber");
    expect(SOURCE).toContain("/api/gas?chainId=369");
    expect(SOURCE).toContain("Revoke.PLS does not add an extra revoke fee");
    expect(SOURCE).not.toMatch(/writeContract|sendTransaction|signTransaction/);
  });
});
