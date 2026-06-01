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
});
