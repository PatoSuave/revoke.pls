import type { GasAdvisory, GasAdvisoryTier } from "@/lib/gas/gas-types";
import { formatGweiNumber } from "@/lib/gas/gas-format";

const OWLRACLE_PULSECHAIN_GAS_URL =
  "https://api.owlracle.info/v4/pulse/gas";
const OWLRACLE_REQUEST_TIMEOUT_MS = 3_000;
const OWLRACLE_ADVISORY_TTL_MS = 60_000;

interface OwlracleSpeed {
  acceptance?: number;
  gasPrice?: number;
}

interface OwlracleGasResponse {
  timestamp?: string;
  avgTime?: number;
  avgTx?: number;
  speeds?: OwlracleSpeed[];
}

interface OwlracleOptions {
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  now?: number;
  apiKey?: string;
}

let cachedAdvisory:
  | {
      expiresAt: number;
      value: GasAdvisory | null;
    }
  | undefined;

export async function fetchOwlraclePulsechainAdvisory(
  options: OwlracleOptions = {},
): Promise<GasAdvisory | null> {
  const now = options.now ?? Date.now();
  if (cachedAdvisory && cachedAdvisory.expiresAt > now) {
    return cachedAdvisory.value;
  }

  try {
    const value = await fetchFreshOwlraclePulsechainAdvisory(options);
    cachedAdvisory = {
      expiresAt: now + OWLRACLE_ADVISORY_TTL_MS,
      value,
    };
    return value;
  } catch {
    cachedAdvisory = {
      expiresAt: now + Math.round(OWLRACLE_ADVISORY_TTL_MS / 2),
      value: null,
    };
    return null;
  }
}

export async function fetchFreshOwlraclePulsechainAdvisory({
  signal,
  fetchFn = fetch,
  timeoutMs = OWLRACLE_REQUEST_TIMEOUT_MS,
  apiKey = cleanEnv(process.env.OWLRACLE_API_KEY),
}: OwlracleOptions = {}): Promise<GasAdvisory | null> {
  const url = new URL(OWLRACLE_PULSECHAIN_GAS_URL);
  url.searchParams.set("blocks", "200");
  url.searchParams.set("accept", "35,60,90");
  url.searchParams.set("feeinusd", "false");
  url.searchParams.set("eip1559", "false");
  if (apiKey) url.searchParams.set("apikey", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetchFn(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return parseOwlraclePulsechainAdvisory(
      (await response.json()) as OwlracleGasResponse,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function parseOwlraclePulsechainAdvisory(
  payload: OwlracleGasResponse,
): GasAdvisory | null {
  const tiers = buildAdvisoryTiers(payload.speeds);
  if (tiers.length === 0) return null;

  return {
    provider: "owlracle",
    updatedAt: safeIsoDate(payload.timestamp) ?? new Date().toISOString(),
    avgBlockTimeSeconds: finiteOrNull(payload.avgTime),
    avgTransactionsPerBlock: finiteOrNull(payload.avgTx),
    tiers,
  };
}

export function resetOwlracleAdvisoryCacheForTests() {
  cachedAdvisory = undefined;
}

function buildAdvisoryTiers(
  speeds: OwlracleSpeed[] | undefined,
): GasAdvisoryTier[] {
  const ordered = (speeds ?? [])
    .filter(
      (speed) =>
        Number.isFinite(speed.acceptance) && Number.isFinite(speed.gasPrice),
    )
    .sort((a, b) => (a.acceptance ?? 0) - (b.acceptance ?? 0))
    .slice(0, 3);
  const labels: GasAdvisoryTier["label"][] = ["Low", "Medium", "High"];

  return ordered.map((speed, index) => ({
    label: labels[index] ?? "High",
    acceptance: Number(speed.acceptance),
    gasPriceGwei: formatGweiNumber(Number(speed.gasPrice)),
  }));
}

function finiteOrNull(value: number | undefined): number | null {
  return Number.isFinite(value) ? Number(value) : null;
}

function safeIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
