import { getAddress, isAddress, type Address } from "viem";

import type {
  TokenContractHistoryCall,
  TokenContractLiquidityPair,
  TokenContractOwnershipTransfer,
  TokenContractReportModule,
  TokenContractResolvedSelector,
} from "@/lib/token-contract-report";

const LIVE_EVIDENCE_TIMEOUT_MS = 8_000;
const HISTORY_LIMIT = 50;
const HOLDER_LIMIT = 10;
const PAIR_LIMIT = 3;
const EVENT_LIMIT = 50;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const OWNERSHIP_TRANSFERRED_TOPIC =
  "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0";

export interface TokenContractLiveEvidenceChain {
  chainId: number;
  name: string;
  apiUrl: string;
  apiKind: "etherscan-v2" | "blockscout-compatible";
  apiChainId?: string;
  apiKey?: string;
  dexScreenerSlug: string | null;
}

export interface TokenContractHistoryResult {
  inspectedTransactions: number;
  decodedCalls: TokenContractHistoryCall[];
  postOwnershipZeroActivity: boolean | null;
  limitations: string[];
  module: TokenContractReportModule;
}

export interface TokenContractLiquidityResult {
  pairs: TokenContractLiquidityPair[];
  limitations: string[];
  module: TokenContractReportModule;
}

export interface TokenContractHolderResult {
  holders: Address[];
  limitations: string[];
}

export interface TokenContractEventResult {
  holderCandidates: Address[];
  ownershipTransfers: TokenContractOwnershipTransfer[];
  initialMintAmount: string | null;
  initialMintRecipients: Address[];
  initialMintTransactionHash: `0x${string}` | null;
  initialMintBlockNumber: number | null;
  limitations: string[];
}

interface ExplorerLog {
  transactionHash: `0x${string}`;
  blockNumber: number | null;
  logIndex: number | null;
  topics: `0x${string}`[];
  data: `0x${string}`;
}

export interface TokenContractRpcLog {
  transactionHash: `0x${string}`;
  blockNumber: number | null;
  logIndex: number | null;
  topics: `0x${string}`[];
  data: `0x${string}`;
}

export type TokenContractRpcLogFetcher = (args: {
  contractAddress: Address;
  topic0: `0x${string}`;
  creationBlockNumber: number | null;
}) => Promise<TokenContractRpcLog[]>;

interface ExplorerTransaction {
  hash: `0x${string}`;
  blockNumber: number | null;
  timestamp: string | null;
  from: Address | null;
  input: `0x${string}` | null;
  success: boolean | null;
}

