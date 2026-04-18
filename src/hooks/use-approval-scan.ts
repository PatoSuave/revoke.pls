"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { useReadContracts } from "wagmi";

import {
  buildScanContracts,
  parseScanResults,
  type Approval,
} from "@/lib/approvals";
import { SPENDER_REGISTRY, TOKEN_REGISTRY } from "@/lib/registry";

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
  enabled?: boolean;
}

/**
 * Scans the curated PulseChain registry for positive ERC-20 allowances that
 * `owner` has granted to any of the registered spender contracts.
 *
 * All reads are batched by wagmi through PulseChain's Multicall3 deployment
 * so the entire scan resolves in a single RPC round-trip. Per-call failures
 * are tolerated (`allowFailure: true`) so one bad token can't sink the scan.
 */
export function useApprovalScan({
  owner,
  enabled = true,
}: UseApprovalScanOptions): UseApprovalScanResult {
  const contracts = useMemo(
    () =>
      owner ? buildScanContracts(owner, TOKEN_REGISTRY, SPENDER_REGISTRY) : [],
    [owner],
  );

  const isEnabled = enabled && Boolean(owner) && contracts.length > 0;

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
      data ? parseScanResults(data, TOKEN_REGISTRY, SPENDER_REGISTRY) : [],
    [data],
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
    tokensScanned: TOKEN_REGISTRY.length,
    spendersScanned: SPENDER_REGISTRY.length,
    totalChecks: TOKEN_REGISTRY.length * SPENDER_REGISTRY.length,
  };
}
