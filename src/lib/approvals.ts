import type { Address } from "viem";

import type { SupportedChainId } from "@/lib/chains";
import type { DiscoveredPair } from "@/lib/discovery";
import { erc20Abi, formatAllowance, isUnlimitedAllowance } from "@/lib/erc20";
import {
  getSpenderEntry,
  getTokenEntry,
  type SpenderCategory,
  type SpenderEntry,
  type TokenCategory,
  type TokenEntry,
} from "@/lib/registry";
import { shortenAddress } from "@/lib/format";

/**
 * Flat representation of a single positive ERC-20 approval. This is the
 * base scan-result model — presentation enrichment (risk classification,
 * etc.) lives in `@/lib/risk`.
 */
export interface Approval {
  key: string;
  /** Chain the approval lives on. Needed for explorer links and to route
   *  the revoke write to the correct chain. */
  chainId: number;
  tokenAddress: Address;
  tokenSymbol: string;
  tokenName?: string;
  tokenDecimals: number | null;
  tokenCategory: TokenCategory;
  spenderAddress: Address;
  spenderLabel: string;
  protocol: string;
  spenderCategory: SpenderCategory;
  /** Mirrors `SpenderEntry.isTrusted` — carried here so downstream code
   * doesn't have to re-resolve the spender via the registry. */
  trusted: boolean;
  spenderUrl?: string;
  spenderNotes?: string;
  /** Mirrors `SpenderEntry.verificationMethod`. Surfaced in UI tooltips
   * as the source of any "known / trusted" claim. */
  spenderVerificationMethod?: string;
  rawAllowance: bigint;
  formattedAllowance: string;
  unlimited: boolean;
}

const METADATA_CALLS_PER_TOKEN = 3; // symbol, decimals, name
const MAX_FAILURE_SAMPLES = 6;

/**
 * Number of wagmi `useReadContracts` entries produced per token in the
 * registry: 3 metadata calls plus one allowance read per registered spender.
 */
export function readsPerToken(spenderCount: number): number {
  return METADATA_CALLS_PER_TOKEN + spenderCount;
}

/**
 * Build the flat array of contract read configs passed to
 * `useReadContracts`. Layout per token (stride = readsPerToken):
 *   [symbol, decimals, name, allowance(spender_0), …, allowance(spender_N)]
 */
export function buildScanContracts(
  owner: Address,
  tokens: readonly TokenEntry[],
  spenders: readonly SpenderEntry[],
  chainId: SupportedChainId,
) {
  return tokens.flatMap((token) => [
    {
      address: token.address,
      abi: erc20Abi,
      functionName: "symbol" as const,
      chainId,
    },
    {
      address: token.address,
      abi: erc20Abi,
      functionName: "decimals" as const,
      chainId,
    },
    {
      address: token.address,
      abi: erc20Abi,
      functionName: "name" as const,
      chainId,
    },
    ...spenders.map((spender) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: "allowance" as const,
      args: [owner, spender.address] as const,
      chainId,
    })),
  ]);
}

/**
 * One entry of a wagmi `useReadContracts` result with `allowFailure: true`.
 */
export type ReadResult =
  | { status: "success"; result: unknown; error?: undefined }
  | { status: "failure"; error: Error; result?: undefined };

export type Erc20LiveReadFailureKind =
  | "allowance"
  | "symbol"
  | "name"
  | "decimals"
  | "other";

export interface Erc20LiveReadFailureSample {
  kind: Erc20LiveReadFailureKind;
  tokenAddress: Address;
  spenderAddress?: Address;
  error: string;
}

export interface Erc20LiveReadFailureDiagnostics {
  allowance: number;
  symbol: number;
  name: number;
  decimals: number;
  other: number;
  allowanceSucceeded: number;
  allowanceFailed: number;
  allowanceTotal: number;
  metadataFailed: number;
  samples: readonly Erc20LiveReadFailureSample[];
}

export const EMPTY_ERC20_LIVE_READ_FAILURES: Erc20LiveReadFailureDiagnostics = {
  allowance: 0,
  symbol: 0,
  name: 0,
  decimals: 0,
  other: 0,
  allowanceSucceeded: 0,
  allowanceFailed: 0,
  allowanceTotal: 0,
  metadataFailed: 0,
  samples: [],
};

