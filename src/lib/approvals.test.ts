import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import {
  collectDiscoveryReadFailures,
  parseDiscoveryResults,
  type ReadResult,
} from "./approvals";
import { FUNGIBLE_APPROVAL_SHAPE_COPY } from "./diagnostic-copy";
import type { DiscoveredPair } from "./discovery";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as Address;
const TOKEN = "0x1111111111111111111111111111111111111111" as Address;
const SPENDER = "0x2222222222222222222222222222222222222222" as Address;
const OTHER_SPENDER =
  "0x3333333333333333333333333333333333333333" as Address;

function success(result: unknown): ReadResult {
  return { status: "success", result };
}

function failure(name: string): ReadResult {
  const error = new Error("read failed");
  error.name = name;
  return { status: "failure", error };
}

describe("ERC-20 discovery live-read diagnostics", () => {
  it("groups read failures by metadata and allowance read type", () => {
    const pairs: DiscoveredPair[] = [
      { tokenAddress: TOKEN, spenderAddress: SPENDER },
      { tokenAddress: TOKEN, spenderAddress: OTHER_SPENDER },
    ];
    const results: ReadResult[] = [
      failure("SymbolReadError"),
      failure("DecimalsReadError"),
      failure("NameReadError"),
      failure("AllowanceReadError"),
      success(0n),
    ];

    const diagnostics = collectDiscoveryReadFailures(results, pairs);

    expect(diagnostics.symbol).toBe(1);
    expect(diagnostics.decimals).toBe(1);
    expect(diagnostics.name).toBe(1);
    expect(diagnostics.allowance).toBe(1);
    expect(diagnostics.metadataFailed).toBe(3);
    expect(diagnostics.allowanceSucceeded).toBe(1);
    expect(diagnostics.allowanceFailed).toBe(1);
    expect(diagnostics.allowanceTotal).toBe(2);
    expect(diagnostics.samples.map((sample) => sample.kind)).toEqual([
      "symbol",
      "decimals",
      "name",
      "allowance",
    ]);
    expect(diagnostics.samples[3]).toMatchObject({
      kind: "allowance",
      tokenAddress: TOKEN,
      spenderAddress: SPENDER,
      error: "AllowanceReadError",
    });
  });

  it("keeps a successful allowance when token metadata reads fail", () => {
    const pairs: DiscoveredPair[] = [
      { tokenAddress: TOKEN, spenderAddress: SPENDER },
    ];
    const results: ReadResult[] = [
      failure("SymbolReadError"),
      failure("DecimalsReadError"),
      failure("NameReadError"),
      success(123n),
    ];

    const parsed = parseDiscoveryResults(results, OWNER, 1, pairs);

    expect(parsed.stats.active).toBe(1);
    expect(parsed.approvals).toHaveLength(1);
    expect(parsed.approvals[0]).toMatchObject({
      tokenAddress: TOKEN,
      spenderAddress: SPENDER,
      tokenDecimals: null,
      spenderLabel: "Unknown spender",
      formattedAllowance: "Raw allowance: 123 units",
    });
  });

  it("does not treat failed allowance reads as confirmed zero allowances", () => {
    const pairs: DiscoveredPair[] = [
      { tokenAddress: TOKEN, spenderAddress: SPENDER },
    ];
    const results: ReadResult[] = [
      success("TOK"),
      success(18),
      success("Token"),
      failure("AllowanceReadError"),
    ];

    const diagnostics = collectDiscoveryReadFailures(results, pairs);
    const parsed = parseDiscoveryResults(results, OWNER, 1, pairs);

    expect(diagnostics.allowance).toBe(1);
    expect(diagnostics.allowanceFailed).toBe(1);
    expect(diagnostics.allowanceSucceeded).toBe(0);
    expect(parsed.stats.active).toBe(0);
    expect(parsed.approvals).toHaveLength(0);
  });

  it("uses neutral fungible approval-shape diagnostics copy", () => {
    expect(FUNGIBLE_APPROVAL_SHAPE_COPY).toContain("Fungible token approvals");
    expect(FUNGIBLE_APPROVAL_SHAPE_COPY).not.toContain("PulseChain");
  });
});
