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
import type {
  Eip7702Evidence,
  Eip7702RiskLevel,
} from "@/lib/lifeboat/eip7702";
import type {
  SmartWalletEvidence,
  SmartWalletRiskLevel,
} from "@/lib/lifeboat/smart-wallet";
import type {
  Erc4337Evidence,
  Erc4337RiskLevel,
  Erc4337UserOperationEvent,
} from "@/lib/lifeboat/erc4337";
import type {
  Erc6909Evidence,
  Erc6909PermissionEvent,
  Erc6909RiskLevel,
} from "@/lib/lifeboat/erc6909";
import type {
  DustTrapEvidence,
  DustTrapRiskLevel,
  DustTrapTransfer,
} from "@/lib/lifeboat/dust-trap";
import type {
  HexStakeEvidence,
  HexStakeRiskLevel,
  HexStakeRow,
} from "@/lib/lifeboat/hex-stake";
import type {
  GoodAccountingAssistEvidence,
  GoodAccountingAssistRiskLevel,
  GoodAccountingCandidate,
} from "@/lib/lifeboat/good-accounting";
import type {
  Permit2ExposureEvidence,
  Permit2ExposureRiskLevel,
} from "@/lib/lifeboat/permit2-exposure";
import type {
  SpenderContractSignal,
  SpenderRiskEvidence,
  SpenderRiskLevel,
} from "@/lib/lifeboat/spender-risk";
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
  spenderRiskCheckComplete: boolean;
  hexStakeCheckComplete: boolean;
  goodAccountingAssistComplete: boolean;
  permit2Complete: boolean;
  eip7702Complete: boolean;
  smartWalletComplete: boolean;
  erc4337Complete: boolean;
  erc6909Complete: boolean;
  dustTrapCheckComplete: boolean;
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
  spenderRiskStatus: LifeboatModuleStatus;
  spenderRiskLevel: SpenderRiskLevel;
  spenderRiskEvidence: SpenderRiskEvidence[];
  spenderRiskSpenders: SpenderContractSignal[];
  hexStatus: LifeboatModuleStatus;
  hexStakeRiskLevel: HexStakeRiskLevel;
  hexStakeEvidence: HexStakeEvidence[];
  hexStakeRows: HexStakeRow[];
  goodAccountingStatus: LifeboatModuleStatus;
  goodAccountingRiskLevel: GoodAccountingAssistRiskLevel;
  goodAccountingEvidence: GoodAccountingAssistEvidence[];
  goodAccountingCandidates: GoodAccountingCandidate[];
  permit2Status: LifeboatModuleStatus;
  permit2RiskLevel: Permit2ExposureRiskLevel;
  permit2Evidence: Permit2ExposureEvidence[];
  eip7702Status: LifeboatModuleStatus;
  eip7702RiskLevel: Eip7702RiskLevel;
  eip7702Evidence: Eip7702Evidence[];
  smartWalletStatus: LifeboatModuleStatus;
  smartWalletRiskLevel: SmartWalletRiskLevel;
  smartWalletEvidence: SmartWalletEvidence[];
  erc4337Status: LifeboatModuleStatus;
  erc4337RiskLevel: Erc4337RiskLevel;
  erc4337Evidence: Erc4337Evidence[];
  erc4337Events: Erc4337UserOperationEvent[];
  erc6909Status: LifeboatModuleStatus;
  erc6909RiskLevel: Erc6909RiskLevel;
  erc6909Evidence: Erc6909Evidence[];
  erc6909Events: Erc6909PermissionEvent[];
  dustTrapStatus: LifeboatModuleStatus;
  dustTrapRiskLevel: DustTrapRiskLevel;
  dustTrapEvidence: DustTrapEvidence[];
  dustTrapTransfers: DustTrapTransfer[];
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
