import { getAddress, isAddress, type Address } from "viem";

import { PULSECHAIN_CHAIN_ID, getChainConfig } from "@/lib/chains";
import type {
  TokenChairConcentrationSignal,
  TokenChairHolderDistribution,
  TokenChairHolderData,
} from "@/lib/token-chair-sniffer";

export interface FetchTokenChairHolderOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  maxPages?: number;
}

interface HolderFetchResult {
  ok: boolean;
  status: number | null;
  payload: unknown;
  error: string | null;
  warning: string | null;
  pageCount: number;
  maxPagesReached: boolean;
}

interface TokenHolderItem {
  address?: {
    hash?: string;
    is_contract?: boolean | null;
  };
  token?: {
    holders?: string | null;
    total_supply?: string | null;
  };
  value?: string | null;
}

interface NormalizedHolderItem {
  address: Address | null;
  isContract: boolean | null;
  valueRaw: string | null;
  value: bigint | null;
  holdersCount: number | null;
  totalSupplyRaw: string | null;
  totalSupply: bigint | null;
}

interface HolderPageParams {
  address_hash?: string;
  items_count?: string;
  value?: string;
}

interface HolderPagesPayload {
  items: unknown[];
  pageCount: number;
  maxPagesReached: boolean;
}

const DEFAULT_HOLDER_MAX_PAGES = 4;

export async function fetchTokenChairHolderData(
  tokenAddress: Address,
  pairAddress: string | null | undefined,
  options: FetchTokenChairHolderOptions = {},
): Promise<TokenChairHolderData> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const normalizedPairAddress = normalizeAddress(pairAddress);
  const maxPages = options.maxPages ?? DEFAULT_HOLDER_MAX_PAGES;
  const baseUrl = pulseScanV2BaseUrl();
  const [tokenRead, lpRead] = await Promise.all([
    fetchHolderPages(
      `${baseUrl}/tokens/${tokenAddress}/holders`,
      fetchImpl,
      options.signal,
      maxPages,
    ),
    normalizedPairAddress
      ? fetchHolderPages(
          `${baseUrl}/tokens/${normalizedPairAddress}/holders`,
          fetchImpl,
          options.signal,
          maxPages,
        )
      : Promise.resolve({
          ok: false,
          status: null,
          payload: null,
          error: "No selected pair address was available for LP concentration.",
          warning: null,
          pageCount: 0,
          maxPagesReached: false,
        }),
  ]);

  return normalizeTokenChairHolderResponse({
    tokenPayload: tokenRead.payload,
    lpPayload: lpRead.payload,
    pairAddress: normalizedPairAddress,
    tokenError: tokenRead.ok ? null : tokenRead.error,
    tokenWarning: tokenRead.warning,
    lpWarning: lpRead.ok ? null : lpRead.error,
    lpPaginationWarning: lpRead.warning,
  });
}

export function normalizeTokenChairHolderResponse({
  tokenPayload,
  lpPayload,
  pairAddress,
  tokenError = null,
  tokenWarning = null,
  lpWarning = null,
  lpPaginationWarning = null,
}: {
  tokenPayload: unknown;
  lpPayload: unknown;
  pairAddress: Address | null;
  tokenError?: string | null;
  tokenWarning?: string | null;
  lpWarning?: string | null;
  lpPaginationWarning?: string | null;
}): TokenChairHolderData {
  const token = normalizeConcentrationSignal(tokenPayload);
  const lpBase = normalizeConcentrationSignal(lpPayload);
  const lp = { ...lpBase, pairAddress };
  const distribution = normalizeDistribution(tokenPayload, pairAddress);
  const lpDistribution = normalizeDistribution(lpPayload, null);
  const warnings = [
    tokenWarning,
    token.percent === null && !tokenError
      ? "PulseScan did not return token holder concentration data."
      : null,
    distribution === null && !tokenError
      ? "PulseScan did not return enough token holder data for distribution buckets."
      : null,
    lpPaginationWarning,
    lp.percent === null
      ? lpWarning ??
        "PulseScan did not return LP holder concentration for the selected pair."
      : null,
  ].filter((warning): warning is string => Boolean(warning));
  const errors = [tokenError].filter((error): error is string => Boolean(error));
  const status =
    errors.length > 0
      ? "unable-to-verify"
      : warnings.length > 0
        ? "partial"
        : "success";

  return {
    status,
    token,
    lp,
    distribution,
    lpDistribution,
    warnings,
    errors,
  };
}

