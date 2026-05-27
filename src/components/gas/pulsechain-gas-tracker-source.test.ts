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

  it("uses a two-second visual heartbeat without fake samples", () => {
    expect(SOURCE).toContain("2_000");
    expect(SOURCE).toContain("New blocks + 2s heartbeat");
    expect(SOURCE).toContain("<animate");
    expect(SOURCE).toContain('dur="2s"');
  });

  it("renders status-segmented chart UX with motion safety", () => {
    expect(SOURCE).toContain("gasStatusChartColor");
    expect(SOURCE).toContain("segments.map");
    expect(SOURCE).toContain("bg-pulse-yellow");
    expect(SOURCE).toContain("prefers-reduced-motion");
    expect(SOURCE).toContain("requestAnimationFrame");
    expect(SOURCE).toContain("buildSmoothSegmentPath");
    expect(SOURCE).toContain("stroke-dashoffset");
  });

  it("labels Owlracle advisory data as supplemental", () => {
    expect(SOURCE).toContain("Advisory Tiers");
    expect(SOURCE).toContain("Supplemental Owlracle estimates");
    expect(SOURCE).toContain("source of truth");
  });
});
