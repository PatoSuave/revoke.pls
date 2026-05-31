import { getAddress, isAddress, type Address } from "viem";

export type Erc4337RiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type Erc4337ScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export interface Erc4337UserOperationEvent {
  entryPointVersion: string;
  entryPointAddress: Address;
  userOpHash: string;
  sender: Address;
  paymaster: Address | null;
  nonce: string;
  success: boolean;
  actualGasCostWei: string;
  actualGasUsed: string;
  blockNumber: number;
  transactionHash: string;
  explorerUrl: string | null;
}

export interface Erc4337Evidence {
  title: string;
  description: string;
  riskLevel: Erc4337RiskLevel;
  event: Erc4337UserOperationEvent;
}

export interface Erc4337Analysis {
  riskLevel: Erc4337RiskLevel;
  evidence: Erc4337Evidence[];
  events: Erc4337UserOperationEvent[];
  summary: {
    checkedEntryPointCount: number;
    checkedBlockRange: number;
    userOperationCount: number;
    failedUserOperationCount: number;
    paymasterUserOperationCount: number;
    uniquePaymasterCount: number;
    hasAccountCode: boolean;
  };
  warnings: string[];
}

export interface LifeboatErc4337ApiResponse {
  ok: boolean;
  status: Erc4337ScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: Erc4337RiskLevel;
  evidence: Erc4337Evidence[];
  events: Erc4337UserOperationEvent[];
  summary: Erc4337Analysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
  supported: boolean;
  supportNotes: string[];
}

export interface AnalyzeErc4337ActivityOptions {
  events: readonly Erc4337UserOperationEvent[];
  checkedEntryPointCount: number;
  checkedBlockRange: number;
  hasAccountCode: boolean;
}

export function analyzeErc4337Activity({
  events,
  checkedEntryPointCount,
  checkedBlockRange,
  hasAccountCode,
}: AnalyzeErc4337ActivityOptions): Erc4337Analysis {
  const sortedEvents = [...events].sort((a, b) => b.blockNumber - a.blockNumber);
  const failedUserOperationCount = sortedEvents.filter(
    (event) => !event.success,
  ).length;
  const paymasters = new Set(
    sortedEvents
      .map((event) => event.paymaster?.toLowerCase())
      .filter((paymaster): paymaster is string => Boolean(paymaster)),
  );
  const paymasterUserOperationCount = sortedEvents.filter((event) =>
    Boolean(event.paymaster),
  ).length;
  const evidence = sortedEvents.slice(0, 8).map(eventToEvidence);

  return {
    riskLevel: erc4337RiskLevel({
      eventCount: sortedEvents.length,
      failedUserOperationCount,
      paymasterUserOperationCount,
      hasAccountCode,
    }),
    evidence,
    events: sortedEvents,
    summary: {
      checkedEntryPointCount,
      checkedBlockRange,
      userOperationCount: sortedEvents.length,
      failedUserOperationCount,
      paymasterUserOperationCount,
      uniquePaymasterCount: paymasters.size,
      hasAccountCode,
    },
    warnings: [
      "This read-only diagnostic checks recent EntryPoint UserOperationEvent logs only. It does not contact bundlers, request signatures, submit UserOperations, use paymasters, or clear session keys.",
      "No ERC-4337 activity found in this bounded window does not prove the wallet has no account-abstraction, session-key, module, delegation, or off-chain authorization risk.",
    ],
  };
}

export function emptyErc4337Summary(): Erc4337Analysis["summary"] {
  return {
    checkedEntryPointCount: 0,
    checkedBlockRange: 0,
    userOperationCount: 0,
    failedUserOperationCount: 0,
    paymasterUserOperationCount: 0,
    uniquePaymasterCount: 0,
    hasAccountCode: false,
  };
}

export function normalizeErc4337Owner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function erc4337RiskLabel(riskLevel: Erc4337RiskLevel): string {
  switch (riskLevel) {
    case "elevated":
      return "Failed UserOps found";
    case "possible":
      return "ERC-4337 activity review";
    case "informational":
      return "UserOps found";
    case "none_detected":
      return "No recent UserOps found";
    case "insufficient_data":
      return "Incomplete ERC-4337 check";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function eventToEvidence(event: Erc4337UserOperationEvent): Erc4337Evidence {
  const paymaster = event.paymaster
    ? ` Paymaster ${event.paymaster} was recorded.`
    : " No paymaster was recorded.";
  const success = event.success
    ? "The UserOperation was reported successful."
    : "The UserOperation was reported failed and deserves careful review.";

  return {
    title: event.success ? "UserOperation observed" : "Failed UserOperation",
    description: `${success}${paymaster}`,
    riskLevel: event.success
      ? event.paymaster
        ? "possible"
        : "informational"
      : "elevated",
    event,
  };
}

function erc4337RiskLevel({
  eventCount,
  failedUserOperationCount,
  paymasterUserOperationCount,
  hasAccountCode,
}: {
  eventCount: number;
  failedUserOperationCount: number;
  paymasterUserOperationCount: number;
  hasAccountCode: boolean;
}): Erc4337RiskLevel {
  if (failedUserOperationCount > 0) return "elevated";
  if (paymasterUserOperationCount > 0) return "possible";
  if (eventCount > 0) return "informational";
  if (hasAccountCode) return "possible";
  return "none_detected";
}
