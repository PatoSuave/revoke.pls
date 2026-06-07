import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { ApprovalAgeInfo, ApprovalWrappedSummary } from "@/lib/approval-age/types";
import { containsSafetyClaim } from "@/lib/approval-age/roasts";
import type { NftApproval } from "@/lib/nft-approvals";

interface BuildApprovalWrappedSummaryInput {
  owner: Address;
  approvals: readonly Approval[];
  nftApprovals: readonly NftApproval[];
  ageInfoByKey: ReadonlyMap<string, ApprovalAgeInfo>;
  chainNameById: ReadonlyMap<number, string>;
  chainsScanned: readonly number[];
  roastLine?: string;
  generatedAt?: string;
}

export function buildApprovalWrappedSummary({
  owner,
  approvals,
  nftApprovals,
  ageInfoByKey,
  chainNameById,
  chainsScanned,
  roastLine,
  generatedAt = new Date().toISOString(),
}: BuildApprovalWrappedSummaryInput): ApprovalWrappedSummary {
  const rows = [...approvals, ...nftApprovals];
  const oldest = rows.reduce<
    | {
        chainId: number;
        info: ApprovalAgeInfo & { ageDays: number };
      }
    | undefined
  >((current, row) => {
    const info = ageInfoByKey.get(row.key);
    if (!info || info.ageDays === undefined) return current;
    if (!current || info.ageDays > current.info.ageDays) {
      return { chainId: row.chainId, info: { ...info, ageDays: info.ageDays } };
    }
    return current;
  }, undefined);

  const chainCounts = rows.reduce((counts, row) => {
    counts.set(row.chainId, (counts.get(row.chainId) ?? 0) + 1);
    return counts;
  }, new Map<number, number>());

  const mostApprovedChain = [...chainCounts.entries()]
    .sort((a, b) => b[1] - a[1] || chainName(a[0], chainNameById).localeCompare(chainName(b[0], chainNameById)))
    .map(([chainId, count]) => ({
      chainId,
      chainName: chainName(chainId, chainNameById),
      count,
    }))[0];

  return {
    generatedAt,
    owner,
    chainsScanned: [...new Set(chainsScanned)],
    approvalsReviewed: rows.length,
    oldestApprovalAgeDays: oldest?.info.ageDays,
    oldestApprovalLabel: oldest?.info.label,
    oldestApprovalChainName:
      oldest === undefined ? undefined : chainName(oldest.chainId, chainNameById),
    unlimitedApprovals: approvals.filter((approval) => approval.unlimited).length,
    nftOperatorApprovals: nftApprovals.filter(
      (approval) => approval.kind === "approvalForAll",
    ).length,
    unknownSpenders:
      approvals.filter((approval) => !approval.trusted).length +
      nftApprovals.filter((approval) => !approval.trusted).length,
    oneYearPlusApprovals: rows.filter((row) => {
      const info = ageInfoByKey.get(row.key);
      return info?.ageDays !== undefined && info.ageDays >= 365;
    }).length,
    ancientApprovals: rows.filter((row) => {
      const info = ageInfoByKey.get(row.key);
      return info?.ageDays !== undefined && info.ageDays >= 1095;
    }).length,
    mostApprovedChain,
    roastLine,
  };
}

export function formatApprovalWrappedCopy(
  summary: ApprovalWrappedSummary,
): string {
  const lines = [
    "Pulse Revoke Approval Wrapped",
    `Approvals reviewed: ${summary.approvalsReviewed}`,
    `Oldest approval: ${
      summary.oldestApprovalLabel ?? "Approval age unavailable"
    }${
      summary.oldestApprovalChainName
        ? ` on ${summary.oldestApprovalChainName}`
        : ""
    }`,
    `Unlimited approvals: ${summary.unlimitedApprovals}`,
    `NFT operator approvals: ${summary.nftOperatorApprovals}`,
    `Unknown spenders: ${summary.unknownSpenders}`,
    `Ancient approvals: ${summary.ancientApprovals}`,
    summary.mostApprovedChain
      ? `Most approved chain: ${summary.mostApprovedChain.chainName} (${summary.mostApprovedChain.count})`
      : "Most approved chain: unavailable",
    summary.roastLine ? `Roast: ${summary.roastLine}` : undefined,
    "Scan first. Revoke only when ready.",
    "pulserevoke.com",
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

export function wrappedCopyHasBlockedContent(copy: string): boolean {
  if (containsSafetyClaim(copy)) return true;
  return [
    /\bbalance\b/i,
    /\bbalances\b/i,
    /\bdollar\b/i,
    /\busd\b/i,
    /\$\d/,
    /\brevoked\b/i,
  ].some((pattern) => pattern.test(copy));
}

function chainName(
  chainId: number,
  chainNameById: ReadonlyMap<number, string>,
): string {
  return chainNameById.get(chainId) ?? `Chain ${chainId}`;
}
