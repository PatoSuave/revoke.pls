import { getAddress, isAddress, type Address } from "viem";

import type { TokenChairDextoolsData } from "@/lib/token-chair-sniffer";

export const DEXTOOLS_API_BASE_URL_DEFAULT =
  "https://public-api.dextools.io/free/v2";
export const DEXTOOLS_CHAIN_SLUG = "pulse";
export const DEXTOOLS_REQUEST_TIMEOUT_MS = 3_500;

const API_KEY_ENV_NAME = "DEXTOOLS_API_KEY";
const API_BASE_URL_ENV_NAME = "DEXTOOLS_API_BASE_URL";
const API_KEY_HEADER_ENV_NAME = "DEXTOOLS_API_KEY_HEADER";
const API_KEY_HEADER_DEFAULT = "X-API-Key";

interface DextoolsConfig {
  configured: boolean;
  apiKey: string | null;
  baseUrl: string;
  apiKeyHeader: string;
  warnings: string[];
  errors: string[];
}

interface FetchDextoolsOptions {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  pairAddress?: Address | string | null;
}

interface DextoolsFetchResult {
  ok: boolean;
  status: number | null;
  payload: unknown;
  error: string | null;
  rateLimited: boolean;
}

export function resolveDextoolsConfig(
  env: Record<string, string | undefined> = process.env,
): DextoolsConfig {
  const apiKey = cleanEnv(env[API_KEY_ENV_NAME]);
  const baseUrl = normalizeBaseUrl(
    cleanEnv(env[API_BASE_URL_ENV_NAME]) ?? DEXTOOLS_API_BASE_URL_DEFAULT,
  );
  const apiKeyHeader =
    cleanEnv(env[API_KEY_HEADER_ENV_NAME]) ?? API_KEY_HEADER_DEFAULT;
  const warnings: string[] = [];
  const errors: string[] = [];

  if (env.NEXT_PUBLIC_DEXTOOLS_API_KEY && !apiKey) {
    warnings.push(
      "NEXT_PUBLIC_DEXTOOLS_API_KEY is ignored. Use the server-only DEXTOOLS_API_KEY env var.",
    );
  }

  if (!apiKey) {
    return {
      configured: false,
      apiKey: null,
      baseUrl,
      apiKeyHeader,
      warnings,
      errors,
    };
  }

  if (!baseUrl) {
    errors.push(
      `${API_BASE_URL_ENV_NAME} must be an http(s) URL when configured.`,
    );
  }

  return {
    configured: errors.length === 0,
    apiKey,
    baseUrl,
    apiKeyHeader,
    warnings,
    errors,
  };
}

