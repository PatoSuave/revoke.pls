import type { Address } from "viem";

export type ApprovalAgeBucket =
  | "new"
  | "thirty_days_plus"
  | "one_year_plus"
  | "ancient"
  | "unknown";

export interface ApprovalAgeInfo {
  chainId: number;
  approvalTxHash?: `0x${string}`;
  approvalBlockNumber?: bigint;
  approvalTimestamp?: number;
  ageDays?: number;
  bucket: ApprovalAgeBucket;
  label: string;
  source:
    | "approval_event"
    | "explorer_history"
    | "scanner_metadata"
    | "unavailable";
  unavailableReason?: string;
}

export interface ApprovalAgeSummary {
  totalRows: number;
  rowsWithAge: number;
  rowsWithoutAge: number;
  oldestApprovalAgeDays?: number;
  oldestApprovalLabel?: string;
  approvalsToday: number;
  approvalsThirtyDaysPlus: number;
  approvalsOneYearPlus: number;
  ancientApprovals: number;
  unlimitedApprovals: number;
  nftOperatorApprovals: number;
  unknownSpenders: number;
}

export interface ApprovalWrappedSummary {
  generatedAt: string;
  owner: Address;
  chainsScanned: number[];
  approvalsReviewed: number;
  oldestApprovalAgeDays?: number;
  oldestApprovalLabel?: string;
  oldestApprovalChainName?: string;
  unlimitedApprovals: number;
  nftOperatorApprovals: number;
  unknownSpenders: number;
  oneYearPlusApprovals: number;
  ancientApprovals: number;
  mostApprovedChain?: {
    chainId: number;
    chainName: string;
    count: number;
  };
  roastLine?: string;
}
