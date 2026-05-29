"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptyTimelineSummary,
  type LifeboatTimelineApiResponse,
} from "@/lib/lifeboat/timeline";

export interface UseLifeboatTimelineScanResult {
  response: LifeboatTimelineApiResponse;
  status: "idle" | "pending" | "success" | "error";
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLifeboatTimelineScan({
  owner,
  chainId,
  chainName,
  enabled = true,
}: {
  owner: Address | undefined;
  chainId: number;
  chainName: string;
  enabled?: boolean;
}): UseLifeboatTimelineScanResult {
  const query = useQuery({
    queryKey: ["lifeboat-timeline", chainId, owner?.toLowerCase() ?? null],
    enabled: enabled && Boolean(owner),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchLifeboatTimelineScan({ owner, chainId, signal });
    },
  });

  const response = useMemo(() => {
    if (!owner) return emptyResponse(chainId, chainName, null, "idle");
    if (query.data) return query.data;
    if (query.status === "pending") {
      return emptyResponse(chainId, chainName, owner, "scanning");
    }
    if (query.error) {
      return {
        ...emptyResponse(chainId, chainName, owner, "upstream-failure"),
        warnings: [
          "The approval-to-drain timeline is incomplete. Do not treat this as proof that the wallet has no suspicious sequence.",
        ],
        errors: [
          query.error instanceof Error
            ? query.error.message
            : "Timeline diagnostic request failed.",
        ],
      };
    }
    return emptyResponse(chainId, chainName, owner, "idle");
  }, [chainId, chainName, owner, query.data, query.error, query.status]);

  const status: UseLifeboatTimelineScanResult["status"] = !enabled || !owner
    ? "idle"
    : query.status === "pending"
      ? "pending"
      : query.status === "error"
        ? "error"
        : "success";

  return {
    response,
    status,
    isFetching: query.isFetching,
    error: (query.error as Error | null) ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

async function fetchLifeboatTimelineScan({
  owner,
  chainId,
  signal,
}: {
  owner: Address;
  chainId: number;
  signal?: AbortSignal;
}): Promise<LifeboatTimelineApiResponse> {
  const url = new URL("/api/lifeboat/timeline", window.location.origin);
  url.searchParams.set("owner", owner);
  url.searchParams.set("chainId", chainId.toString());

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  const body = (await response.json()) as LifeboatTimelineApiResponse;
  if (
    !response.ok &&
    body.status !== "config-missing" &&
    body.status !== "partial"
  ) {
    throw new Error(body.errors?.[0] ?? "Timeline diagnostic request failed.");
  }
  return body;
}

function emptyResponse(
  chainId: number,
  chainName: string,
  owner: Address | null,
  status: LifeboatTimelineApiResponse["status"],
): LifeboatTimelineApiResponse {
  return {
    ok: false,
    status,
    chainId,
    chainName,
    owner,
    riskLevel:
      status === "idle" || status === "scanning"
        ? "not_checked"
        : "upstream_unavailable",
    events: [],
    evidence: [],
    summary: emptyTimelineSummary(),
    warnings: [],
    errors: [],
    missingConfig: [],
  };
}
