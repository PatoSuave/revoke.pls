import { describe, expect, it } from "vitest";

import {
  CANDIDATE_DOMAIN_HOSTNAMES,
  PLSTART_CANDIDATE_SOURCE,
  findCandidateDomainMatches,
} from "@/lib/security/candidate-domain-registry";

describe("candidate-domain-registry", () => {
  it("stores the plstart.me GitHub mirror as candidate context only", () => {
    expect(PLSTART_CANDIDATE_SOURCE).toEqual({
      id: "plstart-eth-limo",
      label: "plstart.me GitHub mirror",
      sourceUrl:
        "https://raw.githubusercontent.com/0xWhankFrite/plstart.eth.limo/6417ee6c6b86ab9fa79417e9cc532f70edc19446/index.html",
      sourceRepositoryUrl: "https://github.com/0xWhankFrite/plstart.eth.limo",
      capturedAt: "2026-05-30",
    });
  });

  it("keeps the imported hostnames deduped and broad enough for the source", () => {
    expect(new Set(CANDIDATE_DOMAIN_HOSTNAMES).size).toBe(
      CANDIDATE_DOMAIN_HOSTNAMES.length,
    );
    expect(CANDIDATE_DOMAIN_HOSTNAMES).toHaveLength(178);
    expect(CANDIDATE_DOMAIN_HOSTNAMES).toContain("app.pulsex.com");
    expect(CANDIDATE_DOMAIN_HOSTNAMES).toContain("bridge.pulsechain.com");
    expect(CANDIDATE_DOMAIN_HOSTNAMES).toContain("scan.pulsechain.com");
  });

  it("matches exact source hostnames without promoting them to official domains", () => {
    const matches = findCandidateDomainMatches("app.pulsex.com");

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      hostname: "app.pulsex.com",
      confidence: "candidate-source",
    });
  });

  it("treats www and root forms as equivalent for candidate context", () => {
    expect(findCandidateDomainMatches("coingecko.com")[0]?.hostname).toBe(
      "www.coingecko.com",
    );
    expect(findCandidateDomainMatches("www.coingecko.com")[0]?.hostname).toBe(
      "www.coingecko.com",
    );
  });

  it("does not match unlisted sibling hostnames", () => {
    expect(findCandidateDomainMatches("evil.pulsex.com")).toEqual([]);
  });
});
