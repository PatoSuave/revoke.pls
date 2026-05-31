"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptyHexStakeSummary,
  type LifeboatHexStakeApiResponse,
} from "@/lib/lifeboat/hex-stake";

export interface UseLifeboatHexStakeScanResult {
  response: LifeboatHexStakeApiResponse;
  status: "idle" | "pending" | "success" | "error";
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLifeboatHexStakeScan({
  owner,
  chainId,
  chainName,
  enabled = true,
}: {
  owner: Address | undefined;
  chainId: number;
  chainName: string;
  enabled?: boolean;
}): UseLifeboatHexStakeScanResult {
  const query = useQuery({
    queryKey: ["lifeboat-hex-stake", chainId, owner?.toLowerCase() ?? null],
    enabled: enabled && Boolean(owner),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchLifeboatHexStakeScan({ owner, chainId, signal });
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
          "The HEX stake diagnostic is incomplete. Do not treat this as proof that the wallet has no active, mature, late, or historical stakes.",
        ],
        errors: [
          query.error instanceof Error
            ? query.error.message
            : "HEX stake diagnostic request failed.",
        ],
      };
    }
    return emptyResponse(chainId, chainName, owner, "idle");
  }, [chainId, chainName, owner, query.data, query.error, query.status]);

  const status: UseLifeboatHexStakeScanResult["status"] =
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

async function fetchLifeboatHexStakeScan({
  owner,
  chainId,
  signal,
}: {
  owner: Address;
  chainId: number;
  signal?: AbortSignal;
}): Promise<LifeboatHexStakeApiResponse> {
  const url = new URL("/api/lifeboat/hex-stake", window.location.origin);
  url.searchParams.set("owner", owner);
  url.searchParams.set("chainId", chainId.toString());

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  const body = (await response.json()) as LifeboatHexStakeApiResponse;
  if (
    !response.ok &&
    body.status !== "config-missing" &&
    body.status !== "unsupported"
  ) {
    throw new Error(body.errors?.[0] ?? "HEX stake diagnostic request failed.");
  }
  return body;
}

function emptyResponse(
  chainId: number,
  chainName: string,
  owner: Address | null,
  status: LifeboatHexStakeApiResponse["status"],
): LifeboatHexStakeApiResponse {
  return {
    ok: false,
    status,
    chainId,
    chainName,
    owner,
    riskLevel:
      status === "idle" || status === "scanning"
        ? "not_checked"
        : status === "unsupported"
          ? "unsupported"
          : "upstream_unavailable",
    stakes: [],
    evidence: [],
    summary: emptyHexStakeSummary(),
    warnings: [],
    errors: [],
    missingConfig: [],
    supported: status !== "unsupported",
    supportNotes: [],
  };
}