function readFailureCategory(error: unknown): string {
  if (!error || typeof error !== "object") return "unknown";
  const name =
    "name" in error && typeof error.name === "string"
      ? error.name.trim()
      : "";
  if (name) return name.slice(0, 80);
  const code = "code" in error ? error.code : undefined;
  if (typeof code === "string" || typeof code === "number") {
    return `code ${String(code).slice(0, 48)}`;
  }
  return "Error";
}

function failedReadCategory(result: ReadResult | undefined): string {
  if (!result) return "missing-result";
  return result.status === "failure"
    ? readFailureCategory(result.error)
    : "unknown";
}

function addFailureSample(
  samples: Erc20LiveReadFailureSample[],
  sample: Erc20LiveReadFailureSample,
) {
  if (samples.length < MAX_FAILURE_SAMPLES) {
    samples.push(sample);
  }
}

function incrementFailure(
  diagnostics: {
    allowance: number;
    symbol: number;
    name: number;
    decimals: number;
    other: number;
    samples: Erc20LiveReadFailureSample[];
  },
  kind: Erc20LiveReadFailureKind,
) {
  diagnostics[kind] += 1;
}

function formatValidatedAllowance(
  raw: bigint,
  decimals: number | undefined,
  symbol: string,
): string {
  if (isUnlimitedAllowance(raw)) return "Unlimited";
  if (typeof decimals === "number") {
    return `${formatAllowance(raw, decimals)} ${symbol}`;
  }
  return `Raw allowance: ${raw.toString()} units`;
}

/**
 * Parse a wagmi `useReadContracts` result (with `allowFailure: true`) back
 * into a list of positive approvals. Tokens whose metadata fails degrade
 * gracefully to the registry fallback; tokens with no decimals info at all
 * are skipped so we never display a mis-scaled allowance.
 */
export function parseScanResults(
  results: readonly ReadResult[],
  chainId: number,
  tokens: readonly TokenEntry[],
  spenders: readonly SpenderEntry[],
): Approval[] {
  const stride = readsPerToken(spenders.length);
  const approvals: Approval[] = [];

  tokens.forEach((token, tokenIdx) => {
    const base = tokenIdx * stride;
    const symbolRes = results[base];
    const decimalsRes = results[base + 1];
    const nameRes = results[base + 2];

    const onChainSymbol =
      symbolRes?.status === "success" && typeof symbolRes.result === "string"
        ? symbolRes.result
        : undefined;
    const onChainName =
      nameRes?.status === "success" && typeof nameRes.result === "string"
        ? nameRes.result
        : undefined;
    const onChainDecimals =
      decimalsRes?.status === "success" && typeof decimalsRes.result === "number"
        ? decimalsRes.result
        : undefined;

    const decimals = onChainDecimals ?? token.decimals;
    if (typeof decimals !== "number") return; // can't safely format without decimals

    const symbol = onChainSymbol ?? token.symbol;
    const name = onChainName ?? token.name;

    spenders.forEach((spender, spenderIdx) => {
      const allowanceRes = results[base + METADATA_CALLS_PER_TOKEN + spenderIdx];
      if (!allowanceRes || allowanceRes.status !== "success") return;

      const raw = allowanceRes.result;
      if (typeof raw !== "bigint" || raw === 0n) return;

      const unlimited = isUnlimitedAllowance(raw);

      approvals.push({
        key: `${chainId}-${token.address}-${spender.address}`,
        chainId,
        tokenAddress: token.address,
        tokenSymbol: symbol,
        tokenName: name,
        tokenDecimals: decimals,
        tokenCategory: token.category,
        spenderAddress: spender.address,
        spenderLabel: spender.label,
        protocol: spender.protocol,
        spenderCategory: spender.category,
        trusted: spender.isTrusted,
        spenderUrl: spender.url,
        spenderNotes: spender.notes,
        spenderVerificationMethod: spender.verificationMethod,
        rawAllowance: raw,
        formattedAllowance: unlimited
          ? "Unlimited"
          : `${formatAllowance(raw, decimals)} ${symbol}`,
        unlimited,
      });
    });
  });

  return approvals;
}

