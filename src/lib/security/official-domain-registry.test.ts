import { describe, expect, it } from "vitest";

import {
  OFFICIAL_DOMAIN_REGISTRY,
  findOfficialDomainMatch,
  findOfficialParentDomain,
} from "@/lib/security/official-domain-registry";

describe("OFFICIAL_DOMAIN_REGISTRY", () => {
  it("seeds only the reviewed Pulse Revoke production domain", () => {
    expect(OFFICIAL_DOMAIN_REGISTRY).toEqual([
      {
        domain: "pulserevoke.com",
        projectName: "Pulse Revoke",
        category: "pulse-revoke",
        sourceLabel: "Pulse Revoke production domain",
        sourceUrl: "https://pulserevoke.com/security",
        lastReviewedAt: "2026-05-30",
        allowSubdomains: false,
      },
    ]);
  });

  it("matches the exact official hostname", () => {
    expect(findOfficialDomainMatch("pulserevoke.com")?.domain).toBe(
      "pulserevoke.com",
    );
  });

  it("does not treat subdomains as official unless explicitly allowed", () => {
    expect(findOfficialDomainMatch("app.pulserevoke.com")).toBeUndefined();
    expect(findOfficialParentDomain("app.pulserevoke.com")?.domain).toBe(
      "pulserevoke.com",
    );
  });
});
