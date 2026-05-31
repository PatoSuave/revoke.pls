"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptyDustTrapSummary,
  type LifeboatDustTrapApiResponse,
} from "@/lib/lifeboat/dust-trap";

export interface UseLifeboatDustTrapScanResult {
  response: LifeboatDustTrapApiResponse;
  status: "idle" | "pending" | "success" | "error";
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLifeboatDustTrapScan({
  owner,
  chainId,
  chainName,
  enabled = true,
}: {
  owner: Address | undefined;
  chainId: number;
  chainName: string;
  enabled?: boolean;
}): UseLifeboatDustTrapScanResult {
  const query = useQuery({
    queryKey: ["lifeboat-dust-trap", chainId, owner?.toLowerCase() ?? null],
    enabled: enabled && Boolean(owner),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchLifeboatDustTrapScan({ owner, chainId, signal });
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
          "The dust trap diagnostic is incomplete. Do not treat this as proof that the wallet has no suspicious token or NFT dust.",
        ],
        errors: [
          query.error instanceof Error
            ? query.error.message
            : "Dust trap diagnostic request failed.",
        ],
      };
    }
    return emptyResponse(chainId, chainName, owner, "idle");
  }, [chainId, chainName, owner, query.data, query.error, query.status]);

  const status: UseLifeboatDustTrapScanResult["status"] =
    !enabled || !owner
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

async function fetchLifeboatDustTrapScan({
  owner,
  chainId,
  signal,
}: {
  owner: Address;
  chainId: number;
  signal?: AbortSignal;
}): Promise<LifeboatDustTrapApiResponse> {
  const url = new URL("/api/lifeboat/dust-trap", window.location.origin);
  url.searchParams.set("owner", owner);
  url.searchParams.set("chainId", chainId.toString());

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  const body = (await response.json()) as LifeboatDustTrapApiResponse;
  if (!response.ok && body.status !== "config-missing") {
    throw new Error(body.errors?.[0] ?? "Dust trap diagnostic request failed.");
  }
  return body;
}

function emptyResponse(
  chainId: number,
  chainName: string,
  owner: Address | null,
  status: LifeboatDustTrapApiResponse["status"],
): LifeboatDustTrapApiResponse {
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
    evidence: [],
    transfers: [],
    summary: emptyDustTrapSummary(),
    warnings: [],
    errors: [],
    missingConfig: [],
  };
}