export async function fetchTokenContractHistory({
  contractAddress,
  chain,
  selectors,
  fetcher,
  signal,
}: {
  contractAddress: Address;
  chain: TokenContractLiveEvidenceChain;
  selectors: TokenContractResolvedSelector[];
  fetcher: typeof fetch;
  signal?: AbortSignal;
}): Promise<TokenContractHistoryResult> {
  const limitations: string[] = [];
  try {
    const response = await fetchWithTimeout(
      fetcher(historyUrl(contractAddress, chain), {
        method: "GET",
        cache: "no-store",
        headers: { accept: "application/json" },
        signal,
      }),
      `${chain.name} contract history timed out`,
    );
    if (!response.ok) {
      throw new Error(`explorer returned HTTP ${response.status}`);
    }
    const body = (await response.json()) as unknown;
    const transactions = parseExplorerTransactions(body, chain.apiKind).slice(
      0,
      HISTORY_LIMIT,
    );
    const selectorMap = new Map(
      selectors.map((selector) => [selector.selector, selector.signature]),
    );
    const renounceBlock = transactions
      .filter(
        (transaction) =>
          transaction.input?.slice(0, 10).toLowerCase() === "0x715018a6" &&
          transaction.success !== false,
      )
      .reduce<number | null>(
        (earliest, transaction) =>
          transaction.blockNumber !== null &&
          (earliest === null || transaction.blockNumber < earliest)
            ? transaction.blockNumber
            : earliest,
        null,
      );
    const decodedCalls = transactions
      .filter((transaction) => transaction.input && transaction.input.length >= 10)
      .map((transaction): TokenContractHistoryCall => {
        const selector = transaction.input!.slice(0, 10).toLowerCase() as `0x${string}`;
        const signature = selectorMap.get(selector) ?? null;
        return {
          transactionHash: transaction.hash,
          blockNumber: transaction.blockNumber,
          timestamp: transaction.timestamp,
          from: transaction.from,
          selector,
          signature,
          success: transaction.success,
          afterOwnershipZero:
            renounceBlock !== null && transaction.blockNumber !== null
              ? transaction.blockNumber > renounceBlock
              : null,
        };
      })
      .slice(0, HISTORY_LIMIT);
    const postOwnershipZeroActivity =
      renounceBlock === null
        ? null
        : decodedCalls.some(
            (call) =>
              call.afterOwnershipZero === true &&
              call.success !== false &&
              call.selector !== "0x095ea7b3" &&
              call.selector !== "0xa9059cbb" &&
              call.selector !== "0x23b872dd" &&
              Boolean(
                call.signature?.match(
                  /owner|admin|role|auth|operator|approv|block|black|white|freeze|pause|mint|fee|tax|trading|upgrade/i,
                ),
              ),
          );
    if (transactions.length === HISTORY_LIMIT) {
      limitations.push(
        `Only the ${HISTORY_LIMIT} most recent contract transactions were inspected.`,
      );
    }

    return {
      inspectedTransactions: transactions.length,
      decodedCalls,
      postOwnershipZeroActivity,
      limitations,
      module: {
        id: "history",
        label: "Contract history",
        status: "complete",
        evidenceCount: decodedCalls.length,
        summary: `Inspected ${transactions.length} recent contract transactions and decoded ${decodedCalls.length} calls.`,
        warnings: limitations,
      },
    };
  } catch (error) {
    const message = `${chain.name} history unavailable: ${safeError(error)}`;
    return {
      inspectedTransactions: 0,
      decodedCalls: [],
      postOwnershipZeroActivity: null,
      limitations: [message],
      module: {
        id: "history",
        label: "Contract history",
        status: "unavailable",
        evidenceCount: 0,
        summary: "Recent contract calls could not be inspected.",
        warnings: [message],
      },
    };
  }
}

export async function fetchTokenLiquidity({
  contractAddress,
  chain,
  fetcher,
  signal,
}: {
  contractAddress: Address;
  chain: TokenContractLiveEvidenceChain;
  fetcher: typeof fetch;
  signal?: AbortSignal;
}): Promise<TokenContractLiquidityResult> {
  if (!chain.dexScreenerSlug) {
    const limitation = "DEX Screener does not have a configured slug for this chain.";
    return unavailableLiquidity(limitation);
  }

  try {
    const response = await fetchWithTimeout(
      fetcher(
        `https://api.dexscreener.com/tokens/v1/${encodeURIComponent(
          chain.dexScreenerSlug,
        )}/${contractAddress}`,
        {
          method: "GET",
          cache: "no-store",
          headers: { accept: "application/json" },
          signal,
        },
      ),
      "DEX pair discovery timed out",
    );
    if (!response.ok) throw new Error(`DEX Screener returned HTTP ${response.status}`);
    const body = (await response.json()) as unknown;
    const pairs = parseDexPairs(body, chain.dexScreenerSlug).slice(0, PAIR_LIMIT);
    const limitations = [
      "DEX pair discovery does not prove LP ownership, lock duration, or removable liquidity.",
    ];
    return {
      pairs,
      limitations,
      module: {
        id: "liquidity",
        label: "DEX liquidity",
        status: pairs.length > 0 ? "partial" : "complete",
        evidenceCount: pairs.length,
        summary:
          pairs.length > 0
            ? `Found ${pairs.length} bounded DEX pair candidate${pairs.length === 1 ? "" : "s"}. LP custody remains unresolved.`
            : "No DEX pair was returned by the configured provider.",
        warnings: limitations,
      },
    };
  } catch (error) {
    return unavailableLiquidity(`DEX pair discovery unavailable: ${safeError(error)}`);
  }
}

