import { describe, expect, it } from "vitest";

import {
  DEFAULT_SITE_URL,
  normalizeSiteUrl,
  resolveSiteUrl,
  siteConfig,
} from "./site";

describe("normalizeSiteUrl", () => {
  it("uses pulserevoke.com as the built-in production fallback", () => {
    expect(DEFAULT_SITE_URL).toBe("https://pulserevoke.com");
  });

  it("keeps a full https URL as the normalized origin", () => {
    expect(normalizeSiteUrl("https://revoke-pls.vercel.app")).toBe(
      "https://revoke-pls.vercel.app",
    );
  });

  it("normalizes a host-only value to https", () => {
    expect(normalizeSiteUrl("revoke-pls.vercel.app")).toBe(
      "https://revoke-pls.vercel.app",
    );
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeSiteUrl("  https://revoke-pls.vercel.app  ")).toBe(
      "https://revoke-pls.vercel.app",
    );
  });

  it("removes a trailing slash from the base URL", () => {
    expect(normalizeSiteUrl("https://revoke-pls.vercel.app/")).toBe(
      "https://revoke-pls.vercel.app",
    );
  });

  it("uses the configured fallback when the value is missing", () => {
    expect(normalizeSiteUrl(undefined, "https://fallback.example")).toBe(
      "https://fallback.example",
    );
  });

  it("uses the default fallback when no value is configured", () => {
    expect(normalizeSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
  });

  it("falls back and marks clearly invalid values", () => {
    const result = resolveSiteUrl(
      "https://revoke-pls.vercel.app/app?x=1",
      "https://fallback.example",
    );

    expect(result).toEqual({
      url: "https://fallback.example",
      usedFallback: true,
      issue: "invalid",
    });
  });
});

describe("siteConfig nav", () => {
  it("keeps shared app-shell nav pointed at real app routes", () => {
    expect(siteConfig.nav).toEqual([
      { href: "/app#scanner", label: "Scanner" },
      { href: "/app/wallet-lifeboat", label: "Wallet Lifeboat" },
      { href: "/security", label: "Security Guide" },
      { href: "/intel", label: "Intelligence" },
    ]);
  });
});
