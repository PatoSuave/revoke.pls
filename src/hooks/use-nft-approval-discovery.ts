"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type { Address } from "viem";
import { useReadContracts } from "wagmi";

import type {
  DiscoverySource,
  DiscoverySourceMeta,
  NftDiscoveredApproval,
} from "@/lib/discovery";
import { getDefaultDiscoverySource } from "@/lib/discovery";
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
  sourceMeta: DiscoverySourceMeta;
  truncated: boolean;
}

/**
 * Discovery-first NFT approval pipeline, parallel to `useApprovalDiscovery`.
 *
 * 1. Fetch historical `ApprovalForAll` + ERC-721 per-token `Approval` events
 *    for `owner` from the configured discovery source.
 * 2. Deduplicate into `(collection, operator, [tokenId])` candidates.
 * 3. Re-validate on-chain with `isApprovedForAll(owner, operator)` or
 *    `getApproved(tokenId) == operator` via Multicall3, fetching collection
 *    metadata (standard detection via ERC-165 + optional `name()`) in the
 *    same batch.
 * 4. Drop inactive approvals and enrich operators from the curated registry.
 */
export function useNftApprovalDiscovery({
  owner,
  source,
  enabled = true,
}: UseNftApprovalDiscoveryOptions): UseNftApprovalDiscoveryResult {
  const discoverySource = useMemo(
    () => source ?? getDefaultDiscoverySource(),
    [source],
  );

  const discoveryEnabled = enabled && Boolean(owner);

  const discoveryQuery = useQuery({
    queryKey: [
      "nft-approval-discovery",
      discoverySource.meta.id,
      owner?.toLowerCase() ?? null,
    ],
    enabled: discoveryEnabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return discoverySource.discoverNftApprovals(owner, { signal });
    },
  });

  const candidates: readonly NftDiscoveredApproval[] = useMemo(
    () => discoveryQuery.data?.approvals ?? EMPTY_CANDIDATES,
    [discoveryQuery.data],
  );

  const { contracts, uniqueCollections } = useMemo(() => {
    if (!owner || candidates.length === 0) {
      return { contracts: [], uniqueCollections: [] as Address[] };
    }
    return buildNftValidationContracts(owner, candidates);
  }, [owner, candidates]);

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
    if (!owner || !reads.data || candidates.length === 0) {
      return {
        approvals: [] as NftApproval[],
        stats: {
          candidates: candidates.length,
          active: 0,
          registryMatched: 0,
        },
      };
    }
    return parseNftValidationResults(reads.data, owner, candidates);
  }, [owner, reads.data, candidates]);

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
    const source = discoverySource.meta.id;
    if (status === "pending") {
      trackEvent("scan_started", { kind: "nft", source });
    } else if (status === "success") {
      trackEvent("scan_completed", {
        kind: "nft",
        source,
        candidates: candidates.length,
        active: parsed.approvals.length,
        registryMatched: parsed.stats.registryMatched,
        windows: discoveryQuery.data?.windows ?? 0,
      });
      if (discoveryQuery.data?.truncated) {
        trackEvent("scan_truncated", { kind: "nft", source });
      }
    } else if (status === "error") {
      trackEvent("scan_failed", { kind: "nft", source }, "warn");
    }
  }, [
    status,
    discoverySource.meta.id,
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
    sourceMeta: discoverySource.meta,
    truncated: discoveryQuery.data?.truncated ?? false,
  };
}