export async function fetchTokenHolders({
  contractAddress,
  chain,
  fetcher,
  signal,
}: {
  contractAddress: Address;
  chain: TokenContractLiveEvidenceChain;
  fetcher: typeof fetch;
  signal?: AbortSignal;
}): Promise<TokenContractHolderResult> {
  if (chain.apiKind !== "blockscout-compatible") {
    return {
      holders: [],
      limitations: [
        "The configured explorer does not expose the bounded Blockscout token-holder endpoint; bounded Transfer-event candidates are used when available.",
      ],
    };
  }
  try {
    const response = await fetchWithTimeout(
      fetcher(blockscoutV2Url(chain.apiUrl, ["tokens", contractAddress, "holders"]), {
        method: "GET",
        cache: "no-store",
        headers: { accept: "application/json" },
        signal,
      }),
      `${chain.name} token-holder lookup timed out`,
    );
    if (!response.ok) throw new Error(`explorer returned HTTP ${response.status}`);
    const body = (await response.json()) as { items?: unknown };
    const items = Array.isArray(body.items) ? body.items : [];
    const holders = items
      .map((item) => addressFromUnknown(item))
      .filter((address): address is Address => address !== null)
      .slice(0, HOLDER_LIMIT);
    return {
      holders,
      limitations:
        holders.length === HOLDER_LIMIT
          ? [`Only the first ${HOLDER_LIMIT} explorer holder candidates were retained.`]
          : [],
    };
  } catch (error) {
    return {
      holders: [],
      limitations: [`Token-holder lookup unavailable: ${safeError(error)}`],
    };
  }
}

