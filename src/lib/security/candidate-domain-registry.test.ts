import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CANDIDATE_DOMAIN_HOSTNAMES,
  CANDIDATE_DOMAIN_REGISTRY,
  PLSTART_CANDIDATE_SOURCE,
  findCandidateDomainMatches,
} from "@/lib/security/candidate-domain-registry";
import { OFFICIAL_DOMAIN_REGISTRY } from "@/lib/security/official-domain-registry";

describe("candidate-domain-registry", () => {
  it("stores the plstart.me GitHub mirror as candidate context only", () => {
    expect(PLSTART_CANDIDATE_SOURCE).toEqual({
      id: "plstart-eth-limo",
      label: "plstart.me GitHub mirror",
      sourceUrl:
        "https://raw.githubusercontent.com/0xWhankFrite/plstart.eth.limo/6417ee6c6b86ab9fa79417e9cc532f70edc19446/index.html",
      sourceRepositoryUrl: "https://github.com/0xWhankFrite/plstart.eth.limo",
      sourcePacketPath: "docs/security/domain-source-packets/plstart-eth-limo.md",
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

  it("keeps candidate hostnames normalized, sorted, and host-only", () => {
    const sorted = [...CANDIDATE_DOMAIN_HOSTNAMES].sort();

    expect(CANDIDATE_DOMAIN_HOSTNAMES).toEqual(sorted);
    for (const hostname of CANDIDATE_DOMAIN_HOSTNAMES) {
      expect(hostname).toBe(hostname.toLowerCase());
      expect(hostname).not.toMatch(/:\/\//);
      expect(hostname).not.toMatch(/[/?#@\s]/);
      expect(hostname).not.toMatch(/^\./);
      expect(hostname).not.toMatch(/\.$/);
    }
  });

  it("keeps candidate domains separate from the official-domain registry", () => {
    const officialDomains = new Set(
      OFFICIAL_DOMAIN_REGISTRY.map((entry) => entry.domain),
    );

    for (const hostname of CANDIDATE_DOMAIN_HOSTNAMES) {
      expect(officialDomains.has(hostname)).toBe(false);
    }
  });

  it("keeps every candidate entry labeled as candidate-source", () => {
    expect(CANDIDATE_DOMAIN_REGISTRY).toHaveLength(
      CANDIDATE_DOMAIN_HOSTNAMES.length,
    );
    for (const entry of CANDIDATE_DOMAIN_REGISTRY) {
      expect(entry.confidence).toBe("candidate-source");
      expect(entry.source.id).toBe(PLSTART_CANDIDATE_SOURCE.id);
      expect(entry.lastReviewedAt).toBe(PLSTART_CANDIDATE_SOURCE.capturedAt);
    }
  });

  it("keeps a source packet tied to the pinned source snapshot", () => {
    const sourcePacket = readFileSync(
      join(process.cwd(), PLSTART_CANDIDATE_SOURCE.sourcePacketPath),
      "utf8",
    );

    expect(sourcePacket).toContain(PLSTART_CANDIDATE_SOURCE.sourceUrl);
    expect(sourcePacket).toContain(PLSTART_CANDIDATE_SOURCE.sourceRepositoryUrl);
    expect(sourcePacket).toContain("Candidate source context only");
    expect(sourcePacket).toContain("Unique URLs observed");
    expect(sourcePacket).toContain("178");
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
