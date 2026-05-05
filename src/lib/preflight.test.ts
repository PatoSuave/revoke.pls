import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import {
  BSC_GAS_CAP_BODY,
  BSC_GAS_CAP_ERROR,
  BSC_GAS_CAP_HELPER,
  BSC_GAS_CAP_TITLE,
  HIGH_GAS_WARNING_BODY,
  HIGH_GAS_WARNING_HELPER,
  HIGH_GAS_WARNING_TITLE,
  applyGasEstimateToPreflight,
  evaluateErc20AllowancePreflight,
  evaluateNftApprovalPreflight,
  failedErc20Preflight,
  failedNftPreflight,
  isBscGasCapErrorMessage,
  safeGasForRevokeRequest,
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
      highGasWarning: 0,
      cleared: 1,
      unverified: 1,
    });
  });

  it("never treats failed reads as safe or zero", () => {
    const result = failedErc20Preflight(new Error("read failed"));

    expect(result.status).toBe("unverified");
    expect(result.currentAllowance).toBeUndefined();
  });

  it("allows a BSC revoke gas estimate below the Osaka/Mendel cap", () => {
    const result = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      120_000n,
      16_777_216n,
    );

    expect(result).toMatchObject({
      status: "active",
      estimatedGas: 120_000n,
      maxTransactionGas: 16_777_216n,
      highGasWarningThreshold: undefined,
      gasCapExceeded: false,
      highGasWarning: false,
    });
    const safeGas = safeGasForRevokeRequest(result, 16_777_216n);
    expect(safeGas).toEqual({ ok: true, gas: 120_000n });
    if (safeGas.ok) {
      const requestGasFields = {
        ...(safeGas.gas !== undefined ? { gas: safeGas.gas } : {}),
      };
      expect(requestGasFields).toEqual({ gas: 120_000n });
      expect("gasLimit" in requestGasFields).toBe(false);
    }
  });

  it("keeps BSC estimates at the high-gas threshold as normal active revokes", () => {
    const result = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      1_000_000n,
      16_777_216n,
      1_000_000n,
    );

    expect(result).toMatchObject({
      status: "active",
      estimatedGas: 1_000_000n,
      highGasWarningThreshold: 1_000_000n,
      gasCapExceeded: false,
      highGasWarning: false,
    });
    expect(safeGasForRevokeRequest(result, 16_777_216n)).toEqual({
      ok: true,
      gas: 1_000_000n,
    });
  });

  it("marks BSC estimates above 1,000,000 and below the cap as high-gas warnings", () => {
    const result = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      1_000_001n,
      16_777_216n,
      1_000_000n,
    );

    expect(result).toMatchObject({
      status: "highGasWarning",
      estimatedGas: 1_000_001n,
      maxTransactionGas: 16_777_216n,
      highGasWarningThreshold: 1_000_000n,
      gasCapExceeded: false,
      highGasWarning: true,
    });
    expect(HIGH_GAS_WARNING_TITLE).toBe("Unusually high gas estimate");
    expect(HIGH_GAS_WARNING_BODY).toContain("above 1,000,000 gas on BSC");
    expect(HIGH_GAS_WARNING_HELPER).toContain("not mean the transaction");
    expect(safeGasForRevokeRequest(result, 16_777_216n).ok).toBe(false);
  });

  it("allows a high-gas BSC revoke only after explicit confirmation", () => {
    const result = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      1_500_000n,
      16_777_216n,
      1_000_000n,
    );

    const firstClick = safeGasForRevokeRequest(result, 16_777_216n);
    expect(firstClick.ok).toBe(false);

    const confirmed = safeGasForRevokeRequest(result, 16_777_216n, true);
    expect(confirmed).toEqual({ ok: true, gas: 1_500_000n });
    if (confirmed.ok) {
      const requestGasFields = {
        ...(confirmed.gas !== undefined ? { gas: confirmed.gas } : {}),
      };
      expect(requestGasFields).toEqual({ gas: 1_500_000n });
      expect("gasLimit" in requestGasFields).toBe(false);
    }
  });

  it("blocks a BSC revoke gas estimate above the Osaka/Mendel cap", () => {
    const active: Erc20PreflightResult = {
      kind: "erc20",
      status: "active",
      currentAllowance: 1n,
    };
    const result = applyGasEstimateToPreflight(
      active,
      16_777_217n,
      16_777_216n,
    );

    expect(result).toMatchObject({
      status: "unverified",
      error: BSC_GAS_CAP_ERROR,
      estimatedGas: 16_777_217n,
      maxTransactionGas: 16_777_216n,
      gasCapExceeded: true,
    });
    expect(result.error).toContain(BSC_GAS_CAP_TITLE);
    expect(result.error).toContain(BSC_GAS_CAP_BODY);
    expect(result.error).toContain(BSC_GAS_CAP_HELPER);
    expect(result.error).toContain("Osaka/Mendel");
    expect(safeGasForRevokeRequest(result, 16_777_216n).ok).toBe(false);
  });

  it("blocks capped BSC revokes that do not have a safe gas estimate", () => {
    const result: Erc20PreflightResult = {
      kind: "erc20",
      status: "active",
      currentAllowance: 1n,
    };

    const safeGas = safeGasForRevokeRequest(result, 16_777_216n);

    expect(safeGas.ok).toBe(false);
    if (!safeGas.ok) {
      expect(safeGas.preflight).toMatchObject({
        status: "unverified",
        error: BSC_GAS_CAP_ERROR,
        maxTransactionGas: 16_777_216n,
        gasCapExceeded: true,
      });
    }
  });

  it("leaves uncapped PulseChain revoke requests unchanged", () => {
    const result: Erc20PreflightResult = {
      kind: "erc20",
      status: "active",
      currentAllowance: 1n,
    };

    expect(safeGasForRevokeRequest(result, undefined)).toEqual({
      ok: true,
      gas: undefined,
    });
  });

  it("does not inherit BSC gas caps or high-gas warnings for uncapped chains", () => {
    const result = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      20_000_000n,
      undefined,
      undefined,
    );

    expect(result).toMatchObject({
      status: "active",
      estimatedGas: 20_000_000n,
      gasCapExceeded: false,
      highGasWarning: false,
    });
    expect(safeGasForRevokeRequest(result, undefined)).toEqual({
      ok: true,
      gas: 20_000_000n,
    });
  });

  it("applies the same BSC gas cap to NFT revoke preflight", () => {
    const result = applyGasEstimateToPreflight(
      { kind: "nft-operator", status: "active", approvedForAll: true },
      20_000_000n,
      16_777_216n,
    );

    expect(result).toMatchObject({
      kind: "nft-operator",
      status: "unverified",
      gasCapExceeded: true,
      estimatedGas: 20_000_000n,
      maxTransactionGas: 16_777_216n,
    });
    expect(safeGasForRevokeRequest(result, 16_777_216n).ok).toBe(false);
  });

  it("classifies Osaka/Mendel estimate failures as BSC gas-cap preflight blocks", () => {
    const error = new Error(
      "mainnet passes Osaka hardfork, transaction gas cannot exceed 16777216",
    );

    expect(failedErc20Preflight(error)).toMatchObject({
      status: "unverified",
      error: BSC_GAS_CAP_ERROR,
      gasCapExceeded: true,
    });
    expect(
      failedNftPreflight(error, { kind: "approvalForAll" }),
    ).toMatchObject({
      status: "unverified",
      error: BSC_GAS_CAP_ERROR,
      gasCapExceeded: true,
    });
  });

  it("recognizes BSC gas-cap error wording variants", () => {
    expect(isBscGasCapErrorMessage("Osaka hardfork")).toBe(true);
    expect(
      isBscGasCapErrorMessage("transaction gas cannot exceed 16777216"),
    ).toBe(true);
    expect(isBscGasCapErrorMessage("gas cannot exceed 16777216")).toBe(true);
    expect(isBscGasCapErrorMessage("exceeds maximum transaction gas")).toBe(
      true,
    );
    expect(
      isBscGasCapErrorMessage({
        shortMessage: "Estimate failed",
        cause: { message: "transaction gas cannot exceed 16777216" },
      }),
    ).toBe(true);
  });

  it("marks above-cap batch preflight results as unverified", () => {
    const aboveCap = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      30_000_000n,
      16_777_216n,
    );

    expect(summarizeBatchPreflight([aboveCap])).toMatchObject({
      total: 1,
      attempted: 1,
      failed: 1,
      active: 0,
      highGasWarning: 0,
      unverified: 1,
    });
  });

  it("counts high-gas warning items separately so batch can skip them by default", () => {
    const highGas = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      1_500_000n,
      16_777_216n,
      1_000_000n,
    );

    expect(summarizeBatchPreflight([highGas])).toMatchObject({
      total: 1,
      attempted: 1,
      succeeded: 1,
      failed: 0,
      active: 0,
      highGasWarning: 1,
      unverified: 0,
    });
    expect(safeGasForRevokeRequest(highGas, 16_777_216n).ok).toBe(false);
  });
});