export async function fetchTokenContractEvents({
  contractAddress,
  chain,
  fetcher,
  signal,
  creationBlockNumber,
  rpcLogFetcher,
}: {
  contractAddress: Address;
  chain: TokenContractLiveEvidenceChain;
  fetcher: typeof fetch;
  signal?: AbortSignal;
  creationBlockNumber?: number | null;
  rpcLogFetcher?: TokenContractRpcLogFetcher;
}): Promise<TokenContractEventResult> {
  const limitations: string[] = [];
  let blockscoutLogs: Promise<ExplorerLog[]> | null = null;
  const fetchBlockscoutLogs = () => {
    blockscoutLogs ??= (async () => {
      const response = await fetchWithTimeout(
        fetcher(blockscoutV2Url(chain.apiUrl, ["addresses", contractAddress, "logs"]), {
          method: "GET",
          cache: "no-store",
          headers: { accept: "application/json" },
          signal,
        }),
        `${chain.name} Blockscout v2 event lookup timed out`,
      );
      if (!response.ok) throw new Error(`Blockscout v2 returned HTTP ${response.status}`);
      return parseExplorerLogs((await response.json()) as unknown);
    })();
    return blockscoutLogs;
  };
  const results = await Promise.allSettled(
    [TRANSFER_TOPIC, OWNERSHIP_TRANSFERRED_TOPIC].map(async (topic) => {
      let primaryError: unknown = null;
      try {
        const response = await fetchWithTimeout(
          fetcher(
            logsUrl(contractAddress, chain, topic, creationBlockNumber ?? 0),
            {
              method: "GET",
              cache: "no-store",
              headers: { accept: "application/json" },
              signal,
            },
          ),
          `${chain.name} event lookup timed out`,
        );
        if (!response.ok) throw new Error(`explorer returned HTTP ${response.status}`);
        return parseExplorerLogs((await response.json()) as unknown);
      } catch (error) {
        primaryError = error;
      }

      const fallbackLogs: ExplorerLog[] = [];
      if (chain.apiKind === "blockscout-compatible") {
        try {
          const fallback = (await fetchBlockscoutLogs()).filter(
            (log) => log.topics[0]?.toLowerCase() === topic.toLowerCase(),
          );
          if (fallback.length > 0) {
            limitations.push(
              `${topic === TRANSFER_TOPIC ? "Transfer" : "Ownership"} events used the Blockscout v2 address-log fallback after the legacy explorer request failed.`,
            );
            fallbackLogs.push(...fallback);
          }
        } catch (error) {
          primaryError = new Error(
            `${safeError(primaryError)}; Blockscout v2 fallback: ${safeError(error)}`,
          );
        }
      }

      if (rpcLogFetcher) {
        try {
          const fallback = await rpcLogFetcher({
            contractAddress,
            topic0: topic as `0x${string}`,
            creationBlockNumber: creationBlockNumber ?? null,
          });
          if (fallback.length > 0) {
            limitations.push(
              `${topic === TRANSFER_TOPIC ? "Transfer" : "Ownership"} events used a bounded RPC eth_getLogs fallback after explorer lookups were incomplete.`,
            );
            fallbackLogs.push(...fallback);
          }
        } catch (error) {
          primaryError = new Error(
            `${safeError(primaryError)}; RPC fallback: ${safeError(error)}`,
          );
        }
      }
      if (fallbackLogs.length > 0) {
        return Array.from(
          new Map(
            fallbackLogs.map((log) => [
              `${log.transactionHash}:${log.logIndex ?? -1}`,
              log,
            ]),
          ).values(),
        ).slice(0, EVENT_LIMIT);
      }
      throw primaryError ?? new Error("event lookup returned no usable result");
    }),
  );
  const transferLogs =
    results[0]?.status === "fulfilled" ? results[0].value : [];
  const ownershipLogs =
    results[1]?.status === "fulfilled" ? results[1].value : [];
  if (results[0]?.status === "rejected") {
    limitations.push(
      `Transfer-event lookup unavailable: ${safeError(results[0].reason)}`,
    );
  }
  if (results[1]?.status === "rejected") {
    limitations.push(
      `Ownership-event lookup unavailable: ${safeError(results[1].reason)}`,
    );
  }

  const transfers = transferLogs
    .map((log) => ({
      log,
      from: indexedAddress(log.topics[1]),
      to: indexedAddress(log.topics[2]),
      amount: uint256(log.data),
    }))
    .filter(
      (event): event is {
        log: ExplorerLog;
        from: Address;
        to: Address;
        amount: bigint;
      } => event.from !== null && event.to !== null && event.amount !== null,
    )
    .sort(compareLogs);
  const initialMint = transfers.find(
    (event) => event.from.toLowerCase() === ZERO_ADDRESS,
  );
  const initialMintEvents = initialMint
    ? transfers.filter(
        (event) =>
          event.from.toLowerCase() === ZERO_ADDRESS &&
          event.log.transactionHash === initialMint.log.transactionHash,
      )
    : [];
  const holderCandidates = Array.from(
    new Set(
      transfers.flatMap((event) => [event.from, event.to]).filter(
        (address) => address.toLowerCase() !== ZERO_ADDRESS,
      ),
    ),
  ).slice(0, HOLDER_LIMIT);
  const ownershipTransfers = ownershipLogs
    .map((log): TokenContractOwnershipTransfer | null => {
      const previousOwner = indexedAddress(log.topics[1]);
      const newOwner = indexedAddress(log.topics[2]);
      if (!previousOwner || !newOwner) return null;
      return {
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        previousOwner,
        newOwner,
        renounced: newOwner.toLowerCase() === ZERO_ADDRESS,
      };
    })
    .filter(
      (event): event is TokenContractOwnershipTransfer => event !== null,
    )
    .sort((left, right) =>
      (left.blockNumber ?? Number.MAX_SAFE_INTEGER) -
      (right.blockNumber ?? Number.MAX_SAFE_INTEGER),
    );

  if (transferLogs.length === EVENT_LIMIT) {
    limitations.push(
      `Only ${EVENT_LIMIT} Transfer events near deployment were inspected.`,
    );
  }
  if (ownershipLogs.length === EVENT_LIMIT) {
    limitations.push(
      `Only ${EVENT_LIMIT} ownership events were inspected.`,
    );
  }
  return {
    holderCandidates,
    ownershipTransfers,
    initialMintAmount:
      initialMintEvents.length > 0
        ? initialMintEvents
            .reduce((total, event) => total + event.amount, 0n)
            .toString()
        : null,
    initialMintRecipients: Array.from(
      new Set(initialMintEvents.map((event) => event.to)),
    ),
    initialMintTransactionHash: initialMint?.log.transactionHash ?? null,
    initialMintBlockNumber: initialMint?.log.blockNumber ?? null,
    limitations,
  };
}

