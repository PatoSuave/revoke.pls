import { formatUnits, getAddress, isAddress, type Address } from "viem";

export type AddressPoisoningRiskLevel =
  | "not_checked"
  | "none_detected"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type AddressPoisoningScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "partial"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export type AddressPoisoningAssetType = "native" | "token";
export type AddressPoisoningDirection = "inbound" | "outbound";

export interface AddressPoisoningHistoryEvent {
  id: string;
  txHash: string;
  timestamp: number;
  occurredAt: string;
  blockNumber: number | null;
  direction: AddressPoisoningDirection;
  assetType: AddressPoisoningAssetType;
  from: Address;
  to: Address;
  counterparty: Address;
  contractAddress: Address | null;
  amount: string;
  tokenSymbol: string | null;
  explorerUrl: string | null;
}

export interface AddressPoisoningEvidence {
  txHash: string;
  occurredAt: string;
  lookalikeAddress: Address;
  referenceAddress: Address;
  comparedPrefix: string;
  comparedSuffix: string;
  sharedPrefixLength: number;
  sharedSuffixLength: number;
  assetType: AddressPoisoningAssetType;
  amount: string;
  tokenSymbol: string | null;
  explorerUrl: string | null;
}

export interface AddressPoisoningAnalysis {
  riskLevel: AddressPoisoningRiskLevel;
  evidence: AddressPoisoningEvidence[];
  events: AddressPoisoningHistoryEvent[];
  summary: {
    checkedEventCount: number;
    inboundEventCount: number;
    outboundReferenceCount: number;
    possiblePoisoningCount: number;
    minimumSharedPrefixLength: number;
    minimumSharedSuffixLength: number;
  };
  warnings: string[];
}

export interface LifeboatAddressPoisoningApiResponse {
  ok: boolean;
  status: AddressPoisoningScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: AddressPoisoningRiskLevel;
  evidence: AddressPoisoningEvidence[];
  events: AddressPoisoningHistoryEvent[];
  summary: AddressPoisoningAnalysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}

export interface AnalyzeAddressPoisoningOptions {
  owner: Address;
  events: readonly AddressPoisoningHistoryEvent[];
  evidenceLimit?: number;
  eventLimit?: number;
  minimumSharedPrefixLength?: number;
  minimumSharedSuffixLength?: number;
}

