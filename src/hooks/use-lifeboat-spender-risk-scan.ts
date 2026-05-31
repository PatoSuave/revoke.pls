"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptySpenderRiskSummary,
  type LifeboatSpenderRiskApiResponse,
} from "@/lib/lifeboat/spender-risk";

export interface UseLifeboatSpenderRiskScanResult {
  response: LifeboatSpenderRiskApiResponse;
  status: "idle" | "pending" | "success" | "error";
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLifeboatSpenderRiskScan({
  spenderAddresses,
  chainId,
  chainName,
  enabled = true,
}: {
  spenderAddresses: readonly Address[];
  chainId: number;
  chainName: string;
  enabled?: boolean;
}): UseLifeboatSpenderRiskScanResult {
  const normalizedSpenders = useMemo(
    () => dedupeAddresses(spenderAddresses),
    [spenderAddresses],
  );
  const query = useQuery({
    queryKey: [
      "lifeboat-spender-risk",
      chainId,
      normalizedSpenders.map((spender) => spender.toLowerCase()).join(","),
    ],
    enabled: enabled && normalizedSpenders.length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) =>
      fetchLifeboatSpenderRiskScan({
        spenderAddresses: normalizedSpenders,
        chainId,
        signal,
      }),
  });

  const response = useMemo(() => {
    if (!enabled || normalizedSpenders.length === 0) {
      return emptyResponse(chainId, chainName, "idle");
    }
    if (query.data) return query.data;
    if (query.status === "pending") {
      return emptyResponse(chainId, chainName, "scanning");
    }
    if (query.error) {
      return {
        ...emptyResponse(chainId, chainName, "upstream-failure"),
        warnings: [
          "The spender contract diagnostic is incomplete. Do not treat this as proof that approval spenders are safe.",
        ],
        errors: [
          query.error instanceof Error
            ? query.error.message
            : "Spender contract diagnostic request failed.",
        ],
      };
    }
    return emptyResponse(chainId, chainName, "idle");
  }, [
    chainId,
    chainName,
    enabled,
    normalizedSpenders.length,
    query.data,
    query.error,
    query.status,
  ]);

  const status: UseLifeboatSpenderRiskScanResult["status"] =
    !enabled || normalizedSpenders.length === 0
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

async function fetchLifeboatSpenderRiskScan({
  spenderAddresses,
  chainId,
  signal,
}: {
  spenderAddresses: readonly Address[];
  chainId: number;
  signal?: AbortSignal;
}): Promise<LifeboatSpenderRiskApiResponse> {
  const url = new URL("/api/lifeboat/spender-risk", window.location.origin);
  url.searchParams.set("chainId", chainId.toString());
  for (const spender of spenderAddresses) {
    url.searchParams.append("spender", spender);
  }

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  const body = (await response.json()) as LifeboatSpenderRiskApiResponse;
  if (!response.ok && body.status !== "partial") {
    throw new Error(
      body.errors?.[0] ?? "Spender contract diagnostic request failed.",
    );
  }
  return body;
}

function emptyResponse(
  chainId: number,
  chainName: string,
  status: LifeboatSpenderRiskApiResponse["status"],
): LifeboatSpenderRiskApiResponse {
  return {
    ok: false,
    status,
    chainId,
    chainName,
    riskLevel:
      status === "idle" || status === "scanning"
        ? "not_checked"
        : "upstream_unavailable",
    evidence: [],
    spenders: [],
    summary: emptySpenderRiskSummary(),
    warnings: [],
    errors: [],
    missingConfig: [],
  };
}

function dedupeAddresses(addresses: readonly Address[]): Address[] {
  const out: Address[] = [];
  const seen = new Set<string>();
  for (const address of addresses) {
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(address);
  }
  return out.sort((a, b) => a.localeCompare(b));
}
