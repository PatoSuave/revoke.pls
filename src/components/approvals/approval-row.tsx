"use client";

import type { Approval } from "@/lib/approvals";
import { explorerAddressUrl } from "@/lib/explorer";
import { shortenAddress } from "@/lib/format";

export function ApprovalRow({ approval }: { approval: Approval }) {
  return (
    <li className="grid grid-cols-1 gap-3 border-b border-pulse-border/60 px-4 py-4 last:border-b-0 sm:grid-cols-[1.2fr_1.5fr_1fr_auto] sm:items-center sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <TokenAvatar symbol={approval.tokenSymbol} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-pulse-text">
            {approval.tokenSymbol}
          </p>
          <ExplorerLink
            address={approval.tokenAddress}
            label={approval.tokenName}
          />
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-pulse-text">
          {approval.spenderLabel}
        </p>
        <p className="truncate text-xs text-pulse-muted">
          {approval.protocol}
          {" · "}
          <ExplorerLink address={approval.spenderAddress} inline />
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {approval.unlimited ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pulse-red/40 bg-pulse-red/10 px-2.5 py-1 text-xs font-semibold text-pulse-red">
            <span className="h-1.5 w-1.5 rounded-full bg-pulse-red" aria-hidden />
            Unlimited
          </span>
        ) : (
          <span className="font-mono text-sm text-pulse-text">
            {approval.formattedAllowance}
          </span>
        )}
        {approval.unlimited ? (
          <span className="font-mono text-[11px] text-pulse-muted">
            max uint256
          </span>
        ) : null}
      </div>

      <button
        type="button"
        disabled
        title="Revoke transactions land in the next step"
        className="inline-flex items-center justify-center rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-muted transition disabled:cursor-not-allowed"
      >
        Revoke
      </button>
    </li>
  );
}

function TokenAvatar({ symbol }: { symbol: string }) {
  const initials = symbol.slice(0, 3).toUpperCase();
  return (
    <div
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pulse-gradient text-[10px] font-bold text-pulse-bg"
    >
      {initials}
    </div>
  );
}

function ExplorerLink({
  address,
  label,
  inline,
}: {
  address: string;
  label?: string;
  inline?: boolean;
}) {
  const text = label ?? shortenAddress(address);
  const base =
    "text-xs text-pulse-muted hover:text-pulse-cyan hover:underline underline-offset-2";
  return (
    <a
      href={explorerAddressUrl(address)}
      target="_blank"
      rel="noreferrer"
      className={inline ? `${base} font-mono` : `truncate ${base}`}
      title={address}
    >
      {text}
    </a>
  );
}
