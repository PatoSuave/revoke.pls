import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  "src/components/gas/pulsechain-gas-tracker.tsx",
  "utf8",
);

describe("PulseChain gas tracker component source", () => {
  it("includes loading, available, and unavailable user states", () => {
    expect(SOURCE).toContain("Waiting for ${selectedChain.chainName} gas data");
    expect(SOURCE).toContain("Estimated Transaction Costs");
    expect(SOURCE).toContain("${selectedChain.chainName} gas data is unavailable");
  });

  it("keeps gas tracking informational and block-driven", () => {
    expect(SOURCE).toContain("watchBlockNumber");
    expect(SOURCE).toContain("/api/gas?chainId=${chainId}");
    expect(SOURCE).toContain("does not add fees");
    expect(SOURCE).not.toMatch(/writeContract|sendTransaction|signTransaction/);
  });

  it("uses a two-second visual heartbeat without fake samples", () => {
    expect(SOURCE).toContain("2_000");
    expect(SOURCE).toContain("2s");
    expect(SOURCE).toContain("<animate");
    expect(SOURCE).toContain('dur="2s"');
  });

  it("keeps gas secondary to the revoke workflow by default", () => {
    expect(SOURCE).toContain("Network fee");
    expect(SOURCE).toContain("fee monitor");
    expect(SOURCE).toContain("Estimated revoke");
    expect(SOURCE).toContain("View live chart");
    expect(SOURCE).toContain("MiniGasSparkline");
    expect(SOURCE).toContain("conditionLabel");
    expect(SOURCE).toContain("Watching");
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
    expect(SOURCE).toContain("Advisory tiers");
    expect(SOURCE).toContain("Supplemental Owlracle estimates");
    expect(SOURCE).toMatch(/RPC remains source\s+of truth/);
  });
});
