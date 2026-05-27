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
  gasStatusLabel,
} from "@/lib/gas/gas-status";
import type { GasApiResponse, GasChartSample, GasStatus } from "@/lib/gas/gas-types";
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
  const latestWatchedBlockRef = useRef<bigint | null>(null);

  const loadGas = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const response = await fetch("/api/gas?chainId=369", {
        cache: "no-store",
        headers: { Accept: "application/json" },
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
    } catch {
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
      unwatch();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadGas]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      setNow(Date.now());
      setHeartbeat((current) => current + 1);
    }, 3_000);
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
  const status = isStale ? "elevated" : sample?.status ?? "unavailable";
  const liveLabel = isStale ? "Stale" : state === "loading" ? "Loading" : "Live";

  return (
    <section className="border-b border-pulse-border/50 bg-pulse-bg py-8 sm:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/70 shadow-glow">
          <div className="border-b border-pulse-border/70 bg-pulse-bg/35 p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-pulse-cyan/25 bg-pulse-cyan/10 text-2xl text-pulse-cyan">
                    <span aria-hidden="true">PLS</span>
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-pulse-text sm:text-3xl">
                        Gas Tracker
                      </h2>
                      <StatusPill status={status} label={liveLabel} />
                    </div>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-pulse-muted">
                      Gas is the network fee required to submit transactions.
                      Revoke.PLS does not add an extra revoke fee.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 rounded-2xl border border-pulse-border/70 bg-pulse-bg/55 p-3 text-sm text-pulse-muted sm:min-w-72">
                <InfoRow
                  label="Last updated"
                  value={formatRelativeTime(sample?.updatedAt ?? null, now)}
                />
                <InfoRow
                  label="Refresh mode"
                  value="New blocks + 3s heartbeat"
                  valueClassName="text-pulse-green"
                />
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-pulse-text">
                Select Chain
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                <button
                  type="button"
                  className="flex min-h-16 items-center justify-between rounded-xl border border-pulse-cyan/70 bg-pulse-cyan/10 px-4 py-3 text-left shadow-glow"
                  aria-pressed="true"
                >
                  <span>
                    <span className="block font-semibold text-pulse-text">
                      PulseChain
                    </span>
                    <span className="block text-sm text-pulse-muted">PLS</span>
                  </span>
                  <span className="rounded-full bg-pulse-green/15 px-2 py-1 text-xs font-semibold text-pulse-green">
                    Active
                  </span>
                </button>
                {COMING_SOON_CHAINS.map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    disabled
                    className="flex min-h-16 items-center justify-between rounded-xl border border-pulse-border/70 bg-pulse-bg/35 px-4 py-3 text-left opacity-60"
                  >
                    <span>
                      <span className="block font-semibold text-pulse-text">
                        {chain}
                      </span>
                      <span className="block text-sm text-pulse-muted">
                        Later
                      </span>
                    </span>
                    <span className="rounded-full border border-pulse-border px-2 py-1 text-xs text-pulse-muted">
                      Soon
                    </span>
                  </button>
                ))}
              </div>
            </div>
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
                  Typical Transaction Costs
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
      </div>
    </section>
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

      {state === "unavailable" || watcherError ? (
        <div className="mt-4 rounded-xl border border-pulse-red/30 bg-pulse-red/10 p-3 text-sm leading-6 text-pulse-muted">
          {sample?.errors?.[0] ?? watcherError ?? "PulseChain gas data is unavailable."}
        </div>
      ) : null}
      {isStale ? (
        <div className="mt-4 rounded-xl border border-pulse-pink/30 bg-pulse-pink/10 p-3 text-sm leading-6 text-pulse-muted">
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
            Recent PulseChain block samples in Gwei. The pulse shows the app is
            still watching for the next block.
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
          <GasLineChart samples={history} heartbeat={heartbeat} />
        )}
      </div>
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

function GasLineChart({
  samples,
  heartbeat,
}: {
  samples: readonly GasChartSample[];
  heartbeat: number;
}) {
  const chart = useMemo(() => buildChart(samples), [samples]);
  const latest = samples.at(-1);
  const scanX = 42 + ((heartbeat % 12) / 11) * 578;

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
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
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
        <path
          d={chart.linePath}
          fill="none"
          stroke="#22d3ee"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {chart.points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === chart.points.length - 1 ? 5 : 3}
            fill={index === chart.points.length - 1 ? "#34d399" : "#22d3ee"}
            stroke="#07111f"
            strokeWidth="2"
          />
        ))}
        <line
          x1={scanX}
          x2={scanX}
          y1="18"
          y2="208"
          stroke="#34d399"
          strokeOpacity="0.35"
          strokeWidth="2"
        />
        <circle
          cx={scanX}
          cy="18"
          r="4"
          fill="#34d399"
          opacity="0.85"
        />
      </svg>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-pulse-muted">
        <span>Recent blocks</span>
        <span className="font-mono text-pulse-text">
          Latest {latest ? latest.gasPriceGwei.toFixed(2) : "--"} Gwei
        </span>
      </div>
    </div>
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

function LiveHeartbeat({ heartbeat }: { heartbeat: number }) {
  const active = heartbeat % 2 === 0;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-pulse-green/30 bg-pulse-green/10 px-3 py-1 text-xs font-semibold text-pulse-green">
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
        ? "border-pulse-pink/30 bg-pulse-pink/15 text-pulse-pink"
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
    return { x, y };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const last = points.at(-1);
  const first = points[0];
  const areaPath =
    first && last
      ? `${linePath} L ${last.x} ${top + height} L ${first.x} ${top + height} Z`
      : "";

  return {
    points,
    linePath,
    areaPath,
    minLabel: `${low.toFixed(2)} Gwei`,
    maxLabel: `${high.toFixed(2)} Gwei`,
  };
}