const DEFAULT_EVIDENCE_LIMIT = 5;
const DEFAULT_EVENT_LIMIT = 12;
const DEFAULT_SHARED_PREFIX_LENGTH = 4;
const DEFAULT_SHARED_SUFFIX_LENGTH = 4;
const ELEVATED_SHARED_PREFIX_LENGTH = 6;
const ELEVATED_SHARED_SUFFIX_LENGTH = 6;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function analyzeAddressPoisoning({
  owner,
  events,
  evidenceLimit = DEFAULT_EVIDENCE_LIMIT,
  eventLimit = DEFAULT_EVENT_LIMIT,
  minimumSharedPrefixLength = DEFAULT_SHARED_PREFIX_LENGTH,
  minimumSharedSuffixLength = DEFAULT_SHARED_SUFFIX_LENGTH,
}: AnalyzeAddressPoisoningOptions): AddressPoisoningAnalysis {
  const normalizedOwner = owner.toLowerCase();
  const ordered = dedupePoisoningEvents(events).sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id),
  );
  const inboundEvents = ordered.filter(
    (event) =>
      event.direction === "inbound" &&
      event.counterparty.toLowerCase() !== normalizedOwner &&
      event.counterparty.toLowerCase() !== ZERO_ADDRESS,
  );
  const referenceAddresses = collectOutboundReferenceAddresses(
    ordered,
    normalizedOwner,
  );
  const evidence: AddressPoisoningEvidence[] = [];
  const seen = new Set<string>();

  for (const inbound of inboundEvents) {
    for (const referenceAddress of referenceAddresses) {
      const similarity = compareAddressSimilarity(
        inbound.counterparty,
        referenceAddress,
      );
      if (
        !similarity ||
        similarity.sharedPrefixLength < minimumSharedPrefixLength ||
        similarity.sharedSuffixLength < minimumSharedSuffixLength
      ) {
        continue;
      }

      const key = `${inbound.txHash}:${inbound.counterparty.toLowerCase()}:${referenceAddress.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (evidence.length < evidenceLimit) {
        evidence.push({
          txHash: inbound.txHash,
          occurredAt: inbound.occurredAt,
          lookalikeAddress: inbound.counterparty,
          referenceAddress,
          comparedPrefix: similarity.comparedPrefix,
          comparedSuffix: similarity.comparedSuffix,
          sharedPrefixLength: similarity.sharedPrefixLength,
          sharedSuffixLength: similarity.sharedSuffixLength,
          assetType: inbound.assetType,
          amount: inbound.amount,
          tokenSymbol: inbound.tokenSymbol,
          explorerUrl: inbound.explorerUrl,
        });
      }
    }
  }

  const riskLevel = addressPoisoningRiskLevel({
    checkedEventCount: ordered.length,
    outboundReferenceCount: referenceAddresses.length,
    evidence,
  });
  const visibleEvents = [...ordered]
    .sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id))
    .slice(0, eventLimit);

  return {
    riskLevel,
    evidence,
    events: visibleEvents,
    summary: {
      checkedEventCount: ordered.length,
      inboundEventCount: inboundEvents.length,
      outboundReferenceCount: referenceAddresses.length,
      possiblePoisoningCount: evidence.length,
      minimumSharedPrefixLength,
      minimumSharedSuffixLength,
    },
    warnings: [
      "This read-only heuristic compares recent inbound counterparties against outbound addresses from the bounded history window. A match is possible phishing context, not proof of attacker control or intent.",
    ],
  };
}

export function compareAddressSimilarity(
  lookalikeAddress: Address,
  referenceAddress: Address,
):
  | {
      comparedPrefix: string;
      comparedSuffix: string;
      sharedPrefixLength: number;
      sharedSuffixLength: number;
    }
  | null {
  const lookalike = lookalikeAddress.toLowerCase();
  const reference = referenceAddress.toLowerCase();
  if (lookalike === reference) return null;

  const lookalikeBody = lookalike.slice(2);
  const referenceBody = reference.slice(2);
  const sharedPrefixLength = commonPrefixLength(lookalikeBody, referenceBody);
  const sharedSuffixLength = commonSuffixLength(lookalikeBody, referenceBody);

  return {
    comparedPrefix: `0x${lookalikeBody.slice(0, sharedPrefixLength)}`,
    comparedSuffix: lookalikeBody.slice(-sharedSuffixLength),
    sharedPrefixLength,
    sharedSuffixLength,
  };
}

export function normalizeAddressPoisoningOwner(
  value: string | null,
): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function emptyAddressPoisoningSummary(): AddressPoisoningAnalysis["summary"] {
  return {
    checkedEventCount: 0,
    inboundEventCount: 0,
    outboundReferenceCount: 0,
    possiblePoisoningCount: 0,
    minimumSharedPrefixLength: DEFAULT_SHARED_PREFIX_LENGTH,
    minimumSharedSuffixLength: DEFAULT_SHARED_SUFFIX_LENGTH,
  };
}

export function addressPoisoningRiskLabel(
  riskLevel: AddressPoisoningRiskLevel,
): string {
  switch (riskLevel) {
    case "elevated":
      return "Multiple or close lookalikes";
    case "possible":
      return "Possible lookalike signal";
    case "none_detected":
      return "No lookalike signal found";
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

export function formatPoisoningNativeAmount(
  valueWei: bigint,
  nativeSymbol: string,
): string {
  return `${trimFormattedAmount(valueWei, 18)} ${nativeSymbol}`;
}

export function formatPoisoningTokenAmount({
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

function collectOutboundReferenceAddresses(
  events: readonly AddressPoisoningHistoryEvent[],
  normalizedOwner: string,
): Address[] {
  const addresses: Address[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    if (event.direction !== "outbound") continue;
    const key = event.counterparty.toLowerCase();
    if (key === normalizedOwner || key === ZERO_ADDRESS || seen.has(key)) {
      continue;
    }
    seen.add(key);
    addresses.push(event.counterparty);
  }
  return addresses;
}

function addressPoisoningRiskLevel({
  checkedEventCount,
  outboundReferenceCount,
  evidence,
}: {
  checkedEventCount: number;
  outboundReferenceCount: number;
  evidence: readonly AddressPoisoningEvidence[];
}): AddressPoisoningRiskLevel {
  if (checkedEventCount < 2 || outboundReferenceCount === 0) {
    return "insufficient_data";
  }
  const hasCloseMatch = evidence.some(
    (item) =>
      item.sharedPrefixLength >= ELEVATED_SHARED_PREFIX_LENGTH &&
      item.sharedSuffixLength >= ELEVATED_SHARED_SUFFIX_LENGTH,
  );
  if (evidence.length >= 2 || hasCloseMatch) return "elevated";
  if (evidence.length === 1) return "possible";
  return "none_detected";
}

function dedupePoisoningEvents(
  events: readonly AddressPoisoningHistoryEvent[],
): AddressPoisoningHistoryEvent[] {
  const byId = new Map<string, AddressPoisoningHistoryEvent>();
  for (const event of events) {
    byId.set(event.id, event);
  }
  return [...byId.values()];
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    if (a[i] !== b[i]) return i;
  }
  return max;
}

function commonSuffixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  for (let i = 1; i <= max; i += 1) {
    if (a.at(-i) !== b.at(-i)) return i - 1;
  }
  return max;
}

function trimFormattedAmount(value: bigint, decimals: number): string {
  const formatted = formatUnits(value, decimals);
  return formatted.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
}
