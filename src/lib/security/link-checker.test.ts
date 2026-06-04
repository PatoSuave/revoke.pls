import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkCryptoLink } from "@/lib/security/link-checker";

describe("checkCryptoLink", () => {
  it("classifies the bare Pulse Revoke domain as an official match", () => {
    const result = checkCryptoLink("pulserevoke.com");

    expect(result.status).toBe("official-match");
    expect(result.hostname).toBe("pulserevoke.com");
    expect(result.normalizedUrl).toBe("https://pulserevoke.com/");
  });

  it("classifies a Pulse Revoke path as an official match", () => {
    const result = checkCryptoLink("https://pulserevoke.com/security");

    expect(result.status).toBe("official-match");
    expect(result.path).toBe("/security");
    expect(result.matchedOfficialDomain?.domain).toBe("pulserevoke.com");
  });

  it("detects Pulse Revoke lookalike domains", () => {
    const inputs = [
      "pulserrevoke.com",
      "pulse-revoke.com",
      "pulserev0ke.com",
      "pulserevoke.net",
    ];

    for (const input of inputs) {
      expect(checkCryptoLink(input).status, input).toBe("likely-lookalike");
    }
  });

  it("flags non-HTTPS links", () => {
    const result = checkCryptoLink("http://example.com");

    expect(result.status).toBe("suspicious-patterns");
    expect(result.signals.map((signal) => signal.id)).toContain("non-https");
  });

  it("does not give HTTP official-domain links the official-match status", () => {
    const result = checkCryptoLink("http://pulserevoke.com/security");

    expect(result.status).toBe("suspicious-patterns");
    expect(result.matchedOfficialDomain?.domain).toBe("pulserevoke.com");
    expect(result.signals.map((signal) => signal.id)).toContain("non-https");
  });

  it("flags IP hostnames", () => {
    const result = checkCryptoLink("https://192.168.0.1/connect");

    expect(result.status).toBe("suspicious-patterns");
    expect(result.signals.map((signal) => signal.id)).toContain("ip-hostname");
  });

  it("flags punycode hostnames", () => {
    const result = checkCryptoLink("https://xn--e1awd7f.com");

    expect(result.status).toBe("suspicious-patterns");
    expect(result.signals.map((signal) => signal.id)).toContain("punycode");
  });

  it("flags misleading userinfo before an @ symbol", () => {
    const result = checkCryptoLink("https://pulserevoke.com@evil.example");

    expect(result.hostname).toBe("evil.example");
    expect(result.status).toBe("suspicious-patterns");
    expect(result.signals.map((signal) => signal.id)).toContain(
      "misleading-userinfo",
    );
  });

  it("flags URL shorteners", () => {
    const result = checkCryptoLink("https://bit.ly/pulse-revoke");

    expect(result.status).toBe("suspicious-patterns");
    expect(result.signals.map((signal) => signal.id)).toContain("shortener");
  });

  it("returns invalid-input for invalid text", () => {
    expect(checkCryptoLink("not a url").status).toBe("invalid-input");
  });

  it("returns unknown-domain when no local signal is found", () => {
    const result = checkCryptoLink("https://example.com");

    expect(result.status).toBe("unknown-domain");
    expect(result.signals).toEqual([]);
    expect(result.candidateDomainMatches).toEqual([]);
  });

  it("adds candidate source context without promoting a domain to official", () => {
    const result = checkCryptoLink("https://app.pulsex.com");

    expect(result.status).toBe("unknown-domain");
    expect(result.matchedOfficialDomain).toBeUndefined();
    expect(result.closestCandidateDomain).toBeUndefined();
    expect(result.candidateDomainMatches).toHaveLength(1);
    expect(result.candidateDomainMatches[0]).toMatchObject({
      hostname: "app.pulsex.com",
      confidence: "candidate-source",
    });
    expect(result.userMessage).toContain("candidate source list");
  });

  it("detects lookalikes of candidate source-list domains without making them official", () => {
    const result = checkCryptoLink("https://app.pu1sex.com");

    expect(result.status).toBe("likely-lookalike");
    expect(result.matchedOfficialDomain).toBeUndefined();
    expect(result.closestOfficialDomain).toBeUndefined();
    expect(result.candidateDomainMatches).toEqual([]);
    expect(result.closestCandidateDomain).toMatchObject({
      hostname: "app.pulsex.com",
      confidence: "candidate-source",
    });
    expect(result.userMessage).toContain("candidate source list");
    expect(result.userMessage).not.toContain("official-domain registry");
  });

  it("detects candidate source-list TLD swaps as lookalike risk", () => {
    const result = checkCryptoLink("https://pulsex.net");

    expect(result.status).toBe("likely-lookalike");
    expect(result.closestCandidateDomain?.hostname).toBe("app.pulsex.com");
    expect(result.candidateDomainMatches).toEqual([]);
  });

  it("does not treat unapproved official-domain subdomains as official", () => {
    const result = checkCryptoLink("https://app.pulserevoke.com");

    expect(result.status).toBe("suspicious-patterns");
    expect(result.matchedOfficialDomain).toBeUndefined();
    expect(result.signals.map((signal) => signal.id)).toContain(
      "unregistered-official-subdomain",
    );
  });

  it("keeps checker copy away from overconfident wording", () => {
    const source = [
      "src/lib/security/link-checker.ts",
      "src/components/security/link-checker.tsx",
      "src/components/security/link-checker-result.tsx",
    ]
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n");

    expect(source).not.toMatch(/\b(safe|trusted|guaranteed)\b/i);
  });

  it("keeps source-list example copy distinct from official-match copy", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/security/link-checker.tsx"),
      "utf8",
    );

    expect(source).toContain("Try source-list example");
    expect(source).toContain("https://app.pulsex.com");
    expect(source).toContain("not");
    expect(source).toContain("official-domain matches");
  });

  it("does not add wallet write paths or secret-request inputs", () => {
    const source = [
      "src/components/security/link-checker.tsx",
      "src/components/security/link-checker-result.tsx",
    ]
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n");
    const inputBlocks = source.match(/<input[\s\S]*?>/g) ?? [];

    expect(inputBlocks.length).toBeGreaterThan(0);
    for (const input of inputBlocks) {
      expect(input).not.toMatch(
        /seed phrase|recovery phrase|private key|mnemonic|keystore|wallet password/i,
      );
    }
    expect(source).not.toMatch(
      /writeContract|sendTransaction|connectWallet|useAccount|useWalletClient|server signer|server-sign|relayer|flashbots/i,
    );
  });

  it("keeps the checker route unpublished from main", () => {
    expect(
      existsSync(join(process.cwd(), "src", "app", "security", "check-link", "page.tsx")),
    ).toBe(false);
  });
});
