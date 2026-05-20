import type { ReactNode } from "react";

import {
  CURRENT_APPROVAL_STATE_UNVERIFIED_TITLE,
  ZERO_ADDRESS_EXPLANATION_BODY,
  ZERO_ADDRESS_EXPLANATION_TITLE,
  getCurrentApprovalStateCopy,
  type ApprovalVerificationKind,
} from "@/lib/approval-verification-copy";
import type { SpenderProtocolMetadata } from "@/lib/registry";

export {
  CURRENT_APPROVAL_STATE_UNVERIFIED_BODY,
  CURRENT_APPROVAL_STATE_UNVERIFIED_TITLE,
  ZERO_ADDRESS_EXPLANATION_BODY,
  ZERO_ADDRESS_EXPLANATION_TITLE,
  getCurrentApprovalStateCopy,
  isCurrentApprovalStateUnverifiedReason,
} from "@/lib/approval-verification-copy";

export type { ApprovalVerificationKind } from "@/lib/approval-verification-copy";

export interface ApprovalMeaningItem {
  label: string;
  value: ReactNode;
}

export function ApprovalMeaningPanel({
  items,
  technicalDetails,
}: {
  items: readonly ApprovalMeaningItem[];
  technicalDetails?: ReactNode;
}) {
  return (
    <details className="group mx-4 mb-4 overflow-hidden rounded-xl border border-pulse-border/70 bg-pulse-bg/35 sm:mx-6 [&>summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-cyan transition hover:bg-pulse-text/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse-cyan">
        <span>What this approval means</span>
        <span
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-pulse-border text-pulse-muted transition group-open:rotate-45"
          aria-hidden
        >
          +
        </span>
      </summary>
      <div className="border-t border-pulse-border/60 p-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
                {item.label}
              </dt>
              <dd className="mt-1 leading-6 text-pulse-muted">{item.value}</dd>
            </div>
          ))}
        </dl>
        {technicalDetails ? (
          <div className="mt-3 border-t border-pulse-border/60 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
              Technical details
            </p>
            {technicalDetails}
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function CurrentApprovalStateSummary({
  kind,
}: {
  kind: ApprovalVerificationKind;
}) {
  const copy = getCurrentApprovalStateCopy(kind);

  return (
    <SummaryText
      primary={copy.title}
      secondary={
        <span className="block">
          <span className="block">{copy.body}</span>
          <span className="mt-1 block">{copy.method}</span>
        </span>
      }
    />
  );
}

export function CurrentApprovalStateInline({
  kind,
  className = "",
}: {
  kind: ApprovalVerificationKind;
  className?: string;
}) {
  const copy = getCurrentApprovalStateCopy(kind);

  return (
    <p className={`max-w-[16rem] text-[11px] leading-5 text-pulse-muted ${className}`}>
      <span className="font-semibold text-pulse-text">
        {CURRENT_APPROVAL_STATE_UNVERIFIED_TITLE}.
      </span>{" "}
      Revoke disabled until verified by a live contract read.{" "}
      {copy.method}
    </p>
  );
}

export function ZeroAddressSummary() {
  return (
    <SummaryText
      primary={ZERO_ADDRESS_EXPLANATION_TITLE}
      secondary={ZERO_ADDRESS_EXPLANATION_BODY}
    />
  );
}

export function ZeroAddressInline({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-[11px] leading-5 text-amber-100 ${className}`}
    >
      <span className="font-semibold text-amber-200">
        {ZERO_ADDRESS_EXPLANATION_TITLE}.
      </span>{" "}
      {ZERO_ADDRESS_EXPLANATION_BODY}
    </p>
  );
}

export function VerificationTechnicalExplainer() {
  return (
    <div className="mt-2 rounded-lg border border-pulse-border/70 bg-pulse-panel/35 p-2">
      <p className="font-semibold text-pulse-text">What needs to be verified?</p>
      <dl className="mt-2 grid gap-2">
        <div>
          <dt className="font-semibold text-pulse-muted">ERC-20 approvals</dt>
          <dd>
            The app reads{" "}
            <span className="font-mono text-pulse-text">
              allowance(owner, spender)
            </span>
            . A value greater than zero means the approval is still active.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-pulse-muted">
            ERC-721 per-token approvals
          </dt>
          <dd>
            The app reads{" "}
            <span className="font-mono text-pulse-text">
              getApproved(tokenId)
            </span>
            . The zero address means no current per-token approved address.
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-pulse-muted">
            ERC-721 / ERC-1155 operator approvals
          </dt>
          <dd>
            The app reads{" "}
            <span className="font-mono text-pulse-text">
              isApprovedForAll(owner, operator)
            </span>
            . A false result means the operator approval is no longer enabled.
          </dd>
        </div>
      </dl>
      <p className="mt-2">
        If these reads fail, Revoke.PLS keeps revoke disabled instead of
        guessing.
      </p>
    </div>
  );
}

export function SummaryText({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <span className="block min-w-0">
      <span className="block break-words font-semibold text-pulse-text">
        {primary}
      </span>
      {secondary ? (
        <span className="mt-0.5 block break-words text-xs leading-5 text-pulse-muted">
          {secondary}
        </span>
      ) : null}
    </span>
  );
}

export function protocolMetadataItems(
  metadata: SpenderProtocolMetadata | undefined,
): ApprovalMeaningItem[] {
  if (!metadata) return [];

  const items: ApprovalMeaningItem[] = [
    {
      label: "Known protocol",
      value: <SummaryText primary={metadata.protocolName} />,
    },
    {
      label: "Contract status",
      value: <SummaryText primary={contractStatusLabel(metadata.contractStatus)} />,
    },
    {
      label: "Source",
      value: (
        <a
          href={metadata.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-pulse-cyan underline underline-offset-2 hover:text-pulse-text"
        >
          {metadata.sourceLabel}
        </a>
      ),
    },
  ];

  if (metadata.assetLabel) {
    items.push({
      label: "Documented asset",
      value: <SummaryText primary={metadata.assetLabel} />,
    });
  }

  if (metadata.note) {
    items.push({
      label: "Note",
      value: metadata.note,
    });
  }

  return items;
}

export function riskSignalItems(
  drivers: readonly string[] | undefined,
): ApprovalMeaningItem[] {
  if (!drivers?.length) return [];

  return [
    {
      label: "Risk signals",
      value: (
        <ul className="grid gap-1">
          {drivers.map((driver) => (
            <li key={driver}>{driver}</li>
          ))}
        </ul>
      ),
    },
  ];
}

function contractStatusLabel(
  contractStatus: SpenderProtocolMetadata["contractStatus"],
): string {
  return contractStatus === "legacy" ? "Legacy contract" : "Current contract";
}
