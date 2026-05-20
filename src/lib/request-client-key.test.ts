import { describe, expect, it } from "vitest";

import { getRequestClientKey } from "@/lib/request-client-key";

function requestWithHeaders(headers: HeadersInit) {
  return new Request("https://pulserevoke.test/api/check", { headers });
}

describe("getRequestClientKey", () => {
  it("prefers Vercel and CDN client headers before forwarded chains", () => {
    expect(
      getRequestClientKey(
        requestWithHeaders({
          "cf-connecting-ip": "2001:db8::1",
          "x-real-ip": "203.0.113.10",
          "x-forwarded-for": "203.0.113.11, 198.51.100.5",
        }),
      ),
    ).toBe("2001:db8::1");
  });

  it("uses the first x-forwarded-for IP when no stronger header is present", () => {
    expect(
      getRequestClientKey(
        requestWithHeaders({
          "x-forwarded-for": "203.0.113.22, 198.51.100.5",
        }),
      ),
    ).toBe("203.0.113.22");
  });

  it("normalizes common proxy port formats", () => {
    expect(
      getRequestClientKey(
        requestWithHeaders({
          "x-real-ip": "203.0.113.45:443",
        }),
      ),
    ).toBe("203.0.113.45");
    expect(
      getRequestClientKey(
        requestWithHeaders({
          "x-forwarded-for": "[2001:db8::abcd]:443",
        }),
      ),
    ).toBe("2001:db8::abcd");
  });

  it("falls back instead of accepting malformed or oversized header keys", () => {
    expect(
      getRequestClientKey(
        requestWithHeaders({
          "cf-connecting-ip": "not-an-ip",
          "x-real-ip": "203.0.113.2 injected",
          "x-forwarded-for": "x".repeat(5_000),
        }),
      ),
    ).toBe("unknown-client");
  });
});