export async function fetchDextoolsTokenChairData(
  tokenAddress: Address,
  options: FetchDextoolsOptions = {},
): Promise<TokenChairDextoolsData> {
  const config = resolveDextoolsConfig(options.env);
  const pairAddress = normalizeAddress(options.pairAddress);
  const base = createBaseDextoolsData(tokenAddress, pairAddress, config.warnings);

  if (!config.configured || !config.apiKey) {
    return {
      ...base,
      status: "not-configured",
      errors: config.errors,
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEXTOOLS_REQUEST_TIMEOUT_MS,
  );
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const endpoints = [
      dextoolsUrl(config.baseUrl, "token", DEXTOOLS_CHAIN_SLUG, tokenAddress, "info"),
      dextoolsUrl(config.baseUrl, "token", DEXTOOLS_CHAIN_SLUG, tokenAddress, "price"),
      pairAddress
        ? dextoolsUrl(
            config.baseUrl,
            "pool",
            DEXTOOLS_CHAIN_SLUG,
            pairAddress,
            "liquidity",
          )
        : null,
    ].filter((endpoint): endpoint is string => endpoint !== null);

    const results = await Promise.all(
      endpoints.map((endpoint) =>
        fetchDextoolsJson(endpoint, {
          apiKey: config.apiKey!,
          apiKeyHeader: config.apiKeyHeader,
          fetchImpl,
          signal: controller.signal,
        }),
      ),
    );

    const okResults = results.filter((result) => result.ok);
    const fields = normalizeDextoolsPayloads(
      okResults.map((result) => result.payload),
      tokenAddress,
      pairAddress,
    );
    const errors = [
      ...config.errors,
      ...results
        .filter((result) => !result.ok && result.error)
        .map((result) => result.error!),
    ];
    const warnings = [
      ...base.warnings,
      ...(okResults.length > 0 && !hasAnyDextoolsField(fields)
        ? [
            "DEXTools returned JSON, but Token Chair did not find expected enrichment fields.",
          ]
        : []),
    ];

    return {
      ...base,
      ...fields,
      status: dextoolsStatus(results, fields),
      warnings,
      errors,
    };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

function createBaseDextoolsData(
  tokenAddress: Address,
  pairAddress: Address | null,
  warnings: string[] = [],
): TokenChairDextoolsData {
  return {
    status: "not-configured",
    sourceLabel: "DEXTools",
    tokenAddress,
    pairAddress,
    priceUsd: null,
    liquidityUsd: null,
    volume24h: null,
    dextScore: null,
    holderCount: null,
    tokenUrl: `https://www.dextools.io/app/en/${DEXTOOLS_CHAIN_SLUG}/pair-explorer/${pairAddress ?? tokenAddress}`,
    pairUrl: pairAddress
      ? `https://www.dextools.io/app/en/${DEXTOOLS_CHAIN_SLUG}/pair-explorer/${pairAddress}`
      : null,
    websiteUrl: null,
    socials: [],
    warnings,
    errors: [],
  };
}

async function fetchDextoolsJson(
  endpoint: string,
  {
    apiKey,
    apiKeyHeader,
    fetchImpl,
    signal,
  }: {
    apiKey: string;
    apiKeyHeader: string;
    fetchImpl: typeof fetch;
    signal: AbortSignal;
  },
): Promise<DextoolsFetchResult> {
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
        [apiKeyHeader]: apiKey,
      },
      signal,
    });
  } catch (error) {
    return {
      ok: false,
      status: null,
      payload: null,
      error:
        error instanceof Error && error.name === "AbortError"
          ? "DEXTools request timed out."
          : "DEXTools enrichment is temporarily unavailable.",
      rateLimited: false,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload: null,
      error: `DEXTools returned HTTP ${response.status}.`,
      rateLimited: response.status === 429,
    };
  }

  try {
    return {
      ok: true,
      status: response.status,
      payload: await response.json(),
      error: null,
      rateLimited: false,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      payload: null,
      error: "DEXTools returned a response that could not be parsed as JSON.",
      rateLimited: false,
    };
  }
}

function normalizeDextoolsPayloads(
  payloads: unknown[],
  tokenAddress: Address,
  pairAddress: Address | null,
): Omit<
  TokenChairDextoolsData,
  "status" | "sourceLabel" | "tokenAddress" | "pairAddress" | "warnings" | "errors"
> {
  return {
    priceUsd: firstStringOrNumber(payloads, [
      "priceUsd",
      "priceUSD",
      "price",
      "usdPrice",
    ]),
    liquidityUsd: firstNumber(payloads, [
      "liquidityUsd",
      "liquidityUSD",
      "usdLiquidity",
      "liquidity",
    ]),
    volume24h: firstNumber(payloads, [
      "volume24h",
      "volume24H",
      "volume24",
      "volume",
    ]),
    dextScore: normalizeDextScore(
      firstNumber(payloads, ["dextScore", "dextscore", "score", "dext_score"]),
    ),
    holderCount: firstNumber(payloads, [
      "holderCount",
      "holdersCount",
      "holders",
      "holdersTotal",
    ]),
    tokenUrl:
      firstUrl(payloads, ["dextoolsUrl", "dextoolsURL", "url", "tokenUrl"]) ??
      `https://www.dextools.io/app/en/${DEXTOOLS_CHAIN_SLUG}/pair-explorer/${pairAddress ?? tokenAddress}`,
    pairUrl:
      firstUrl(payloads, ["pairUrl", "poolUrl"]) ??
      (pairAddress
        ? `https://www.dextools.io/app/en/${DEXTOOLS_CHAIN_SLUG}/pair-explorer/${pairAddress}`
        : null),
    websiteUrl: firstUrl(payloads, ["website", "web", "site", "homepage"]),
    socials: normalizeSocials(payloads),
  };
}

