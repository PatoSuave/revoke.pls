"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type { Address } from "viem";
import { useReadContracts } from "wagmi";

import type { SupportedChainId } from "@/lib/chains";
import type {
  DiscoverySource,
  DiscoverySourceMeta,
  NftDiscoveredApproval,
} from "@/lib/discovery";
import { getDiscoverySourceForChain } from "@/lib/discovery";
import {
  buildNftValidationContracts,
  parseNftValidationResults,
  type NftApproval,
} from "@/lib/nft-approvals";
import { trackEvent } from "@/lib/telemetry";

export type NftDiscoveryStatus = "idle" | "pending" | "success" | "error";

const EMPTY_CANDIDATES: readonly NftDiscoveredApproval[] = [];

export interface UseNftApprovalDiscoveryOptions {
  owner: Address | undefined;
  chainId: number | undefined;
  source?: DiscoverySource;
  enabled?: boolean;
}

export interface UseNftApprovalDiscoveryResult {
  approvals: NftApproval[];
  status: NftDiscoveryStatus;
  isFetching: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => void;
  stats: {
    candidates: number;
    uniqueCollections: number;
    active: number;
    registryMatched: number;
    rawCandidateLogs: number;
    windows: number;
    requests: number;
  };
  sourceMeta: DiscoverySourceMeta | null;
  truncated: boolean;
}

/**
 * Discovery-first NFT approval pipeline, parallel to `useApprovalDiscovery`.
 *
 * 1. Fetch historical `ApprovalForAll` + ERC-721 per-token `Approval` events
 *    for `owner` on `chainId` from the chain's configured discovery source.
 * 2. Deduplicate into `(collection, operator, [tokenId])` candidates.
 * 3. Re-validate on-chain with `isApprovedForAll(owner, operator)` or
 *    `getApproved(tokenId) == operator` via Multicall3 on the same chain,
 *    fetching collection metadata in the same batch.
 * 4. Drop inactive approvals and enrich operators from the curated registry
 *    scoped to `chainId`.
 */
export function useNftApprovalDiscovery({
  owner,
  chainId,
  source,
  enabled = true,
}: UseNftApprovalDiscoveryOptions): UseNftApprovalDiscoveryResult {
  const discoverySource = useMemo(
    () => source ?? getDiscoverySourceForChain(chainId),
    [source, chainId],
  );

  const discoveryEnabled =
    enabled && Boolean(owner) && Boolean(discoverySource) && Boolean(chainId);

  const discoveryQuery = useQuery({
    queryKey: [
      "nft-approval-discovery",
      discoverySource?.meta.id ?? null,
      chainId ?? null,
      owner?.toLowerCase() ?? null,
    ],
    enabled: discoveryEnabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      if (!discoverySource) throw new Error("unsupported chain");
      return discoverySource.discoverNftApprovals(owner, { signal });
    },
  });

  const candidates: readonly NftDiscoveredApproval[] = useMemo(
    () => discoveryQuery.data?.approvals ?? EMPTY_CANDIDATES,
    [discoveryQuery.data],
  );

  const { contracts, uniqueCollections } = useMemo(() => {
    if (!owner || !chainId || candidates.length === 0) {
      return { contracts: [], uniqueCollections: [] as Address[] };
    }
    return buildNftValidationContracts(
      owner,
      candidates,
      chainId as SupportedChainId,
    );
  }, [owner, chainId, candidates]);

  const readsEnabled =
    discoveryEnabled &&
    discoveryQuery.status === "success" &&
    contracts.length > 0;

  const reads = useReadContracts({
    contracts,
    allowFailure: true,
    query: {
      enabled: readsEnabled,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  });

  const parsed = useMemo(() => {
    if (!owner || !chainId || !reads.data || candidates.length === 0) {
      return {
        approvals: [] as NftApproval[],
        stats: {
          candidates: candidates.length,
          active: 0,
          registryMatched: 0,
        },
      };
    }
    return parseNftValidationResults(reads.data, owner, chainId, candidates);
  }, [owner, chainId, reads.data, candidates]);

  const status: NftDiscoveryStatus = useMemo(() => {
    if (!discoveryEnabled) return "idle";
    if (discoveryQuery.status === "pending") return "pending";
    if (discoveryQuery.status === "error") return "error";
    if (candidates.length === 0) return "success";
    if (reads.status === "pending") return "pending";
    if (reads.status === "error") return "error";
    return "success";
  }, [discoveryEnabled, discoveryQuery.status, candidates.length, reads.status]);

  const error: Error | null =
    (discoveryQuery.error as Error | null) ?? reads.error ?? null;

  const lastStatusRef = useRef<NftDiscoveryStatus>("idle");
  useEffect(() => {
    const prev = lastStatusRef.current;
    if (prev === status) return;
    lastStatusRef.current = status;
    const src = discoverySource?.meta.id ?? "unknown";
    if (status === "pending") {
      trackEvent("scan_started", { kind: "nft", source: src, chainId });
    } else if (status === "success") {
      trackEvent("scan_completed", {
        kind: "nft",
        source: src,
        chainId,
        candidates: candidates.length,
        active: parsed.approvals.length,
        registryMatched: parsed.stats.registryMatched,
        windows: discoveryQuery.data?.windows ?? 0,
      });
      if (discoveryQuery.data?.truncated) {
        trackEvent("scan_truncated", { kind: "nft", source: src, chainId });
      }
    } else if (status === "error") {
      trackEvent("scan_failed", { kind: "nft", source: src, chainId }, "warn");
    }
  }, [
    status,
    discoverySource?.meta.id,
    chainId,
    candidates.length,
    parsed.approvals.length,
    parsed.stats.registryMatched,
    discoveryQuery.data?.windows,
    discoveryQuery.data?.truncated,
  ]);

  const refetch = () => {
    void discoveryQuery.refetch();
    void reads.refetch();
  };

  return {
    approvals: parsed.approvals,
    status,
    isFetching: discoveryQuery.isFetching || reads.isFetching,
    isRefetching: discoveryQuery.isRefetching || reads.isRefetching,
    error,
    refetch,
    stats: {
      candidates: candidates.length,
      uniqueCollections: uniqueCollections.length,
      active: parsed.stats.active,
      registryMatched: parsed.stats.registryMatched,
      rawCandidateLogs: discoveryQuery.data?.rawCount ?? 0,
      windows: discoveryQuery.data?.windows ?? 0,
      requests: discoveryQuery.data?.requests ?? 0,
    },
    sourceMeta: discoverySource?.meta ?? null,
    truncated: discoveryQuery.data?.truncated ?? false,
  };
}
