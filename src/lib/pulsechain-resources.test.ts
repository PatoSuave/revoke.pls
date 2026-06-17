import { describe, expect, it } from "vitest";

import {
  PULSECHAIN_RESOURCE_LINKS,
  PULSECHAIN_RESOURCE_NOTICE,
} from "@/lib/pulsechain-resources";

describe("PulseChain resource links", () => {
  const referralRedirectDomain = ["refr", "cc"].join(".");

  it("keeps the curated resource list on the exact approved HTTPS domains", () => {
    expect(PULSECHAIN_RESOURCE_LINKS.map((link) => link.href)).toEqual([
      "https://pulsechain.com/",
      "https://pulsex.com/",
      "https://libertyswap.finance/",
      "https://9mm.pro/",
      "https://hex.com/",
      "https://trezor.io/store",
      "https://zkxwallet.com/",
    ]);
    expect(
      PULSECHAIN_RESOURCE_LINKS.every((link) =>
        link.href.startsWith("https://"),
      ),
    ).toBe(true);
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
      "trezor.io",
      "zkxwallet.com",
    ]);
  });

  it("keeps local logos or fallback marks for every curated destination", () => {
    const logos = PULSECHAIN_RESOURCE_LINKS.flatMap((link) =>
      link.logoSrc ? [link.logoSrc] : [],
    );

    expect(new Set(logos).size).toBe(logos.length);
    expect(
      logos.every((logoSrc) => logoSrc.startsWith("/protocol-logos/")),
    ).toBe(true);
    expect(logos.every((logoSrc) => /\.(png|svg)$/.test(logoSrc))).toBe(true);
    expect(
      PULSECHAIN_RESOURCE_LINKS.every(
        (link) => Boolean(link.logoSrc) || Boolean(link.fallbackMark),
      ),
    ).toBe(true);
  });

  it("targets hover videos only to the approved resource cards", () => {
    const hoverVideoLinks = PULSECHAIN_RESOURCE_LINKS.filter(
      (link) => link.hoverVideoSrc,
    );

    expect(hoverVideoLinks.map((link) => link.label).sort()).toEqual([
      "9mm Pro",
      "HEX",
      "LibertySwap",
      "PulseChain",
      "PulseX",
    ]);
    expect(
      Object.fromEntries(
        hoverVideoLinks.map((link) => [link.label, link.hoverVideoSrc]),
      ),
    ).toEqual({
      "9mm Pro": "/media/9mm-hover.mov",
      HEX: "/media/richard-heart-twerking.mp4",
      LibertySwap: "/media/libertyswap-pcock.mp4",
      PulseChain: "/media/richard-heart-twerking.mp4",
      PulseX: "/media/richard-heart-twerking.mp4",
    });
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

  it("keeps Trezor pointed at the official store only", () => {
    const trezor = PULSECHAIN_RESOURCE_LINKS.find(
      (link) => link.label === "Trezor",
    );

    expect(trezor).toBeDefined();
    expect(trezor?.href).toBe("https://trezor.io/store");
    expect(trezor?.domain).toBe("trezor.io");
    expect(trezor?.logoSrc).toBe("/protocol-logos/trezor.svg");
    expect(trezor?.actions).toEqual([
      {
        label: "Official site",
        href: "https://trezor.io/store",
        domain: "trezor.io",
        kind: "primary",
      },
    ]);
    expect(
      trezor?.actions?.every((action) => action.href.startsWith("https://")),
    ).toBe(true);
    expect(JSON.stringify(trezor).toLowerCase()).not.toContain("referral");
    expect(JSON.stringify(trezor).toLowerCase()).not.toContain(
      referralRedirectDomain,
    );
  });

  it("keeps ZKX Wallet pointed at the provided HTTPS wallet site", () => {
    const zkx = PULSECHAIN_RESOURCE_LINKS.find(
      (link) => link.label === "ZKX Wallet",
    );

    expect(zkx).toBeDefined();
    expect(zkx?.href).toBe("https://zkxwallet.com/");
    expect(zkx?.domain).toBe("zkxwallet.com");
    expect(zkx?.category).toBe("Wallet");
    expect(zkx?.logoSrc).toBe("/protocol-logos/zkx-wallet.png");
    expect(JSON.stringify(zkx).toLowerCase()).not.toContain("referral");
    expect(JSON.stringify(zkx).toLowerCase()).not.toContain(
      referralRedirectDomain,
    );
  });

  it("does not frame the list as financial advice or a safety guarantee", () => {
    expect(PULSECHAIN_RESOURCE_NOTICE).toContain("not financial advice");
    expect(PULSECHAIN_RESOURCE_NOTICE).toContain("not");
    expect(PULSECHAIN_RESOURCE_NOTICE).toContain("safety guarantee");
    expect(PULSECHAIN_RESOURCE_NOTICE).toContain("verify the destination domain");
    expect(PULSECHAIN_RESOURCE_NOTICE.toLowerCase()).not.toContain("referral");
  });
});
