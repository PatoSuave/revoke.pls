"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import { useReadContracts } from "wagmi";

import {
  buildDiscoveryContracts,
  buildPermit2AllowanceContracts,
  collectDiscoveryReadFailures,
  collectPermit2ReadFailures,
  EMPTY_ERC20_LIVE_READ_FAILURES,
  parseDiscoveryResults,
  parsePermit2AllowanceResults,
  type Approval,
  type Erc20LiveReadFailureDiagnostics,
} from "@/lib/approvals";
import type { SupportedChainId } from "@/lib/chains";
import {
  getDiscoverySourceForChain,
  type DiscoveredPair,
  type DiscoverySource,
  type DiscoverySourceMeta,
  type Erc20ApprovalParseDiagnostics,
} from "@/lib/discovery";
import type { Permit2DiscoveredAllowance } from "@/lib/permit2";
import { trackEvent } from "@/lib/telemetry";

export type DiscoveryStatus = "idle" | "pending" | "success" | "error";

const EMPTY_PAIRS: readonly DiscoveredPair[] = [];
const EMPTY_PERMIT2_ALLOWANCES: readonly Permit2DiscoveredAllowance[] = [];

const EMPTY_ERC20_PARSE: Erc20ApprovalParseDiagnostics = {
  rawLogs: 0,
  decodeAttempts: 0,
  erc20TopicShape: 0,
  erc721TokenApprovalShape: 0,
  unsupportedTopicShape: 0,
  missingTopics: 0,
  missingTokenAddress: 0,
  invalidTokenAddress: 0,
  missingSpenderTopic: 0,
  invalidSpenderTopic: 0,
  decodedPairs: 0,
  uniquePairs: 0,
  samplePairs: [],
};

interface PipelineTiming {
  startedAt: number | null;
  completedAt: number | null;
  elapsedMs: number | null;
}

const EMPTY_TIMING: PipelineTiming = {
  startedAt: null,
  completedAt: null,
  elapsedMs: null,
};

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return String(error);
}

function combineReadFailures(
  a: Erc20LiveReadFailureDiagnostics,
  b: Erc20LiveReadFailureDiagnostics,
): Erc20LiveReadFailureDiagnostics {
  return {
    allowance: a.allowance + b.allowance,
    symbol: a.symbol + b.symbol,
    name: a.name + b.name,
    decimals: a.decimals + b.decimals,
    other: a.other + b.other,
    allowanceSucceeded: a.allowanceSucceeded + b.allowanceSucceeded,
    allowanceFailed: a.allowanceFailed + b.allowanceFailed,
    allowanceTotal: a.allowanceTotal + b.allowanceTotal,
    metadataFailed: a.metadataFailed + b.metadataFailed,
    samples: [...a.samples, ...b.samples].slice(0, 6),
  };
}

function usePipelineTiming(status: DiscoveryStatus): PipelineTiming {
  const [timing, setTiming] = useState<PipelineTiming>(EMPTY_TIMING);
  const previousStatusRef = useRef<DiscoveryStatus>("idle");

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === "pending" && previousStatus !== "pending") {
      setTiming({
        startedAt: Date.now(),
        completedAt: null,
        elapsedMs: null,
      });
      return;
    }

    if (
      (status === "success" || status === "error") &&
      previousStatus === "pending"
    ) {
      setTiming((current) => {
        if (!current.startedAt) return current;
        const completedAt = Date.now();
        return {
          startedAt: current.startedAt,
          completedAt,
          elapsedMs: completedAt - current.startedAt,
        };
      });
    }
  }, [status]);

  return timing;
}

export interface UseApprovalDiscoveryOptions {
  owner: Address | undefined;
  chainId: number | undefined;
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
    permit2Candidates: number;
    permit2Active: number;
    rawCandidateLogs: number;
    windows: number;
    requests: number;
  };
  diagnostics: {
    discoveryError: string | null;
    liveReadError: string | null;
    liveReadFailureCount: number;
    liveReadFailures: Erc20LiveReadFailureDiagnostics;
    parse: Erc20ApprovalParseDiagnostics;
    timing: PipelineTiming;
  };
  sourceMeta: DiscoverySourceMeta | null;
  truncated: boolean;
}

/**
 * Discovery-first approval pipeline.
 *
 * 1. Fetch historical ERC-20 `Approval` events for `owner` on `chainId`
 *    from the chain's configured discovery source.
 * 2. Deduplicate into `(token, spender)` pairs.
 * 3. Re-validate on-chain with `allowance(owner, spender)` via Multicall3
 *    on the same chain, fetching token metadata in the same batch.
 * 4. Drop zero allowances, identify unlimited allowances, and enrich spenders
 *    from the curated registry scoped to `chainId` when a match exists.
 *
 * The registry is an enrichment layer, not the primary discovery mechanism.
 * Unknown spenders stay unknown and untrusted.
 */
