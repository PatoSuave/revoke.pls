import type { ApprovalAgeBucket, ApprovalAgeInfo } from "@/lib/approval-age/types";

const SECONDS_PER_DAY = 86_400;

export function getApprovalAgeBucket(ageDays?: number): ApprovalAgeBucket {
  if (ageDays == null) return "unknown";
  if (ageDays < 30) return "new";
  if (ageDays < 365) return "thirty_days_plus";
  if (ageDays < 1095) return "one_year_plus";
  return "ancient";
}

export function approvalAgeBucketLabel(bucket: ApprovalAgeBucket): string {
  switch (bucket) {
    case "new":
      return "New";
    case "thirty_days_plus":
      return "30d+";
    case "one_year_plus":
      return "1yr+";
    case "ancient":
      return "Ancient approval";
    case "unknown":
    default:
      return "Unknown age";
  }
}

export function formatApprovalAge(ageDays?: number): string {
  if (ageDays == null) return "Approval age unavailable";
  if (ageDays === 0) return "Approved today";
  if (ageDays === 1) return "Approved yesterday";
  if (ageDays < 365) return `Approved ${ageDays} days ago`;

  const years = Math.floor(ageDays / 365);
  if (years === 1) return "Approved 1 year ago";
  return `Approved ${years} years ago`;
}

export function ageDaysFromTimestamp(
  approvalTimestamp: number,
  nowUnix = Math.floor(Date.now() / 1000),
): number {
  return Math.max(
    0,
    Math.floor((Math.max(0, nowUnix) - approvalTimestamp) / SECONDS_PER_DAY),
  );
}

export function buildApprovalAgeInfo({
  chainId,
  approvalBlockNumber,
  approvalTxHash,
  approvalTimestamp,
  unavailableReason,
  nowUnix,
}: {
  chainId: number;
  approvalBlockNumber?: bigint;
  approvalTxHash?: `0x${string}`;
  approvalTimestamp?: number;
  unavailableReason?: string;
  nowUnix?: number;
}): ApprovalAgeInfo {
  if (approvalTimestamp === undefined) {
    return {
      chainId,
      approvalBlockNumber,
      approvalTxHash,
      bucket: "unknown",
      label: "Approval age unavailable",
      source: "unavailable",
      unavailableReason:
        unavailableReason ??
        (approvalBlockNumber === undefined
          ? "Approval event block is unavailable."
          : "Approval event timestamp is unavailable."),
    };
  }

  const ageDays = ageDaysFromTimestamp(approvalTimestamp, nowUnix);
  return {
    chainId,
    approvalBlockNumber,
    approvalTxHash,
    approvalTimestamp,
    ageDays,
    bucket: getApprovalAgeBucket(ageDays),
    label: formatApprovalAge(ageDays),
    source: "approval_event",
  };
}
