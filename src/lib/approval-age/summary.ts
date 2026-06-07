import type { Approval } from "@/lib/approvals";
import type { NftApproval } from "@/lib/nft-approvals";
import type { ApprovalAgeInfo, ApprovalAgeSummary } from "@/lib/approval-age/types";

export function summarizeApprovalAges({
  approvals,
  nftApprovals,
  ageInfoByKey,
}: {
  approvals: readonly Approval[];
  nftApprovals: readonly NftApproval[];
  ageInfoByKey: ReadonlyMap<string, ApprovalAgeInfo>;
}): ApprovalAgeSummary {
  const rows = [...approvals, ...nftApprovals];
  const ageInfos = rows
    .map((row) => ageInfoByKey.get(row.key))
    .filter((info): info is ApprovalAgeInfo => Boolean(info));
  const knownAges = ageInfos.filter(
    (info): info is ApprovalAgeInfo & { ageDays: number } =>
      info.ageDays !== undefined,
  );
  const oldest = knownAges.reduce<
    (ApprovalAgeInfo & { ageDays: number }) | undefined
  >((current, info) => {
    if (!current || info.ageDays > current.ageDays) return info;
    return current;
  }, undefined);

  return {
    totalRows: rows.length,
    rowsWithAge: knownAges.length,
    rowsWithoutAge: rows.length - knownAges.length,
    oldestApprovalAgeDays: oldest?.ageDays,
    oldestApprovalLabel: oldest?.label,
    approvalsToday: knownAges.filter((info) => info.ageDays === 0).length,
    approvalsThirtyDaysPlus: knownAges.filter((info) => info.ageDays >= 30)
      .length,
    approvalsOneYearPlus: knownAges.filter((info) => info.ageDays >= 365)
      .length,
    ancientApprovals: knownAges.filter((info) => info.ageDays >= 1095).length,
    unlimitedApprovals: approvals.filter((approval) => approval.unlimited).length,
    nftOperatorApprovals: nftApprovals.filter(
      (approval) => approval.kind === "approvalForAll",
    ).length,
    unknownSpenders:
      approvals.filter((approval) => !approval.trusted).length +
      nftApprovals.filter((approval) => !approval.trusted).length,
  };
}
