"use client";

import { useMemo, useState } from "react";

import {
  formatApprovalWrappedCopy,
  wrappedCopyHasBlockedContent,
} from "@/lib/approval-age/wrapped";
import type { ApprovalWrappedSummary } from "@/lib/approval-age/types";

export function ApprovalWrappedCard({
  completed,
  summary,
}: {
  completed: boolean;
  summary: ApprovalWrappedSummary;
}) {
  const [copied, setCopied] = useState(false);
  const copyText = useMemo(() => formatApprovalWrappedCopy(summary), [summary]);
  if (!completed) return null;

  const copyBlocked = wrappedCopyHasBlockedContent(copyText);

  async function copyRecap() {
    if (copyBlocked) return;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Approval Wrapped
          </p>
          <h3 className="mt-1 text-lg font-semibold text-pulse-text">
            Current scan recap
          </h3>
        </div>
        <button
          type="button"
          onClick={copyRecap}
          disabled={copyBlocked}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-4 py-2 text-sm font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copied ? "Copied" : "Copy recap"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WrappedStat
          label="Approvals reviewed"
          value={summary.approvalsReviewed.toString()}
        />
        <WrappedStat
          label="Oldest approval"
          value={summary.oldestApprovalLabel ?? "Unavailable"}
        />
        <WrappedStat
          label="Unlimited approvals"
          value={summary.unlimitedApprovals.toString()}
        />
        <WrappedStat
          label="NFT operators"
          value={summary.nftOperatorApprovals.toString()}
        />
        <WrappedStat
          label="Unknown spenders"
          value={summary.unknownSpenders.toString()}
        />
        <WrappedStat
          label="Ancient approvals"
          value={summary.ancientApprovals.toString()}
        />
        <WrappedStat
          label="Most approved chain"
          value={
            summary.mostApprovedChain
              ? `${summary.mostApprovedChain.chainName} (${summary.mostApprovedChain.count})`
              : "Unavailable"
          }
        />
        <WrappedStat
          label="1yr+ approvals"
          value={`${summary.oneYearPlusApprovals} over 1yr`}
        />
      </div>

      {summary.roastLine ? (
        <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-panel/55 px-3 py-2 text-sm leading-6 text-pulse-muted">
          {summary.roastLine}
        </p>
      ) : null}
    </section>
  );
}

function WrappedStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-pulse-border/70 bg-pulse-panel/55 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-muted">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-pulse-text">
        {value}
      </p>
    </div>
  );
}
