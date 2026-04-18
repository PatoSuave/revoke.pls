"use client";

import type { ApprovalFilter, ApprovalSort } from "@/lib/risk";

const SORT_OPTIONS: Array<{ value: ApprovalSort; label: string }> = [
  { value: "risk", label: "Risk first" },
  { value: "token", label: "Token A–Z" },
  { value: "spender", label: "Spender A–Z" },
];

const FILTER_OPTIONS: Array<{ value: ApprovalFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "high", label: "High risk" },
  { value: "unlimited", label: "Unlimited" },
  { value: "trusted", label: "Trusted" },
];

export function ApprovalFilters({
  query,
  onQueryChange,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  count,
  totalChecks,
  disabled,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  sort: ApprovalSort;
  onSortChange: (next: ApprovalSort) => void;
  filter: ApprovalFilter;
  onFilterChange: (next: ApprovalFilter) => void;
  count: number;
  totalChecks: number;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="approval-search">
            Filter approvals
          </label>
          <input
            id="approval-search"
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Filter by token or spender"
            value={query}
            disabled={disabled}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full rounded-xl border border-pulse-border bg-pulse-bg/60 px-3 py-2 text-sm text-pulse-text placeholder:text-pulse-muted focus:border-pulse-purple focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:w-72"
          />

          <div
            className="flex items-center gap-1 rounded-xl border border-pulse-border bg-pulse-bg/60 p-1"
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? "bg-pulse-panel2 text-pulse-text"
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

        <p className="text-xs text-pulse-muted">
          {count} {count === 1 ? "approval" : "approvals"} shown · {totalChecks}{" "}
          checks
        </p>
      </div>

      <div
        className="flex flex-wrap items-center gap-1"
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
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-pulse-purple/60 bg-pulse-purple/15 text-pulse-text"
                  : "border-pulse-border bg-pulse-bg/50 text-pulse-muted hover:text-pulse-text"
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