/**
 * Unique list of token addresses present in the discovered pairs, in the
 * order they first appear. Used to batch metadata reads (symbol/decimals/name)
 * exactly once per token rather than once per pair.
 */
function uniqueTokenAddresses(pairs: readonly DiscoveredPair[]): Address[] {
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const p of pairs) {
    const key = p.tokenAddress.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p.tokenAddress);
  }
  return out;
}

/**
 * Build a flat `useReadContracts` config for the discovery-first pipeline.
 *
 * Layout:
 *   [ t0.symbol, t0.decimals, t0.name,
 *     t1.symbol, t1.decimals, t1.name, …,
 *     allowance(owner, pair0.spender) on pair0.token,
 *     allowance(owner, pair1.spender) on pair1.token, … ]
 *
 * Deduping tokens before the metadata reads keeps Multicall3 payloads small
 * even for wallets with hundreds of historical approvals.
 */
export function buildDiscoveryContracts(
  owner: Address,
  pairs: readonly DiscoveredPair[],
  chainId: SupportedChainId,
) {
  const tokens = uniqueTokenAddresses(pairs);
  const metadata = tokens.flatMap((address) => [
    { address, abi: erc20Abi, functionName: "symbol" as const, chainId },
    { address, abi: erc20Abi, functionName: "decimals" as const, chainId },
    { address, abi: erc20Abi, functionName: "name" as const, chainId },
  ]);
  const allowances = pairs.map((pair) => ({
    address: pair.tokenAddress,
    abi: erc20Abi,
    functionName: "allowance" as const,
    args: [owner, pair.spenderAddress] as const,
    chainId,
  }));
  return {
    contracts: [...metadata, ...allowances],
    uniqueTokens: tokens,
  };
}

export function collectDiscoveryReadFailures(
  results: readonly ReadResult[] | undefined,
  pairs: readonly DiscoveredPair[],
  tokens = uniqueTokenAddresses(pairs),
): Erc20LiveReadFailureDiagnostics {
  const diagnostics: {
    allowance: number;
    symbol: number;
    name: number;
    decimals: number;
    other: number;
    allowanceSucceeded: number;
    allowanceFailed: number;
    allowanceTotal: number;
    metadataFailed: number;
    samples: Erc20LiveReadFailureSample[];
  } = {
    ...EMPTY_ERC20_LIVE_READ_FAILURES,
    samples: [],
    allowanceTotal: pairs.length,
  };

  if (!results) return diagnostics;

  tokens.forEach((address, tokenIdx) => {
    const base = tokenIdx * METADATA_CALLS_PER_TOKEN;
    const metadataReads: readonly [Erc20LiveReadFailureKind, number][] = [
      ["symbol", base],
      ["decimals", base + 1],
      ["name", base + 2],
    ];

    metadataReads.forEach(([kind, index]) => {
      const result = results[index];
      if (result?.status !== "failure") return;

      incrementFailure(diagnostics, kind);
      diagnostics.metadataFailed += 1;
      addFailureSample(diagnostics.samples, {
        kind,
        tokenAddress: address,
        error: failedReadCategory(result),
      });
    });
  });

  const allowanceOffset = tokens.length * METADATA_CALLS_PER_TOKEN;
  pairs.forEach((pair, pairIdx) => {
    const result = results[allowanceOffset + pairIdx];
    if (result?.status === "success") {
      diagnostics.allowanceSucceeded += 1;
      return;
    }

    diagnostics.allowance += 1;
    diagnostics.allowanceFailed += 1;
    addFailureSample(diagnostics.samples, {
      kind: "allowance",
      tokenAddress: pair.tokenAddress,
      spenderAddress: pair.spenderAddress,
      error: failedReadCategory(result),
    });
  });

  return diagnostics;
}

export interface ParseDiscoveryStats {
  /** Number of `(token, spender)` pairs fed into the pipeline. */
  candidates: number;
  /** How many survived live `allowance > 0` validation. */
  active: number;
  /** How many of the active approvals matched a registry spender entry. */
  registryMatched: number;
}

