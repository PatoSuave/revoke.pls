import { getAddress, isAddress, type Address } from "viem";

export type Erc6909RiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type Erc6909ScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export type Erc6909PermissionEvent =
  | Erc6909ApprovalEvent
  | Erc6909OperatorEvent;

export interface Erc6909BaseEvent {
  contractAddress: Address;
  owner: Address;
  spender: Address;
  blockNumber: number;
  transactionHash: string;
  explorerUrl: string | null;
  contractExplorerUrl: string | null;
}

export interface Erc6909ApprovalEvent extends Erc6909BaseEvent {
  kind: "approval";
  tokenId: string;
  amount: string;
  unlimited: boolean;
}

export interface Erc6909OperatorEvent extends Erc6909BaseEvent {
  kind: "operator";
  approved: boolean;
}

export interface Erc6909Evidence {
  title: string;
  description: string;
  riskLevel: Erc6909RiskLevel;
  event: Erc6909PermissionEvent;
}

export interface Erc6909Analysis {
  riskLevel: Erc6909RiskLevel;
  evidence: Erc6909Evidence[];
  events: Erc6909PermissionEvent[];
  summary: {
    checkedBlockRange: number;
    permissionEventCount: number;
    approvalEventCount: number;
    nonzeroApprovalEventCount: number;
    unlimitedApprovalEventCount: number;
    operatorEventCount: number;
    activeOperatorEventCount: number;
    uniqueContractCount: number;
    uniqueSpenderCount: number;
  };
  warnings: string[];
}

export interface LifeboatErc6909ApiResponse {
  ok: boolean;
  status: Erc6909ScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: Erc6909RiskLevel;
  evidence: Erc6909Evidence[];
  events: Erc6909PermissionEvent[];
  summary: Erc6909Analysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
  supported: boolean;
  supportNotes: string[];
}

export interface AnalyzeErc6909EventsOptions {
  events: readonly Erc6909PermissionEvent[];
  checkedBlockRange: number;
}

const MAX_UINT256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

export function analyzeErc6909Events({
  events,
  checkedBlockRange,
}: AnalyzeErc6909EventsOptions): Erc6909Analysis {
  const sortedEvents = [...events].sort((a, b) => b.blockNumber - a.blockNumber);
  const approvalEvents = sortedEvents.filter(isApprovalEvent);
  const operatorEvents = sortedEvents.filter(isOperatorEvent);
  const nonzeroApprovalEventCount = approvalEvents.filter(
    (event) => event.amount !== "0",
  ).length;
  const unlimitedApprovalEventCount = approvalEvents.filter(
    (event) => event.unlimited,
  ).length;
  const activeOperatorEventCount = operatorEvents.filter(
    (event) => event.approved,
  ).length;
  const uniqueContracts = new Set(
    sortedEvents.map((event) => event.contractAddress.toLowerCase()),
  );
  const uniqueSpenders = new Set(
    sortedEvents.map((event) => event.spender.toLowerCase()),
  );

  return {
    riskLevel: erc6909RiskLevel({
      eventCount: sortedEvents.length,
      nonzeroApprovalEventCount,
      unlimitedApprovalEventCount,
      activeOperatorEventCount,
    }),
    evidence: sortedEvents.slice(0, 10).map(eventToEvidence),
    events: sortedEvents,
    summary: {
      checkedBlockRange,
      permissionEventCount: sortedEvents.length,
      approvalEventCount: approvalEvents.length,
      nonzeroApprovalEventCount,
      unlimitedApprovalEventCount,
      operatorEventCount: operatorEvents.length,
      activeOperatorEventCount,
      uniqueContractCount: uniqueContracts.size,
      uniqueSpenderCount: uniqueSpenders.size,
    },
    warnings: [
      "This read-only diagnostic checks a bounded recent RPC log window for ERC-6909 Approval and OperatorSet events only. It does not read every historical event, prepare revokes, submit transactions, or prove current allowance state.",
      "No ERC-6909 event found in this bounded window does not prove the wallet has no multi-token approvals, operator permissions, wrapped-token exposure, or off-chain authorization risk.",
    ],
  };
}

export function emptyErc6909Summary(): Erc6909Analysis["summary"] {
  return {
    checkedBlockRange: 0,
    permissionEventCount: 0,
    approvalEventCount: 0,
    nonzeroApprovalEventCount: 0,
    unlimitedApprovalEventCount: 0,
    operatorEventCount: 0,
    activeOperatorEventCount: 0,
    uniqueContractCount: 0,
    uniqueSpenderCount: 0,
  };
}

export function normalizeErc6909Owner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function isErc6909UnlimitedAmount(amount: string | bigint): boolean {
  return amount.toString() === MAX_UINT256;
}

export function isErc6909BroadLogAddressFilterRequiredError(
  value: string,
): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("specify an address") ||
    normalized.includes("address in your request") ||
    normalized.includes("address filter")
  );
}

export function erc6909RiskLabel(riskLevel: Erc6909RiskLevel): string {
  switch (riskLevel) {
    case "elevated":
      return "ERC-6909 operator risk";
    case "possible":
      return "ERC-6909 allowance review";
    case "informational":
      return "ERC-6909 events found";
    case "none_detected":
      return "No recent ERC-6909 events";
    case "insufficient_data":
      return "Incomplete ERC-6909 check";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function eventToEvidence(event: Erc6909PermissionEvent): Erc6909Evidence {
  if (event.kind === "operator") {
    return {
      title: event.approved
        ? "Operator permission enabled"
        : "Operator permission disabled",
      description: event.approved
        ? `Spender ${event.spender} was recorded as an ERC-6909 operator for all token IDs in contract ${event.contractAddress}.`
        : `Spender ${event.spender} was recorded as no longer approved as an ERC-6909 operator in contract ${event.contractAddress}.`,
      riskLevel: event.approved ? "elevated" : "informational",
      event,
    };
  }

  if (event.amount === "0") {
    return {
      title: "Allowance set to zero",
      description: `Spender ${event.spender} was recorded with a zero ERC-6909 allowance for token ID ${event.tokenId}. This recent event alone is not a full historical state proof.`,
      riskLevel: "informational",
      event,
    };
  }

  return {
    title: event.unlimited
      ? "Infinite per-token allowance"
      : "Per-token allowance recorded",
    description: `Spender ${event.spender} was recorded with ERC-6909 allowance ${event.amount} for token ID ${event.tokenId} in contract ${event.contractAddress}.`,
    riskLevel: event.unlimited ? "elevated" : "possible",
    event,
  };
}

function erc6909RiskLevel({
  eventCount,
  nonzeroApprovalEventCount,
  unlimitedApprovalEventCount,
  activeOperatorEventCount,
}: {
  eventCount: number;
  nonzeroApprovalEventCount: number;
  unlimitedApprovalEventCount: number;
  activeOperatorEventCount: number;
}): Erc6909RiskLevel {
  if (activeOperatorEventCount > 0 || unlimitedApprovalEventCount > 0) {
    return "elevated";
  }
  if (nonzeroApprovalEventCount > 0) return "possible";
  if (eventCount > 0) return "informational";
  return "none_detected";
}

function isApprovalEvent(
  event: Erc6909PermissionEvent,
): event is Erc6909ApprovalEvent {
  return event.kind === "approval";
}

function isOperatorEvent(
  event: Erc6909PermissionEvent,
): event is Erc6909OperatorEvent {
  return event.kind === "operator";
}