function historyUrl(address: Address, chain: TokenContractLiveEvidenceChain) {
  if (chain.apiKind === "blockscout-compatible") {
    const url = new URL(blockscoutV2Url(chain.apiUrl, ["addresses", address, "transactions"]));
    url.searchParams.set("filter", "to");
    return url.toString();
  }
  const url = new URL(chain.apiUrl);
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "txlist");
  url.searchParams.set("address", address);
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", HISTORY_LIMIT.toString());
  url.searchParams.set("sort", "desc");
  if (chain.apiChainId) url.searchParams.set("chainid", chain.apiChainId);
  if (chain.apiKey) url.searchParams.set("apikey", chain.apiKey);
  return url.toString();
}

function logsUrl(
  address: Address,
  chain: TokenContractLiveEvidenceChain,
  topic0: string,
  fromBlock: number,
) {
  const url = new URL(chain.apiUrl);
  url.searchParams.set("module", "logs");
  url.searchParams.set("action", "getLogs");
  url.searchParams.set("address", address);
  url.searchParams.set("fromBlock", String(fromBlock));
  url.searchParams.set("toBlock", "latest");
  url.searchParams.set("topic0", topic0);
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", String(EVENT_LIMIT));
  if (chain.apiChainId) url.searchParams.set("chainid", chain.apiChainId);
  if (chain.apiKey) url.searchParams.set("apikey", chain.apiKey);
  return url.toString();
}

function parseExplorerLogs(body: unknown): ExplorerLog[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  const record = body as Record<string, unknown>;
  const rows = Array.isArray(record.result) ? record.result : record.items;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((value): ExplorerLog | null => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const row = value as Record<string, unknown>;
      const transactionHash = txHash(row.transactionHash ?? row.transaction_hash);
      const data = hexInput(row.data);
      const topics = Array.isArray(row.topics)
        ? row.topics
            .map((topic) => hexInput(topic))
            .filter((topic): topic is `0x${string}` => topic !== null)
        : [];
      if (!transactionHash || !data || topics.length === 0) return null;
      return {
        transactionHash,
        blockNumber: integer(row.blockNumber ?? row.block_number ?? row.block),
        logIndex: integer(row.logIndex ?? row.log_index ?? row.index),
        topics,
        data,
      };
    })
    .filter((log): log is ExplorerLog => log !== null)
    .slice(0, EVENT_LIMIT);
}

function indexedAddress(topic: `0x${string}` | undefined): Address | null {
  if (!topic || !/^0x[0-9a-f]{64}$/i.test(topic)) return null;
  return normalizedAddress(`0x${topic.slice(-40)}`);
}

function uint256(data: `0x${string}`): bigint | null {
  if (!/^0x[0-9a-f]{1,64}$/i.test(data)) return null;
  try {
    return BigInt(data);
  } catch {
    return null;
  }
}

function compareLogs(
  left: { log: ExplorerLog },
  right: { log: ExplorerLog },
) {
  return (
    (left.log.blockNumber ?? Number.MAX_SAFE_INTEGER) -
      (right.log.blockNumber ?? Number.MAX_SAFE_INTEGER) ||
    (left.log.logIndex ?? Number.MAX_SAFE_INTEGER) -
      (right.log.logIndex ?? Number.MAX_SAFE_INTEGER)
  );
}

function parseExplorerTransactions(
  body: unknown,
  kind: TokenContractLiveEvidenceChain["apiKind"],
): ExplorerTransaction[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  const record = body as Record<string, unknown>;
  const rows =
    kind === "blockscout-compatible"
      ? Array.isArray(record.items)
        ? record.items
        : []
      : Array.isArray(record.result)
        ? record.result
        : [];
  return rows
    .map((row) => normalizeTransaction(row))
    .filter((row): row is ExplorerTransaction => row !== null)
    .sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0));
}

