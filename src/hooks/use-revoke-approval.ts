"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPublicClient } from "@wagmi/core";
import {
  useAccount,
  useConfig,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import type { Address } from "viem";

import { getChainConfig } from "@/lib/chains";
import type { WalletWriteChainId } from "@/lib/ethereum-approval-client";
import { normalizeRevokeError } from "@/lib/errors";
import {
  applyGasEstimateToPreflight,
  blockGasEstimateFailure,
  blockedErc20Preflight,
  buildErc20PreflightRead,
  evaluateErc20AllowancePreflight,
  failedErc20Preflight,
  safeGasForRevokeRequest,
  type Erc20PreflightResult,
} from "@/lib/preflight";
import {
  verifyErc20PostRevokeCleared,
  type PostRevokeVerificationState,
} from "@/lib/post-revoke-verification";
import {
  buildRevokeCall,
  getWalletRevokeBlockReason,
  type RevokeTarget,
} from "@/lib/revoke";
import { shouldEstimateRevokeGas } from "@/lib/revoke-gas";
import { trackEvent } from "@/lib/telemetry";

export type RevokeStatus =
  | "idle"
  | "refreshing"
  | "wallet"
  | "pending"
  | "success"
  | "error"
  | "rejected";

export interface UseRevokeApprovalResult {
  status: RevokeStatus;
  hash?: `0x${string}`;
  errorMessage?: string;
  preflight: Erc20PreflightResult | null;
  postRevokeVerificationState: PostRevokeVerificationState;
  /** True while the wallet is open or the tx is confirming on-chain. */
  isBusy: boolean;
  isRefreshingApproval: boolean;
  refreshPreflight: () => Promise<Erc20PreflightResult>;
  revoke: (options?: { allowHighGasWarning?: boolean }) => Promise<void>;
  reset: () => void;
}

export interface UseRevokeApprovalOptions {
  target: RevokeTarget;
  ownerAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number | null;
  /** Called exactly once per confirmed (non-reverted) transaction. */
  onSuccess?: (hash: `0x${string}`) => void;
}

/**
 * Per-row revoke state machine.
 *
 * Wraps wagmi's `useWriteContract` + `useWaitForTransactionReceipt` so each
 * approval row owns an isolated transaction lifecycle. Errors are normalized
 * through `normalizeRevokeError` to distinguish wallet rejection from
 * on-chain revert from generic RPC failure.
 *
 * Status is derived from wagmi primitives — we never duplicate transaction
 * state into local React state, which keeps the machine in sync with the
 * underlying mutations even across reconnects.
 */
export function useRevokeApproval({
  target,
  ownerAddress,
  tokenSymbol,
  tokenDecimals,
  onSuccess,
}: UseRevokeApprovalOptions): UseRevokeApprovalResult {
  const config = useConfig();
  const { address: connectedAddress, chainId: walletChainId } = useAccount();
  const write = useWriteContract();
  const [preflight, setPreflight] = useState<Erc20PreflightResult | null>(null);
  const [isRefreshingApproval, setIsRefreshingApproval] = useState(false);
  const [postRevokeVerificationState, setPostRevokeVerificationState] =
    useState<PostRevokeVerificationState>("not-run");
  const walletStateRef = useRef({ connectedAddress, walletChainId });
  const postVerificationRunRef = useRef(0);
  const postVerifiedHashRef = useRef<`0x${string}` | null>(null);
  const wait = useWaitForTransactionReceipt({
    hash: write.data,
    chainId: target.chainId as WalletWriteChainId,
    query: { enabled: Boolean(write.data) },
  });

  const status: RevokeStatus = useMemo(() => {
    if (isRefreshingApproval) return "refreshing";
    if (write.status === "pending") return "wallet";
    if (write.status === "error") {
      return normalizeRevokeError(write.error).rejected ? "rejected" : "error";
    }
    if (write.data) {
      if (wait.status === "error") return "error";
      if (wait.status === "success") {
        return wait.data?.status === "reverted" ? "error" : "success";
      }
      return "pending";
    }
    return "idle";
  }, [
    isRefreshingApproval,
    write.status,
    write.error,
    write.data,
    wait.status,
    wait.data,
  ]);

  const errorMessage = useMemo(() => {
    if (write.status === "error") {
      return normalizeRevokeError(write.error).message;
    }
    if (wait.status === "error") {
      return normalizeRevokeError(wait.error).message;
    }
    if (wait.data?.status === "reverted") {
      return "Transaction reverted on-chain.";
    }
    return undefined;
  }, [write.status, write.error, wait.status, wait.error, wait.data]);

  const notifiedHashRef = useRef<`0x${string}` | null>(null);
  const lastStatusRef = useRef<RevokeStatus>("idle");

  useEffect(() => {
    walletStateRef.current = { connectedAddress, walletChainId };
  }, [connectedAddress, walletChainId]);

  const walletRevokeBlockReason = useCallback(() => {
    const current = walletStateRef.current;
    return getWalletRevokeBlockReason({
      connectedAddress: current.connectedAddress,
      ownerAddress,
      walletChainId: current.walletChainId,
      targetChainId: target.chainId,
    });
  }, [ownerAddress, target.chainId]);

  useEffect(() => {
    if (
      status === "success" &&
      write.data &&
      notifiedHashRef.current !== write.data
    ) {
      notifiedHashRef.current = write.data;
      onSuccess?.(write.data);
    }
  }, [status, write.data, onSuccess]);

  useEffect(() => {
    if (status === "pending" && write.data) {
      setPostRevokeVerificationState("not-run");
    }
  }, [status, write.data]);

  useEffect(() => {
    if (status !== "success" || !write.data) return;
    if (postVerifiedHashRef.current === write.data) return;

    const hash = write.data;
    const runId = postVerificationRunRef.current + 1;
    postVerificationRunRef.current = runId;
    postVerifiedHashRef.current = hash;
    setPostRevokeVerificationState("pending");

    const setIfCurrent = (next: PostRevokeVerificationState) => {
      if (
        postVerificationRunRef.current === runId &&
        postVerifiedHashRef.current === hash
      ) {
        setPostRevokeVerificationState(next);
      }
    };

    async function verify() {
      const blockReason = walletRevokeBlockReason();
      if (blockReason) {
        setIfCurrent("incomplete");
        return;
      }

      const client = getPublicClient(config, {
        chainId: target.chainId as WalletWriteChainId,
      });
      if (!client) {
        setIfCurrent("incomplete");
        return;
      }

      const result = await verifyErc20PostRevokeCleared({
        client,
        ownerAddress,
        target: {
          chainId: target.chainId,
          tokenAddress: target.tokenAddress,
          spenderAddress: target.spenderAddress,
          approvalKind: target.approvalKind,
          approvalContractAddress: target.approvalContractAddress,
        },
      });
      setIfCurrent(result.state);
    }

    void verify();
  }, [
    config,
    ownerAddress,
    status,
    target.approvalContractAddress,
    target.approvalKind,
    target.chainId,
    target.spenderAddress,
    target.tokenAddress,
    walletRevokeBlockReason,
    write.data,
  ]);

  useEffect(() => {
    const prev = lastStatusRef.current;
    if (prev === status) return;
    lastStatusRef.current = status;
    if (status === "success") {
      trackEvent("revoke_confirmed", {
        kind: target.approvalKind ?? "erc20",
        chainId: target.chainId,
      });
    } else if (status === "error") {
      trackEvent(
        "revoke_failed",
        { kind: target.approvalKind ?? "erc20", chainId: target.chainId },
        "warn",
      );
    } else if (status === "rejected") {
      trackEvent("revoke_rejected", {
        kind: target.approvalKind ?? "erc20",
        chainId: target.chainId,
      });
    }
  }, [status, target.approvalKind, target.chainId]);

  const refreshPreflight = useCallback(async () => {
    setIsRefreshingApproval(true);
    try {
      const blockReason = walletRevokeBlockReason();
      if (blockReason) {
        const next = blockedErc20Preflight(blockReason);
        setPreflight(next);
        return next;
      }

      const client = getPublicClient(config, {
        chainId: target.chainId as WalletWriteChainId,
      });
      if (!client) throw new Error(`No public client for chain ${target.chainId}`);
      const raw = await client.readContract(
        buildErc20PreflightRead(ownerAddress, target),
      );
      const allowancePreflight = evaluateErc20AllowancePreflight(raw, {
        tokenSymbol,
        tokenDecimals,
        approvalKind: target.approvalKind,
      });
      if (allowancePreflight.status !== "active") {
        setPreflight(allowancePreflight);
        return allowancePreflight;
      }

      const chainConfig = getChainConfig(target.chainId);
      const revokeCall = buildRevokeCall(target);
      const shouldEstimate =
        shouldEstimateRevokeGas(target.chainId) ||
        Boolean(chainConfig?.maxTransactionGas);
      if (!shouldEstimate) {
        setPreflight(allowancePreflight);
        return allowancePreflight;
      }

      let next: Erc20PreflightResult;
      try {
        const estimatedGas = await client.estimateContractGas({
          ...revokeCall,
          account: ownerAddress,
        });
        const gasPriceWei = await getGasPriceOrUndefined(client);
        next = applyGasEstimateToPreflight(
          allowancePreflight,
          estimatedGas,
          chainConfig?.maxTransactionGas,
          chainConfig?.highGasWarningThreshold,
          {
            chainId: target.chainId,
            callKind: "erc20",
            gasPriceWei,
            nativeSymbol: chainConfig?.nativeSymbol,
          },
        );
      } catch (error) {
        next = withGasCapContext(
          blockGasEstimateFailure(allowancePreflight, error, {
            chainId: target.chainId,
            callKind: "erc20",
            nativeSymbol: chainConfig?.nativeSymbol,
          }),
          target.chainId,
        );
      }
      setPreflight(next);
      return next;
    } catch (error) {
      const next = withGasCapContext(
        failedErc20Preflight(error),
        target.chainId,
      );
      setPreflight(next);
      return next;
    } finally {
      setIsRefreshingApproval(false);
    }
  }, [
    config,
    ownerAddress,
    target,
    tokenSymbol,
    tokenDecimals,
    walletRevokeBlockReason,
  ]);

  const revoke = useCallback(async (options?: { allowHighGasWarning?: boolean }) => {
    notifiedHashRef.current = null;
    postVerifiedHashRef.current = null;
    postVerificationRunRef.current += 1;
    setPostRevokeVerificationState("not-run");
    const latest = await refreshPreflight();
    if (latest.status !== "active" && latest.status !== "highGasWarning") return;
    const chainConfig = getChainConfig(target.chainId);
    const safeGas = safeGasForRevokeRequest(
      latest,
      chainConfig?.maxTransactionGas,
      options?.allowHighGasWarning === true,
    );
    if (!safeGas.ok) {
      setPreflight(safeGas.preflight);
      return;
    }
    const blockReason = walletRevokeBlockReason();
    if (blockReason) {
      setPreflight(blockedErc20Preflight(blockReason));
      return;
    }
    trackEvent("revoke_submitted", {
      kind: target.approvalKind ?? "erc20",
      chainId: target.chainId,
    });
    write.writeContract({
      ...buildRevokeCall(target),
      chainId: target.chainId as WalletWriteChainId,
      ...(safeGas.gas !== undefined ? { gas: safeGas.gas } : {}),
    });
  }, [refreshPreflight, target, walletRevokeBlockReason, write]);

  const reset = useCallback(() => {
    notifiedHashRef.current = null;
    postVerifiedHashRef.current = null;
    postVerificationRunRef.current += 1;
    setPostRevokeVerificationState("not-run");
    setPreflight(null);
    write.reset();
  }, [write]);

  return {
    status,
    hash: write.data,
    errorMessage,
    preflight,
    postRevokeVerificationState,
    isBusy:
      status === "refreshing" || status === "wallet" || status === "pending",
    isRefreshingApproval,
    refreshPreflight,
    revoke,
    reset,
  };
}

type PreflightClient = NonNullable<ReturnType<typeof getPublicClient>>;

async function getGasPriceOrUndefined(
  client: PreflightClient,
): Promise<bigint | undefined> {
  try {
    return await client.getGasPrice();
  } catch {
    return undefined;
  }
}

function withGasCapContext(
  result: Erc20PreflightResult,
  chainId: number,
): Erc20PreflightResult {
  const maxTransactionGas = getChainConfig(chainId)?.maxTransactionGas;
  if (!result.gasCapExceeded || !maxTransactionGas) return result;
  return { ...result, maxTransactionGas };
}