function normalizeConcentrationSignal(
  payload: unknown,
): TokenChairConcentrationSignal {
  const holders = normalizeHolderItems(payload);
  if (holders.length === 0) {
    return emptyConcentrationSignal(0);
  }

  const top = holders[0];
  const percent =
    top.value !== null && top.totalSupply !== null && top.totalSupply > 0n
      ? bigintPercent(top.value, top.totalSupply)
      : null;

  return {
    percent,
    address: top.address,
    isContract: top.isContract,
    holdersCount: top.holdersCount,
    sampledHolderCount: holders.length,
    totalSupplyRaw: top.totalSupplyRaw,
    valueRaw: top.valueRaw,
  };
}

function normalizeDistribution(
  payload: unknown,
  pairAddress: Address | null,
): TokenChairHolderDistribution | null {
  const holders = normalizeHolderItems(payload);
  if (holders.length === 0) return null;

  const totalSupply = holders.find((holder) => holder.totalSupply !== null)
    ?.totalSupply ?? null;
  if (totalSupply === null || totalSupply <= 0n) return null;

  const totalSupplyRaw = holders.find((holder) => holder.totalSupplyRaw)?.totalSupplyRaw ?? null;
  const holdersCount = holders.find((holder) => holder.holdersCount !== null)
    ?.holdersCount ?? null;
  const selectedPair = pairAddress
    ? holders.find((holder) => addressesMatch(holder.address, pairAddress)) ?? null
    : null;

  return {
    sampledHolderCount: holders.length,
    pageCount: normalizePageCount(payload),
    maxPagesReached: normalizeMaxPagesReached(payload),
    holdersCount,
    totalSupplyRaw,
    top1Percent: bucketPercent(holders.slice(0, 1), totalSupply),
    top5Percent: bucketPercent(holders.slice(0, 5), totalSupply),
    top10Percent: bucketPercent(holders.slice(0, 10), totalSupply),
    burnDeadPercent: bucketPercent(
      holders.filter((holder) => isBurnDeadAddress(holder.address)),
      totalSupply,
    ),
    selectedPairPercent: selectedPair
      ? bucketPercent([selectedPair], totalSupply)
      : null,
    topHolders: holders.slice(0, 10).map((holder, index) => ({
      rank: index + 1,
      address: holder.address,
      percent: holder.value !== null ? bigintPercent(holder.value, totalSupply) : null,
      isContract: holder.isContract,
      valueRaw: holder.valueRaw,
    })),
  };
}

function normalizeHolderItems(payload: unknown): NormalizedHolderItem[] {
  const items = asRecord(payload)?.items;
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => asRecord(item) as TokenHolderItem | null)
    .filter((item): item is TokenHolderItem => Boolean(item))
    .map((item) => ({
      address: normalizeAddress(item.address?.hash),
      isContract:
        typeof item.address?.is_contract === "boolean"
          ? item.address.is_contract
          : null,
      valueRaw: item.value ?? null,
      value: parsePositiveBigInt(item.value),
      holdersCount: parsePositiveNumber(item.token?.holders),
      totalSupplyRaw: item.token?.total_supply ?? null,
      totalSupply: parsePositiveBigInt(item.token?.total_supply),
    }));
}

function normalizePageCount(payload: unknown): number {
  const value = asRecord(payload)?.pageCount;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : 1;
}

function normalizeMaxPagesReached(payload: unknown): boolean {
  return asRecord(payload)?.maxPagesReached === true;
}

async function fetchHolderPages(
  baseUrl: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
  maxPages: number,
): Promise<HolderFetchResult> {
  const pageLimit = Math.max(1, Math.min(maxPages, 8));
  const allItems: unknown[] = [];
  let nextParams: HolderPageParams | null = null;
  let lastStatus: number | null = null;

  for (let page = 0; page < pageLimit; page += 1) {
    const pageResult = await fetchHolderPage(
      holderPageUrl(baseUrl, nextParams),
      fetchImpl,
      signal,
    );
    lastStatus = pageResult.status;

    if (!pageResult.ok) {
      if (allItems.length > 0) {
        return {
          ok: true,
          status: lastStatus,
          payload: {
            items: allItems,
            pageCount: page,
            maxPagesReached: false,
          } satisfies HolderPagesPayload,
          error: null,
          warning: pageResult.error,
          pageCount: page,
          maxPagesReached: false,
        };
      }

      return pageResult;
    }

    const pageItems = asRecord(pageResult.payload)?.items;
    if (Array.isArray(pageItems)) {
      allItems.push(...pageItems);
    }

    nextParams = pageResult.nextPageParams;
    if (!nextParams) {
      return {
        ok: true,
        status: lastStatus,
        payload: {
          items: allItems,
          pageCount: page + 1,
          maxPagesReached: false,
        } satisfies HolderPagesPayload,
        error: null,
        warning: null,
        pageCount: page + 1,
        maxPagesReached: false,
      };
    }
  }

  return {
    ok: true,
    status: lastStatus,
    payload: {
      items: allItems,
      pageCount: pageLimit,
      maxPagesReached: true,
    } satisfies HolderPagesPayload,
    error: null,
    warning:
      `PulseScan holder distribution was capped at ${allItems.length.toLocaleString("en-US")} sampled rows to keep the read-only scan responsive.`,
    pageCount: pageLimit,
    maxPagesReached: true,
  };
}

