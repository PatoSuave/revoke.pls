import { type Address, getAddress } from "viem";

import { pulsechain } from "@/lib/chains";

/**
 * ERC-20 `Approval(address indexed owner, address indexed spender, uint256 value)`
 * event topic signature. Note that ERC-721's single-token `Approval` has the
 * same ABI signature hash but ships three indexed topics instead of two — we
 * disambiguate by filtering on `topics.length === 3` below.
 */
export const ERC20_APPROVAL_TOPIC0 =
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

/**
 * Default Blockscout-compatible API endpoint for PulseChain. Overridable via
 * `NEXT_PUBLIC_PULSECHAIN_EXPLORER_API` so self-hosters and preview deploys
 * can point at a different indexer without a code change.
 */
const DEFAULT_EXPLORER_API = "https://api.scan.pulsechain.com/api";

/**
 * A raw discovered `(token, spender)` pair sourced from historical Approval
 * events. This is the "on-chain fact" layer — it carries no labels, no risk
 * scoring, and no guarantee that the allowance is currently non-zero. Live
 * `allowance(owner, spender)` validation happens downstream.
 */
export interface DiscoveredPair {
  tokenAddress: Address;
  spenderAddress: Address;
}

export interface DiscoverySourceMeta {
  /** Short machine-friendly identifier, used in dev/debug views. */
  id: string;
  /** Human-readable name of the source. */
  name: string;
  /** URL the user can visit to learn more about the source. */
  url?: string;
}

export interface DiscoveryResult {
  pairs: DiscoveredPair[];
  /** Total candidate log entries observed (pre-dedupe, sum across windows). */
  rawCount: number;
  source: DiscoverySourceMeta;
  /** True when the source signaled more data than it returned. Consumers
   *  should surface this honestly rather than imply chain-wide completeness. */
  truncated: boolean;
  /** Number of block-range windows that were queried to build this result. */
  windows: number;
  /** Number of HTTP requests issued (windows + any block-tip lookup). */
  requests: number;
}

export interface DiscoverySource {
  meta: DiscoverySourceMeta;
  discover(
    owner: Address,
    options?: { signal?: AbortSignal },
  ): Promise<DiscoveryResult>;
}

interface BlockscoutLogEntry {
  address?: string;
  topics?: readonly string[];
  blockNumber?: string;
}

interface BlockscoutLogsResponse {
  status?: string;
  message?: string;
  result?: BlockscoutLogEntry[] | string;
}

interface BlockscoutNumberResponse {
  status?: string;
  message?: string;
  result?: string;
}

/**
 * Tunables for the windowed logs fetcher. Deliberately small integer caps so
 * that browser memory and round-trip budget stay bounded even for wallets
 * with very long approval histories. See `createBlockscoutDiscoverySource`
 * for the adaptive windowing strategy that uses them.
 */
export interface DiscoveryLimits {
  /** Upper bound on HTTP requests issued per `discover()` call. */
  maxRequests: number;
  /** Upper bound on total raw log rows accumulated across windows. */
  maxRawLogs: number;
  /**
   * Blockscout's per-response row cap (getLogs truncation point). Responses
   * whose length meets or exceeds this value are treated as "may have more"
   * and trigger a window split.
   */
  pageCap: number;
  /**
   * Minimum block span before we stop splitting and accept a truncated
   * response. Protects against pathological deployments that always return
   * the cap regardless of range density.
   */
  minSplitSpan: number;
}

export const DEFAULT_DISCOVERY_LIMITS: DiscoveryLimits = {
  maxRequests: 40,
  maxRawLogs: 20_000,
  pageCap: 1000,
  minSplitSpan: 16,
};

function padTopicAddress(address: Address): string {
  // 20-byte address → 32-byte topic (left-pad with zeros, lowercase).
  return "0x" + address.slice(2).toLowerCase().padStart(64, "0");
}

function topicToAddress(topic: string): Address | null {
  if (!topic || topic.length !== 66 || !topic.startsWith("0x")) return null;
  const raw = "0x" + topic.slice(26);
  try {
    return getAddress(raw);
  } catch {
    return null;
  }
}

