"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { useReadContracts } from "wagmi";

import {
  buildScanContracts,
  parseScanResults,
  type Approval,
} from "@/lib/approvals";
import type { SupportedChainId } from "@/lib/chains";
import { getSpendersForChain, getTokensForChain } from "@/lib/registry";

export type ScanStatus = "idle" | "pending" | "success" | "error";

export interface UseApprovalScanResult {
  approvals: Approval[];
  status: ScanStatus;
  isFetching: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => void;
  tokensScanned: number;
  spendersScanned: number;
  totalChecks: number;
}

export interface UseApprovalScanOptions {
  owner: Address | undefined;
  chainId: number | undefined;
  enabled?: boolean;
}

/**
 * Registry-first scan kept for parity / fallback. Takes the chain-scoped
 * curated registry and checks every (token, spender) allowance via Multicall3
 * on that chain. The primary pipeline is now `useApprovalDiscovery`.
 */
export function useApprovalScan({
  owner,
  chainId,
  enabled = true,
}: UseApprovalScanOptions): UseApprovalScanResult {
  const tokens = useMemo(
    () => (chainId ? getTokensForChain(chainId) : []),
    [chainId],
  );
  const spenders = useMemo(
    () => (chainId ? getSpendersForChain(chainId) : []),
    [chainId],
  );

  const contracts = useMemo(
    () =>
      owner && chainId
        ? buildScanContracts(
            owner,
            tokens,
            spenders,
            chainId as SupportedChainId,
          )
        : [],
    [owner, chainId, tokens, spenders],
  );

  const isEnabled =
    enabled && Boolean(owner) && Boolean(chainId) && contracts.length > 0;

  const {
    data,
    status,
    isFetching,
    isRefetching,
    error,
    refetch,
  } = useReadContracts({
    contracts,
    allowFailure: true,
    query: {
      enabled: isEnabled,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  });

  const approvals = useMemo(
    () =>
      data && chainId ? parseScanResults(data, chainId, tokens, spenders) : [],
    [data, chainId, tokens, spenders],
  );

  return {
    approvals,
    status: isEnabled ? status : "idle",
    isFetching,
    isRefetching,
    error: error ?? null,
    refetch: () => {
      void refetch();
    },
    tokensScanned: tokens.length,
    spendersScanned: spenders.length,
    totalChecks: tokens.length * spenders.length,
  };
}
