"use client";

import { useState } from "react";
import type { Address } from "viem";

import type { BatchItemResult } from "@/hooks/use-batch-revoke";
import { useRevokeApproval } from "@/hooks/use-revoke-approval";
import { getChainConfig } from "@/lib/chains";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/explorer";
import { shortenAddress } from "@/lib/format";
import type { Erc20PreflightResult } from "@/lib/preflight";
import type { RiskLevel, ScoredApproval } from "@/lib/risk";

export function ApprovalRow({
  approval,
  ownerAddress,
  onRevoked,
  selected = false,
  onToggleSelect,
  selectionDisabled = false,
  batchActive = false,
  batchResult,
}: {
  approval: ScoredApproval;
  ownerAddress: Address;
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
    preflight,
    isRefreshingApproval,
    refreshPreflight,
    revoke,
    reset,
  } = useRevokeApproval({
    target: {
      chainId: approval.chainId,
      tokenAddress: approval.tokenAddress,
      spenderAddress: approval.spenderAddress,
    },
    ownerAddress,
    tokenSymbol: approval.tokenSymbol,
    tokenDecimals: approval.tokenDecimals,
    onSuccess: (h) => {
      setConfirming(false);
      onRevoked?.(h);
    },
  });

  const chainConfig = getChainConfig(approval.chainId);
  const chainId = approval.chainId;
  const showConfirm =
    confirming && (status === "idle" || status === "refreshing") && !batchActive;
  const showStatus =
    status !== "idle" && status !== "refreshing" && !batchActive;

  return (
    <li
      className={`border-b border-pulse-border/60 transition last:border-b-0 ${
        selected ? "bg-pulse-purple/5" : "hover:bg-white/[0.025]"
      }`}
    >
      <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-[auto_1.15fr_1.45fr_1fr_auto] sm:items-center sm:gap-4">
        <div className="flex items-center sm:justify-center">
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
          <TokenAvatar symbol={approval.tokenSymbol} />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-pulse-text">
                {approval.tokenSymbol}
              </p>
              <RiskBadge risk={approval.risk} compact />
            </div>
            <ExplorerLink
              chainId={chainId}
              address={approval.tokenAddress}
              label={approval.tokenName}
            />
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-3 sm:border-0 sm:bg-transparent sm:p-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted sm:hidden">
            Spender
          </p>
          <p className="mt-1 truncate text-sm font-medium text-pulse-text sm:mt-0">
            {approval.spenderLabel}
          </p>
          <p className="truncate text-xs text-pulse-muted">
            <ExplorerLink chainId={chainId} address={approval.spenderAddress} inline />
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ProtocolBadge
              protocol={approval.protocol}
              category={approval.spenderCategory}
            />
            {approval.trusted ? (
              <TrustedBadge
                verificationMethod={approval.spenderVerificationMethod}
              />
            ) : (
              <UnverifiedBadge />
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5 rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-3 sm:border-0 sm:bg-transparent sm:p-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted sm:hidden">
            Exposure
          </p>
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

        <div className="flex justify-stretch sm:justify-end">
          {batchActive && batchResult ? (
            <BatchStatusPill result={batchResult} chainId={chainId} />
          ) : (
            <RowAction
              status={status}
              hash={hash}
              chainId={chainId}
              isBusy={isBusy || batchActive}
              confirming={confirming}
              onConfirmClick={() => {
                setConfirming(true);
                void refreshPreflight();
              }}
              onCancel={() => setConfirming(false)}
              onRetry={() => {
                reset();
                setConfirming(true);
                void refreshPreflight();
              }}
            />
          )}
        </div>
      </div>

      {showConfirm ? (
        <ConfirmPanel
          approval={approval}
          chainName={chainConfig?.displayName ?? "the network"}
          nativeSymbol={chainConfig?.nativeSymbol}
          onCancel={() => setConfirming(false)}
          preflight={preflight}
          isRefreshingApproval={isRefreshingApproval}
          onRefresh={() => void refreshPreflight()}
          onConfirm={() => {
            void revoke();
          }}
        />
      ) : null}

      {showStatus ? (
        <StatusPanel
          status={status}
          hash={hash}
          chainId={chainId}
          chainName={chainConfig?.displayName ?? "the network"}
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

function RiskBadge({
  risk,
  compact = false,
}: {
  risk: ScoredApproval["risk"];
  compact?: boolean;
}) {
  const style = RISK_STYLES[risk.level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide ${style.pill} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
      title={risk.reason}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}

const SPENDER_CATEGORY_LABEL: Record<string, string> = {
  router: "Router",
  dex: "DEX",
  bridge: "Bridge",
  staking: "Staking",
  farm: "Farm",
  permit2: "Permit2",
  unknown: "",
};

function ProtocolBadge({
  protocol,
  category,
}: {
  protocol: string;
  category?: string;
}) {
  const categoryLabel = category ? SPENDER_CATEGORY_LABEL[category] ?? "" : "";
  const title = categoryLabel
    ? `${protocol} / ${categoryLabel}`
    : protocol;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted"
      title={title}
    >
      {protocol}
      {categoryLabel ? (
        <span className="text-pulse-muted/70">/ {categoryLabel}</span>
      ) : null}
    </span>
  );
}

function TrustedBadge({
  verificationMethod,
}: {
  verificationMethod?: string;
}) {
  const title = verificationMethod
    ? `Known spender — ${verificationMethod} This is not an absolute safety claim.`
    : "Spender address matches a manually verified entry in the Pulse Revoke registry. This is not an absolute safety claim.";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-pulse-cyan/40 bg-pulse-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-cyan"
      title={title}
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
  chainId,
  isBusy,
  confirming,
  onConfirmClick,
  onCancel,
  onRetry,
}: {
  status: ReturnType<typeof useRevokeApproval>["status"];
  hash?: `0x${string}`;
  chainId: number;
  isBusy: boolean;
  confirming: boolean;
  onConfirmClick: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const base =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed sm:w-auto";

  if (status === "refreshing") {
    return (
      <span
        className={`${base} border border-pulse-cyan/40 bg-pulse-cyan/10 text-pulse-cyan`}
      >
        <Spinner /> Refreshing...
      </span>
    );
  }

  if (status === "wallet") {
    return (
      <span
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}
      >
        <Spinner /> Confirm in wallet...
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}
      >
        <Spinner /> Confirming...
        {hash ? <TxLink chainId={chainId} hash={hash} /> : null}
      </span>
    );
  }

  if (status === "success") {
    return (
      <span
        className={`${base} border border-pulse-green/40 bg-pulse-green/10 text-pulse-green`}
      >
        Revoked
        {hash ? <TxLink chainId={chainId} hash={hash} tone="success" /> : null}
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
      Review revoke
    </button>
  );
}

function ConfirmPanel({
  approval,
  chainName,
  nativeSymbol,
  onCancel,
  preflight,
  isRefreshingApproval,
  onRefresh,
  onConfirm,
}: {
  approval: ScoredApproval;
  chainName: string;
  nativeSymbol?: string;
  onCancel: () => void;
  preflight: Erc20PreflightResult | null;
  isRefreshingApproval: boolean;
  onRefresh: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = preflight?.status === "active" && !isRefreshingApproval;

  return (
    <div className="border-t border-pulse-border/60 bg-pulse-bg/50 px-4 py-4 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
            Review transaction
          </p>
          <p className="mt-1 font-medium text-pulse-text">
            Revoke{" "}
            <span className="font-semibold">{approval.tokenSymbol}</span>{" "}
            approval for{" "}
            <span className="font-semibold">{approval.spenderLabel}</span>?
          </p>
          <p className="mt-2 text-xs leading-5 text-pulse-muted">
            This requests one wallet transaction that sets the allowance to
            zero:{" "}
            <span className="font-mono text-pulse-text">
              approve({shortenAddress(approval.spenderAddress)}, 0)
            </span>{" "}
            on {chainName}
            {nativeSymbol ? `. Paid in ${nativeSymbol} gas.` : ". Gas fees apply."}
          </p>
          <p className="mt-1 text-xs leading-5 text-pulse-muted">
            Pulse Revoke cannot move funds. Your wallet shows the final
            transaction before you sign.
          </p>
          <PreflightNotice
            preflight={preflight}
            isRefreshingApproval={isRefreshingApproval}
          />
          <p className="mt-2 rounded-xl border border-pulse-border/70 bg-pulse-panel/45 p-3 text-xs leading-5 text-pulse-muted">
            {approval.risk.reason}
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-white/10 sm:flex-none"
          >
            Cancel
          </button>
          {canConfirm ? null : (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshingApproval}
              className="flex-1 rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {isRefreshingApproval ? "Refreshing..." : "Refresh"}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-xl bg-pulse-gradient px-3 py-2 text-xs font-semibold text-pulse-bg shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            Confirm revoke
          </button>
        </div>
      </div>
    </div>
  );
}

function PreflightNotice({
  preflight,
  isRefreshingApproval,
}: {
  preflight: Erc20PreflightResult | null;
  isRefreshingApproval: boolean;
}) {
  if (isRefreshingApproval) {
    return (
      <PreflightBox tone="info">
        <Spinner /> Refreshing current approval...
      </PreflightBox>
    );
  }

  if (!preflight) {
    return (
      <PreflightBox tone="info">
        Refreshing current approval before the wallet opens.
      </PreflightBox>
    );
  }

  if (preflight.status === "active") {
    return (
      <PreflightBox tone="success">
        Current allowance:{" "}
        <span className="font-mono text-pulse-text">
          {preflight.currentLabel ?? "active"}
        </span>
        . This approval is still active.
      </PreflightBox>
    );
  }

  if (preflight.status === "cleared") {
    return (
      <PreflightBox tone="success">
        Already cleared. Current allowance is zero, so no revoke transaction is
        needed.
      </PreflightBox>
    );
  }

  return (
    <PreflightBox tone="warning">
      Could not verify the current allowance
      {preflight.error ? ` (${preflight.error})` : ""}. No revoke transaction
      will be sent from this prompt.
    </PreflightBox>
  );
}

function PreflightBox({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "info" | "success" | "warning";
}) {
  const toneClass = {
    info: "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan",
    success: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  }[tone];

  return (
    <p
      className={`mt-3 flex items-center gap-2 rounded-xl border p-3 text-xs leading-5 ${toneClass}`}
    >
      {children}
    </p>
  );
}

function StatusPanel({
  status,
  hash,
  chainId,
  chainName,
  errorMessage,
  onDismiss,
}: {
  status: ReturnType<typeof useRevokeApproval>["status"];
  hash?: `0x${string}`;
  chainId: number;
  chainName: string;
  errorMessage?: string;
  onDismiss: () => void;
}) {
  if (status === "wallet") {
    return (
      <StatusRow tone="info">
        Open your wallet and review the approval reset before signing.
      </StatusRow>
    );
  }

  if (status === "pending") {
    return (
      <StatusRow tone="info">
        Transaction submitted. Waiting for {chainName} confirmation.
        {hash ? (
          <>
            {" "}
            <TxLink chainId={chainId} hash={hash} />
          </>
        ) : null}
      </StatusRow>
    );
  }

  if (status === "success") {
    return (
      <StatusRow tone="success" onDismiss={onDismiss}>
        Approval revoked on-chain.
        {hash ? (
          <>
            {" "}
            <TxLink chainId={chainId} hash={hash} tone="success" />
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

function BatchStatusPill({
  result,
  chainId,
}: {
  result: BatchItemResult;
  chainId: number;
}) {
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

  if (result.status === "refreshing") {
    return (
      <span
        className={`${base} border border-pulse-cyan/40 bg-pulse-cyan/10 text-pulse-cyan`}
      >
        <Spinner /> Refreshing
      </span>
    );
  }

  if (result.status === "wallet") {
    return (
      <span
        className={`${base} border border-pulse-cyan/40 bg-pulse-cyan/10 text-pulse-cyan`}
      >
        <Spinner /> Confirm in wallet...
      </span>
    );
  }

  if (result.status === "submitted") {
    return (
      <span
        className={`${base} border border-pulse-cyan/40 bg-pulse-cyan/10 text-pulse-cyan`}
      >
        <Spinner /> Confirming...
        {result.hash ? <TxLink chainId={chainId} hash={result.hash} /> : null}
      </span>
    );
  }

  if (result.status === "success") {
    return (
      <span
        className={`${base} border border-pulse-green/40 bg-pulse-green/10 text-pulse-green`}
      >
        Revoked
        {result.hash ? (
          <TxLink chainId={chainId} hash={result.hash} tone="success" />
        ) : null}
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

  if (result.status === "cleared") {
    return (
      <span
        className={`${base} border border-pulse-green/40 bg-pulse-green/10 text-pulse-green`}
      >
        Already cleared
      </span>
    );
  }

  if (result.status === "unverified") {
    return (
      <span
        className={`${base} border border-amber-400/40 bg-amber-400/10 text-amber-200`}
        title={result.error}
      >
        Unverified
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
  chainId,
  hash,
  tone = "muted",
}: {
  chainId: number;
  hash: `0x${string}`;
  tone?: "muted" | "success";
}) {
  const cls =
    tone === "success"
      ? "underline underline-offset-2 hover:text-pulse-green"
      : "underline underline-offset-2 hover:text-pulse-cyan";
  return (
    <a
      href={explorerTxUrl(chainId, hash)}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-[11px] font-semibold ${cls}`}
    >
      view tx
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
  chainId,
  address,
  label,
  inline,
}: {
  chainId: number;
  address: string;
  label?: string;
  inline?: boolean;
}) {
  const text = label ?? shortenAddress(address);
  const base =
    "text-xs text-pulse-muted hover:text-pulse-cyan hover:underline underline-offset-2";
  return (
    <a
      href={explorerAddressUrl(chainId, address)}
      target="_blank"
      rel="noopener noreferrer"
      className={inline ? `${base} font-mono` : `truncate ${base}`}
      title={address}
    >
      {text}
    </a>
  );
}
