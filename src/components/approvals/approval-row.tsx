"use client";

import { useState } from "react";

import type { BatchItemResult } from "@/hooks/use-batch-revoke";
import { useRevokeApproval } from "@/hooks/use-revoke-approval";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/explorer";
import { shortenAddress } from "@/lib/format";
import type { RiskLevel, ScoredApproval } from "@/lib/risk";

export function ApprovalRow({
  approval,
  onRevoked,
  selected = false,
  onToggleSelect,
  selectionDisabled = false,
  batchActive = false,
  batchResult,
}: {
  approval: ScoredApproval;
  onRevoked?: (hash: `0x${string}`) => void;
  selected?: boolean;
  onToggleSelect?: (key: string) => void;
  selectionDisabled?: boolean;
  batchActive?: boolean;
  batchResult?: BatchItemResult;
}) {
  const [confirming, setConfirming] = useState(false);

  const {
    status,
    hash,
    errorMessage,
    isBusy,
    revoke,
    reset,
  } = useRevokeApproval({
    target: {
      tokenAddress: approval.tokenAddress,
      spenderAddress: approval.spenderAddress,
    },
    onSuccess: (h) => {
      setConfirming(false);
      onRevoked?.(h);
    },
  });

  const showConfirm = confirming && status === "idle" && !batchActive;
  const showStatus = status !== "idle" && !batchActive;

  return (
    <li className="border-b border-pulse-border/60 last:border-b-0">
      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[auto_1.2fr_1.5fr_1fr_auto] sm:items-center sm:gap-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(approval.key)}
            disabled={selectionDisabled || !onToggleSelect}
            aria-label={`Select ${approval.tokenSymbol} approval for ${approval.spenderLabel}`}
            className="h-4 w-4 cursor-pointer accent-pulse-purple disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <RiskDot level={approval.risk.level} />
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
            <ExplorerLink address={approval.spenderAddress} inline />
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ProtocolBadge protocol={approval.protocol} />
            {approval.trusted ? <TrustedBadge /> : <UnverifiedBadge />}
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5">
          <RiskBadge risk={approval.risk} />
          {approval.unlimited ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pulse-red/40 bg-pulse-red/10 px-2.5 py-1 text-xs font-semibold text-pulse-red">
              <span
                className="h-1.5 w-1.5 rounded-full bg-pulse-red"
                aria-hidden
              />
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

        <div className="flex justify-start sm:justify-end">
          {batchActive && batchResult ? (
            <BatchStatusPill result={batchResult} />
          ) : (
            <RowAction
              status={status}
              hash={hash}
              isBusy={isBusy || batchActive}
              confirming={confirming}
              onConfirmClick={() => setConfirming(true)}
              onCancel={() => setConfirming(false)}
              onRetry={() => {
                reset();
                setConfirming(true);
              }}
            />
          )}
        </div>
      </div>

      {showConfirm ? (
        <ConfirmPanel
          approval={approval}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            revoke();
          }}
        />
      ) : null}

      {showStatus ? (
        <StatusPanel
          status={status}
          hash={hash}
          errorMessage={errorMessage}
          onDismiss={reset}
        />
      ) : null}
    </li>
  );
}

const RISK_STYLES: Record<
  RiskLevel,
  { pill: string; dot: string; label: string }
> = {
  low: {
    pill: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    dot: "bg-pulse-green",
    label: "Low risk",
  },
  medium: {
    pill: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-300",
    label: "Medium risk",
  },
  high: {
    pill: "border-pulse-red/50 bg-pulse-red/15 text-pulse-red",
    dot: "bg-pulse-red",
    label: "High risk",
  },
};

function RiskBadge({ risk }: { risk: ScoredApproval["risk"] }) {
  const style = RISK_STYLES[risk.level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${style.pill}`}
      title={risk.reason}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}

function RiskDot({ level }: { level: RiskLevel }) {
  const style = RISK_STYLES[level];
  return (
    <span
      aria-hidden
      className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`}
    />
  );
}

function ProtocolBadge({ protocol }: { protocol: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted">
      {protocol}
    </span>
  );
}

function TrustedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-pulse-cyan/40 bg-pulse-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-cyan"
      title="Spender address matches a manually verified entry in the Pulse Revoke registry. This is not an absolute safety claim."
    >
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 6.5 L5 9 L9.5 3.5" />
      </svg>
      Known
    </span>
  );
}

function UnverifiedBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted"
      title="This spender is not in the verified registry. Verify the contract before leaving an allowance in place."
    >
      Unverified
    </span>
  );
}

