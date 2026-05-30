"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptyEip7702Summary,
  type LifeboatEip7702ApiResponse,
} from "@/lib/lifeboat/eip7702";

export interface UseLifeboatEip7702ScanResult {
  response: LifeboatEip7702ApiResponse;
  status: "idle" | "pending" | "success" | "error";
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLifeboatEip7702Scan({
  owner,
  chainId,
  chainName,
  enabled = true,
}: {
  owner: Address | undefined;
  chainId: number;
  chainName: string;
  enabled?: boolean;
}): UseLifeboatEip7702ScanResult {
  const query = useQuery({
    queryKey: ["lifeboat-eip7702", chainId, owner?.toLowerCase() ?? null],
    enabled: enabled && Boolean(owner),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchLifeboatEip7702Scan({ owner, chainId, signal });
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
          "The EIP-7702 delegation diagnostic is incomplete. Do not treat this as proof that the wallet has no delegation or account-code risk.",
        ],
        errors: [
          query.error instanceof Error
            ? query.error.message
            : "EIP-7702 diagnostic request failed.",
        ],
      };
    }
    return emptyResponse(chainId, chainName, owner, "idle");
  }, [chainId, chainName, owner, query.data, query.error, query.status]);

  const status: UseLifeboatEip7702ScanResult["status"] =
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

async function fetchLifeboatEip7702Scan({
  owner,
  chainId,
  signal,
}: {
  owner: Address;
  chainId: number;
  signal?: AbortSignal;
}): Promise<LifeboatEip7702ApiResponse> {
  const url = new URL("/api/lifeboat/eip7702", window.location.origin);
  url.searchParams.set("owner", owner);
  url.searchParams.set("chainId", chainId.toString());

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  const body = (await response.json()) as LifeboatEip7702ApiResponse;
  if (
    !response.ok &&
    body.status !== "config-missing" &&
    body.status !== "unsupported"
  ) {
    throw new Error(body.errors?.[0] ?? "EIP-7702 diagnostic request failed.");
  }
  return body;
}

function emptyResponse(
  chainId: number,
  chainName: string,
  owner: Address | null,
  status: LifeboatEip7702ApiResponse["status"],
): LifeboatEip7702ApiResponse {
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
    summary: emptyEip7702Summary(),
    warnings: [],
    errors: [],
    missingConfig: [],
    supported: false,
    supportNotes: [],
  };
}
