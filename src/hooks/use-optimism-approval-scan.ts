"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptyOptimismApprovalApiResponse,
  fetchOptimismApprovals,
  mapOptimismApprovalApiResponse,
  type OptimismApprovalApiResponse,
  type OptimismApprovalClientMapping,
} from "@/lib/optimism-approval-client";

export type OptimismApprovalScanStatus =
  | "idle"
  | "pending"
  | "success"
  | "error";

export interface UseOptimismApprovalScanResult {
  response: OptimismApprovalApiResponse | null;
  mapped: OptimismApprovalClientMapping | null;
  status: OptimismApprovalScanStatus;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useOptimismApprovalScan({
  owner,
  enabled = true,
}: {
  owner: Address | undefined;
  enabled?: boolean;
}): UseOptimismApprovalScanResult {
  const query = useQuery({
    queryKey: ["optimism-approval-api", owner?.toLowerCase() ?? null],
    enabled: enabled && Boolean(owner),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchOptimismApprovals({ owner, signal });
    },
  });

  const response = useMemo(() => {
    if (query.data) return query.data;
    if (query.error) {
      return emptyOptimismApprovalApiResponse("upstream-failure", [
        query.error instanceof Error
          ? query.error.message
          : "Optimism approvals API request failed.",
      ]);
    }
    return null;
  }, [query.data, query.error]);

  const mapped = useMemo(
    () => (response ? mapOptimismApprovalApiResponse(response) : null),
    [response],
  );

  const status: OptimismApprovalScanStatus = !enabled || !owner
    ? "idle"
    : query.status === "pending"
      ? "pending"
      : query.status === "error"
        ? "error"
        : "success";

  return {
    response,
    mapped,
    status,
    isFetching: query.isFetching,
    error: (query.error as Error | null) ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}
