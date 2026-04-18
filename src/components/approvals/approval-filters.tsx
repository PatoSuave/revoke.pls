"use client";

import type { ApprovalSort } from "@/lib/approvals";

const SORT_OPTIONS: Array<{ value: ApprovalSort; label: string }> = [
  { value: "risk", label: "Unlimited first" },
  { value: "token", label: "Token A–Z" },
  { value: "spender", label: "Spender A–Z" },
];

export function ApprovalFilters({
  query,
  onQueryChange,
  sort,
  onSortChange,
  count,
  totalChecks,
  disabled,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  sort: ApprovalSort;
  onSortChange: (next: ApprovalSort) => void;
  count: number;
  totalChecks: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="approval-search">
          Filter approvals
        </label>
        <div className="relative">
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
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-pulse-border bg-pulse-bg/60 p-1">
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
        {count} active {count === 1 ? "approval" : "approvals"} · {totalChecks}{" "}
        checks
      </p>
    </div>
  );
}
