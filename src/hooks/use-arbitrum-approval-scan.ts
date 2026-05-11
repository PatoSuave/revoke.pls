"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptyArbitrumApprovalApiResponse,
  fetchArbitrumApprovals,
  mapArbitrumApprovalApiResponse,
  type ArbitrumApprovalApiResponse,
  type ArbitrumApprovalClientMapping,
} from "@/lib/arbitrum-approval-client";

export type ArbitrumApprovalScanStatus =
  | "idle"
  | "pending"
  | "success"
  | "error";

export interface UseArbitrumApprovalScanResult {
  response: ArbitrumApprovalApiResponse | null;
  mapped: ArbitrumApprovalClientMapping | null;
  status: ArbitrumApprovalScanStatus;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useArbitrumApprovalScan({
  owner,
  enabled = true,
}: {
  owner: Address | undefined;
  enabled?: boolean;
}): UseArbitrumApprovalScanResult {
  const query = useQuery({
    queryKey: ["arbitrum-approval-api", owner?.toLowerCase() ?? null],
    enabled: enabled && Boolean(owner),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchArbitrumApprovals({ owner, signal });
    },
  });

  const response = useMemo(() => {
    if (query.data) return query.data;
    if (query.error) {
      return emptyArbitrumApprovalApiResponse("upstream-failure", [
        query.error instanceof Error
          ? query.error.message
          : "Arbitrum approvals API request failed.",
      ]);
    }
    return null;
  }, [query.data, query.error]);

  const mapped = useMemo(
    () => (response ? mapArbitrumApprovalApiResponse(response) : null),
    [response],
  );

  const status: ArbitrumApprovalScanStatus = !enabled || !owner
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
