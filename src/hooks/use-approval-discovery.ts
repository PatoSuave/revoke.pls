"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import type { Address } from "viem";
import { useReadContracts } from "wagmi";

import {
  buildDiscoveryContracts,
  parseDiscoveryResults,
  type Approval,
} from "@/lib/approvals";
import {
  getDefaultDiscoverySource,
  type DiscoveredPair,
  type DiscoverySource,
  type DiscoverySourceMeta,
} from "@/lib/discovery";
import { trackEvent } from "@/lib/telemetry";

export type DiscoveryStatus = "idle" | "pending" | "success" | "error";

const EMPTY_PAIRS: readonly DiscoveredPair[] = [];

export interface UseApprovalDiscoveryOptions {
  owner: Address | undefined;
  source?: DiscoverySource;
  enabled?: boolean;
}

export interface UseApprovalDiscoveryResult {
  approvals: Approval[];
  status: DiscoveryStatus;
  isFetching: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => void;
  /** Debug-friendly pipeline counters: how many pairs were discovered, how
   *  many survived live allowance validation, how many matched the registry. */
  stats: {
    candidates: number;
    uniqueTokens: number;
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
 * Discovery-first approval pipeline.
 *
 * 1. Fetch historical ERC-20 `Approval` events for `owner` from the configured
 *    discovery source (default: PulseScan's Blockscout API).
 * 2. Deduplicate into `(token, spender)` pairs.
 * 3. Re-validate on-chain with `allowance(owner, spender)` via Multicall3,
 *    fetching token metadata in the same batch.
 * 4. Drop zero allowances, identify unlimited allowances, and enrich spenders
 *    from the curated registry when a match exists.
 *
 * The registry is an enrichment layer, not the primary discovery mechanism.
 * Unknown spenders stay unknown and untrusted.
 */
export function useApprovalDiscovery({
  owner,
  source,
  enabled = true,
}: UseApprovalDiscoveryOptions): UseApprovalDiscoveryResult {
  const discoverySource = useMemo(
    () => source ?? getDefaultDiscoverySource(),
    [source],
  );

  const discoveryEnabled = enabled && Boolean(owner);

  const discoveryQuery = useQuery({
    queryKey: [
      "approval-discovery",
      discoverySource.meta.id,
      owner?.toLowerCase() ?? null,
    ],
    enabled: discoveryEnabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      return discoverySource.discover(owner, { signal });
    },
  });

  const pairs: readonly DiscoveredPair[] = useMemo(
    () => discoveryQuery.data?.pairs ?? EMPTY_PAIRS,
    [discoveryQuery.data],
  );

  const { contracts, uniqueTokens } = useMemo(() => {
    if (!owner || pairs.length === 0) {
      return { contracts: [], uniqueTokens: [] as Address[] };
    }
    return buildDiscoveryContracts(owner, pairs);
  }, [owner, pairs]);

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
    if (!owner || !reads.data || pairs.length === 0) {
      return {
        approvals: [] as Approval[],
        stats: { candidates: pairs.length, active: 0, registryMatched: 0 },
      };
    }
    return parseDiscoveryResults(reads.data, owner, pairs);
  }, [owner, reads.data, pairs]);

  const status: DiscoveryStatus = useMemo(() => {
    if (!discoveryEnabled) return "idle";
    if (discoveryQuery.status === "pending") return "pending";
    if (discoveryQuery.status === "error") return "error";
    // Discovery succeeded. If there are candidate pairs, the on-chain
    // validation read determines the final status; otherwise we're done.
    if (pairs.length === 0) return "success";
    if (reads.status === "pending") return "pending";
    if (reads.status === "error") return "error";
    return "success";
  }, [discoveryEnabled, discoveryQuery.status, pairs.length, reads.status]);

  const error: Error | null =
    (discoveryQuery.error as Error | null) ?? reads.error ?? null;

  const lastStatusRef = useRef<DiscoveryStatus>("idle");
  useEffect(() => {
    const prev = lastStatusRef.current;
    if (prev === status) return;
    lastStatusRef.current = status;
    const source = discoverySource.meta.id;
    if (status === "pending") {
      trackEvent("scan_started", { kind: "erc20", source });
    } else if (status === "success") {
      trackEvent("scan_completed", {
        kind: "erc20",
        source,
        candidates: pairs.length,
        active: parsed.approvals.length,
        registryMatched: parsed.stats.registryMatched,
        windows: discoveryQuery.data?.windows ?? 0,
      });
      if (discoveryQuery.data?.truncated) {
        trackEvent("scan_truncated", { kind: "erc20", source });
      }
    } else if (status === "error") {
      trackEvent("scan_failed", { kind: "erc20", source }, "warn");
    }
  }, [
    status,
    discoverySource.meta.id,
    pairs.length,
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
      candidates: pairs.length,
      uniqueTokens: uniqueTokens.length,
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