function dextoolsStatus(
  results: DextoolsFetchResult[],
  fields: ReturnType<typeof normalizeDextoolsPayloads>,
): TokenChairDextoolsData["status"] {
  if (results.some((result) => result.rateLimited)) return "rate-limited";
  const okCount = results.filter((result) => result.ok).length;
  if (okCount === 0) return "unable-to-verify";
  if (okCount < results.length) return "partial";
  return hasAnyDextoolsField(fields) ? "success" : "partial";
}

function hasAnyDextoolsField(
  fields: ReturnType<typeof normalizeDextoolsPayloads>,
): boolean {
  return Boolean(
    fields.priceUsd ||
      fields.liquidityUsd !== null ||
      fields.volume24h !== null ||
      fields.dextScore !== null ||
      fields.holderCount !== null ||
      fields.websiteUrl ||
      fields.socials.length > 0,
  );
}

function firstStringOrNumber(payloads: unknown[], keys: string[]): string | null {
  for (const payload of payloads) {
    const value = findDeepValue(payload, keys);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function firstNumber(payloads: unknown[], keys: string[]): number | null {
  for (const payload of payloads) {
    const value = findDeepValue(payload, keys);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const numeric = Number(value.replace(/,/g, ""));
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  return null;
}

function firstUrl(payloads: unknown[], keys: string[]): string | null {
  for (const payload of payloads) {
    const value = findDeepValue(payload, keys);
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
      return value.trim();
    }
  }
  return null;
}

function findDeepValue(value: unknown, keys: string[]): unknown {
  const targetKeys = new Set(keys.map((key) => key.toLowerCase()));
  const queue = [unwrapPayload(value)];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (typeof current !== "object") continue;
    for (const [key, item] of Object.entries(current as Record<string, unknown>)) {
      if (targetKeys.has(key.toLowerCase())) return item;
      if (item && typeof item === "object") queue.push(item);
    }
  }

  return null;
}

function unwrapPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return record.data ?? record.result ?? record;
}

function normalizeDextScore(value: number | null): number | null {
  if (value === null) return null;
  if (value < 0) return null;
  return Math.min(99, value);
}

function normalizeSocials(payloads: unknown[]): TokenChairDextoolsData["socials"] {
  const links: TokenChairDextoolsData["socials"] = [];
  for (const payload of payloads) {
    collectSocialLinks(unwrapPayload(payload), links);
  }
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.label}:${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function collectSocialLinks(
  value: unknown,
  links: TokenChairDextoolsData["socials"],
): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectSocialLinks(item, links);
    return;
  }

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string" && /^https?:\/\//i.test(item)) {
      const label = socialLabel(key);
      if (label) links.push({ label, url: item });
    } else if (item && typeof item === "object") {
      collectSocialLinks(item, links);
    }
  }
}

function socialLabel(key: string): string | null {
  const normalized = key.toLowerCase();
  if (normalized.includes("twitter") || normalized.includes("xcom")) return "X";
  if (normalized.includes("telegram")) return "Telegram";
  if (normalized.includes("discord")) return "Discord";
  if (normalized.includes("medium")) return "Medium";
  if (normalized.includes("reddit")) return "Reddit";
  return null;
}

function dextoolsUrl(baseUrl: string, ...parts: string[]): string {
  return `${baseUrl.replace(/\/+$/, "")}/${parts
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function normalizeAddress(value: Address | string | null | undefined): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

function cleanEnv(value: string | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function normalizeBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}
