import { describe, expect, it } from "vitest";

import {
  LIVE_SUPPORTED_CHAIN_COUNT,
  LIVE_SUPPORTED_CHAIN_ROWS,
} from "@/lib/supported-chain-copy";
import {
  TOKEN_CONTRACT_REPORT_CHAIN_COUNT,
  TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS,
  markdownText,
  normalizeTokenContractReportAddress,
  tokenContractReportChainEvidenceSummary,
} from "@/lib/token-contract-report";

describe("token contract report shared helpers", () => {
  it("uses the current live supported chain source of truth", () => {
    expect(TOKEN_CONTRACT_REPORT_CHAIN_COUNT).toBe(30);
    expect(TOKEN_CONTRACT_REPORT_CHAIN_COUNT).toBe(LIVE_SUPPORTED_CHAIN_COUNT);
    expect(TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS.map((chain) => chain.name)).toEqual(
      LIVE_SUPPORTED_CHAIN_ROWS.map((row) => row.chain),
    );
    expect(tokenContractReportChainEvidenceSummary()).toContain(
      "30 live chains",
    );
  });

  it("normalizes valid EVM addresses and rejects invalid input", () => {
    expect(
      normalizeTokenContractReportAddress(
        "0xa1077a294dde1b09bb078844df40758a5d0f9a27",
      ),
    ).toBe("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
    expect(normalizeTokenContractReportAddress("not-an-address")).toBeNull();
  });

  it("escapes token-provided markdown text", () => {
    expect(markdownText("[Permit](https://attacker.example) <img> # wow")).toBe(
      "\\[Permit\\]\\(https://attacker.example\\) \\<img\\> \\# wow",
    );
  });
});

