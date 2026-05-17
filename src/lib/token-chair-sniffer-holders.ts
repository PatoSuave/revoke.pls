import { getAddress, isAddress, type Address } from "viem";

import { PULSECHAIN_CHAIN_ID, getChainConfig } from "@/lib/chains";
import type {
  TokenChairConcentrationSignal,
  TokenChairHolderData,
} from "@/lib/token-chair-sniffer";

export interface FetchTokenChairHolderOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

interface HolderFetchResult {
  ok: boolean;
  status: number | null;
  payload: unknown;
  error: string | null;
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

export async function fetchTokenChairHolderData(
  tokenAddress: Address,
  pairAddress: string | null | undefined,
  options: FetchTokenChairHolderOptions = {},
): Promise<TokenChairHolderData> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const normalizedPairAddress = normalizeAddress(pairAddress);
  const baseUrl = pulseScanV2BaseUrl();
  const tokenRead = await fetchHolderJson(
    `${baseUrl}/tokens/${tokenAddress}/holders`,
    fetchImpl,
    options.signal,
  );
  const lpRead = normalizedPairAddress
    ? await fetchHolderJson(
        `${baseUrl}/tokens/${normalizedPairAddress}/holders`,
        fetchImpl,
        options.signal,
      )
    : {
        ok: false,
        status: null,
        payload: null,
        error: "No selected pair address was available for LP concentration.",
      };

  return normalizeTokenChairHolderResponse({
    tokenPayload: tokenRead.payload,
    lpPayload: lpRead.payload,
    pairAddress: normalizedPairAddress,
    tokenError: tokenRead.ok ? null : tokenRead.error,
    lpWarning: lpRead.ok ? null : lpRead.error,
  });
}

export function normalizeTokenChairHolderResponse({
  tokenPayload,
  lpPayload,
  pairAddress,
  tokenError = null,
  lpWarning = null,
}: {
  tokenPayload: unknown;
  lpPayload: unknown;
  pairAddress: Address | null;
  tokenError?: string | null;
  lpWarning?: string | null;
}): TokenChairHolderData {
  const token = normalizeConcentrationSignal(tokenPayload);
  const lpBase = normalizeConcentrationSignal(lpPayload);
  const lp = { ...lpBase, pairAddress };
  const warnings = [
    token.percent === null && !tokenError
      ? "PulseScan did not return token holder concentration data."
      : null,
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
    warnings,
    errors,
  };
}

function normalizeConcentrationSignal(
  payload: unknown,
): TokenChairConcentrationSignal {
  const items = asRecord(payload)?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return emptyConcentrationSignal(0);
  }

  const holders = items
    .map((item) => asRecord(item) as TokenHolderItem | null)
    .filter((item): item is TokenHolderItem => Boolean(item));
  const top = holders[0] ?? null;
  const topValue = parsePositiveBigInt(top?.value);
  const totalSupply = parsePositiveBigInt(top?.token?.total_supply);
  const percent =
    topValue !== null && totalSupply !== null && totalSupply > 0n
      ? bigintPercent(topValue, totalSupply)
      : null;

  return {
    percent,
    address: normalizeAddress(top?.address?.hash),
    isContract:
      typeof top?.address?.is_contract === "boolean"
        ? top.address.is_contract
        : null,
    holdersCount: parsePositiveNumber(top?.token?.holders),
    sampledHolderCount: holders.length,
    totalSupplyRaw: top?.token?.total_supply ?? null,
    valueRaw: top?.value ?? null,
  };
}

async function fetchHolderJson(
  url: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
): Promise<HolderFetchResult> {
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
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload: null,
      error: `PulseScan holder data returned HTTP ${response.status}.`,
    };
  }

  try {
    return {
      ok: true,
      status: response.status,
      payload: await response.json(),
      error: null,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      payload: null,
      error: "PulseScan holder data could not be parsed as JSON.",
    };
  }
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

function holderErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "PulseScan holder data request timed out.";
  }
  return "PulseScan holder data is temporarily unavailable.";
}
