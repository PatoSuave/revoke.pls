import { formatUnits, getAddress, isAddress, type Address } from "viem";

export type TimelineRiskLevel =
  | "not_checked"
  | "none_detected"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type TimelineScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "partial"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export type TimelineEventKind =
  | "approval"
  | "native_in"
  | "native_out"
  | "token_in"
  | "token_out";

export interface TimelineApprovalCall {
  methodId: string;
  methodName: string;
  approvalKind: "token_allowance" | "operator_approval";
  spender: Address | null;
}

export interface TimelineHistoryEvent {
  id: string;
  kind: TimelineEventKind;
  txHash: string;
  timestamp: number;
  occurredAt: string;
  blockNumber: number | null;
  from: Address;
  to: Address | null;
  contractAddress: Address | null;
  label: string;
  amount: string | null;
  methodId: string | null;
  methodName: string | null;
  spender: Address | null;
  explorerUrl: string | null;
}

export interface TimelineEvidence {
  approvalTxHash: string;
  movementTxHash: string;
  approvalAt: string;
  movementAt: string;
  secondsAfterApproval: number;
  movementKind: "native_out" | "token_out";
  movementLabel: string;
  movementAmount: string | null;
  spender: Address | null;
  recipient: Address | null;
  approvalExplorerUrl: string | null;
  movementExplorerUrl: string | null;
}

export interface TimelineAnalysis {
  riskLevel: TimelineRiskLevel;
  events: TimelineHistoryEvent[];
  evidence: TimelineEvidence[];
  summary: {
    checkedEventCount: number;
    approvalEventCount: number;
    outboundMovementCount: number;
    possibleSequenceCount: number;
    correlationWindowSeconds: number;
    earliestEventAt: string | null;
    latestEventAt: string | null;
  };
  warnings: string[];
}

export interface LifeboatTimelineApiResponse {
  ok: boolean;
  status: TimelineScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: TimelineRiskLevel;
  events: TimelineHistoryEvent[];
  evidence: TimelineEvidence[];
  summary: TimelineAnalysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}

export interface AnalyzeApprovalDrainTimelineOptions {
  owner: Address;
  events: readonly TimelineHistoryEvent[];
  correlationWindowSeconds?: number;
  eventLimit?: number;
  evidenceLimit?: number;
}

const DEFAULT_CORRELATION_WINDOW_SECONDS = 86_400;
const ELEVATED_SEQUENCE_SECONDS = 600;
const DEFAULT_EVENT_LIMIT = 12;
const DEFAULT_EVIDENCE_LIMIT = 5;

const APPROVAL_METHODS: Record<
  string,
  Omit<TimelineApprovalCall, "spender">
> = {
  "0x095ea7b3": {
    methodId: "0x095ea7b3",
    methodName: "approve",
    approvalKind: "token_allowance",
  },
  "0x39509351": {
    methodId: "0x39509351",
    methodName: "increaseAllowance",
    approvalKind: "token_allowance",
  },
  "0xa22cb465": {
    methodId: "0xa22cb465",
    methodName: "setApprovalForAll",
    approvalKind: "operator_approval",
  },
};