function safeChecksum(address: string): Address | null {
  try {
    return getAddress(address);
  } catch {
    return null;
  }
}

function dedupePairs(pairs: DiscoveredPair[]): DiscoveredPair[] {
  const seen = new Set<string>();
  const out: DiscoveredPair[] = [];
  for (const p of pairs) {
    const key = `${p.tokenAddress.toLowerCase()}-${p.spenderAddress.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/**
 * Blockscout / Etherscan-compatible logs discovery source.
 *
 * Queries historical ERC-20 `Approval` events where `owner == wallet`, then
 * returns the unique `(token, spender)` pairs. Coverage is bounded by the
 * indexer's logs endpoint (PulseScan currently returns at most ~1000 log
 * rows per call); we surface `truncated` honestly rather than claim chain-
 * wide coverage. Downstream code MUST re-check live `allowance(owner, spender)`
 * on-chain before displaying anything as an active approval.
 */
function parseHexNumber(value: string | undefined): bigint | null {
  if (!value || typeof value !== "string") return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function extractPairs(logs: readonly BlockscoutLogEntry[]): {
  pairs: DiscoveredPair[];
  maxBlock: bigint | null;
  minBlock: bigint | null;
} {
  const pairs: DiscoveredPair[] = [];
  let maxBlock: bigint | null = null;
  let minBlock: bigint | null = null;
  for (const log of logs) {
    const topics = log.topics;
    // ERC-20 Approval has exactly 3 topics (sig + 2 indexed args). ERC-721
    // Approval shares the same topic0 but carries 4 topics (tokenId is also
    // indexed); drop those here.
    if (topics && topics.length === 3) {
      const tokenRaw = log.address;
      const spenderRaw = topics[2];
      if (typeof tokenRaw === "string") {
        const tokenAddress = safeChecksum(tokenRaw);
        const spenderAddress = spenderRaw ? topicToAddress(spenderRaw) : null;
        if (tokenAddress && spenderAddress) {
          pairs.push({ tokenAddress, spenderAddress });
        }
      }
    }
    const block = parseHexNumber(log.blockNumber);
    if (block !== null) {
      if (maxBlock === null || block > maxBlock) maxBlock = block;
      if (minBlock === null || block < minBlock) minBlock = block;
    }
  }
  return { pairs, maxBlock, minBlock };
}

/**
 * Blockscout / Etherscan-compatible logs discovery source with adaptive
 * block-range windowing.
 *
 * Strategy:
 *   1. Issue a single `getLogs` call over `[0, latest]`.
 *   2. If the response is under `pageCap`, we're done.
 *   3. Otherwise fetch the current block tip once and recursively split the
 *      range in half, re-querying each half. Capped responses are discarded
 *      (so no overlap); uncapped responses have their rows collected.
 *   4. Stop early when `maxRequests`, `maxRawLogs`, or `minSplitSpan` limits
 *      are reached — and mark the result `truncated: true` so the UI can
 *      surface remaining coverage limits honestly.
 *
 * Live `allowance(owner, spender)` validation happens downstream; this layer
 * only returns unique candidate `(token, spender)` pairs.
 */
export function createBlockscoutDiscoverySource(
  apiUrl: string = DEFAULT_EXPLORER_API,
  limits: DiscoveryLimits = DEFAULT_DISCOVERY_LIMITS,
): DiscoverySource {
  const meta: DiscoverySourceMeta = {
    id: "blockscout-pulsescan",
    name: "PulseScan (Blockscout)",
    url: pulsechain.blockExplorers.default.url,
  };

  async function fetchLogs(
    owner: Address,
    fromBlock: string,
    toBlock: string,
    signal: AbortSignal | undefined,
  ): Promise<BlockscoutLogEntry[]> {
    const params = new URLSearchParams({
      module: "logs",
      action: "getLogs",
      fromBlock,
      toBlock,
      topic0: ERC20_APPROVAL_TOPIC0,
      topic1: padTopicAddress(owner),
      topic0_1_opr: "and",
    });
    const res = await fetch(`${apiUrl}?${params.toString()}`, {
      signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(
        `Discovery source returned HTTP ${res.status} ${res.statusText}`,
      );
    }
    const body = (await res.json()) as BlockscoutLogsResponse;
    return Array.isArray(body.result) ? body.result : [];
  }

  async function fetchBlockTip(
    signal: AbortSignal | undefined,
  ): Promise<bigint | null> {
    const params = new URLSearchParams({
      module: "block",
      action: "eth_block_number",
    });
    try {
      const res = await fetch(`${apiUrl}?${params.toString()}`, {
        signal,
        headers: { accept: "application/json" },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as BlockscoutNumberResponse;
      return parseHexNumber(body.result);
    } catch {
      return null;
    }
  }

  return {
    meta,
    async discover(owner, options) {
      const signal = options?.signal;

      // Pass 1: single full-range call. Most wallets resolve here in one RTT.
      const initial = await fetchLogs(owner, "0", "latest", signal);
      let requests = 1;
      let windows = 1;

      if (initial.length < limits.pageCap) {
        const { pairs } = extractPairs(initial);
        return {
          pairs: dedupePairs(pairs),
          rawCount: initial.length,
          source: meta,
          truncated: false,
          windows,
          requests,
        };
      }

      // Pass 2: we hit the page cap — discard the initial batch and split the
      // range. Fetch the chain tip once to bound the upper half. If the tip
      // lookup fails, fall back to the max block observed in the initial
      // response (better than nothing; just shifts the upper edge in).
      let tip = await fetchBlockTip(signal);
      requests += 1;
      if (tip === null) {
        const { maxBlock } = extractPairs(initial);
        tip = maxBlock;
      }
      if (tip === null) {
        // No usable upper bound — return the capped initial response rather
        // than loop forever. Honest `truncated: true` on the way out.
        const { pairs } = extractPairs(initial);
        return {
          pairs: dedupePairs(pairs),
          rawCount: initial.length,
          source: meta,
          truncated: true,
          windows,
          requests,
        };
      }

      const collected: BlockscoutLogEntry[] = [];
      let truncated = false;

      const stack: Array<{ from: bigint; to: bigint }> = [
        { from: 0n, to: tip },
      ];

      while (stack.length > 0) {
        if (requests >= limits.maxRequests) {
          truncated = true;
          break;
        }
        if (collected.length >= limits.maxRawLogs) {
          truncated = true;
          break;
        }

        const range = stack.pop()!;
        const logs = await fetchLogs(
          owner,
          range.from.toString(),
          range.to.toString(),
          signal,
        );
        requests += 1;
        windows += 1;

        const span = range.to - range.from;
        if (
          logs.length >= limits.pageCap &&
          span > BigInt(limits.minSplitSpan)
        ) {
          // Still capped and we have room to narrow — split in half and
          // discard this batch to avoid overlap when the halves are fetched.
          const mid = range.from + span / 2n;
          stack.push({ from: mid + 1n, to: range.to });
          stack.push({ from: range.from, to: mid });
          continue;
        }

        if (logs.length >= limits.pageCap) {
          // Pathological: a tight range still hits the cap. Accept what we
          // have but flag truncation.
          truncated = true;
        }

        const remaining = limits.maxRawLogs - collected.length;
        if (logs.length > remaining) {
          collected.push(...logs.slice(0, remaining));
          truncated = true;
        } else {
          collected.push(...logs);
        }
      }

      if (stack.length > 0) truncated = true;

      const { pairs } = extractPairs(collected);
      return {
        pairs: dedupePairs(pairs),
        rawCount: collected.length,
        source: meta,
        truncated,
        windows,
        requests,
      };
    },
  };
}

let cachedDefaultSource: DiscoverySource | null = null;

/**
 * Lazily-constructed default discovery source. Module-scoped caching keeps
 * the source stable across hook re-renders without pulling a runtime DI layer
 * into an otherwise small app.
 */
export function getDefaultDiscoverySource(): DiscoverySource {
  if (cachedDefaultSource) return cachedDefaultSource;
  const apiUrl =
    process.env.NEXT_PUBLIC_PULSECHAIN_EXPLORER_API || DEFAULT_EXPLORER_API;
  cachedDefaultSource = createBlockscoutDiscoverySource(apiUrl);
  return cachedDefaultSource;
}