export function useApprovalDiscovery({
  owner,
  chainId,
  source,
  enabled = true,
}: UseApprovalDiscoveryOptions): UseApprovalDiscoveryResult {
  const discoverySource = useMemo(
    () => source ?? getDiscoverySourceForChain(chainId),
    [source, chainId],
  );

  const discoveryEnabled =
    enabled && Boolean(owner) && Boolean(discoverySource) && Boolean(chainId);

  const discoveryQuery = useQuery({
    queryKey: [
      "approval-discovery",
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
      return discoverySource.discover(owner, { signal });
    },
  });

  const permit2DiscoveryEnabled =
    discoveryEnabled && Boolean(discoverySource?.discoverPermit2Allowances);

  const permit2Query = useQuery({
    queryKey: [
      "permit2-approval-discovery",
      discoverySource?.meta.id ?? null,
      chainId ?? null,
      owner?.toLowerCase() ?? null,
    ],
    enabled: permit2DiscoveryEnabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      if (!owner) throw new Error("owner required");
      if (!discoverySource?.discoverPermit2Allowances) {
        throw new Error("Permit2 discovery unsupported");
      }
      return discoverySource.discoverPermit2Allowances(owner, { signal });
    },
  });

  const pairs: readonly DiscoveredPair[] = useMemo(
    () => discoveryQuery.data?.pairs ?? EMPTY_PAIRS,
    [discoveryQuery.data],
  );

  const permit2Candidates: readonly Permit2DiscoveredAllowance[] = useMemo(
    () => permit2Query.data?.allowances ?? EMPTY_PERMIT2_ALLOWANCES,
    [permit2Query.data],
  );

  const { contracts, uniqueTokens } = useMemo(() => {
    if (!owner || !chainId || pairs.length === 0) {
      return { contracts: [], uniqueTokens: [] as Address[] };
    }
    return buildDiscoveryContracts(owner, pairs, chainId as SupportedChainId);
  }, [owner, chainId, pairs]);

  const { contracts: permit2Contracts, uniqueTokens: permit2UniqueTokens } =
    useMemo(() => {
      if (!owner || !chainId || permit2Candidates.length === 0) {
        return { contracts: [], uniqueTokens: [] as Address[] };
      }
      return buildPermit2AllowanceContracts(
        owner,
        permit2Candidates,
        chainId as SupportedChainId,
      );
    }, [owner, chainId, permit2Candidates]);

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

  const permit2ReadsEnabled =
    discoveryEnabled &&
    permit2Query.status === "success" &&
    permit2Contracts.length > 0;

  const permit2Reads = useReadContracts({
    contracts: permit2Contracts,
    allowFailure: true,
    query: {
      enabled: permit2ReadsEnabled,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  });

  const parsed = useMemo(() => {
    if (!owner || !chainId || !reads.data || pairs.length === 0) {
      return {
        approvals: [] as Approval[],
        stats: { candidates: pairs.length, active: 0, registryMatched: 0 },
      };
    }
    return parseDiscoveryResults(reads.data, owner, chainId, pairs);
  }, [owner, chainId, reads.data, pairs]);

  const permit2Parsed = useMemo(() => {
    if (
      !owner ||
      !chainId ||
      !permit2Reads.data ||
      permit2Candidates.length === 0
    ) {
      return {
        approvals: [] as Approval[],
        stats: {
          candidates: permit2Candidates.length,
          active: 0,
          registryMatched: 0,
        },
      };
    }
    return parsePermit2AllowanceResults(
      permit2Reads.data,
      owner,
      chainId,
      permit2Candidates,
    );
  }, [owner, chainId, permit2Reads.data, permit2Candidates]);

  const approvals = useMemo(
    () => [...parsed.approvals, ...permit2Parsed.approvals],
    [parsed.approvals, permit2Parsed.approvals],
  );

  const erc20ReadFailures = useMemo(
    () =>
      reads.data
        ? collectDiscoveryReadFailures(reads.data, pairs, uniqueTokens)
        : {
            ...EMPTY_ERC20_LIVE_READ_FAILURES,
            allowanceTotal: pairs.length,
          },
    [reads.data, pairs, uniqueTokens],
  );

  const permit2ReadFailures = useMemo(
    () =>
      permit2Reads.data
        ? collectPermit2ReadFailures(
            permit2Reads.data,
            permit2Candidates,
            permit2UniqueTokens,
          )
        : {
            ...EMPTY_ERC20_LIVE_READ_FAILURES,
            allowanceTotal: permit2Candidates.length,
          },
    [permit2Reads.data, permit2Candidates, permit2UniqueTokens],
  );

  const readFailures = useMemo(
    () => combineReadFailures(erc20ReadFailures, permit2ReadFailures),
    [erc20ReadFailures, permit2ReadFailures],
  );

  const status: DiscoveryStatus = useMemo(() => {
    if (!discoveryEnabled) return "idle";
    if (
      discoveryQuery.status === "pending" ||
      (permit2DiscoveryEnabled && permit2Query.status === "pending")
    ) {
      return "pending";
    }
    if (discoveryQuery.status === "error" || permit2Query.status === "error") {
      return "error";
    }
    // Discovery succeeded. If there are candidate pairs, the on-chain
    // validation read determines the final status; otherwise we're done.
    if (pairs.length === 0 && permit2Candidates.length === 0) return "success";
    if (
      (pairs.length > 0 && reads.status === "pending") ||
      (permit2Candidates.length > 0 && permit2Reads.status === "pending")
    ) {
      return "pending";
    }
    if (reads.status === "error" || permit2Reads.status === "error") {
      return "error";
    }
    return "success";
  }, [
    discoveryEnabled,
    discoveryQuery.status,
    permit2DiscoveryEnabled,
    permit2Query.status,
    pairs.length,
    permit2Candidates.length,
    reads.status,
    permit2Reads.status,
  ]);

  const error: Error | null =
    (discoveryQuery.error as Error | null) ??
    (permit2Query.error as Error | null) ??
    reads.error ??
    permit2Reads.error ??
    null;
  const timing = usePipelineTiming(status);

  const lastStatusRef = useRef<DiscoveryStatus>("idle");
  useEffect(() => {
    const prev = lastStatusRef.current;
    if (prev === status) return;
    lastStatusRef.current = status;
    const src = discoverySource?.meta.id ?? "unknown";
    if (status === "pending") {
      trackEvent("scan_started", { kind: "erc20", source: src, chainId });
    } else if (status === "success") {
      trackEvent("scan_completed", {
        kind: "erc20",
        source: src,
        chainId,
        candidates: pairs.length + permit2Candidates.length,
        active: approvals.length,
        registryMatched:
          parsed.stats.registryMatched + permit2Parsed.stats.registryMatched,
        windows:
          (discoveryQuery.data?.windows ?? 0) +
          (permit2Query.data?.windows ?? 0),
      });
      if (discoveryQuery.data?.truncated || permit2Query.data?.truncated) {
        trackEvent("scan_truncated", { kind: "erc20", source: src, chainId });
      }
    } else if (status === "error") {
      trackEvent("scan_failed", { kind: "erc20", source: src, chainId }, "warn");
    }
  }, [
    status,
    discoverySource?.meta.id,
    chainId,
    pairs.length,
    permit2Candidates.length,
    approvals.length,
    parsed.stats.registryMatched,
    permit2Parsed.stats.registryMatched,
    discoveryQuery.data?.windows,
    permit2Query.data?.windows,
    discoveryQuery.data?.truncated,
    permit2Query.data?.truncated,
  ]);

  const refetch = () => {
    void discoveryQuery.refetch();
    void permit2Query.refetch();
    void reads.refetch();
    void permit2Reads.refetch();
  };

  return {
    approvals,
    status,
    isFetching:
      discoveryQuery.isFetching ||
      permit2Query.isFetching ||
      reads.isFetching ||
      permit2Reads.isFetching,
    isRefetching:
      discoveryQuery.isRefetching ||
      permit2Query.isRefetching ||
      reads.isRefetching ||
      permit2Reads.isRefetching,
    error,
    refetch,
    stats: {
      candidates: pairs.length + permit2Candidates.length,
      uniqueTokens: new Set([
        ...uniqueTokens.map((address) => address.toLowerCase()),
        ...permit2UniqueTokens.map((address) => address.toLowerCase()),
      ]).size,
      active: approvals.length,
      registryMatched:
        parsed.stats.registryMatched + permit2Parsed.stats.registryMatched,
      permit2Candidates: permit2Candidates.length,
      permit2Active: permit2Parsed.stats.active,
      rawCandidateLogs:
        (discoveryQuery.data?.rawCount ?? 0) +
        (permit2Query.data?.rawCount ?? 0),
      windows:
        (discoveryQuery.data?.windows ?? 0) +
        (permit2Query.data?.windows ?? 0),
      requests:
        (discoveryQuery.data?.requests ?? 0) +
        (permit2Query.data?.requests ?? 0),
    },
    diagnostics: {
      discoveryError:
        errorMessage(discoveryQuery.error) ?? errorMessage(permit2Query.error),
      liveReadError: errorMessage(reads.error) ?? errorMessage(permit2Reads.error),
      liveReadFailureCount:
        readFailures.allowance +
        readFailures.symbol +
        readFailures.name +
        readFailures.decimals +
        readFailures.other,
      liveReadFailures: readFailures,
      parse: discoveryQuery.data?.erc20Parse ?? EMPTY_ERC20_PARSE,
      timing,
    },
    sourceMeta: discoverySource?.meta ?? null,
    truncated:
      (discoveryQuery.data?.truncated ?? false) ||
      (permit2Query.data?.truncated ?? false),
  };
}
