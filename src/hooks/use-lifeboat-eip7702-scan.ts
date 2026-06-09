"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createPublicClient, http, type Address } from "viem";

import { getGasTrackerChainConfig } from "@/lib/gas/gas-chains";
import {
  analyzeEip7702Delegation,
  emptyEip7702Summary,
  type LifeboatEip7702ApiResponse,
} from "@/lib/lifeboat/eip7702";
import { isStaticExportBuild } from "@/lib/platform";

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
      if (isStaticExportBuild) {
        return fetchStaticExportEip7702Scan({
          owner,
          chainId,
          chainName,
          signal,
        });
      }
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

async function fetchStaticExportEip7702Scan({
  owner,
  chainId,
  chainName,
  signal,
}: {
  owner: Address;
  chainId: number;
  chainName: string;
  signal?: AbortSignal;
}): Promise<LifeboatEip7702ApiResponse> {
  const chain = getGasTrackerChainConfig(chainId);
  if (!chain) {
    return {
      ...emptyResponse(chainId, chainName, owner, "unsupported"),
      riskLevel: "unsupported",
      supportNotes: [
        "This desktop beta only runs account-code checks on known Pulse Revoke chains.",
      ],
    };
  }

  try {
    const client = createPublicClient({
      chain: chain.viemChain,
      transport: http(chain.publicRpcUrl, {
        timeout: 8_000,
      }),
    });
    const code = (await client.getCode({ address: owner })) ?? "0x";
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const explorerBaseUrl = chain.viemChain.blockExplorers?.default.url ?? null;
    const analysis = analyzeEip7702Delegation({
      owner,
      code,
      explorerUrl: explorerBaseUrl
        ? `${explorerBaseUrl}/address/${owner}`
        : null,
      delegationExplorerUrl: explorerBaseUrl
        ? (address) => `${explorerBaseUrl}/address/${address}`
        : undefined,
    });

    return {
      ok: true,
      status: "complete",
      chainId,
      chainName: chain.chainName,
      owner,
      riskLevel: analysis.riskLevel,
      evidence: analysis.evidence,
      summary: analysis.summary,
      warnings: analysis.warnings,
      errors: [],
      missingConfig: [],
      supported: true,
      supportNotes: [
        "Desktop beta read the latest account code directly from the public RPC.",
      ],
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return {
      ...emptyResponse(chainId, chainName, owner, "upstream-failure"),
      warnings: [
        "The EIP-7702 delegation diagnostic is incomplete. Do not treat this as proof that the wallet has no delegation or account-code risk.",
      ],
      errors: [
        `${chain.chainName} account-code read failed from the public RPC.`,
      ],
    };
  }
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
    riskLevel: riskLevelForEmptyStatus(status),
    evidence: [],
    summary: emptyEip7702Summary(),
    warnings: [],
    errors: [],
    missingConfig: [],
    supported: false,
    supportNotes: [],
  };
}

function riskLevelForEmptyStatus(
  status: LifeboatEip7702ApiResponse["status"],
): LifeboatEip7702ApiResponse["riskLevel"] {
  if (status === "idle" || status === "scanning") return "not_checked";
  if (status === "unsupported") return "unsupported";
  return "upstream_unavailable";
}
