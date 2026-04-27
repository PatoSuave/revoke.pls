"use client";

import type { ApprovalFilter, ApprovalSort } from "@/lib/risk";

const SORT_OPTIONS: Array<{ value: ApprovalSort; label: string }> = [
  { value: "risk", label: "Risk first" },
  { value: "token", label: "Token A-Z" },
  { value: "spender", label: "Spender A-Z" },
];

const FILTER_OPTIONS: Array<{ value: ApprovalFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "high", label: "High risk" },
  { value: "unlimited", label: "Unlimited" },
  { value: "trusted", label: "Known" },
];

export function ApprovalFilters({
  query,
  onQueryChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  count,
  candidateCount,
  disabled,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  sort: ApprovalSort;
  onSortChange: (next: ApprovalSort) => void;
  filter: ApprovalFilter;
  onFilterChange: (next: ApprovalFilter) => void;
  count: number;
  candidateCount: number;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-muted"
              htmlFor="approval-search"
            >
              Search approvals
            </label>
            <input
              id="approval-search"
              type="search"
              inputMode="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Token, spender, or protocol"
              value={query}
              disabled={disabled}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full rounded-xl border border-pulse-border bg-pulse-panel/70 px-3 py-2.5 text-sm text-pulse-text placeholder:text-pulse-muted/70 focus:border-pulse-cyan focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-muted">
              Sort
            </p>
            <div
              className="flex min-h-10 flex-wrap items-center gap-1 rounded-xl border border-pulse-border bg-pulse-panel/70 p-1"
              role="group"
              aria-label="Sort approvals"
            >
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSortChange(opt.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "bg-pulse-cyan/15 text-pulse-cyan"
                        : "text-pulse-muted hover:text-pulse-text"
                    }`}
                    aria-pressed={active}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="rounded-xl border border-pulse-border bg-pulse-panel/70 px-3 py-2 text-xs text-pulse-muted lg:text-right">
          <span className="font-semibold text-pulse-text">{count}</span> shown
          <span className="px-1 text-pulse-muted/60">/</span>
          <span className="font-semibold text-pulse-text">
            {candidateCount}
          </span>{" "}
          checked
        </p>
      </div>

      <div
        className="mt-3 flex flex-wrap items-center gap-1"
        role="group"
        aria-label="Filter approvals by category"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onFilterChange(opt.value)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-pulse-purple/60 bg-pulse-purple/20 text-pulse-text"
                  : "border-pulse-border bg-pulse-panel/60 text-pulse-muted hover:text-pulse-text"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
