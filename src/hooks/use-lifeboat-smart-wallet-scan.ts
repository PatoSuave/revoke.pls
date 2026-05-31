"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptySmartWalletSummary,
  type LifeboatSmartWalletApiResponse,
} from "@/lib/lifeboat/smart-wallet";

export interface UseLifeboatSmartWalletScanResult {
  response: LifeboatSmartWalletApiResponse;
  status: "idle" | "pending" | "success" | "error";
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLifeboatSmartWalletScan({
  owner,
  chainId,
  chainName,
  enabled = true,
}: {
  owner: Address | undefined;
  chainId: number;
  chainName: string;
  enabled?: boolean;
}): UseLifeboatSmartWalletScanResult {
  const query = useQuery({
    queryKey: ["lifeboat-smart-wallet", chainId, owner?.toLowerCase() ?? null],
    enabled: enabled && Boolean(owner),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchLifeboatSmartWalletScan({ owner, chainId, signal });
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
          "The smart-wallet diagnostic is incomplete. Do not treat this as proof that no smart-wallet, Safe, module, guard, or session-key risk exists.",
        ],
        errors: [
          query.error instanceof Error
            ? query.error.message
            : "Smart-wallet diagnostic request failed.",
        ],
      };
    }
    return emptyResponse(chainId, chainName, owner, "idle");
  }, [chainId, chainName, owner, query.data, query.error, query.status]);

  const status: UseLifeboatSmartWalletScanResult["status"] =
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

async function fetchLifeboatSmartWalletScan({
  owner,
  chainId,
  signal,
}: {
  owner: Address;
  chainId: number;
  signal?: AbortSignal;
}): Promise<LifeboatSmartWalletApiResponse> {
  const url = new URL("/api/lifeboat/smart-wallet", window.location.origin);
  url.searchParams.set("owner", owner);
  url.searchParams.set("chainId", chainId.toString());

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  const body = (await response.json()) as LifeboatSmartWalletApiResponse;
  if (
    !response.ok &&
    body.status !== "config-missing" &&
    body.status !== "unsupported"
  ) {
    throw new Error(
      body.errors?.[0] ?? "Smart-wallet diagnostic request failed.",
    );
  }
  return body;
}

function emptyResponse(
  chainId: number,
  chainName: string,
  owner: Address | null,
  status: LifeboatSmartWalletApiResponse["status"],
): LifeboatSmartWalletApiResponse {
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
    summary: emptySmartWalletSummary(),
    warnings: [],
    errors: [],
    missingConfig: [],
    supported: false,
    supportNotes: [],
  };
}
