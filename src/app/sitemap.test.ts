import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("does not publish unfinished route entries", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).not.toContain("https://pulserevoke.com/security/check-link");
    expect(urls).not.toContain("https://pulserevoke.com/app/wallet-lifeboat");
  });
});
