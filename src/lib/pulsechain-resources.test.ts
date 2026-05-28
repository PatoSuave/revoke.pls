import { describe, expect, it } from "vitest";

import {
  PULSECHAIN_RESOURCE_LINKS,
  PULSECHAIN_RESOURCE_NOTICE,
} from "@/lib/pulsechain-resources";

describe("PulseChain resource links", () => {
  it("keeps the curated resource list on the exact approved HTTPS domains", () => {
    expect(PULSECHAIN_RESOURCE_LINKS.map((link) => link.href)).toEqual([
      "https://pulsechain.com/",
      "https://pulsex.com/",
      "https://libertyswap.finance/",
      "https://9mm.pro/",
      "https://hex.com/",
    ]);
    expect(PULSECHAIN_RESOURCE_LINKS.every((link) => link.href.startsWith("https://"))).toBe(
      true,
    );
  });

  it("uses each display domain exactly once", () => {
    const domains = PULSECHAIN_RESOURCE_LINKS.map((link) => link.domain);

    expect(new Set(domains).size).toBe(domains.length);
    expect(domains).toEqual([
      "pulsechain.com",
      "pulsex.com",
      "libertyswap.finance",
      "9mm.pro",
      "hex.com",
    ]);
  });

  it("keeps local logo assets for every curated destination", () => {
    const logos = PULSECHAIN_RESOURCE_LINKS.map((link) => link.logoSrc);

    expect(new Set(logos).size).toBe(logos.length);
    expect(logos.every((logoSrc) => logoSrc.startsWith("/protocol-logos/"))).toBe(
      true,
    );
    expect(logos.every((logoSrc) => logoSrc.endsWith(".png"))).toBe(true);
  });

  it("keeps accent colors readable in light mode", () => {
    expect(PULSECHAIN_RESOURCE_LINKS.every((link) => link.accentReadable)).toBe(
      true,
    );
    const nineMm = PULSECHAIN_RESOURCE_LINKS.find(
      (link) => link.label === "9mm Pro",
    );

    expect(nineMm && "logoPlate" in nineMm ? nineMm.logoPlate : undefined).toBe(
      "dark",
    );
  });

  it("does not frame the list as financial advice or a safety guarantee", () => {
    expect(PULSECHAIN_RESOURCE_NOTICE).toContain("not financial advice");
    expect(PULSECHAIN_RESOURCE_NOTICE).toContain("not");
    expect(PULSECHAIN_RESOURCE_NOTICE).toContain("safety guarantee");
    expect(PULSECHAIN_RESOURCE_NOTICE).toContain("verify the domain");
  });
});