export interface ParseDiscoveryOutput {
  approvals: Approval[];
  stats: ParseDiscoveryStats;
}

/**
 * Parse the discovery-first `useReadContracts` output back into scan-layer
 * approvals. Always:
 *  - prefers on-chain metadata, falling back to registry fallbacks then to a
 *    short-address placeholder for tokens we have never seen before
 *  - drops zero allowances (including revoked-but-still-logged entries)
 *  - uses raw-unit display when decimals metadata is unavailable, so a
 *    successful nonzero allowance is never hidden by metadata-only failures
 *  - enriches spenders from the registry when a match exists; otherwise marks
 *    them untrusted with category `unknown` and does NOT fabricate a label
 */
export function parseDiscoveryResults(
  results: readonly ReadResult[],
  owner: Address,
  chainId: number,
  pairs: readonly DiscoveredPair[],
): ParseDiscoveryOutput {
  void owner; // reserved for future multi-owner caching
  const tokens = uniqueTokenAddresses(pairs);
  const tokenMetaOffset = 0;
  const allowanceOffset = tokens.length * METADATA_CALLS_PER_TOKEN;

  interface TokenMeta {
    symbol: string;
    name?: string;
    decimals: number | undefined;
    category: TokenCategory;
  }

  const tokenMeta = new Map<string, TokenMeta>();
  tokens.forEach((address, i) => {
    const base = tokenMetaOffset + i * METADATA_CALLS_PER_TOKEN;
    const symbolRes = results[base];
    const decimalsRes = results[base + 1];
    const nameRes = results[base + 2];
    const registry = getTokenEntry(chainId, address);

    const onChainSymbol =
      symbolRes?.status === "success" && typeof symbolRes.result === "string"
        ? symbolRes.result
        : undefined;
    const onChainName =
      nameRes?.status === "success" && typeof nameRes.result === "string"
        ? nameRes.result
        : undefined;
    const onChainDecimals =
      decimalsRes?.status === "success" &&
      typeof decimalsRes.result === "number"
        ? decimalsRes.result
        : undefined;

    const decimals = onChainDecimals ?? registry?.decimals;
    const symbol = onChainSymbol ?? registry?.symbol ?? shortenAddress(address);
    const name = onChainName ?? registry?.name;
    const category: TokenCategory = registry?.category ?? "unknown";

    tokenMeta.set(address.toLowerCase(), { symbol, name, decimals, category });
  });

  const approvals: Approval[] = [];
  let registryMatched = 0;

  pairs.forEach((pair, pairIdx) => {
    const allowanceRes = results[allowanceOffset + pairIdx];
    if (!allowanceRes || allowanceRes.status !== "success") return;

    const raw = allowanceRes.result;
    if (typeof raw !== "bigint" || raw === 0n) return;

    const meta = tokenMeta.get(pair.tokenAddress.toLowerCase());
    if (!meta) return;

    const unlimited = isUnlimitedAllowance(raw);
    const spenderEntry = getSpenderEntry(chainId, pair.spenderAddress);
    if (spenderEntry) registryMatched += 1;

    approvals.push({
      key: `${chainId}-${pair.tokenAddress}-${pair.spenderAddress}`,
      chainId,
      tokenAddress: pair.tokenAddress,
      tokenSymbol: meta.symbol,
      tokenName: meta.name,
      tokenDecimals: meta.decimals ?? null,
      tokenCategory: meta.category,
      spenderAddress: pair.spenderAddress,
      spenderLabel: spenderEntry?.label ?? "Unknown spender",
      protocol: spenderEntry?.protocol ?? "Unknown",
      spenderCategory: spenderEntry?.category ?? "unknown",
      trusted: spenderEntry?.isTrusted ?? false,
      spenderUrl: spenderEntry?.url,
      spenderNotes: spenderEntry?.notes,
      spenderVerificationMethod: spenderEntry?.verificationMethod,
      rawAllowance: raw,
      formattedAllowance: formatValidatedAllowance(
        raw,
        meta.decimals,
        meta.symbol,
      ),
      unlimited,
    });
  });

  return {
    approvals,
    stats: {
      candidates: pairs.length,
      active: approvals.length,
      registryMatched,
    },
  };
}
