import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
} from "@/lib/chains";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";
import {
  blockGasEstimateFailure,
  applyGasEstimateToPreflight,
  safeGasForRevokeRequest,
  summarizeBatchPreflight,
  type Erc20PreflightResult,
} from "@/lib/preflight";
import {
  ETHEREUM_GAS_PAID_TO_NETWORK_COPY,
  ETHEREUM_REVOKE_GAS_THRESHOLDS,
  WALLET_HIGHER_FEE_CANCEL_COPY,
  WALLET_PROMPT_SAFETY_COPY,
  getGasWarningLevel,
  requiresGasWarningAcknowledgement,
  shouldEstimateRevokeGas,
} from "@/lib/revoke-gas";

describe("revoke gas safety policy", () => {
  it("keeps a normal Ethereum ERC-20 revoke estimate below warning levels", () => {
    const result = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      45_000n,
      undefined,
      undefined,
      {
        chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        callKind: "erc20",
        gasPriceWei: 10_000_000_000n,
      },
    );

    expect(result).toMatchObject({
      status: "active",
      estimatedGas: 45_000n,
      estimatedFeeWei: 450_000_000_000_000n,
      nativeSymbol: "ETH",
      gasWarningLevel: "none",
      highGasWarning: false,
      gasEstimateAttempted: true,
      gasEstimateSucceeded: true,
    });
    expect(safeGasForRevokeRequest(result, undefined)).toEqual({
      ok: true,
      gas: 45_000n,
    });
  });

  it("classifies Ethereum ERC-20 estimates above the high threshold as high-gas warnings", () => {
    const result = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      150_001n,
      undefined,
      undefined,
      {
        chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        callKind: "erc20",
      },
    );

    expect(result).toMatchObject({
      status: "highGasWarning",
      estimatedGas: 150_001n,
      highGasWarningThreshold: ETHEREUM_REVOKE_GAS_THRESHOLDS.erc20.high,
      gasWarningLevel: "high",
      highGasWarning: true,
    });
    expect(safeGasForRevokeRequest(result, undefined).ok).toBe(false);
    expect(safeGasForRevokeRequest(result, undefined, true)).toEqual({
      ok: true,
      gas: 150_001n,
    });
  });

  it("requires extra acknowledgement for severe and extreme Ethereum gas warnings", () => {
    expect(
      getGasWarningLevel({
        chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        kind: "erc20",
        estimatedGas: 300_001n,
      }),
    ).toBe("severe");
    expect(
      getGasWarningLevel({
        chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        kind: "erc20",
        estimatedGas: 500_001n,
      }),
    ).toBe("extreme");
    expect(requiresGasWarningAcknowledgement("high")).toBe(false);
    expect(requiresGasWarningAcknowledgement("severe")).toBe(true);
    expect(requiresGasWarningAcknowledgement("extreme")).toBe(true);
  });

  it("treats unavailable gas estimates as unavailable, not low gas", () => {
    expect(
      getGasWarningLevel({
        chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        kind: "erc20",
        estimatedGas: undefined,
      }),
    ).toBe("unavailable");
  });

  it("blocks revoke submission when gas simulation or estimation fails", () => {
    const result: Erc20PreflightResult = blockGasEstimateFailure(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      Object.assign(new Error("execution reverted: noisy raw message"), {
        name: "ContractFunctionExecutionError",
      }),
      {
        chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        callKind: "erc20",
      },
    );

    expect(result).toMatchObject({
      status: "unverified",
      gasWarningLevel: "unavailable",
      gasEstimateAttempted: true,
      gasEstimateSucceeded: false,
      gasEstimateError: "ContractFunctionExecutionError",
    });
    expect(result.error).toBe(
      "Gas estimate failed: ContractFunctionExecutionError",
    );
    expect(safeGasForRevokeRequest(result, undefined).ok).toBe(false);
  });

  it("does not turn live-verified high-gas approvals into hidden or unverified rows", () => {
    const result: Erc20PreflightResult = applyGasEstimateToPreflight(
      { kind: "erc20", status: "active", currentAllowance: 1n },
      450_000n,
      undefined,
      undefined,
      {
        chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        callKind: "erc20",
      },
    );

    expect(result.status).toBe("highGasWarning");
    expect(result.currentAllowance).toBe(1n);
    expect(result.gasCapExceeded).toBe(false);
    expect(summarizeBatchPreflight([result])).toMatchObject({
      succeeded: 1,
      failed: 0,
      highGasWarning: 1,
      unverified: 0,
    });
  });

  it("keeps non-Ethereum chain estimation behavior scoped to the existing BSC gas cap lane", () => {
    expect(shouldEstimateRevokeGas(ETHEREUM_MAINNET_CLIENT_CHAIN_ID)).toBe(true);
    expect(shouldEstimateRevokeGas(BSC_CHAIN_ID)).toBe(true);
    expect(shouldEstimateRevokeGas(PULSECHAIN_CHAIN_ID)).toBe(false);
    expect(shouldEstimateRevokeGas(BASE_CHAIN_ID)).toBe(false);
    expect(shouldEstimateRevokeGas(POLYGON_CHAIN_ID)).toBe(false);
  });

  it("keeps the Ethereum gas warning and wallet-safety copy explicit", () => {
    expect(ETHEREUM_GAS_PAID_TO_NETWORK_COPY).toBe(
      "Gas is paid to the Ethereum network, not to Pulse Revoke or the approved protocol.",
    );
    expect(WALLET_HIGHER_FEE_CANCEL_COPY).toBe(
      "If your wallet shows a much higher fee than this app estimates, cancel and try again later.",
    );
    expect(WALLET_PROMPT_SAFETY_COPY).toContain(
      "Revoke should not transfer tokens or ETH",
    );

    const ethereumScanner = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "sections",
        "ethereum-readonly-scanner.tsx",
      ),
      "utf8",
    );
    expect(ethereumScanner).toContain("EthereumGasDisclosure");
    expect(ethereumScanner).toContain("WALLET_PROMPT_SAFETY_COPY");
  });

  it("does not add API route transaction submission or signing helpers", () => {
    const apiDir = join(process.cwd(), "src", "app", "api");
    const ethereumRoute = readFileSync(
      join(apiDir, "ethereum", "approvals", "route.ts"),
      "utf8",
    );

    expect(ethereumRoute).not.toMatch(
      /writeContract|sendTransaction|signTransaction|privateKey|mnemonic|seed/i,
    );
  });
});
