"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptyEthereumApprovalApiResponse,
  fetchEthereumApprovals,
  mapEthereumApprovalApiResponse,
  type EthereumApprovalApiResponse,
  type EthereumApprovalClientMapping,
} from "@/lib/ethereum-approval-client";
import { isStaticExportBuild } from "@/lib/platform";

export type EthereumApprovalScanStatus =
  | "idle"
  | "pending"
  | "success"
  | "error";

export interface UseEthereumApprovalScanResult {
  response: EthereumApprovalApiResponse | null;
  mapped: EthereumApprovalClientMapping | null;
  status: EthereumApprovalScanStatus;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEthereumApprovalScan({
  owner,
  enabled = true,
}: {
  owner: Address | undefined;
  enabled?: boolean;
}): UseEthereumApprovalScanResult {
  const query = useQuery({
    queryKey: ["ethereum-approval-api", owner?.toLowerCase() ?? null],
    enabled: enabled && Boolean(owner) && !isStaticExportBuild,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchEthereumApprovals({ owner, signal });
    },
  });

  const response = useMemo(() => {
    if (owner && isStaticExportBuild) {
      return {
        ...emptyEthereumApprovalApiResponse("config-missing", [
          "Ethereum hosted approval discovery is not available in the desktop beta.",
        ]),
        missingConfig: ["Hosted Ethereum approvals API"],
      };
    }
    if (query.data) return query.data;
    if (query.error) {
      return emptyEthereumApprovalApiResponse("upstream-failure", [
        query.error instanceof Error
          ? query.error.message
          : "Ethereum approvals API request failed.",
      ]);
    }
    return null;
  }, [owner, query.data, query.error]);

  const mapped = useMemo(
    () => (response ? mapEthereumApprovalApiResponse(response) : null),
    [response],
  );

  const status: EthereumApprovalScanStatus = !enabled || !owner
    ? "idle"
    : isStaticExportBuild
      ? "success"
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
      if (isStaticExportBuild) return;
      void query.refetch();
    },
  };
}
