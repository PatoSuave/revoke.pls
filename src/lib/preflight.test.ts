import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import {
  evaluateErc20AllowancePreflight,
  evaluateNftApprovalPreflight,
  failedErc20Preflight,
  summarizeBatchPreflight,
  type Erc20PreflightResult,
} from "./preflight";

const SPENDER = "0x2222222222222222222222222222222222222222" as Address;
const OTHER_SPENDER =
  "0x3333333333333333333333333333333333333333" as Address;

describe("approval revoke preflight", () => {
  it("marks a zero ERC-20 allowance as already cleared", () => {
    const result = evaluateErc20AllowancePreflight(0n, {
      tokenSymbol: "TOK",
      tokenDecimals: 18,
    });

    expect(result).toMatchObject({
      kind: "erc20",
      status: "cleared",
      currentAllowance: 0n,
      currentLabel: "0 TOK",
    });
  });

  it("marks a nonzero ERC-20 allowance as ready to revoke", () => {
    const result = evaluateErc20AllowancePreflight(123000000000000000000n, {
      tokenSymbol: "TOK",
      tokenDecimals: 18,
    });

    expect(result).toMatchObject({
      kind: "erc20",
      status: "active",
      currentAllowance: 123000000000000000000n,
      currentLabel: "123 TOK",
    });
  });

  it("marks a failed ERC-20 allowance read as unverified", () => {
    const error = new Error("rpc failed");
    error.name = "RpcRequestError";

    expect(failedErc20Preflight(error)).toMatchObject({
      kind: "erc20",
      status: "unverified",
      error: "RpcRequestError",
    });
  });

  it("marks an ERC-721 token approval with a changed spender as cleared", () => {
    const result = evaluateNftApprovalPreflight(OTHER_SPENDER, {
      kind: "tokenApproval",
      operatorAddress: SPENDER,
    });

    expect(result).toMatchObject({
      kind: "nft-token",
      status: "cleared",
      currentApprovedAddress: OTHER_SPENDER,
    });
  });

  it("marks a false isApprovedForAll result as cleared", () => {
    const result = evaluateNftApprovalPreflight(false, {
      kind: "approvalForAll",
      operatorAddress: SPENDER,
    });

    expect(result).toMatchObject({
      kind: "nft-operator",
      status: "cleared",
      approvedForAll: false,
    });
  });

  it("separates ready, cleared, and unverified batch preflight results", () => {
    const results: Erc20PreflightResult[] = [
      { kind: "erc20", status: "active", currentAllowance: 1n },
      { kind: "erc20", status: "cleared", currentAllowance: 0n },
      { kind: "erc20", status: "unverified", error: "RpcRequestError" },
    ];

    expect(summarizeBatchPreflight(results)).toEqual({
      total: 3,
      attempted: 3,
      succeeded: 2,
      failed: 1,
      active: 1,
      cleared: 1,
      unverified: 1,
    });
  });

  it("never treats failed reads as safe or zero", () => {
    const result = failedErc20Preflight(new Error("read failed"));

    expect(result.status).toBe("unverified");
    expect(result.currentAllowance).toBeUndefined();
  });
});
