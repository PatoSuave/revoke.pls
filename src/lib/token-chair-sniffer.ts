import { getAddress, isAddress, type Address } from "viem";

export const TOKEN_CHAIR_SNIFFER_ROUTE = "/app/token-chair-sniffer";
export const TOKEN_CHAIR_API_ROUTE = "/api/token-chair-sniffer/market";
export const TOKEN_CHAIR_CHAIN_ID = "pulsechain";
export const TOKEN_CHAIR_CHAIN_LABEL = "PulseChain";
export const DEX_SCREENER_TOKEN_PAIRS_URL =
  `https://api.dexscreener.com/token-pairs/v1/${TOKEN_CHAIR_CHAIN_ID}`;

export const TOKEN_CHAIR_DISCLAIMER =
  "Token Chair Sniffer highlights visible risk signals only. It does not guarantee that a token is safe. Scam contracts can hide behavior, change settings, or behave differently after launch.";

export type TokenChairApiStatus =
  | "success"
  | "no-pair-found"
  | "upstream-unavailable"
  | "malformed-response"
  | "bad-request";

export type TokenChairVerdictKind =
  | "low-visible-risk"
  | "some-warnings"
  | "high-risk"
  | "unable-to-fully-verify";

export interface TokenChairVerdict {
  kind: TokenChairVerdictKind;
  label:
    | "Low visible risk"
    | "Some warnings"
    | "High risk"
    | "Unable to fully verify";
  displayLabel:
    | "Chair Verdict: Smells Okay"
    | "Chair Verdict: Something Smells Funny"
    | "Chair Verdict: This Chair Is on Fire"
    | "Chair Verdict: Nose Blocked, Could Not Verify";
  tone: "success" | "warning" | "danger" | "neutral";
  notes: string[];
}

export interface TokenChairTxnWindow {
  buys: number;
  sells: number;
  total: number;
}

export interface TokenChairMarketData {
  tokenAddress: Address;
  tokenName: string;
  tokenSymbol: string;
  pairAddress: string;
  dexName: string;
  dexId: string | null;
  priceUsd: string | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  txns24h: TokenChairTxnWindow | null;
  fdv: number | null;
  marketCap: number | null;
  pairCreatedAt: number | null;
  pairAgeMs: number | null;
  pairAgeLabel: string;
  dexScreenerUrl: string | null;
  quoteTokenSymbol: string | null;
  quoteTokenName: string | null;
  pairCount: number;
}

export interface TokenChairApiResponse {
  ok: boolean;
  status: TokenChairApiStatus;
  chainId: typeof TOKEN_CHAIR_CHAIN_ID;
  tokenAddress: Address | null;
  market: TokenChairMarketData | null;
  pairs: TokenChairMarketData[];
  verdict: TokenChairVerdict;
  warnings: string[];
  errors: string[];
}

export type SniffRowStatus = "not-checked" | "unable-to-verify";

export interface SniffSignalRow {
  label: string;
  value: "Not checked yet" | "Unable to verify";
  status: SniffRowStatus;
  detail: string;
}

export interface ContractSniffCard {
  label: string;
  value: "Not checked yet" | "Unable to verify";
  status: SniffRowStatus;
  detail: string;
}

interface NormalizeOptions {
  now?: number;
}

type NormalizePairReason = "malformed" | "wrong-chain" | "token-mismatch";

interface NormalizePairResult {
  market: TokenChairMarketData | null;
  reason: NormalizePairReason | null;
}

