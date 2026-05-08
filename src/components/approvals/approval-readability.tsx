import type { ReactNode } from "react";

import type { SpenderProtocolMetadata } from "@/lib/registry";

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
    <div className="mx-4 mb-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/35 p-4 sm:mx-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
        What this approval means
      </p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
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

function contractStatusLabel(
  contractStatus: SpenderProtocolMetadata["contractStatus"],
): string {
  return contractStatus === "legacy" ? "Legacy contract" : "Current contract";
}
