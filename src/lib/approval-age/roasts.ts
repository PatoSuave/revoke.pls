import type { ApprovalAgeSummary } from "@/lib/approval-age/types";

const MAX_ROAST_LINES = 5;

const SAFETY_CLAIM_PATTERNS = [
  /\bsafe\b/i,
  /\btrusted\b/i,
  /\brecovered\b/i,
  /\bguaranteed\b/i,
  /\ball clear\b/i,
];

export function generateApprovalRoasts(
  summary: ApprovalAgeSummary,
): readonly string[] {
  if (summary.totalRows === 0) {
    return [
      "This scan gave the wallet nothing spicy to explain, just an empty approval stage.",
    ];
  }

  const lines: string[] = [];

  if (summary.ancientApprovals > 0) {
    lines.push(
      `${countLabel(summary.ancientApprovals, "ancient approval")} ${verbFor(
        summary.ancientApprovals,
      )} old enough to have opinions about gas wars.`,
    );
  }

  if (summary.approvalsOneYearPlus > summary.ancientApprovals) {
    lines.push(
      `${countLabel(
        summary.approvalsOneYearPlus,
        "approval",
      )} have been hanging around for over a year like they pay rent.`,
    );
  }

  if (summary.unlimitedApprovals > 0) {
    lines.push(
      `${countLabel(
        summary.unlimitedApprovals,
        "unlimited approval",
      )} saw a spending cap and chose main character energy.`,
    );
  }

  if (summary.nftOperatorApprovals > 0) {
    lines.push(
      `${countLabel(
        summary.nftOperatorApprovals,
        "NFT operator approval",
      )} ${verbFor(
        summary.nftOperatorApprovals,
      )} holding collection keys like a shared office fridge code.`,
    );
  }

  if (summary.unknownSpenders > 0) {
    lines.push(
      `${countLabel(
        summary.unknownSpenders,
        "unknown spender",
      )} showed up with contract-address name tags.`,
    );
  }

  if (summary.rowsWithoutAge > 0) {
    lines.push(
      `${countLabel(
        summary.rowsWithoutAge,
        "approval",
      )} would not give up a timestamp, very on-brand for chain archaeology.`,
    );
  }

  if (summary.approvalsThirtyDaysPlus > summary.approvalsOneYearPlus) {
    lines.push(
      `${countLabel(
        summary.approvalsThirtyDaysPlus,
        "approval",
      )} crossed 30 days and started acting like permanent roommates.`,
    );
  }

  if (summary.approvalsToday > 0) {
    lines.push(
      `${countLabel(
        summary.approvalsToday,
        "approval",
      )} just arrived today and already wants a spot on the couch.`,
    );
  }

  if (lines.length === 0) {
    lines.push(
      "The approval list is quiet, which gives the roast department very little material.",
    );
  }

  return lines.slice(0, MAX_ROAST_LINES);
}

export function containsSafetyClaim(text: string): boolean {
  return SAFETY_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

export function shouldRevealRoastLines({
  completed,
  optedIn,
}: {
  completed: boolean;
  optedIn: boolean;
}): boolean {
  return completed && optedIn;
}

function countLabel(count: number, singular: string): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : `${singular}s`}`;
}

function verbFor(count: number): "is" | "are" {
  return count === 1 ? "is" : "are";
}
