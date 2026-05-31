import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CANDIDATE_DOMAIN_HOSTNAMES,
  CANDIDATE_DOMAIN_REGISTRY,
  CANDIDATE_DOMAIN_SOURCE_PACKETS,
  PLSTART_CANDIDATE_HOSTNAMES,
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
      sourcePageUrl: "https://start.me/p/gGQ09M/plstart-me",
      sourceRepositoryUrl: "https://github.com/0xWhankFrite/plstart.eth.limo",
      sourcePacketPath: "docs/security/domain-source-packets/plstart-eth-limo.md",
      capturedAt: "2026-05-30",
    });
    const plstartPacket = CANDIDATE_DOMAIN_SOURCE_PACKETS.find(
      (packet) => packet.source.id === PLSTART_CANDIDATE_SOURCE.id,
    );

    expect(plstartPacket?.source).toBe(
      PLSTART_CANDIDATE_SOURCE,
    );
    expect(plstartPacket?.hostnames).toBe(
      PLSTART_CANDIDATE_HOSTNAMES,
    );
  });

  it("keeps the imported hostnames deduped and broad enough for the source", () => {
    const uniquePacketHostnames = new Set(
      CANDIDATE_DOMAIN_SOURCE_PACKETS.flatMap((packet) => packet.hostnames),
    );

    expect(PLSTART_CANDIDATE_HOSTNAMES).toHaveLength(178);
    expect(CANDIDATE_DOMAIN_HOSTNAMES).toEqual(
      [...uniquePacketHostnames].sort(),
    );
    expect(new Set(CANDIDATE_DOMAIN_HOSTNAMES).size).toBe(
      CANDIDATE_DOMAIN_HOSTNAMES.length,
    );
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

    for (const packet of CANDIDATE_DOMAIN_SOURCE_PACKETS) {
      expect(packet.hostnames).toEqual([...packet.hostnames].sort());
      expect(new Set(packet.hostnames).size).toBe(packet.hostnames.length);
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
    const sourceHostnameCount = CANDIDATE_DOMAIN_SOURCE_PACKETS.reduce(
      (total, packet) => total + packet.hostnames.length,
      0,
    );
    const packetBySourceId = new Map(
      CANDIDATE_DOMAIN_SOURCE_PACKETS.map((packet) => [
        packet.source.id,
        packet,
      ]),
    );

    expect(CANDIDATE_DOMAIN_REGISTRY).toHaveLength(
      sourceHostnameCount,
    );
    for (const entry of CANDIDATE_DOMAIN_REGISTRY) {
      expect(entry.confidence).toBe("candidate-source");
      expect(packetBySourceId.get(entry.source.id)?.hostnames).toContain(
        entry.hostname,
      );
      expect(entry.lastReviewedAt).toBe(entry.source.capturedAt);
    }
  });

  it("keeps each source packet tied to reviewed source metadata", () => {
    for (const packet of CANDIDATE_DOMAIN_SOURCE_PACKETS) {
      const sourcePacket = readFileSync(
        join(process.cwd(), packet.source.sourcePacketPath),
        "utf8",
      );

      expect(sourcePacket).toContain(packet.source.sourceUrl);
      if (packet.source.sourcePageUrl) {
        expect(sourcePacket).toContain(packet.source.sourcePageUrl);
      }
      if (packet.source.sourceRepositoryUrl) {
        expect(sourcePacket).toContain(packet.source.sourceRepositoryUrl);
      }
      expect(sourcePacket).toContain(packet.source.capturedAt);
      expect(sourcePacket).toContain("Candidate source context only");
      expect(sourcePacket).toContain("Unique URLs observed");
      expect(sourcePacket).toContain(String(packet.hostnames.length));

      expect(packet.source.sourceUrl).toMatch(/^https:\/\//);
      if (packet.source.sourcePageUrl) {
        expect(packet.source.sourcePageUrl).toMatch(/^https:\/\//);
      }
      if (packet.source.sourceRepositoryUrl) {
        expect(packet.source.sourceRepositoryUrl).toMatch(/^https:\/\//);
      }
    }
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
