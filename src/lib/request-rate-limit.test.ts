import { describe, expect, it } from "vitest";

import { rateLimitKeyFromHeaders } from "@/lib/request-rate-limit";

describe("rateLimitKeyFromHeaders", () => {
  it("uses the first platform-forwarded client IP", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 198.51.100.99",
    });

    expect(rateLimitKeyFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("ignores spoofable caller-controlled proxy headers", () => {
    const headers = new Headers({
      "cf-connecting-ip": "198.51.100.88",
      "x-forwarded-for": "203.0.113.20",
      "x-real-ip": "198.51.100.77",
    });

    expect(rateLimitKeyFromHeaders(headers)).toBe("203.0.113.20");
  });

  it("falls back to a shared anonymous bucket without platform context", () => {
    expect(rateLimitKeyFromHeaders(new Headers())).toBe("unknown-client");
    expect(rateLimitKeyFromHeaders(new Headers({ "x-forwarded-for": " " }))).toBe(
      "unknown-client",
    );
  });

  it("accepts platform-forwarded IPv6 client IPs", () => {
    const headers = new Headers({
      "x-forwarded-for": "2001:db8:85a3::8a2e:370:7334, 198.51.100.99",
    });

    expect(rateLimitKeyFromHeaders(headers)).toBe("2001:db8:85a3::8a2e:370:7334");
  });

  it("does not create attacker-chosen buckets from malformed forwarded values", () => {
    expect(
      rateLimitKeyFromHeaders(
        new Headers({ "x-forwarded-for": "not-an-ip-bucket" }),
      ),
    ).toBe("unknown-client");
    expect(
      rateLimitKeyFromHeaders(
        new Headers({ "x-forwarded-for": "203.0.113.10:1234" }),
      ),
    ).toBe("unknown-client");
  });
});
