import { type Address, getAddress } from "viem";

import {
  getChainConfig,
  supportedChainConfigList,
  type DiscoverySourceConfig,
  type SupportedChainConfig,
} from "@/lib/chains";

/**
 * ERC-20 `Approval(address indexed owner, address indexed spender, uint256 value)`
 * event topic signature. Note that ERC-721's single-token `Approval` has the
 * same ABI signature hash but ships three indexed topics instead of two — we
 * disambiguate by topic count at extraction time.
 */
export const ERC20_APPROVAL_TOPIC0 =
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

/**
 * `ApprovalForAll(address indexed owner, address indexed operator, bool approved)`
 * event topic signature. Shared between ERC-721 and ERC-1155; we only
 * distinguish the underlying standard at the validation layer via
 * `supportsInterface`. Both indexed args are addresses, so topic count is 3.
 */
export const ERC_APPROVAL_FOR_ALL_TOPIC0 =
  "0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31";

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

export type NftApprovalKind = "approvalForAll" | "tokenApproval";

/**
 * Raw NFT approval candidate discovered from historical logs. As with
 * `DiscoveredPair` this carries no labels and no guarantee that the approval
 * is still active — live validation (`isApprovedForAll` / `getApproved`)
 * happens downstream in `@/lib/nft-approvals`.
 */
export interface NftDiscoveredApproval {
  kind: NftApprovalKind;
  collectionAddress: Address;
  operatorAddress: Address;
  /** Present only for per-token ERC-721 approvals (`kind === "tokenApproval"`). */
  tokenId?: bigint;
}

export interface DiscoverySourceMeta {
  /** Short machine-friendly identifier, used in dev/debug views. */
  id: string;
  /** Human-readable name of the source. */
  name: string;
  /** URL the user can visit to learn more about the source. */
  url?: string;
  /** Chain this source is bound to. */
  chainId: number;
}

interface WindowedFetchStats {
  /** Total candidate log entries observed (pre-dedupe, sum across windows). */
  rawCount: number;
  truncated: boolean;
  /** Number of block-range windows that were queried. */
  windows: number;
  /** Number of HTTP requests issued (windows + any block-tip lookup). */
  requests: number;
}

export interface DiscoveryResult extends WindowedFetchStats {
  pairs: DiscoveredPair[];
  source: DiscoverySourceMeta;
}

export interface NftDiscoveryResult extends WindowedFetchStats {
  approvals: NftDiscoveredApproval[];
  source: DiscoverySourceMeta;
}