function RowAction({
  status,
  hash,
  isBusy,
  confirming,
  onConfirmClick,
  onCancel,
  onRetry,
}: {
  status: ReturnType<typeof useRevokeApproval>["status"];
  hash?: `0x${string}`;
  isBusy: boolean;
  confirming: boolean;
  onConfirmClick: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed";

  if (status === "wallet") {
    return (
      <span
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}
      >
        <Spinner /> Confirm in wallet…
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}
      >
        <Spinner /> Confirming…
        {hash ? <TxLink hash={hash} /> : null}
      </span>
    );
  }

  if (status === "success") {
    return (
      <span
        className={`${base} border border-pulse-green/40 bg-pulse-green/10 text-pulse-green`}
      >
        Revoked
        {hash ? <TxLink hash={hash} tone="success" /> : null}
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={`${base} border border-pulse-red/40 bg-pulse-red/10 text-pulse-red hover:bg-pulse-red/20`}
      >
        Retry
      </button>
    );
  }

  if (status === "rejected") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={`${base} border border-pulse-border bg-white/5 text-pulse-text hover:bg-white/10`}
      >
        Try again
      </button>
    );
  }

  if (confirming) {
    return (
      <button
        type="button"
        onClick={onCancel}
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted hover:bg-white/10`}
      >
        Cancel
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onConfirmClick}
      disabled={isBusy}
      className={`${base} bg-pulse-gradient text-pulse-bg shadow-glow hover:brightness-110 active:brightness-95`}
    >
      Revoke
    </button>
  );
}

function ConfirmPanel({
  approval,
  onCancel,
  onConfirm,
}: {
  approval: ScoredApproval;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="border-t border-pulse-border/60 bg-pulse-bg/50 px-4 py-4 sm:px-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium text-pulse-text">
            Revoke{" "}
            <span className="font-semibold">{approval.tokenSymbol}</span>{" "}
            approval for{" "}
            <span className="font-semibold">{approval.spenderLabel}</span>?
          </p>
          <p className="mt-1 text-xs text-pulse-muted">
            Sends{" "}
            <span className="font-mono text-pulse-text">
              approve({shortenAddress(approval.spenderAddress)}, 0)
            </span>{" "}
            on-chain. Gas fees apply.
          </p>
          <p className="mt-1 text-xs text-pulse-muted">{approval.risk.reason}</p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-white/10 sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-pulse-gradient px-3 py-2 text-xs font-semibold text-pulse-bg shadow-glow transition hover:brightness-110 sm:flex-none"
          >
            Confirm revoke
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPanel({
  status,
  hash,
  errorMessage,
  onDismiss,
}: {
  status: ReturnType<typeof useRevokeApproval>["status"];
  hash?: `0x${string}`;
  errorMessage?: string;
  onDismiss: () => void;
}) {
  if (status === "wallet") {
    return (
      <StatusRow tone="info">
        Open your wallet to approve the revoke transaction.
      </StatusRow>
    );
  }

  if (status === "pending") {
    return (
      <StatusRow tone="info">
        Waiting for PulseChain to confirm the revoke transaction.
        {hash ? (
          <>
            {" "}
            <TxLink hash={hash} />
          </>
        ) : null}
      </StatusRow>
    );
  }

  if (status === "success") {
    return (
      <StatusRow tone="success">
        Approval revoked on-chain.
        {hash ? (
          <>
            {" "}
            <TxLink hash={hash} tone="success" />
          </>
        ) : null}
      </StatusRow>
    );
  }

  if (status === "rejected") {
    return (
      <StatusRow tone="muted" onDismiss={onDismiss}>
        {errorMessage ?? "Transaction rejected in wallet."}
      </StatusRow>
    );
  }

  if (status === "error") {
    return (
      <StatusRow tone="error" onDismiss={onDismiss}>
        {errorMessage ?? "Revoke failed."}
      </StatusRow>
    );
  }

  return null;
}

function StatusRow({
  children,
  tone,
  onDismiss,
}: {
  children: React.ReactNode;
  tone: "info" | "success" | "error" | "muted";
  onDismiss?: () => void;
}) {
  const toneClass = {
    info: "border-pulse-border/70 bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    error: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
    muted: "border-pulse-border/70 bg-pulse-bg/50 text-pulse-muted",
  }[tone];

  return (
    <div
      className={`flex items-start justify-between gap-3 border-t px-4 py-3 text-xs sm:px-6 ${toneClass}`}
    >
      <p className="flex-1">{children}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/5"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

function BatchStatusPill({ result }: { result: BatchItemResult }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold";

  if (result.status === "queued") {
    return (
      <span
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}
      >
        Queued
      </span>
    );
  }

  if (result.status === "wallet") {
    return (
      <span
        className={`${base} border border-pulse-cyan/40 bg-pulse-cyan/10 text-pulse-cyan`}
      >
        <Spinner /> Confirm in wallet…
      </span>
    );
  }

  if (result.status === "submitted") {
    return (
      <span
        className={`${base} border border-pulse-cyan/40 bg-pulse-cyan/10 text-pulse-cyan`}
      >
        <Spinner /> Confirming…
        {result.hash ? <TxLink hash={result.hash} /> : null}
      </span>
    );
  }

  if (result.status === "success") {
    return (
      <span
        className={`${base} border border-pulse-green/40 bg-pulse-green/10 text-pulse-green`}
      >
        Revoked
        {result.hash ? <TxLink hash={result.hash} tone="success" /> : null}
      </span>
    );
  }

  if (result.status === "rejected") {
    return (
      <span
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}
      >
        Rejected
      </span>
    );
  }

  if (result.status === "skipped") {
    return (
      <span
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}
      >
        Skipped
      </span>
    );
  }

  return (
    <span
      className={`${base} border border-pulse-red/40 bg-pulse-red/10 text-pulse-red`}
      title={result.error}
    >
      Failed
    </span>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

function TxLink({
  hash,
  tone = "muted",
}: {
  hash: `0x${string}`;
  tone?: "muted" | "success";
}) {
  const cls =
    tone === "success"
      ? "underline underline-offset-2 hover:text-pulse-green"
      : "underline underline-offset-2 hover:text-pulse-cyan";
  return (
    <a
      href={explorerTxUrl(hash)}
      target="_blank"
      rel="noreferrer"
      className={`text-[11px] font-semibold ${cls}`}
    >
      view tx ↗
    </a>
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