export function analyzeApprovalDrainTimeline({
  owner,
  events,
  correlationWindowSeconds = DEFAULT_CORRELATION_WINDOW_SECONDS,
  eventLimit = DEFAULT_EVENT_LIMIT,
  evidenceLimit = DEFAULT_EVIDENCE_LIMIT,
}: AnalyzeApprovalDrainTimelineOptions): TimelineAnalysis {
  const normalizedOwner = owner.toLowerCase();
  const ordered = dedupeTimelineEvents(events).sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id),
  );
  const approvalEvents = ordered.filter(
    (event) =>
      event.kind === "approval" &&
      event.from.toLowerCase() === normalizedOwner,
  );
  const outboundMovementEvents = ordered.filter(
    (
      event,
    ): event is TimelineHistoryEvent & { kind: "native_out" | "token_out" } =>
      (event.kind === "native_out" || event.kind === "token_out") &&
      event.from.toLowerCase() === normalizedOwner,
  );
  const evidence: TimelineEvidence[] = [];

  for (const approval of approvalEvents) {
    const movement = outboundMovementEvents.find(
      (event) =>
        event.txHash !== approval.txHash &&
        event.timestamp >= approval.timestamp &&
        event.timestamp - approval.timestamp <= correlationWindowSeconds,
    );
    if (!movement) continue;

    if (evidence.length < evidenceLimit) {
      evidence.push({
        approvalTxHash: approval.txHash,
        movementTxHash: movement.txHash,
        approvalAt: approval.occurredAt,
        movementAt: movement.occurredAt,
        secondsAfterApproval: movement.timestamp - approval.timestamp,
        movementKind: movement.kind,
        movementLabel: movement.label,
        movementAmount: movement.amount,
        spender: approval.spender,
        recipient: movement.to,
        approvalExplorerUrl: approval.explorerUrl,
        movementExplorerUrl: movement.explorerUrl,
      });
    }
  }

  const riskLevel = timelineRiskLevel({
    checkedEventCount: ordered.length,
    possibleSequenceCount: evidence.length,
    hasFastSequence: evidence.some(
      (item) => item.secondsAfterApproval <= ELEVATED_SEQUENCE_SECONDS,
    ),
  });
  const visibleEvents = [...ordered]
    .sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id))
    .slice(0, eventLimit);

  return {
    riskLevel,
    events: visibleEvents,
    evidence,
    summary: {
      checkedEventCount: ordered.length,
      approvalEventCount: approvalEvents.length,
      outboundMovementCount: outboundMovementEvents.length,
      possibleSequenceCount: evidence.length,
      correlationWindowSeconds,
      earliestEventAt: ordered[0]?.occurredAt ?? null,
      latestEventAt: ordered.at(-1)?.occurredAt ?? null,
    },
    warnings: [
      "This read-only timeline shows visible public events in a bounded recent-history window. It can suggest ordering, but it does not prove causation, identify an attacker, or rule out private, internal, unindexed, or cross-chain activity.",
    ],
  };
}

export function parseApprovalCall(input: string | null | undefined) {
  if (!input) return null;
  const normalized = input.toLowerCase();
  const methodId = normalized.slice(0, 10);
  const method = APPROVAL_METHODS[methodId];
  if (!method) return null;

  return {
    ...method,
    spender: parseFirstAddressArgument(normalized),
  };
}

export function normalizeTimelineOwner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function emptyTimelineSummary(
  correlationWindowSeconds = DEFAULT_CORRELATION_WINDOW_SECONDS,
): TimelineAnalysis["summary"] {
  return {
    checkedEventCount: 0,
    approvalEventCount: 0,
    outboundMovementCount: 0,
    possibleSequenceCount: 0,
    correlationWindowSeconds,
    earliestEventAt: null,
    latestEventAt: null,
  };
}

export function timelineRiskLabel(riskLevel: TimelineRiskLevel): string {
  switch (riskLevel) {
    case "elevated":
      return "Close approval-to-movement sequence";
    case "possible":
      return "Possible sequence";
    case "none_detected":
      return "No visible sequence found";
    case "insufficient_data":
      return "Insufficient data";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

export function formatTimelineNativeAmount(
  valueWei: bigint,
  nativeSymbol: string,
): string {
  return `${trimFormattedAmount(valueWei, 18)} ${nativeSymbol}`;
}

export function formatTimelineTokenAmount({
  value,
  decimals,
  symbol,
}: {
  value: bigint;
  decimals: number;
  symbol: string | null;
}): string {
  return `${trimFormattedAmount(value, decimals)}${symbol ? ` ${symbol}` : ""}`;
}

function timelineRiskLevel({
  checkedEventCount,
  possibleSequenceCount,
  hasFastSequence,
}: {
  checkedEventCount: number;
  possibleSequenceCount: number;
  hasFastSequence: boolean;
}): TimelineRiskLevel {
  if (checkedEventCount < 2) return "insufficient_data";
  if (possibleSequenceCount >= 2 || hasFastSequence) return "elevated";
  if (possibleSequenceCount === 1) return "possible";
  return "none_detected";
}

function parseFirstAddressArgument(input: string): Address | null {
  if (!/^0x[0-9a-f]+$/i.test(input) || input.length < 74) return null;
  const word = input.slice(10, 74);
  const address = `0x${word.slice(24)}`;
  return isAddress(address) ? getAddress(address) : null;
}

function dedupeTimelineEvents(
  events: readonly TimelineHistoryEvent[],
): TimelineHistoryEvent[] {
  const byId = new Map<string, TimelineHistoryEvent>();
  for (const event of events) {
    byId.set(event.id, event);
  }
  return [...byId.values()];
}

function trimFormattedAmount(value: bigint, decimals: number): string {
  const formatted = formatUnits(value, decimals);
  return formatted.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}