interface VisibleMarketWarning {
  severity: "warning" | "high";
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const QUICK_SNIFF_DETAILS: Record<string, string> = {
  "Buy tax": "Needs a verified tax source or trade simulation. This MVP does not check it.",
  "Sell tax": "Needs a verified tax source or trade simulation. This MVP does not check it.",
  "Ownership renounced": "Needs contract ownership reads or verified source analysis.",
  "Hidden owner": "Needs source and bytecode review.",
  "Obfuscated address": "Needs bytecode and source review.",
  "Suspicious functions": "Needs source and bytecode review.",
  Honeypot: "Honeypot execution is not run in this MVP.",
  "Proxy contract": "Needs native contract reads and explorer metadata.",
  Mintable: "Needs source, ABI, or bytecode review.",
  "Transfer pausable": "Needs source, ABI, or bytecode review.",
  "Trading cooldown": "Needs source, ABI, or bytecode review.",
  Blacklist: "Needs source, ABI, or bytecode review.",
  Whitelist: "Needs source, ABI, or bytecode review.",
};

const CONTRACT_SNIFF_DETAILS: Record<string, string> = {
  "Source verified": "Future PulseChain explorer/source check.",
  Owner: "Future owner() or ownership-event check.",
  Deployer: "Future deployment trace or explorer metadata check.",
  "Top holder concentration": "Future holder distribution check.",
  "LP concentration": "Future LP holder distribution check.",
};

const DEX_NAME_OVERRIDES: Record<string, string> = {
  pulsex: "PulseX",
  "pulsex-v1": "PulseX V1",
  "pulsex-v2": "PulseX V2",
  "9inch": "9inch",
  nineinch: "9inch",
  phux: "Phux",
};

export function normalizeTokenChairAddress(
  input: string | null | undefined,
): Address | null {
  const value = input?.trim();
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function normalizeDexScreenerTokenPairsResponse(
  payload: unknown,
  tokenAddress: Address,
  options: NormalizeOptions = {},
): TokenChairApiResponse {
  if (!Array.isArray(payload)) {
    return createTokenChairApiResponse({
      status: "malformed-response",
      tokenAddress,
      errors: ["DEX Screener returned a malformed token-pairs response."],
    });
  }

  if (payload.length === 0) {
    return createTokenChairApiResponse({
      status: "no-pair-found",
      tokenAddress,
      warnings: [
        "DEX Screener did not return a PulseChain pair for this token address.",
      ],
    });
  }

  const now = options.now ?? Date.now();
  const pairs: TokenChairMarketData[] = [];
  const reasons: Record<NormalizePairReason, number> = {
    malformed: 0,
    "wrong-chain": 0,
    "token-mismatch": 0,
  };

  for (const item of payload) {
    const result = normalizeDexScreenerPair(item, tokenAddress, now);
    if (result.market) {
      pairs.push(result.market);
    } else if (result.reason) {
      reasons[result.reason] += 1;
    }
  }

  if (pairs.length === 0) {
    if (reasons.malformed > 0) {
      return createTokenChairApiResponse({
        status: "malformed-response",
        tokenAddress,
        errors: [
          "DEX Screener returned pair data, but the expected market fields were missing.",
        ],
      });
    }

    return createTokenChairApiResponse({
      status: "no-pair-found",
      tokenAddress,
      warnings: [
        "DEX Screener did not return a matching PulseChain pair for this token address.",
      ],
    });
  }

  const sortedPairs = sortMarketPairs(pairs).map((pair) => ({
    ...pair,
    pairCount: pairs.length,
  }));
  const warnings = [
    ...(reasons.malformed > 0
      ? ["Some DEX Screener pairs were ignored because fields were incomplete."]
      : []),
    ...(sortedPairs.every((pair) => pair.liquidityUsd === null)
      ? [
          "DEX Screener did not return liquidity for any matching pair, so pair selection is weak.",
        ]
      : []),
  ];

  return createTokenChairApiResponse({
    status: "success",
    tokenAddress,
    pairs: sortedPairs,
    warnings,
  });
}

export function createTokenChairApiResponse({
  status,
  tokenAddress,
  pairs = [],
  warnings = [],
  errors = [],
}: {
  status: TokenChairApiStatus;
  tokenAddress: Address | null;
  pairs?: TokenChairMarketData[];
  warnings?: string[];
  errors?: string[];
}): TokenChairApiResponse {
  const market = pairs[0] ?? null;
  const response: Omit<TokenChairApiResponse, "verdict"> = {
    ok: status === "success",
    status,
    chainId: TOKEN_CHAIR_CHAIN_ID,
    tokenAddress,
    market,
    pairs,
    warnings,
    errors,
  };

  return {
    ...response,
    verdict: getTokenChairVerdict(response),
  };
}

export function getTokenChairVerdict({
  status,
  market,
}: Pick<TokenChairApiResponse, "status" | "market">): TokenChairVerdict {
  if (status !== "success" || !market) {
    return {
      kind: "unable-to-fully-verify",
      label: "Unable to fully verify",
      displayLabel: "Chair Verdict: Nose Blocked, Could Not Verify",
      tone: "neutral",
      notes: [
        "The scanner could not read enough visible market data to form a market-only verdict.",
      ],
    };
  }

  const visibleWarnings = getVisibleMarketWarnings(market);
  if (visibleWarnings.some((warning) => warning.severity === "high")) {
    return {
      kind: "high-risk",
      label: "High risk",
      displayLabel: "Chair Verdict: This Chair Is on Fire",
      tone: "danger",
      notes: visibleWarnings.map((warning) => warning.message),
    };
  }

  if (visibleWarnings.length > 0) {
    return {
      kind: "some-warnings",
      label: "Some warnings",
      displayLabel: "Chair Verdict: Something Smells Funny",
      tone: "warning",
      notes: visibleWarnings.map((warning) => warning.message),
    };
  }

  return {
    kind: "unable-to-fully-verify",
    label: "Unable to fully verify",
    displayLabel: "Chair Verdict: Nose Blocked, Could Not Verify",
    tone: "neutral",
    notes: [
      "No major DEX Screener market warnings were found, but contract, tax, ownership, and honeypot checks are not live yet.",
    ],
  };
}

export function buildQuickSniffRows(options: {
  unableToVerify?: boolean;
} = {}): SniffSignalRow[] {
  const status: SniffRowStatus = options.unableToVerify
    ? "unable-to-verify"
    : "not-checked";
  const value = status === "unable-to-verify"
    ? "Unable to verify"
    : "Not checked yet";

  return Object.entries(QUICK_SNIFF_DETAILS).map(([label, detail]) => ({
    label,
    value,
    status,
    detail,
  }));
}

export function buildContractSniffCards(options: {
  unableToVerify?: boolean;
} = {}): ContractSniffCard[] {
  const status: SniffRowStatus = options.unableToVerify
    ? "unable-to-verify"
    : "not-checked";
  const value = status === "unable-to-verify"
    ? "Unable to verify"
    : "Not checked yet";

  return Object.entries(CONTRACT_SNIFF_DETAILS).map(([label, detail]) => ({
    label,
    value,
    status,
    detail,
  }));
}

export function formatUsd(value: number | null): string {
  if (!isFiniteNumber(value)) return "Not returned";
  const maximumFractionDigits = value > 0 && value < 1 ? 6 : value < 100 ? 2 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

export function formatPriceUsd(value: string | null): string {
  const cleaned = value?.trim();
  if (!cleaned) return "Not returned";
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return cleaned;
  if (numeric > 0 && numeric < 0.000001) return "<$0.000001";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: numeric < 1 ? 8 : numeric < 100 ? 4 : 2,
  }).format(numeric);
}

export function formatCompactNumber(value: number | null): string {
  if (!isFiniteNumber(value)) return "Not returned";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatTxns24h(txns: TokenChairTxnWindow | null): string {
  if (!txns) return "Not returned";
  return `${txns.total.toLocaleString("en-US")} total`;
}

export function formatPairAge(
  pairCreatedAt: number | null,
  now = Date.now(),
): string {
  if (!isFiniteNumber(pairCreatedAt) || pairCreatedAt <= 0) {
    return "Not returned";
  }

  const ageMs = Math.max(0, now - pairCreatedAt);
  if (ageMs < 60 * 60 * 1000) return "<1h";
  if (ageMs < 2 * DAY_MS) {
    return `${Math.max(1, Math.floor(ageMs / (60 * 60 * 1000)))}h`;
  }
  if (ageMs < 90 * DAY_MS) {
    return `${Math.floor(ageMs / DAY_MS)}d`;
  }
  if (ageMs < 365 * DAY_MS) {
    return `${Math.max(1, Math.floor(ageMs / (30 * DAY_MS)))}mo`;
  }
  return `${(ageMs / (365 * DAY_MS)).toFixed(1)}y`;
}

export function formatDexName(dexId: string | null): string {
  const cleaned = dexId?.trim();
  if (!cleaned) return "Unknown DEX";
  const override = DEX_NAME_OVERRIDES[cleaned.toLowerCase()];
  if (override) return override;
  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeDexScreenerPair(
  item: unknown,
  tokenAddress: Address,
  now: number,
): NormalizePairResult {
  const pair = asRecord(item);
  if (!pair) return { market: null, reason: "malformed" };

  const chainId = cleanString(pair.chainId);
  if (chainId?.toLowerCase() !== TOKEN_CHAIR_CHAIN_ID) {
    return { market: null, reason: "wrong-chain" };
  }

  const baseToken = asRecord(pair.baseToken);
  const quoteToken = asRecord(pair.quoteToken);
  const baseAddress = normalizeTokenChairAddress(cleanString(baseToken?.address));
  const quoteAddress = normalizeTokenChairAddress(cleanString(quoteToken?.address));
  const tokenIsBase = addressesMatch(baseAddress, tokenAddress);
  const tokenIsQuote = addressesMatch(quoteAddress, tokenAddress);
  if (!tokenIsBase && !tokenIsQuote) {
    return { market: null, reason: "token-mismatch" };
  }

  const displayToken = tokenIsBase ? baseToken : quoteToken;
  const counterToken = tokenIsBase ? quoteToken : baseToken;
  const pairAddress = cleanString(pair.pairAddress);
  if (!displayToken || !pairAddress) {
    return { market: null, reason: "malformed" };
  }

  const dexId = cleanString(pair.dexId);
  const pairCreatedAt = finiteNumberOrNull(pair.pairCreatedAt);
  const pairAgeMs = pairCreatedAt === null ? null : Math.max(0, now - pairCreatedAt);
  const txns24h = normalizeTxnWindow(pair.txns);
  const dexScreenerUrl =
    normalizeDexScreenerUrl(cleanString(pair.url)) ??
    `https://dexscreener.com/${TOKEN_CHAIR_CHAIN_ID}/${pairAddress}`;

  return {
    market: {
      tokenAddress,
      tokenName: cleanString(displayToken.name) ?? "Unknown token",
      tokenSymbol: cleanString(displayToken.symbol) ?? "TOKEN",
      pairAddress,
      dexName: formatDexName(dexId),
      dexId,
      priceUsd: stringOrNumber(pair.priceUsd),
      liquidityUsd: finiteNumberOrNull(asRecord(pair.liquidity)?.usd),
      volume24h: finiteNumberOrNull(asRecord(pair.volume)?.h24),
      txns24h,
      fdv: finiteNumberOrNull(pair.fdv),
      marketCap: finiteNumberOrNull(pair.marketCap),
      pairCreatedAt,
      pairAgeMs,
      pairAgeLabel: formatPairAge(pairCreatedAt, now),
      dexScreenerUrl,
      quoteTokenSymbol: cleanString(counterToken?.symbol),
      quoteTokenName: cleanString(counterToken?.name),
      pairCount: 1,
    },
    reason: null,
  };
}

function getVisibleMarketWarnings(
  market: TokenChairMarketData,
): VisibleMarketWarning[] {
  const warnings: VisibleMarketWarning[] = [];

  if (market.priceUsd === null) {
    warnings.push({
      severity: "warning",
      message: "DEX Screener did not return a USD price for the selected pair.",
    });
  }

  if (market.liquidityUsd === null) {
    warnings.push({
      severity: "warning",
      message: "DEX Screener did not return visible liquidity for the selected pair.",
    });
  } else if (market.liquidityUsd <= 0) {
    warnings.push({
      severity: "high",
      message: "The selected pair shows no visible USD liquidity.",
    });
  } else if (market.liquidityUsd < 1_000) {
    warnings.push({
      severity: "high",
      message: "The selected pair has very low visible liquidity.",
    });
  } else if (market.liquidityUsd < 10_000) {
    warnings.push({
      severity: "warning",
      message: "The selected pair has low visible liquidity.",
    });
  }

  if (market.pairAgeMs !== null && market.pairAgeMs < DAY_MS) {
    warnings.push({
      severity: "warning",
      message: "The selected pair appears to be less than 24 hours old.",
    });
  }

  if (market.txns24h && market.txns24h.total === 0) {
    warnings.push({
      severity: "warning",
      message: "DEX Screener shows no 24h transactions for the selected pair.",
    });
  }

  return warnings;
}

function sortMarketPairs(
  pairs: readonly TokenChairMarketData[],
): TokenChairMarketData[] {
  return [...pairs].sort((a, b) => {
    const liquidity = nullableNumberRank(b.liquidityUsd) - nullableNumberRank(a.liquidityUsd);
    if (liquidity !== 0) return liquidity;
    const volume = nullableNumberRank(b.volume24h) - nullableNumberRank(a.volume24h);
    if (volume !== 0) return volume;
    return nullableNumberRank(b.pairCreatedAt) - nullableNumberRank(a.pairCreatedAt);
  });
}

function normalizeTxnWindow(value: unknown): TokenChairTxnWindow | null {
  const h24 = asRecord(asRecord(value)?.h24);
  if (!h24) return null;
  const buys = finiteNumberOrNull(h24.buys);
  const sells = finiteNumberOrNull(h24.sells);
  if (buys === null && sells === null) return null;
  const normalizedBuys = Math.max(0, Math.floor(buys ?? 0));
  const normalizedSells = Math.max(0, Math.floor(sells ?? 0));
  return {
    buys: normalizedBuys,
    sells: normalizedSells,
    total: normalizedBuys + normalizedSells,
  };
}

function normalizeDexScreenerUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "dexscreener.com") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function stringOrNumber(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  return null;
}

function finiteNumberOrNull(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nullableNumberRank(value: number | null): number {
  return isFiniteNumber(value) ? value : -1;
}

function addressesMatch(
  left: Address | null | undefined,
  right: Address | null | undefined,
): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}
