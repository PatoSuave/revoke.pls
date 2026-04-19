"use client";

import { useState } from "react";

import { useRevokeNftApproval } from "@/hooks/use-revoke-nft-approval";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/explorer";
import { shortenAddress } from "@/lib/format";
import type { NftApproval, NftStandard } from "@/lib/nft-approvals";
import type { RiskLevel } from "@/lib/risk";

export function NftApprovalRow({
  approval,
  onRevoked,
}: {
  approval: NftApproval;
  onRevoked?: (hash: `0x${string}`) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const { status, hash, errorMessage, isBusy, revoke, reset } =
    useRevokeNftApproval({
      target: approval,
      onSuccess: (h) => {
        setConfirming(false);
        onRevoked?.(h);
      },
    });

  const showConfirm = confirming && status === "idle";
  const showStatus = status !== "idle";

  const tokenIdLabel =
    approval.kind === "tokenApproval" && approval.tokenId !== undefined
      ? `#${approval.tokenId.toString()}`
      : null;

  return (
    <li className="border-b border-pulse-border/60 last:border-b-0">
      <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[1.2fr_1.5fr_1fr_auto] sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <RiskDot level={approval.risk.level} />
          <CollectionAvatar name={approval.collectionName ?? "NFT"} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-pulse-text">
              {approval.collectionName ?? "Unnamed collection"}
              {tokenIdLabel ? (
                <span className="ml-1.5 font-mono text-xs text-pulse-muted">
                  {tokenIdLabel}
                </span>
              ) : null}
            </p>
            <ExplorerLink address={approval.collectionAddress} />
          </div>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-pulse-text">
            {approval.operatorLabel}
          </p>
          <p className="truncate text-xs text-pulse-muted">
            <ExplorerLink address={approval.operatorAddress} inline />
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StandardBadge standard={approval.standard} />
            <KindBadge kind={approval.kind} />
            {approval.trusted ? (
              <TrustedBadge
                verificationMethod={approval.operatorVerificationMethod}
              />
            ) : (
              <UnverifiedBadge />
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5">
          <RiskBadge risk={approval.risk} />
          <span className="text-[11px] text-pulse-muted">
            {approval.kind === "approvalForAll"
              ? "Collection-wide"
              : "Single NFT"}
          </span>
        </div>

        <div className="flex justify-start sm:justify-end">
          <RowAction
            status={status}
            hash={hash}
            isBusy={isBusy}
            confirming={confirming}
            onConfirmClick={() => setConfirming(true)}
            onCancel={() => setConfirming(false)}
            onRetry={() => {
              reset();
              setConfirming(true);
            }}
          />
        </div>
      </div>

      {showConfirm ? (
        <ConfirmPanel
          approval={approval}
          onCancel={() => setConfirming(false)}
          onConfirm={() => revoke()}
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

function RiskBadge({ risk }: { risk: NftApproval["risk"] }) {
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

function StandardBadge({ standard }: { standard: NftStandard }) {
  const label =
    standard === "erc721"
      ? "ERC-721"
      : standard === "erc1155"
      ? "ERC-1155"
      : "Standard unknown";
  return (
    <span
      className="inline-flex items-center rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted"
      title={
        standard === "unknown"
          ? "Collection did not report a standard via ERC-165."
          : `Detected via ERC-165 supportsInterface.`
      }
    >
      {label}
    </span>
  );
}

function KindBadge({ kind }: { kind: NftApproval["kind"] }) {
  const label = kind === "approvalForAll" ? "Operator (all)" : "Per-token";
  const title =
    kind === "approvalForAll"
      ? "ApprovalForAll — the operator can move every NFT in this collection."
      : "Per-token approve — the operator can move a single tokenId.";
  return (
    <span
      className="inline-flex items-center rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted"
      title={title}
    >
      {label}
    </span>
  );
}

function TrustedBadge({
  verificationMethod,
}: {
  verificationMethod?: string;
}) {
  const title = verificationMethod
    ? `Known operator — ${verificationMethod} This is not an absolute safety claim.`
    : "Operator address matches a manually verified entry in the Pulse Revoke registry. This is not an absolute safety claim.";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-pulse-cyan/40 bg-pulse-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-cyan"
      title={title}
    >
      Known
    </span>
  );
}

function UnverifiedBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted"
      title="This operator is not in the verified registry. Verify the contract before leaving an approval in place."
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
  status: ReturnType<typeof useRevokeNftApproval>["status"];
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
  approval: NftApproval;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const summary =
    approval.kind === "approvalForAll"
      ? `Sends setApprovalForAll(${shortenAddress(
          approval.operatorAddress,
        )}, false) on-chain. This clears collection-wide operator access. Gas fees apply.`
      : `Sends approve(0x0, ${approval.tokenId?.toString()}) on-chain. This clears the per-token approval. The call will revert if you no longer own the NFT. Gas fees apply.`;

  return (
    <div className="border-t border-pulse-border/60 bg-pulse-bg/50 px-4 py-4 sm:px-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium text-pulse-text">
            Revoke{" "}
            <span className="font-semibold">
              {approval.collectionName ?? shortenAddress(approval.collectionAddress)}
            </span>{" "}
            approval for{" "}
            <span className="font-semibold">{approval.operatorLabel}</span>?
          </p>
          <p className="mt-1 text-xs text-pulse-muted">{summary}</p>
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
  status: ReturnType<typeof useRevokeNftApproval>["status"];
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
      <StatusRow tone="success" onDismiss={onDismiss}>
        NFT approval revoked on-chain.
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

function CollectionAvatar({ name }: { name: string }) {
  const initials = name.slice(0, 3).toUpperCase();
  return (
    <div
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pulse-gradient text-[10px] font-bold text-pulse-bg"
    >
      {initials}
    </div>
  );
}

function ExplorerLink({
  address,
  inline,
}: {
  address: string;
  inline?: boolean;
}) {
  const text = shortenAddress(address);
  const base =
    "text-xs text-pulse-muted hover:text-pulse-cyan hover:underline underline-offset-2";
  return (
    <a
      href={explorerAddressUrl(address)}
      target="_blank"
      rel="noreferrer"
      className={inline ? `${base} font-mono` : `truncate ${base} font-mono`}
      title={address}
    >
      {text}
    </a>
  );
}
