import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "@/lib/security/content-security-policy";

function getDirective(policy: string, name: string) {
  return policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `));
}

describe("content security policy", () => {
  it("enforces nonce-based scripts without unsafe-inline", () => {
    const policy = buildContentSecurityPolicy("test-nonce");
    const scriptSrc = getDirective(policy, "script-src");

    expect(scriptSrc).toBe(
      "script-src 'self' 'nonce-test-nonce' 'strict-dynamic'",
    );
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("report-uri /api/csp-report");
  });

  it("rejects malformed nonces before they can enter the header", () => {
    expect(() => buildContentSecurityPolicy("bad <nonce>")).toThrow(
      /invalid characters/i,
    );
  });
});