export interface DiscoverySource {
  meta: DiscoverySourceMeta;
  discover(
    owner: Address,
    options?: { signal?: AbortSignal },
  ): Promise<DiscoveryResult>;
  discoverNftApprovals(
    owner: Address,
    options?: { signal?: AbortSignal },
  ): Promise<NftDiscoveryResult>;
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
 * with very long approval histories.
 */
export interface DiscoveryLimits {
  /** Upper bound on HTTP requests issued per `discover*()` call. */
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
  // Increased to reduce false negatives for long-lived wallets with large
  // approval histories across PulseChain/Ethereum.
  maxRequests: 120,
  maxRawLogs: 100_000,
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

function topicToBigInt(topic: string): bigint | null {
  if (!topic || typeof topic !== "string") return null;
  try {
    return BigInt(topic);
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

function parseHexNumber(value: string | undefined): bigint | null {
  if (!value || typeof value !== "string") return null;
  try {
    return BigInt(value);
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

function dedupeNftApprovals(
  items: NftDiscoveredApproval[],
): NftDiscoveredApproval[] {
  const seen = new Set<string>();
  const out: NftDiscoveredApproval[] = [];
  for (const a of items) {
    const idPart = a.kind === "tokenApproval" ? a.tokenId?.toString() : "all";
    const key = `${a.kind}:${a.collectionAddress.toLowerCase()}:${a.operatorAddress.toLowerCase()}:${idPart}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function buildLogsUrl(
  apiUrl: string,
  apiKey: string | undefined,
  queryParams: Record<string, string> | undefined,
  paddedOwner: string,
  topic0: string,
  fromBlock: string,
  toBlock: string,
  page: number,
  offset: number,
): string {
  const params = new URLSearchParams({
    module: "logs",
    action: "getLogs",
    fromBlock,
    toBlock,
    page: page.toString(),
    offset: offset.toString(),
    topic0,
    topic1: paddedOwner,
    topic0_1_opr: "and",
  });
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) params.set(k, v);
  }
  if (apiKey) params.set("apikey", apiKey);
  return `${apiUrl}?${params.toString()}`;
}

async function fetchLogsPage(
  apiUrl: string,
  apiKey: string | undefined,
  queryParams: Record<string, string> | undefined,
  paddedOwner: string,
  topic0: string,
  fromBlock: string,
  toBlock: string,
  page: number,
  offset: number,
  signal: AbortSignal | undefined,
): Promise<BlockscoutLogEntry[]> {
  const url = buildLogsUrl(
    apiUrl,
    apiKey,
    queryParams,
    paddedOwner,
    topic0,
    fromBlock,
    toBlock,
    page,
    offset,
  );
  const res = await fetch(url, {
    signal,
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(
      `Discovery source returned HTTP ${res.status} ${res.statusText}`,
    );
  }
  const body = (await res.json()) as BlockscoutLogsResponse;
  if (Array.isArray(body.result)) return body.result;

  const message = typeof body.result === "string" ? body.result : body.message;
  const lower = message?.toLowerCase() ?? "";
  const noRecords =
    lower.includes("no records") || lower.includes("no logs found");

  if (
    !noRecords &&
    (body.status === "0" || lower.includes("rate limit") || lower.includes("notok"))
  ) {
    throw new Error(
      `Discovery source rejected the request: ${message ?? "unknown explorer error"}`,
    );
  }

  return [];
}

async function fetchBlockTip(
  apiUrl: string,
  apiKey: string | undefined,
  queryParams: Record<string, string> | undefined,
  signal: AbortSignal | undefined,
): Promise<bigint | null> {
  // Use 'proxy' module for canonical eth_block_number on Etherscan/Blockscout.
  const params = new URLSearchParams({
    module: "proxy",
    action: "eth_block_number",
  });
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) params.set(k, v);
  }
  if (apiKey) params.set("apikey", apiKey);
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

function maxBlockFrom(logs: readonly BlockscoutLogEntry[]): bigint | null {
  let max: bigint | null = null;
  for (const log of logs) {
    const block = parseHexNumber(log.blockNumber);
    if (block === null) continue;
    if (max === null || block > max) max = block;
  }
  return max;
}

/**
 * Adaptive block-range windowed fetch of logs filtered by `topic0` and by
 * `topic1 === paddedOwner`. First tries `[0, latest]`; only splits when the
 * page cap is hit. Bounded by the supplied `limits`.
 */
async function windowedFetchLogs(
  apiUrl: string,
  apiKey: string | undefined,
  queryParams: Record<string, string> | undefined,
  paddedOwner: string,
  topic0: string,
  limits: DiscoveryLimits,
  signal: AbortSignal | undefined,
): Promise<{
  logs: BlockscoutLogEntry[];
  stats: WindowedFetchStats;
}> {
  const initial = await fetchLogsPage(
    apiUrl,
    apiKey,
    queryParams,
    paddedOwner,
    topic0,
    "0",
    "latest",
    1,
    limits.pageCap,
    signal,
  );
  let requests = 1;
  let windows = 1;

  if (initial.length < limits.pageCap) {
    return {
      logs: initial,
      stats: {
        rawCount: initial.length,
        truncated: false,
        windows,
        requests,
      },
    };
  }

  // Capped. Get the chain tip once so we can split the range.
  let tip = await fetchBlockTip(apiUrl, apiKey, queryParams, signal);
  requests += 1;
  if (tip === null) tip = maxBlockFrom(initial);
  if (tip === null) {
    return {
      logs: initial,
      stats: {
        rawCount: initial.length,
        truncated: true,
        windows,
        requests,
      },
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
    const logs = await fetchLogsPage(
      apiUrl,
      apiKey,
      queryParams,
      paddedOwner,
      topic0,
      range.from.toString(),
      range.to.toString(),
      1,
      limits.pageCap,
      signal,
    );
    requests += 1;
    windows += 1;

    const span = range.to - range.from;
    if (logs.length >= limits.pageCap && span > BigInt(limits.minSplitSpan)) {
      const mid = range.from + span / 2n;
      stack.push({ from: mid + 1n, to: range.to });
      stack.push({ from: range.from, to: mid });
      continue;
    }

    // If the response is capped but the range is already too narrow to split
    // further, page through this exact range to pull additional rows.
    if (logs.length >= limits.pageCap) {
      let page = 2;
      while (requests < limits.maxRequests && collected.length < limits.maxRawLogs) {
        const paged = await fetchLogsPage(
          apiUrl,
          apiKey,
          queryParams,
          paddedOwner,
          topic0,
          range.from.toString(),
          range.to.toString(),
          page,
          limits.pageCap,
          signal,
        );
        requests += 1;
        if (paged.length === 0) break;

        const remaining = limits.maxRawLogs - collected.length;
        if (paged.length > remaining) {
          collected.push(...paged.slice(0, remaining));
          truncated = true;
          break;
        }
        collected.push(...paged);

        if (paged.length < limits.pageCap) break;
        page += 1;
      }

      if (requests >= limits.maxRequests || collected.length >= limits.maxRawLogs) {
        truncated = true;
      }
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

  return {
    logs: collected,
    stats: {
      rawCount: collected.length,
      truncated,
      windows,
      requests,
    },
  };
}

function extractErc20Pairs(
  logs: readonly BlockscoutLogEntry[],
): DiscoveredPair[] {
  const pairs: DiscoveredPair[] = [];
  for (const log of logs) {
    const topics = log.topics;
    // ERC-20 Approval: 3 topics. ERC-721's per-token Approval shares the same
    // topic0 but ships 4 topics; drop those here — they're picked up by the
    // NFT pipeline instead.
    if (!topics || topics.length !== 3) continue;
    const tokenRaw = log.address;
    const spenderRaw = topics[2];
    if (typeof tokenRaw !== "string") continue;
    const tokenAddress = safeChecksum(tokenRaw);
    const spenderAddress = spenderRaw ? topicToAddress(spenderRaw) : null;
    if (!tokenAddress || !spenderAddress) continue;
    pairs.push({ tokenAddress, spenderAddress });
  }
  return pairs;
}

function extractNftApprovalForAll(
  logs: readonly BlockscoutLogEntry[],
): NftDiscoveredApproval[] {
  const out: NftDiscoveredApproval[] = [];
  for (const log of logs) {
    const topics = log.topics;
    // ApprovalForAll: 3 indexed topics (sig + owner + operator). We don't
    // distinguish `approved=true` vs `approved=false` here — the live
    // `isApprovedForAll` check filters inactive ones downstream.
    if (!topics || topics.length !== 3) continue;
    const collectionRaw = log.address;
    const operatorRaw = topics[2];
    if (typeof collectionRaw !== "string") continue;
    const collectionAddress = safeChecksum(collectionRaw);
    const operatorAddress = operatorRaw ? topicToAddress(operatorRaw) : null;
    if (!collectionAddress || !operatorAddress) continue;
    out.push({
      kind: "approvalForAll",
      collectionAddress,
      operatorAddress,
    });
  }
  return out;
}

function extractErc721TokenApprovals(
  logs: readonly BlockscoutLogEntry[],
): NftDiscoveredApproval[] {
  const out: NftDiscoveredApproval[] = [];
  for (const log of logs) {
    const topics = log.topics;
    // ERC-721 per-token Approval: 4 topics (sig + owner + approved + tokenId).
    if (!topics || topics.length !== 4) continue;
    const collectionRaw = log.address;
    const operatorRaw = topics[2];
    const tokenIdRaw = topics[3];
    if (typeof collectionRaw !== "string") continue;
    const collectionAddress = safeChecksum(collectionRaw);
    const operatorAddress = operatorRaw ? topicToAddress(operatorRaw) : null;
    const tokenId = tokenIdRaw ? topicToBigInt(tokenIdRaw) : null;
    if (!collectionAddress || !operatorAddress || tokenId === null) continue;
    out.push({
      kind: "tokenApproval",
      collectionAddress,
      operatorAddress,
      tokenId,
    });
  }
  return out;
}

function mergeStats(
  a: WindowedFetchStats,
  b: WindowedFetchStats,
): WindowedFetchStats {
  return {
    rawCount: a.rawCount + b.rawCount,
    truncated: a.truncated || b.truncated,
    windows: a.windows + b.windows,
    requests: a.requests + b.requests,
  };
}

export interface BlockscoutDiscoveryOptions {
  chainId: number;
  source: DiscoverySourceConfig;
  limits?: DiscoveryLimits;
}

/**
 * Blockscout / Etherscan-compatible logs discovery source with adaptive
 * block-range windowing. See `windowedFetchLogs` for the recursion
 * strategy and the `DiscoveryLimits` tunables that bound it.
 *
 * Two independent entry points:
 *   - `discover(owner)`         — ERC-20 approval pairs
 *   - `discoverNftApprovals(owner)` — ERC-721 / ERC-1155 operator approvals
 *     (collection-wide `ApprovalForAll` + ERC-721 per-token `Approval`)
 *
 * Downstream code MUST re-check live state on-chain
 * (`allowance` / `isApprovedForAll` / `getApproved`) before displaying
 * anything as an active approval.
 */
export function createBlockscoutDiscoverySource({
  chainId,
  source,
  limits = DEFAULT_DISCOVERY_LIMITS,
}: BlockscoutDiscoveryOptions): DiscoverySource {
  const meta: DiscoverySourceMeta = {
    id: source.id,
    name: source.name,
    url: source.url,
    chainId,
  };
  const { apiUrl, apiKey } = source;
  const queryParams = source.queryParams;

  return {
    meta,
    async discover(owner, options) {
      const padded = padTopicAddress(owner);
      const { logs, stats } = await windowedFetchLogs(
        apiUrl,
        apiKey,
        queryParams,
        padded,
        ERC20_APPROVAL_TOPIC0,
        limits,
        options?.signal,
      );
      return {
        pairs: dedupePairs(extractErc20Pairs(logs)),
        source: meta,
        ...stats,
      };
    },

    async discoverNftApprovals(owner, options) {
      const padded = padTopicAddress(owner);
      const [forAll, perToken] = await Promise.all([
        windowedFetchLogs(
          apiUrl,
          apiKey,
          queryParams,
          padded,
          ERC_APPROVAL_FOR_ALL_TOPIC0,
          limits,
          options?.signal,
        ),
        windowedFetchLogs(
          apiUrl,
          apiKey,
          queryParams,
          padded,
          ERC20_APPROVAL_TOPIC0,
          limits,
          options?.signal,
        ),
      ]);

      const candidates: NftDiscoveredApproval[] = [
        ...extractNftApprovalForAll(forAll.logs),
        ...extractErc721TokenApprovals(perToken.logs),
      ];

      return {
        approvals: dedupeNftApprovals(candidates),
        source: meta,
        ...mergeStats(forAll.stats, perToken.stats),
      };
    },
  };
}

/**
 * Per-chain cache of discovery sources. Module-scoped caching keeps sources
 * stable across hook re-renders without pulling a runtime DI layer into an
 * otherwise small app.
 */
const sourceCache = new Map<number, DiscoverySource>();

function buildSourceForConfig(config: SupportedChainConfig): DiscoverySource {
  return createBlockscoutDiscoverySource({
    chainId: config.chainId,
    source: config.discovery,
  });
}

/** Returns the discovery source for a supported chain, or `undefined`. */
export function getDiscoverySourceForChain(
  chainId: number | undefined,
): DiscoverySource | undefined {
  const config = getChainConfig(chainId);
  if (!config) return undefined;
  const cached = sourceCache.get(config.chainId);
  if (cached) return cached;
  const source = buildSourceForConfig(config);
  sourceCache.set(config.chainId, source);
  return source;
}

/**
 * Stable default source for code paths that don't yet know a chain — returns
 * the first configured supported chain (currently PulseChain). Prefer
 * `getDiscoverySourceForChain(chainId)` when a chain is available.
 */
export function getDefaultDiscoverySource(): DiscoverySource {
  const first = supportedChainConfigList[0];
  return (
    getDiscoverySourceForChain(first.chainId) ?? buildSourceForConfig(first)
  );
}
