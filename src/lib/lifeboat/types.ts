import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type {
  AddressPoisoningEvidence,
  AddressPoisoningHistoryEvent,
  AddressPoisoningRiskLevel,
} from "@/lib/lifeboat/address-poisoning";
import type {
  PendingNonceEvidence,
  PendingNonceRiskLevel,
  PendingNonceAnalysis,
} from "@/lib/lifeboat/pending-nonce";
import type { SweeperEvidence, SweeperRiskLevel } from "@/lib/lifeboat/sweeper";
import type {
  TimelineEvidence,
  TimelineHistoryEvent,
  TimelineRiskLevel,
} from "@/lib/lifeboat/timeline";
import type { NftApproval } from "@/lib/nft-approvals";

export type LifeboatScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "partial"
  | "failed";

export type LifeboatModuleStatus =
  | "not_scanned"
  | "scanning"
  | "complete"
  | "partial"
  | "planned"
  | "unsupported"
  | "upstream_unavailable";

export type LifeboatRiskLevel =
  | "unknown"
  | "none_detected"
  | "visible_risk"
  | "possible"
  | "strong"
  | "incomplete";

export interface LifeboatCompleteness {
  approvalsComplete: boolean;
  nftApprovalsComplete: boolean;
  sweeperCheckComplete: boolean;
  pendingNonceCheckComplete: boolean;
  timelineCheckComplete: boolean;
  addressPoisoningCheckComplete: boolean;
  hexCheckComplete: boolean;
  permit2Complete: boolean;
  eip7702Complete: boolean;
  visibleAssetsComplete: boolean;
}

export interface LifeboatChainReport {
  chainId: number;
  chainName: string;
  activeApprovalCount: number;
  activeNftApprovalCount: number;
  approvalsStatus: LifeboatModuleStatus;
  nftApprovalsStatus: LifeboatModuleStatus;
  sweeperStatus: LifeboatModuleStatus;
  sweeperRiskLevel: SweeperRiskLevel;
  sweeperEvidence: SweeperEvidence[];
  pendingNonceStatus: LifeboatModuleStatus;
  pendingNonceRiskLevel: PendingNonceRiskLevel;
  pendingNonceEvidence: PendingNonceEvidence[];
  pendingNonceSummary: PendingNonceAnalysis["summary"];
  timelineStatus: LifeboatModuleStatus;
  timelineRiskLevel: TimelineRiskLevel;
  timelineEvents: TimelineHistoryEvent[];
  timelineEvidence: TimelineEvidence[];
  addressPoisoningStatus: LifeboatModuleStatus;
  addressPoisoningRiskLevel: AddressPoisoningRiskLevel;
  addressPoisoningEvidence: AddressPoisoningEvidence[];
  addressPoisoningEvents: AddressPoisoningHistoryEvent[];
  hexStatus: LifeboatModuleStatus;
  permit2Status: LifeboatModuleStatus;
  eip7702Status: LifeboatModuleStatus;
  visibleAssetsStatus: LifeboatModuleStatus;
  incompleteReasons: string[];
}

export interface LifeboatReport {
  owner: Address;
  chains: LifeboatChainReport[];
  generatedAt: string;
  status: LifeboatScanStatus;
  warnings: string[];
  completeness: LifeboatCompleteness;
}

export interface LifeboatScanSnapshot {
  owner: Address | null;
  chainId: number;
  chainName: string;
  status: LifeboatScanStatus;
  approvals: readonly Approval[];
  nftApprovals: readonly NftApproval[];
  approvalsStatus: LifeboatModuleStatus;
  nftApprovalsStatus: LifeboatModuleStatus;
  incompleteReasons: readonly string[];
}
