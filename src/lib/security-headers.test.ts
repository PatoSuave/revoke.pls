import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";
import { buildContentSecurityPolicy } from "@/lib/security/content-security-policy";

describe("security headers", () => {
  it("does not advertise the framework in production responses", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("sets browser hardening headers for every route", async () => {
    const headers = await nextConfig.headers?.();
    const globalHeaders = headers?.find((entry) => entry.source === "/:path*")
      ?.headers;
    const byName = new Map(globalHeaders?.map((h) => [h.key, h.value]));

    expect(byName.has("Content-Security-Policy")).toBe(false);
    expect(byName.has("Content-Security-Policy-Report-Only")).toBe(false);
    expect(byName.get("X-Frame-Options")).toBe("DENY");
    expect(byName.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byName.get("Strict-Transport-Security")).toContain(
      "includeSubDomains",
    );
    expect(byName.get("Permissions-Policy")).toContain("usb=()");
  });

  it("builds nonce-based CSP in middleware instead of static unsafe-inline script CSP", () => {
    const policy = buildContentSecurityPolicy("test-nonce");

    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).toContain("report-uri /api/csp-report");
  });
});
