import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CSP_REPORT_MAX_BYTES,
  resetCspReportRateLimitForTests,
} from "@/lib/csp-report-controls";
import { POST } from "./route";

afterEach(() => {
  resetCspReportRateLimitForTests();
  vi.restoreAllMocks();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

describe("CSP report route hardening", () => {
  it("accepts and logs a sanitized report summary", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await POST(
      new Request("https://pulserevoke.test/api/csp-report", {
        method: "POST",
        headers: {
          "content-type": "application/csp-report",
          "x-forwarded-for": "203.0.113.30",
        },
        body: JSON.stringify({
          "csp-report": {
            "document-uri": "https://pulserevoke.com/app?address=0xsecret",
            "blocked-uri": "https://evil.example/script.js?token=secret",
            "effective-directive": "script-src",
            "violated-directive": "script-src-elem",
            "source-file": "https://pulserevoke.com/app?debug=true",
            "line-number": 12,
            "column-number": 34,
            disposition: "report",
          },
        }),
      }),
    );

    expect(response.status).toBe(204);
    expectNoStore(response);
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(String(warn.mock.calls[0]?.[0]));
    expect(logged).toMatchObject({
      level: "warn",
      msg: "csp-report",
      documentUri: "https://pulserevoke.com/app",
      blockedUri: "https://evil.example/script.js",
      effectiveDirective: "script-src",
      violatedDirective: "script-src-elem",
      sourceFile: "https://pulserevoke.com/app",
      lineNumber: 12,
      columnNumber: 34,
      disposition: "report",
    });
  });

  it("rejects oversized report bodies", async () => {
    const response = await POST(
      new Request("https://pulserevoke.test/api/csp-report", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.31" },
        body: "x".repeat(CSP_REPORT_MAX_BYTES + 1),
      }),
    );

    expect(response.status).toBe(413);
    expectNoStore(response);
  });

  it("rate-limits repeated reports", async () => {
    let response: Response | null = null;
    for (let i = 0; i < 31; i += 1) {
      response = await POST(
        new Request("https://pulserevoke.test/api/csp-report", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.32" },
          body: "{}",
        }),
      );
    }

    expect(response?.status).toBe(429);
    expectNoStore(response!);
    expect(response?.headers.get("Retry-After")).toBeTruthy();
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("30");
  });
});
