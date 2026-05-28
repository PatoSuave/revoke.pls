import type { ReactNode } from "react";

import { ChainLogo } from "@/components/chains/chain-logo";
import { explorerName, explorerTxUrl } from "@/lib/explorer";
import {
  getRevokeReceiptCopy,
  type RevokeReceiptKind,
  type RevokeReceiptStatus,
  type RevokeReceiptVerificationState,
} from "@/lib/revoke-receipt";

export interface RevokeReceiptDetails {
  kind: RevokeReceiptKind;
  chainId: number;
  chainName: string;
  assetLabel: "Token" | "Collection / token";
  assetValue: ReactNode;
  counterpartyLabel: "Spender" | "Operator";
  counterpartyValue: ReactNode;
  verificationState?: RevokeReceiptVerificationState;
}

export function RevokeReceipt({
  status,
  hash,
  errorMessage,
  details,
  onDismiss,
}: {
  status: RevokeReceiptStatus;
  hash?: `0x${string}`;
  errorMessage?: string;
  details: RevokeReceiptDetails;
  onDismiss?: () => void;
}) {
  const copy = getRevokeReceiptCopy({
    status,
    kind: details.kind,
    verificationState: details.verificationState,
  });
  const toneClass = receiptToneClass(status);
  const explorer = explorerName(details.chainId);

  return (
    <div className={`border-t px-4 py-4 text-xs sm:px-6 ${toneClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
            {copy.title}
          </p>
          <p className="mt-1 max-w-3xl leading-5">{copy.body}</p>
          {errorMessage ? (
            <p className="mt-2 max-w-3xl rounded-lg border border-current/20 bg-pulse-text/10 p-2 leading-5">
              {errorMessage}
            </p>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="self-start rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide hover:bg-pulse-text/5"
          >
            Dismiss
          </button>
        ) : null}
      </div>

      <dl className="mt-3 grid gap-3 rounded-xl border border-current/15 bg-pulse-bg/35 p-3 text-pulse-muted sm:grid-cols-2 xl:grid-cols-3">
        <ReceiptField
          label="Chain"
          value={
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/20 bg-pulse-bg/45">
                <ChainLogo chainId={details.chainId} className="h-4 w-4" />
              </span>
              <span className="truncate">{details.chainName}</span>
            </span>
          }
        />
        <ReceiptField label={details.assetLabel} value={details.assetValue} />
        <ReceiptField
          label={details.counterpartyLabel}
          value={details.counterpartyValue}
        />
        <ReceiptField label="Method" value={copy.method} mono />
        <ReceiptField
          label="Transaction"
          value={
            hash ? (
              <a
                href={explorerTxUrl(details.chainId, hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-pulse-cyan underline underline-offset-2 hover:text-pulse-text"
                title={`View on ${explorer}`}
              >
                View on explorer
              </a>
            ) : (
              "No transaction hash available."
            )
          }
        />
        <ReceiptField label="Verification" value={copy.verification} />
      </dl>
    </div>
  );
}

function ReceiptField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words leading-5 text-pulse-text ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function receiptToneClass(status: RevokeReceiptStatus): string {
  if (status === "success") {
    return "border-pulse-green/40 bg-pulse-green/10 text-pulse-green";
  }

  if (status === "error") {
    return "border-pulse-red/40 bg-pulse-red/10 text-pulse-red";
  }

  if (status === "rejected") {
    return "border-pulse-border/70 bg-pulse-bg/50 text-pulse-muted";
  }

  return "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan";
}
