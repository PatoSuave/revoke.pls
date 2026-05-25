import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("security headers", () => {
  it("sets browser hardening headers for every route", async () => {
    const headers = await nextConfig.headers?.();
    const globalHeaders = headers?.find((entry) => entry.source === "/:path*")
      ?.headers;
    const byName = new Map(globalHeaders?.map((h) => [h.key, h.value]));

    expect(byName.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(byName.get("Content-Security-Policy")).toContain(
      "object-src 'none'",
    );
    expect(byName.get("Content-Security-Policy-Report-Only")).toContain(
      "script-src 'self'",
    );
    expect(byName.get("Content-Security-Policy-Report-Only")).toContain(
      "report-uri /api/csp-report",
    );
    expect(byName.get("X-Frame-Options")).toBe("DENY");
    expect(byName.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byName.get("Strict-Transport-Security")).toContain(
      "includeSubDomains",
    );
    expect(byName.get("Permissions-Policy")).toContain("usb=()");
  });
});
