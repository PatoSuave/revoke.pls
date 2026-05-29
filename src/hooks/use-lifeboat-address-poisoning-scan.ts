"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";

import {
  emptyAddressPoisoningSummary,
  type LifeboatAddressPoisoningApiResponse,
} from "@/lib/lifeboat/address-poisoning";

export interface UseLifeboatAddressPoisoningScanResult {
  response: LifeboatAddressPoisoningApiResponse;
  status: "idle" | "pending" | "success" | "error";
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLifeboatAddressPoisoningScan({
  owner,
  chainId,
  chainName,
  enabled = true,
}: {
  owner: Address | undefined;
  chainId: number;
  chainName: string;
  enabled?: boolean;
}): UseLifeboatAddressPoisoningScanResult {
  const query = useQuery({
    queryKey: [
      "lifeboat-address-poisoning",
      chainId,
      owner?.toLowerCase() ?? null,
    ],
    enabled: enabled && Boolean(owner),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return fetchLifeboatAddressPoisoningScan({ owner, chainId, signal });
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
          "The address poisoning diagnostic is incomplete. Do not treat this as proof that the wallet has no lookalike-address risk.",
        ],
        errors: [
          query.error instanceof Error
            ? query.error.message
            : "Address poisoning diagnostic request failed.",
        ],
      };
    }
    return emptyResponse(chainId, chainName, owner, "idle");
  }, [chainId, chainName, owner, query.data, query.error, query.status]);

  const status: UseLifeboatAddressPoisoningScanResult["status"] =
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

async function fetchLifeboatAddressPoisoningScan({
  owner,
  chainId,
  signal,
}: {
  owner: Address;
  chainId: number;
  signal?: AbortSignal;
}): Promise<LifeboatAddressPoisoningApiResponse> {
  const url = new URL("/api/lifeboat/address-poisoning", window.location.origin);
  url.searchParams.set("owner", owner);
  url.searchParams.set("chainId", chainId.toString());

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
    signal,
  });
  const body = (await response.json()) as LifeboatAddressPoisoningApiResponse;
  if (
    !response.ok &&
    body.status !== "config-missing" &&
    body.status !== "partial"
  ) {
    throw new Error(
      body.errors?.[0] ?? "Address poisoning diagnostic request failed.",
    );
  }
  return body;
}

function emptyResponse(
  chainId: number,
  chainName: string,
  owner: Address | null,
  status: LifeboatAddressPoisoningApiResponse["status"],
): LifeboatAddressPoisoningApiResponse {
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
    events: [],
    summary: emptyAddressPoisoningSummary(),
    warnings: [],
    errors: [],
    missingConfig: [],
  };
}