function holderPageUrl(
  baseUrl: string,
  params: HolderPageParams | null,
): string {
  if (!params) return baseUrl;
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchHolderPage(
  url: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
): Promise<HolderFetchResult & { nextPageParams: HolderPageParams | null }> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal,
    });
  } catch (error) {
    return {
      ok: false,
      status: null,
      payload: null,
      error: holderErrorMessage(error),
      warning: null,
      pageCount: 0,
      maxPagesReached: false,
      nextPageParams: null,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload: null,
      error: `PulseScan holder data returned HTTP ${response.status}.`,
      warning: null,
      pageCount: 0,
      maxPagesReached: false,
      nextPageParams: null,
    };
  }

  try {
    const text = await response.text();
    const payload = JSON.parse(text) as unknown;
    return {
      ok: true,
      status: response.status,
      payload,
      error: null,
      warning: null,
      pageCount: 1,
      maxPagesReached: false,
      nextPageParams: extractNextPageParams(text),
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      payload: null,
      error: "PulseScan holder data could not be parsed as JSON.",
      warning: null,
      pageCount: 0,
      maxPagesReached: false,
      nextPageParams: null,
    };
  }
}

function extractNextPageParams(text: string): HolderPageParams | null {
  const match = /"next_page_params"\s*:\s*(null|\{[^{}]*\})/.exec(text);
  if (!match || match[1] === "null") return null;

  const objectText = match[1];
  const addressHash = matchStringProperty(objectText, "address_hash");
  const itemsCount = matchPrimitiveProperty(objectText, "items_count");
  const value = matchPrimitiveProperty(objectText, "value");

  if (!addressHash || !itemsCount || !value) return null;

  return {
    address_hash: addressHash,
    items_count: itemsCount,
    value,
  };
}

function matchStringProperty(text: string, key: string): string | null {
  const escaped = escapeRegExp(key);
  const match = new RegExp(`"${escaped}"\\s*:\\s*"([^"]+)"`).exec(text);
  return match?.[1] ?? null;
}

function matchPrimitiveProperty(text: string, key: string): string | null {
  const escaped = escapeRegExp(key);
  const match = new RegExp(`"${escaped}"\\s*:\\s*("?)([0-9]+)\\1`).exec(text);
  return match?.[2] ?? null;
}

function emptyConcentrationSignal(
  sampledHolderCount: number,
): TokenChairConcentrationSignal {
  return {
    percent: null,
    address: null,
    isContract: null,
    holdersCount: null,
    sampledHolderCount,
    totalSupplyRaw: null,
    valueRaw: null,
  };
}

function pulseScanV2BaseUrl(): string {
  const apiUrl =
    getChainConfig(PULSECHAIN_CHAIN_ID)?.explorer.apiUrl ??
    "https://api.scan.pulsechain.com/api";
  return apiUrl.replace(/\/api\/?$/, "/api/v2").replace(/\/$/, "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeAddress(value: unknown): Address | null {
  if (typeof value !== "string" || !isAddress(value)) return null;
  return getAddress(value);
}

function parsePositiveBigInt(value: unknown): bigint | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed >= 0n ? parsed : null;
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function bigintPercent(value: bigint, total: bigint): number {
  return Number((value * 10_000n) / total) / 100;
}

function bucketPercent(
  holders: readonly NormalizedHolderItem[],
  totalSupply: bigint,
): number | null {
  const value = holders.reduce((sum, holder) => {
    if (holder.value === null) return sum;
    return sum + holder.value;
  }, 0n);
  return bigintPercent(value, totalSupply);
}

function addressesMatch(
  left: Address | null | undefined,
  right: Address | null | undefined,
): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function isBurnDeadAddress(address: Address | null): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return (
    lower === "0x0000000000000000000000000000000000000000" ||
    lower === "0x000000000000000000000000000000000000dead"
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function holderErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "PulseScan holder data request timed out.";
  }
  return "PulseScan holder data is temporarily unavailable.";
}
