"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptyHyperEVMApprovalApiResponse,
  fetchHyperEVMApprovals,
  mapHyperEVMApprovalApiResponse,
  type HyperEVMApprovalApiResponse,
  type HyperEVMApprovalClientMapping,
} from "@/lib/hyperevm-approval-client";

export type HyperEVMApprovalScanStatus =
  | "idle"
  | "pending"
  | "success"
  | "error";

export interface UseHyperEVMApprovalScanResult {
  response: HyperEVMApprovalApiResponse | null;
  mapped: HyperEVMApprovalClientMapping | null;
  status: HyperEVMApprovalScanStatus;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useHyperEVMApprovalScan({
  owner,
  enabled = true,
}: {
  owner: Address | undefined;
  enabled?: boolean;
}): UseHyperEVMApprovalScanResult {
  const query = useQuery({
    queryKey: ["hyperevm-approval-api", owner?.toLowerCase() ?? null],
    enabled: enabled && Boolean(owner),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchHyperEVMApprovals({ owner, signal });
    },
  });

  const response = useMemo(() => {
    if (query.data) return query.data;
    if (query.error) {
      return emptyHyperEVMApprovalApiResponse("upstream-failure", [
        query.error instanceof Error
          ? query.error.message
          : "HyperEVM approvals API request failed.",
      ]);
    }
    return null;
  }, [query.data, query.error]);

  const mapped = useMemo(
    () => (response ? mapHyperEVMApprovalApiResponse(response) : null),
    [response],
  );

  const status: HyperEVMApprovalScanStatus = !enabled || !owner
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
