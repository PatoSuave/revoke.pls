import { describe, expect, it } from "vitest";

import {
  HYPEREVM_CORE_WRITER_ADDRESS,
  HYPEREVM_HYPE_SYSTEM_ADDRESS,
  HYPEREVM_SYSTEM_CONTRACTS,
  HYPEREVM_WHYPE_ADDRESS,
  getHyperEvmSystemContractMetadata,
} from "@/lib/hyperevm-system-contracts";

describe("HyperEVM system contract metadata", () => {
  it("includes known HyperEVM system addresses", () => {
    expect(HYPEREVM_SYSTEM_CONTRACTS.coreWriter.address).toBe(
      HYPEREVM_CORE_WRITER_ADDRESS,
    );
    expect(HYPEREVM_SYSTEM_CONTRACTS.hypeSystem.address).toBe(
      HYPEREVM_HYPE_SYSTEM_ADDRESS,
    );
    expect(HYPEREVM_SYSTEM_CONTRACTS.whype.address).toBe(
      HYPEREVM_WHYPE_ADDRESS,
    );
  });

  it("looks up labels case-insensitively without safety claims", () => {
    const metadata = getHyperEvmSystemContractMetadata(
      HYPEREVM_CORE_WRITER_ADDRESS.toUpperCase(),
    );

    expect(metadata?.label).toBe("HyperEVM CoreWriter");
    expect(metadata?.warning).toContain("may not appear");
    expect(
      [metadata?.label, metadata?.warning].join(" ").toLowerCase(),
    ).not.toMatch(/\b(safe|trusted|guaranteed)\b/);
  });

  it("ignores unknown or malformed addresses", () => {
    expect(getHyperEvmSystemContractMetadata(undefined)).toBeUndefined();
    expect(getHyperEvmSystemContractMetadata("not-an-address")).toBeUndefined();
    expect(
      getHyperEvmSystemContractMetadata(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      ),
    ).toBeUndefined();
  });
});
