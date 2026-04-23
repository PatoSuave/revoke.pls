import { describe, it, expect } from "vitest";
import { shortenAddress } from "./format";

describe("shortenAddress", () => {
  it("should return an empty string for nullish input", () => {
    expect(shortenAddress(null as any)).toBe("");
    expect(shortenAddress(undefined as any)).toBe("");
    expect(shortenAddress("")).toBe("");
  });

  it("should shorten a standard 42-character address with default chars=4", () => {
    const address = "0x1234567890123456789012345678901234567890";
    // default chars=4: slice(0, 2+4) -> slice(0, 6) "0x1234"
    // slice(-4) -> "7890"
    expect(shortenAddress(address)).toBe("0x1234…7890");
  });

  it("should shorten a standard address with custom chars", () => {
    const address = "0x1234567890123456789012345678901234567890";
    expect(shortenAddress(address, 6)).toBe("0x123456…567890");
    expect(shortenAddress(address, 2)).toBe("0x12…90");
  });

  it("should handle addresses shorter than the truncation limit", () => {
    // address.slice(0, 2 + 4) ... address.slice(-4)
    // if address is "0x123", slice(0, 6) is "0x123", slice(-4) is "x123"
    const shortAddress = "0x123";
    expect(shortenAddress(shortAddress)).toBe("0x123…x123");
  });

  it("should handle non-address strings", () => {
    expect(shortenAddress("hello-world", 3)).toBe("hello…rld");
  });
});
