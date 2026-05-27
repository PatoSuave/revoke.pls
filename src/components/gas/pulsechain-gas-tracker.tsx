"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPublicClient, http } from "viem";

import {
  appendGasHistorySample,
  DEFAULT_GAS_HISTORY_LIMIT,
} from "@/lib/gas/gas-history";
import {
  formatBlockNumber,
  formatRelativeTime,
} from "@/lib/gas/gas-format";
import {
  gasStatusCopy,
  gasStatusChartColor,
  gasStatusLabel,
} from "@/lib/gas/gas-status";
import type {
  GasAdvisory,
  GasApiResponse,
  GasChartSample,
  GasStatus,
} from "@/lib/gas/gas-types";
import { pulsechain } from "@/lib/chains";

type LoadState = "loading" | "available" | "unavailable";

interface TrackerViewProps {
  state: LoadState;
  sample: GasApiResponse | null;
  history: readonly GasChartSample[];
  isStale: boolean;
  watcherError: string | null;
  heartbeat: number;
  now?: number;
}

const STALE_AFTER_MS = 90_000;
const WATCH_POLLING_INTERVAL_MS = 4_000;

const COMING_SOON_CHAINS = ["Ethereum", "BSC", "Base", "Polygon", "HyperEVM"];

export function PulseChainGasTracker() {
  const [sample, setSample] = useState<GasApiResponse | null>(null);
  const [history, setHistory] = useState<GasChartSample[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [watcherError, setWatcherError] = useState<string | null>(null);
  const [lastBlockSeenAt, setLastBlockSeenAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [heartbeat, setHeartbeat] = useState(0);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const latestWatchedBlockRef = useRef<bigint | null>(null);

  const loadGas = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/gas?chainId=369", {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const payload = (await response.json()) as GasApiResponse;
      setSample(payload);
      setState(payload.available ? "available" : "unavailable");
      if (payload.available) {
        setLastBlockSeenAt(Date.now());
        setHistory((current) =>
          appendGasHistorySample({
            history: current,
            sample: payload,
            limit: DEFAULT_GAS_HISTORY_LIMIT,
          }),
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("unavailable");
      setSample({
        chainId: 369,
        chainName: "PulseChain",
        nativeCurrency: "PLS",
        blockNumber: null,
        source: "unavailable",
        status: "unavailable",
        updatedAt: new Date().toISOString(),
        available: false,
        gasPriceGwei: null,
        baseFeeGwei: null,
        priorityFeeGwei: null,
        typicalTransactions: [],
        errors: ["PulseChain gas data is unavailable."],
      });
    } finally {
      inFlightRef.current = false;
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    void loadGas();

    const client = createPublicClient({
      chain: pulsechain,
      transport: http(pulsechain.rpcUrls.default.http[0], {
        timeout: 4_000,
      }),
      pollingInterval: WATCH_POLLING_INTERVAL_MS,
    });

    const unwatch = client.watchBlockNumber({
      emitOnBegin: false,
      onBlockNumber: (blockNumber) => {
        if (latestWatchedBlockRef.current === blockNumber) return;
        latestWatchedBlockRef.current = blockNumber;
        setLastBlockSeenAt(Date.now());
        setWatcherError(null);
        if (typeof document !== "undefined" && document.hidden) return;
        void loadGas();
      },
      onError: () => {
        setWatcherError("PulseChain block watcher is temporarily unavailable.");
      },
    });

    const onVisibilityChange = () => {
      if (!document.hidden) {
        setNow(Date.now());
        void loadGas();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      abortRef.current?.abort();
      unwatch();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadGas]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      setNow(Date.now());
      setHeartbeat((current) => current + 1);
    }, 2_000);
    return () => window.clearInterval(interval);
  }, []);

  const isStale =
    lastBlockSeenAt !== null && now - lastBlockSeenAt > STALE_AFTER_MS;

  return (
    <PulseChainGasTrackerView
      state={state}
      sample={sample}
      history={history}
      isStale={isStale}
      watcherError={watcherError}
      heartbeat={heartbeat}
      now={now}
    />
  );
}

export function PulseChainGasTrackerView({
  state,
  sample,
  history,
  isStale,
  watcherError,
  heartbeat,
  now = Date.now(),
}: TrackerViewProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const status = isStale ? "elevated" : sample?.status ?? "unavailable";
  const conditionLabel = isStale
    ? "Stale"
    : state === "loading"
      ? "Loading"
      : gasStatusLabel(status);
  const gasPriceLabel =
    sample?.gasPriceGwei ?? (state === "loading" ? "..." : "Unavailable");
  const revokeEstimate = getTransactionEstimate(
    sample,
    "Token approval / revoke",
  );
  const detailsId = "pulsechain-gas-details";

  return (
    <section className="border-b border-pulse-border/50 bg-pulse-bg py-4 sm:py-5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/70 shadow-glow">
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(210px,260px)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
                  Network fee
                </p>
                <StatusPill status={status} label={conditionLabel} />
                <LiveHeartbeat heartbeat={heartbeat} compact />
              </div>
              <h2 className="mt-2 text-xl font-bold text-pulse-text sm:text-2xl">
                PulseChain fee monitor
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-pulse-muted">
                Live gas context for estimating revoke costs. Wallet estimates
                still control actual transaction gas. This monitor is
                informational and does not add fees or change wallet gas
                estimates.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs text-pulse-muted lg:grid-cols-1">
              <CompactMetric label="Current gas" value={gasPriceLabel} suffix="Gwei" />
              <CompactMetric
                label="Estimated revoke"
                value={revokeEstimate}
                suffix={revokeEstimate === "Pending" ? undefined : "PLS"}
                valueClassName="text-pulse-cyan"
              />
              <CompactMetric
                label="Latest block"
                value={formatBlockNumber(sample?.blockNumber ?? null)}
              />
              <CompactMetric
                label="Updated"
                value={formatRelativeTime(sample?.updatedAt ?? null, now)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_auto] sm:items-center lg:grid-cols-1">
              <MiniGasSparkline
                samples={history}
                state={state}
                heartbeat={heartbeat}
              />
              <button
                type="button"
                aria-controls={detailsId}
                aria-expanded={detailsOpen}
                onClick={() => setDetailsOpen((open) => !open)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-4 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
              >
                {detailsOpen ? "Hide live chart" : "View live chart"}
              </button>
            </div>
          </div>

          {state === "unavailable" || watcherError || isStale ? (
            <div className="border-t border-pulse-border/70 px-4 py-3 text-sm leading-6 text-pulse-muted sm:px-5">
              {state === "unavailable" || watcherError
                ? sample?.errors?.[0] ??
                  watcherError ??
                  "PulseChain gas data is unavailable."
                : "No fresh PulseChain block has been detected recently. The latest sample may be stale."}
            </div>
          ) : null}

          {detailsOpen ? (
            <div id={detailsId} className="border-t border-pulse-border/70">
              <div className="border-b border-pulse-border/70 bg-pulse-bg/25 p-4 sm:p-5 lg:p-6">
                <ChainSelectorCompact />
              </div>

              <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.05fr_1.4fr] lg:p-6">
                <CurrentGasCard
                  sample={sample}
                  state={state}
                  isStale={isStale}
                  watcherError={watcherError}
                />
                <GasChartCard
                  history={history}
                  sample={sample}
                  state={state}
                  heartbeat={heartbeat}
                />
              </div>

              <div className="border-t border-pulse-border/70 p-4 sm:p-5 lg:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-pulse-text">
                      Estimated Transaction Costs
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-pulse-muted">
                      Costs are estimated in PLS using current gas data. Actual
                      wallet estimates may vary by contract.
                    </p>
                  </div>
                </div>
                <TypicalTransactionGrid sample={sample} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function getTransactionEstimate(
  sample: GasApiResponse | null,
  label: string,
): string {
  const transaction = sample?.typicalTransactions.find(
    (entry) => entry.label === label,
  );
  return transaction?.costNative ?? "Pending";
}

function CompactMetric({
  label,
  value,
  suffix,
  valueClassName = "text-pulse-text",
}: {
  label: string;
  value: string;
  suffix?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <span className="block truncate">{label}</span>
      <span
        className={`mt-1 block min-w-0 break-words font-mono font-semibold ${valueClassName}`}
      >
        {value}
        {suffix && value !== "..." && value !== "Unavailable" ? (
          <span className="ml-1 font-sans text-[11px] font-medium text-pulse-muted">
            {suffix}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function ChainSelectorCompact() {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-pulse-text">
        Select Chain
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl border border-pulse-cyan/70 bg-pulse-cyan/10 px-4 py-2 text-left shadow-glow"
          aria-pressed="true"
        >
          <span>
            <span className="block text-sm font-semibold text-pulse-text">
              PulseChain
            </span>
            <span className="block text-xs text-pulse-muted">PLS</span>
          </span>
          <span className="rounded-full bg-pulse-green/15 px-2 py-1 text-[11px] font-semibold text-pulse-green">
            Active
          </span>
        </button>
        {COMING_SOON_CHAINS.map((chain) => (
          <button
            key={chain}
            type="button"
            disabled
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-pulse-border/70 bg-pulse-bg/35 px-3 py-2 text-left opacity-60"
          >
            <span className="text-sm font-semibold text-pulse-text">
              {chain}
            </span>
            <span className="rounded-full border border-pulse-border px-2 py-0.5 text-[11px] text-pulse-muted">
              Soon
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CurrentGasCard({
  sample,
  state,
  isStale,
  watcherError,
}: {
  sample: GasApiResponse | null;
  state: LoadState;
  isStale: boolean;
  watcherError: string | null;
}) {
  const status = isStale ? "elevated" : sample?.status ?? "unavailable";

  return (
    <div className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-pulse-muted">PulseChain</p>
          <h3 className="mt-1 text-3xl font-bold text-pulse-text">
            {sample?.gasPriceGwei ?? (state === "loading" ? "..." : "Unavailable")}
            {sample?.gasPriceGwei ? (
              <span className="ml-2 text-base font-medium text-pulse-muted">
                Gwei
              </span>
            ) : null}
          </h3>
          <p className="mt-2 text-sm text-pulse-muted">
            Native gas token: <span className="text-pulse-text">PLS</span>
          </p>
        </div>
        <StatusPill status={status} label={gasStatusLabel(status)} />
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <InfoRow label="Network status" value={gasStatusCopy(status)} />
        <InfoRow label="Latest block" value={formatBlockNumber(sample?.blockNumber ?? null)} />
        <InfoRow label="Source" value={sourceLabel(sample?.source)} />
        <InfoRow
          label="Base fee"
          value={sample?.baseFeeGwei ? `${sample.baseFeeGwei} Gwei` : "Unavailable"}
        />
        <InfoRow
          label="Priority fee"
          value={
            sample?.priorityFeeGwei
              ? `${sample.priorityFeeGwei} Gwei`
              : "Unavailable"
          }
        />
      </div>

      <GasAdvisoryCompact advisory={sample?.advisory} />

      {state === "unavailable" || watcherError ? (
        <div className="mt-4 rounded-xl border border-pulse-red/30 bg-pulse-red/10 p-3 text-sm leading-6 text-pulse-muted">
          {sample?.errors?.[0] ?? watcherError ?? "PulseChain gas data is unavailable."}
        </div>
      ) : null}
      {isStale ? (
        <div className="mt-4 rounded-xl border border-pulse-yellow/30 bg-pulse-yellow/10 p-3 text-sm leading-6 text-pulse-muted">
          No fresh PulseChain block has been detected recently. The latest
          sample may be stale.
        </div>
      ) : null}
    </div>
  );
}

function GasChartCard({
  history,
  sample,
  state,
  heartbeat,
}: {
  history: readonly GasChartSample[];
  sample: GasApiResponse | null;
  state: LoadState;
  heartbeat: number;
}) {
  return (
    <div className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-pulse-text">
            Live Gas Chart
          </h3>
          <p className="mt-1 text-sm text-pulse-muted">
            Recent PulseChain block samples in Gwei. The moving line shows the
            app is still watching for the next block.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveHeartbeat heartbeat={heartbeat} />
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-xs text-pulse-muted">
            Latest block {formatBlockNumber(sample?.blockNumber ?? null)}
          </span>
        </div>
      </div>
      <div className="mt-4 min-h-64 overflow-hidden rounded-xl border border-pulse-border/70 bg-pulse-bg/50 p-3">
        {state === "loading" && history.length === 0 ? (
          <ChartEmptyState
            label="Waiting for PulseChain gas data..."
            heartbeat={heartbeat}
          />
        ) : history.length < 2 ? (
          <ChartEmptyState
            label="Chart will fill as new blocks arrive."
            heartbeat={heartbeat}
          />
        ) : (
          <GasLineChart samples={history} />
        )}
      </div>
    </div>
  );
}

function GasAdvisoryCompact({
  advisory,
}: {
  advisory: GasAdvisory | undefined;
}) {
  if (!advisory?.tiers.length) return null;

  return (
    <div className="mt-5 rounded-xl border border-pulse-border/70 bg-pulse-bg/35 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-pulse-text">
          Advisory tiers
        </h4>
        <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-2.5 py-1 text-[11px] text-pulse-muted">
          Owlracle
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {advisory.tiers.map((tier) => (
          <div
            key={tier.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 text-pulse-muted">
              <span
                className={`h-2 w-2 rounded-full ${
                  tier.label === "Low"
                    ? "bg-pulse-green"
                    : tier.label === "Medium"
                      ? "bg-pulse-yellow"
                      : "bg-pulse-red"
                }`}
                aria-hidden="true"
              />
              {tier.label} ({Math.round(tier.acceptance * 100)}%)
            </span>
            <span className="whitespace-nowrap font-mono text-pulse-text">
              {tier.gasPriceGwei} Gwei
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-pulse-muted">
        Supplemental Owlracle estimates from recent blocks. RPC remains source
        of truth. Updated {formatRelativeTime(advisory.updatedAt)}.
      </p>
    </div>
  );
}

function TypicalTransactionGrid({ sample }: { sample: GasApiResponse | null }) {
  if (!sample?.available || sample.typicalTransactions.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-pulse-border bg-pulse-bg/40 p-4 text-sm text-pulse-muted">
        Typical PulseChain transaction costs will appear when gas data is
        available.
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {sample.typicalTransactions.map((transaction) => (
        <div
          key={transaction.label}
          className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4"
        >
          <p className="text-sm font-semibold text-pulse-text">
            {transaction.label}
          </p>
          <p className="mt-2 font-mono text-xl text-pulse-cyan">
            {transaction.costNative}
          </p>
          <p className="text-sm text-pulse-muted">
            {transaction.nativeCurrency} -{" "}
            {transaction.gasUnits.toLocaleString("en-US")} gas
          </p>
        </div>
      ))}
    </div>
  );
}

function MiniGasSparkline({
  samples,
  state,
  heartbeat,
}: {
  samples: readonly GasChartSample[];
  state: LoadState;
  heartbeat: number;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const animatedSamples = useAnimatedSamples(samples, prefersReducedMotion);
  const chart = useMemo(
    () => buildMiniChart(animatedSamples),
    [animatedSamples],
  );
  const latestPoint = chart.points.at(-1);

  if (state === "loading" && samples.length === 0) {
    return <MiniSparklineEmpty label="Loading gas" heartbeat={heartbeat} />;
  }

  if (samples.length < 2) {
    return <MiniSparklineEmpty label="Watching blocks" heartbeat={heartbeat} />;
  }

  return (
    <div className="min-h-16 overflow-hidden rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-2">
      <svg
        viewBox="0 0 220 64"
        role="img"
        aria-label="Compact PulseChain gas sparkline"
        className="h-12 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="pulseGasMiniArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={chart.latestColor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={chart.latestColor} stopOpacity="0" />
          </linearGradient>
          <filter
            id="pulseGasMiniGlow"
            x="-20%"
            y="-30%"
            width="140%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={chart.areaPath} fill="url(#pulseGasMiniArea)" />
        {chart.segments.map((segment) => (
          <path
            key={segment.key}
            d={segment.path}
            fill="none"
            stroke={segment.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            filter={segment.isLatest ? "url(#pulseGasMiniGlow)" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {!prefersReducedMotion ? (
          <path
            d={chart.linePath}
            fill="none"
            stroke={chart.latestColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.36"
            strokeWidth="4"
            strokeDasharray="1 18"
            vectorEffect="non-scaling-stroke"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
        ) : null}
        {latestPoint ? (
          <circle
            cx={latestPoint.x}
            cy={latestPoint.y}
            r="4"
            fill={latestPoint.color}
            stroke="#07111f"
            strokeWidth="2"
            filter="url(#pulseGasMiniGlow)"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
    </div>
  );
}

function MiniSparklineEmpty({
  label,
  heartbeat,
}: {
  label: string;
  heartbeat: number;
}) {
  return (
    <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-2 text-xs text-pulse-muted">
      <svg
        viewBox="0 0 220 56"
        role="img"
        aria-label="Compact PulseChain gas sparkline"
        className="h-12 min-w-0"
        preserveAspectRatio="none"
      >
        <path
          d="M 8 32 C 34 24, 55 38, 82 30 S 130 20, 156 31 S 196 40, 212 26"
          fill="none"
          stroke="#14f195"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.7"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 8 32 C 34 24, 55 38, 82 30 S 130 20, 156 31 S 196 40, 212 26 L 212 52 L 8 52 Z"
          fill="#14f195"
          opacity="0.08"
        />
      </svg>
      <span className="grid justify-items-end gap-1">
        <span>{label}</span>
        <LiveHeartbeat heartbeat={heartbeat} compact />
      </span>
    </div>
  );
}

function GasLineChart({ samples }: { samples: readonly GasChartSample[] }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const animatedSamples = useAnimatedSamples(samples, prefersReducedMotion);
  const chart = useMemo(() => buildChart(animatedSamples), [animatedSamples]);
  const latest = samples.at(-1);
  const latestPoint = chart.points.at(-1);

  return (
    <div className="h-full min-h-56 w-full">
      <svg
        viewBox="0 0 640 240"
        role="img"
        aria-label="Recent PulseChain gas price samples"
        className="h-56 w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="pulseGasArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={chart.latestColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={chart.latestColor} stopOpacity="0" />
          </linearGradient>
          <filter id="pulseGasGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = 20 + line * 48;
          return (
            <line
              key={line}
              x1="42"
              x2="620"
              y1={y}
              y2={y}
              stroke="rgba(148, 163, 184, 0.14)"
              strokeWidth="1"
              strokeDasharray="3 8"
            />
          );
        })}
        <text x="4" y="28" fill="#94a3b8" fontSize="11">
          {chart.maxLabel}
        </text>
        <text x="4" y="210" fill="#94a3b8" fontSize="11">
          {chart.minLabel}
        </text>
        <path d={chart.areaPath} fill="url(#pulseGasArea)" />
        {chart.segments.map((segment) => (
          <path
            key={segment.key}
            d={segment.path}
            fill="none"
            stroke={segment.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            filter={segment.isLatest ? "url(#pulseGasGlow)" : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {!prefersReducedMotion ? (
          <>
            <path
              d={chart.linePath}
              fill="none"
              stroke={chart.latestColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.34"
              strokeWidth="5"
              strokeDasharray="1 26"
              vectorEffect="non-scaling-stroke"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="28"
                to="0"
                dur="2s"
                repeatCount="indefinite"
              />
            </path>
            <line
              x1="42"
              x2="42"
              y1="18"
              y2="208"
              stroke={chart.latestColor}
              strokeOpacity="0.35"
              strokeWidth="2"
            >
              <animate
                attributeName="x1"
                from="42"
                to="620"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                from="42"
                to="620"
                dur="2s"
                repeatCount="indefinite"
              />
            </line>
            <circle
              cx="42"
              cy={latestPoint?.y ?? 18}
              r="4"
              fill={chart.latestColor}
              opacity="0.9"
            >
              <animate
                attributeName="cx"
                from="42"
                to="620"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </>
        ) : null}
        {latestPoint ? (
          <circle
            cx={latestPoint.x}
            cy={latestPoint.y}
            r="5"
            fill={latestPoint.color}
            stroke="#07111f"
            strokeWidth="2"
            filter="url(#pulseGasGlow)"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      <div className="mt-2 flex flex-col gap-2 text-xs text-pulse-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Recent blocks</span>
        <div className="flex flex-wrap items-center gap-3">
          <ChartLegendItem color="bg-pulse-green" label="Low" />
          <ChartLegendItem color="bg-pulse-yellow" label="Medium" />
          <ChartLegendItem color="bg-pulse-red" label="High" />
          <span className="font-mono text-pulse-text">
            Latest {latest ? latest.gasPriceGwei.toFixed(2) : "--"} Gwei
          </span>
        </div>
      </div>
    </div>
  );
}

function ChartLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function ChartEmptyState({
  label,
  heartbeat,
}: {
  label: string;
  heartbeat: number;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center text-sm text-pulse-muted">
      <LiveHeartbeat heartbeat={heartbeat} />
      <span>{label}</span>
    </div>
  );
}

function LiveHeartbeat({
  heartbeat,
  compact = false,
}: {
  heartbeat: number;
  compact?: boolean;
}) {
  const active = heartbeat % 2 === 0;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-pulse-green/30 bg-pulse-green/10 text-xs font-semibold text-pulse-green ${
        compact ? "px-2.5 py-0.5" : "px-3 py-1"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full bg-pulse-green transition ${
          active ? "scale-110 opacity-100" : "scale-75 opacity-45"
        }`}
        aria-hidden="true"
      />
      Watching
    </span>
  );
}

function InfoRow({
  label,
  value,
  valueClassName = "text-pulse-text",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <span className="shrink-0 text-pulse-muted">{label}</span>
      <span className={`min-w-0 break-words text-right ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}

function StatusPill({ status, label }: { status: GasStatus; label: string }) {
  const className =
    status === "normal"
      ? "border-pulse-green/30 bg-pulse-green/15 text-pulse-green"
      : status === "elevated"
        ? "border-pulse-yellow/30 bg-pulse-yellow/15 text-pulse-yellow"
        : status === "high"
          ? "border-pulse-red/30 bg-pulse-red/15 text-pulse-red"
          : "border-pulse-border bg-pulse-panel text-pulse-muted";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

function sourceLabel(source: GasApiResponse["source"] | undefined): string {
  if (source === "rpc-fee-history") return "PulseChain RPC fee history";
  if (source === "rpc-gas-price") return "PulseChain RPC gas price";
  return "Unavailable";
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);
    const onChange = () => setPrefersReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}

function useAnimatedSamples(
  samples: readonly GasChartSample[],
  prefersReducedMotion: boolean,
): readonly GasChartSample[] {
  const [animatedSamples, setAnimatedSamples] =
    useState<readonly GasChartSample[]>(samples);
  const previousRef = useRef<readonly GasChartSample[]>(samples);

  useEffect(() => {
    if (prefersReducedMotion || samples.length < 2) {
      previousRef.current = samples;
      setAnimatedSamples(samples);
      return;
    }

    const previous = previousRef.current;
    const latestPrevious = previous.at(-1);
    const startSamples = samples.map((sample) => {
      const existing = previous.find(
        (entry) => entry.blockNumber === sample.blockNumber,
      );
      return (
        existing ?? {
          ...sample,
          gasPriceGwei:
            latestPrevious?.gasPriceGwei ?? sample.gasPriceGwei,
        }
      );
    });
    const startedAt = performance.now();
    const duration = 650;
    let frame = 0;

    const animate = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedSamples(
        samples.map((sample, index) => ({
          ...sample,
          gasPriceGwei:
            startSamples[index].gasPriceGwei +
            (sample.gasPriceGwei - startSamples[index].gasPriceGwei) * eased,
        })),
      );
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        previousRef.current = samples;
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [prefersReducedMotion, samples]);

  return animatedSamples;
}

interface ChartPoint {
  x: number;
  y: number;
  color: string;
}

function buildChart(samples: readonly GasChartSample[]) {
  const values = samples.map((sample) => sample.gasPriceGwei);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.18, max * 0.08, 1);
  const low = Math.max(0, min - padding);
  const high = max + padding;
  const width = 578;
  const height = 184;
  const left = 42;
  const top = 20;
  const denominator = Math.max(1, samples.length - 1);
  const range = Math.max(1, high - low);
  const points = samples.map((sample, index) => {
    const x = left + (index / denominator) * width;
    const y = top + height - ((sample.gasPriceGwei - low) / range) * height;
    return { x, y, color: gasStatusChartColor(sample.status) };
  });
  const linePath = buildSmoothLinePath(points);
  const last = points.at(-1);
  const first = points[0];
  const areaPath =
    first && last
      ? `${linePath} L ${last.x} ${top + height} L ${first.x} ${top + height} Z`
      : "";

  const segments = points.slice(1).map((point, index) => {
    return {
      key: `${samples[index + 1].blockNumber}-${index}`,
      path: buildSmoothSegmentPath(points, index),
      color: point.color,
      isLatest: index === points.length - 2,
    };
  });
  const latestColor = points.at(-1)?.color ?? gasStatusChartColor("unavailable");

  return {
    points,
    segments,
    linePath,
    areaPath,
    latestColor,
    minLabel: `${low.toFixed(2)} Gwei`,
    maxLabel: `${high.toFixed(2)} Gwei`,
  };
}

function buildMiniChart(samples: readonly GasChartSample[]) {
  if (samples.length === 0) {
    return {
      points: [],
      segments: [],
      linePath: "",
      areaPath: "",
      latestColor: gasStatusChartColor("unavailable"),
    };
  }

  const values = samples.map((sample) => sample.gasPriceGwei);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.2, max * 0.08, 1);
  const low = Math.max(0, min - padding);
  const high = max + padding;
  const width = 200;
  const height = 42;
  const left = 10;
  const top = 10;
  const denominator = Math.max(1, samples.length - 1);
  const range = Math.max(1, high - low);
  const points = samples.map((sample, index) => {
    const x = left + (index / denominator) * width;
    const y = top + height - ((sample.gasPriceGwei - low) / range) * height;
    return { x, y, color: gasStatusChartColor(sample.status) };
  });
  const linePath = buildSmoothLinePath(points);
  const last = points.at(-1);
  const first = points[0];
  const areaPath =
    first && last
      ? `${linePath} L ${last.x} ${top + height} L ${first.x} ${top + height} Z`
      : "";

  const segments = points.slice(1).map((point, index) => ({
    key: `mini-${samples[index + 1].blockNumber}-${index}`,
    path: buildSmoothSegmentPath(points, index),
    color: point.color,
    isLatest: index === points.length - 2,
  }));
  const latestColor = points.at(-1)?.color ?? gasStatusChartColor("unavailable");

  return {
    points,
    segments,
    linePath,
    areaPath,
    latestColor,
  };
}

function buildSmoothLinePath(points: readonly ChartPoint[]): string {
  if (points.length === 0) return "";
  return points
    .slice(1)
    .reduce(
      (path, _point, index) =>
        `${path} ${buildSmoothSegmentPath(points, index).replace(/^M [^C]+ /, "")}`,
      `M ${points[0].x} ${points[0].y}`,
    );
}

function buildSmoothSegmentPath(
  points: readonly ChartPoint[],
  index: number,
): string {
  const current = points[index];
  const next = points[index + 1];
  if (!current || !next) return "";

  const previous = points[index - 1] ?? current;
  const after = points[index + 2] ?? next;
  const tension = 0.82;
  const cp1 = {
    x: current.x + ((next.x - previous.x) / 6) * tension,
    y: clamp(
      current.y + ((next.y - previous.y) / 6) * tension,
      Math.min(current.y, next.y),
      Math.max(current.y, next.y),
    ),
  };
  const cp2 = {
    x: next.x - ((after.x - current.x) / 6) * tension,
    y: clamp(
      next.y - ((after.y - current.y) / 6) * tension,
      Math.min(current.y, next.y),
      Math.max(current.y, next.y),
    ),
  };

  return `M ${current.x} ${current.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${next.x} ${next.y}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
