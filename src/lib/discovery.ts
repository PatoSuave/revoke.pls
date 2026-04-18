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
  /** Total candidate log entries observed (pre-dedupe). */
  rawCount: number;
  source: DiscoverySourceMeta;
  /** True when the source signaled more data than it returned. Consumers
   *  should surface this honestly rather than imply chain-wide completeness. */
  truncated: boolean;
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
}

interface BlockscoutLogsResponse {
  status?: string;
  message?: string;
  result?: BlockscoutLogEntry[] | string;
}

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
export function createBlockscoutDiscoverySource(
  apiUrl: string = DEFAULT_EXPLORER_API,
): DiscoverySource {
  const meta: DiscoverySourceMeta = {
    id: "blockscout-pulsescan",
    name: "PulseScan (Blockscout)",
    url: pulsechain.blockExplorers.default.url,
  };

  return {
    meta,
    async discover(owner, options) {
      const params = new URLSearchParams({
        module: "logs",
        action: "getLogs",
        fromBlock: "0",
        toBlock: "latest",
        topic0: ERC20_APPROVAL_TOPIC0,
        topic1: padTopicAddress(owner),
        topic0_1_opr: "and",
      });

      const url = `${apiUrl}?${params.toString()}`;
      const res = await fetch(url, {
        signal: options?.signal,
        headers: { accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(
          `Discovery source returned HTTP ${res.status} ${res.statusText}`,
        );
      }

      const body = (await res.json()) as BlockscoutLogsResponse;

      // Blockscout returns `status: "0"` with `message: "No records found"`
      // when the wallet has no Approval history. That's a clean empty result,
      // not an error.
      const result = body.result;
      if (!Array.isArray(result)) {
        return {
          pairs: [],
          rawCount: 0,
          source: meta,
          truncated: false,
        };
      }

      const pairs: DiscoveredPair[] = [];
      for (const log of result) {
        const topics = log.topics;
        // ERC-20 Approval has exactly 3 topics (sig + 2 indexed args). ERC-721
        // Approval shares the same topic0 but carries 4 topics (tokenId is
        // also indexed); drop those here.
        if (!topics || topics.length !== 3) continue;
        const tokenRaw = log.address;
        const spenderRaw = topics[2];
        if (typeof tokenRaw !== "string") continue;
        const tokenAddress = safeChecksum(tokenRaw);
        const spenderAddress = spenderRaw ? topicToAddress(spenderRaw) : null;
        if (!tokenAddress || !spenderAddress) continue;
        pairs.push({ tokenAddress, spenderAddress });
      }

      return {
        pairs: dedupePairs(pairs),
        rawCount: result.length,
        source: meta,
        // PulseScan's Etherscan-compatible logs endpoint caps responses at
        // 1000 rows. If we hit the cap we can't prove chain-wide completeness.
        truncated: result.length >= 1000,
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
