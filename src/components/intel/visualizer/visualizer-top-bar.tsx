"use client";

import Link from "next/link";

import { IntelRouteSwitcher } from "@/components/intel/intel-route-switcher";
import { PulseMark } from "@/components/pulse-mark";
import { VisualizerIcon } from "@/components/intel/visualizer/visualizer-icons";
import { compactIntelAddress } from "@/lib/intel/address";

export const VISUALIZER_TIME_RANGE_OPTIONS = [
  "24h",
  "7d",
  "30d",
  "90d",
  "All",
] as const;

export function VisualizerTopBar({
  addressInput,
  onAddressInputChange,
  onApplyAddress,
  validationMessage,
  activeAddress,
  onLoadDemo,
  onReset,
  activeTimeRange,
  onTimeRangeChange,
}: {
  addressInput: string;
  onAddressInputChange: (value: string) => void;
  onApplyAddress: () => void;
  validationMessage: string | null;
  activeAddress: `0x${string}`;
  onLoadDemo: () => void;
  onReset: () => void;
  activeTimeRange: string;
  onTimeRangeChange: (range: string) => void;
}) {
  return (
    <header className="relative z-40 border-b border-pulse-border/70 bg-pulse-bg/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[100rem] flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:px-4">
        <div className="flex min-w-0 items-center justify-between gap-3 lg:w-[18rem] lg:justify-start">
          <Link
            href="/intel"
            className="flex min-w-0 items-center gap-2 text-pulse-text"
            aria-label="Back to Intelligence Suite"
          >
            <PulseMark className="h-8 w-8 shrink-0" />
            <span className="truncate text-sm font-semibold">
              Pulse<span className="text-gradient-pulse"> Visualizer</span>
            </span>
          </Link>
          <Link
            href="/intel"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-pulse-border bg-pulse-panel/70 text-pulse-muted transition hover:text-pulse-text lg:hidden"
            aria-label="Back to Intelligence Suite"
          >
            <VisualizerIcon name="back" className="h-4 w-4" />
          </Link>
        </div>

        <form
          className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-pulse-border bg-pulse-panel/54 p-1.5 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            onApplyAddress();
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-pulse-border bg-pulse-bg/75 px-3 py-2">
            <VisualizerIcon
              name="search"
              className="h-4 w-4 shrink-0 text-pulse-cyan"
            />
            <input
              value={addressInput}
              onChange={(event) => onAddressInputChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent font-mono text-sm text-pulse-text outline-none placeholder:text-pulse-muted/70"
              placeholder="Search wallet, token, contract, or label"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-pulse-gradient px-3 py-2 text-xs font-semibold text-pulse-on-gradient shadow-glow transition hover:brightness-110"
            >
              Center graph
            </button>
            <button
              type="button"
              onClick={onLoadDemo}
              className="rounded-md border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
            >
              Preview wallet
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-md border border-pulse-border bg-pulse-text/5 px-3 py-2 text-xs font-semibold text-pulse-muted transition hover:text-pulse-text"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:w-[20rem] lg:justify-end">
          {["PulseChain", "Token", activeTimeRange, "Both flows"].map(
            (item) => (
              <span
                key={item}
                className="rounded border border-pulse-border bg-pulse-panel/62 px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-pulse-muted"
              >
                {item}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-[100rem] flex-col gap-2 px-3 pb-2 text-xs text-pulse-muted lg:flex-row lg:items-center lg:justify-between lg:px-4">
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center">
          <p className="shrink-0">
            Active center:{" "}
            <span className="font-mono text-pulse-cyan">
              {compactIntelAddress(activeAddress)}
            </span>
            {validationMessage ? (
              <span className="ml-2 text-pulse-yellow">{validationMessage}</span>
            ) : null}
          </p>
          <IntelRouteSwitcher
            activeHref="/intel/visualizer"
            variant="chips"
            className="md:max-w-[25rem]"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-md border border-pulse-border bg-pulse-panel/50 p-1">
          {VISUALIZER_TIME_RANGE_OPTIONS.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onTimeRangeChange(range)}
              className={`shrink-0 rounded px-3 py-1.5 font-semibold transition ${
                activeTimeRange === range
                  ? "bg-pulse-cyan text-pulse-bg"
                  : "text-pulse-muted hover:bg-pulse-text/5 hover:text-pulse-text"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