function normalizeTransaction(value: unknown): ExplorerTransaction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const hash = txHash(row.hash ?? row.transaction_hash);
  if (!hash) return null;
  const input = hexInput(row.raw_input ?? row.input);
  return {
    hash,
    blockNumber: integer(row.block_number ?? row.blockNumber ?? row.block),
    timestamp: timestamp(row.timestamp ?? row.timeStamp),
    from: nestedAddress(row.from),
    input,
    success: successValue(row),
  };
}

function successValue(row: Record<string, unknown>): boolean | null {
  const isError = textValue(row.isError);
  if (isError === "0") return true;
  if (isError === "1") return false;
  const status = textValue(row.status ?? row.txreceipt_status)?.toLowerCase();
  if (!status) return null;
  if (["ok", "success", "1", "0x1"].includes(status)) return true;
  if (["error", "failed", "reverted", "0", "0x0"].includes(status)) return false;
  return null;
}

function parseDexPairs(body: unknown, chainSlug: string): TokenContractLiquidityPair[] {
  if (!Array.isArray(body)) return [];
  return body
    .map((value): TokenContractLiquidityPair | null => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return null;
      const pair = value as Record<string, unknown>;
      const pairAddress = normalizedAddress(pair.pairAddress);
      if (!pairAddress) return null;
      const baseToken = objectValue(pair.baseToken);
      const quoteToken = objectValue(pair.quoteToken);
      const liquidity = objectValue(pair.liquidity);
      const liquidityUsd = numberValue(liquidity?.usd);
      const url = textValue(pair.url);
      return {
        chainSlug,
        dexId: textValue(pair.dexId),
        pairAddress,
        baseTokenAddress: normalizedAddress(baseToken?.address),
        quoteTokenAddress: normalizedAddress(quoteToken?.address),
        liquidityUsd,
        url: url?.startsWith("https://dexscreener.com/") ? url : null,
      };
    })
    .filter((pair): pair is TokenContractLiquidityPair => pair !== null)
    .sort((a, b) => (b.liquidityUsd ?? -1) - (a.liquidityUsd ?? -1));
}

function unavailableLiquidity(limitation: string): TokenContractLiquidityResult {
  return {
    pairs: [],
    limitations: [limitation],
    module: {
      id: "liquidity",
      label: "DEX liquidity",
      status: "unavailable",
      evidenceCount: 0,
      summary: "DEX pair candidates could not be collected.",
      warnings: [limitation],
    },
  };
}

function blockscoutV2Url(apiUrl: string, segments: readonly string[]) {
  const url = new URL(apiUrl);
  const basePath = url.pathname.replace(/\/+$/, "").replace(/\/api(?:\/v\d+)?$/i, "");
  url.pathname = `${basePath}/api/v2/${segments
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
  url.search = "";
  return url.toString();
}

function addressFromUnknown(value: unknown): Address | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  return nestedAddress(item.address ?? item.holder ?? item.holder_address_hash);
}

function nestedAddress(value: unknown): Address | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return normalizedAddress((value as Record<string, unknown>).hash);
  }
  return normalizedAddress(value);
}

function normalizedAddress(value: unknown): Address | null {
  const text = textValue(value);
  return text && isAddress(text) ? getAddress(text) : null;
}

function txHash(value: unknown): `0x${string}` | null {
  const text = textValue(value);
  return text && /^0x[0-9a-f]{64}$/i.test(text)
    ? (text.toLowerCase() as `0x${string}`)
    : null;
}

function hexInput(value: unknown): `0x${string}` | null {
  const text = textValue(value);
  return text && /^0x[0-9a-f]*$/i.test(text)
    ? (text.toLowerCase() as `0x${string}`)
    : null;
}

function integer(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(textValue(value));
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function timestamp(value: unknown): string | null {
  const text = textValue(value);
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const milliseconds = Number(text) * 1_000;
    return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
  }
  const milliseconds = Date.parse(text);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(textValue(value));
  return Number.isFinite(number) ? number : null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text || null;
}

async function fetchWithTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), LIVE_EVIDENCE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/([?&](?:api_?key|apikey|key)=)[^&\s)]+/gi, "$1[redacted]")
    .slice(0, 240);
}
