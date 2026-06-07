import { approvalAgeBucketLabel } from "@/lib/approval-age/format";
import type { ApprovalAgeInfo } from "@/lib/approval-age/types";

export function ApprovalAgeBadge({
  approvalAge,
}: {
  approvalAge: ApprovalAgeInfo | undefined;
}) {
  const info =
    approvalAge ??
    ({
      bucket: "unknown",
      label: "Approval age unavailable",
      source: "unavailable",
      chainId: 0,
    } satisfies ApprovalAgeInfo);
  const tone = ageToneClass(info.bucket);

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
      title={
        info.unavailableReason ??
        (info.approvalBlockNumber
          ? `Approval event block ${info.approvalBlockNumber.toString()}`
          : undefined)
      }
    >
      <span>{info.label}</span>
      <span className="font-medium opacity-75">
        {approvalAgeBucketLabel(info.bucket)}
      </span>
    </span>
  );
}

function ageToneClass(bucket: ApprovalAgeInfo["bucket"]): string {
  switch (bucket) {
    case "new":
      return "border-pulse-green/35 bg-pulse-green/10 text-pulse-green";
    case "thirty_days_plus":
      return "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan";
    case "one_year_plus":
      return "border-amber-300/35 bg-amber-300/10 text-amber-100";
    case "ancient":
      return "border-pulse-red/40 bg-pulse-red/10 text-pulse-red";
    case "unknown":
    default:
      return "border-pulse-border bg-pulse-panel/55 text-pulse-muted";
  }
}
