import { formatUnits, getAddress, isAddress, type Address } from "viem";

import { getTokenEntry } from "@/lib/registry";

export type DustTrapRiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type DustTrapScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "partial"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export type DustTrapAssetType = "token" | "nft";

export interface DustTrapMetadata {
  rawName: string | null;
  rawSymbol: string | null;
  displayName: string | null;
  displaySymbol: string | null;
  removedUrlCount: number;
  suspiciousKeywordCount: number;
  warnings: string[];
}

export interface DustTrapTransfer {
  id: string;
  assetType: DustTrapAssetType;
  txHash: string;
  timestamp: number;
  occurredAt: string;
  from: Address;
  to: Address;
  contractAddress: Address;
  tokenId: string | null;
  rawValue: string | null;
  decimals: number | null;
  amount: string;
  metadata: DustTrapMetadata;
  tokenExplorerUrl: string | null;
  txExplorerUrl: string | null;
  reviewedRegistryMatch: boolean;
}

export interface DustTrapEvidence {
  assetType: DustTrapAssetType;
  contractAddress: Address;
  tokenId: string | null;
  txHash: string;
  occurredAt: string;
  amount: string;
  displayName: string;
  displaySymbol: string | null;
  title: string;
  description: string;
  riskLevel: "informational" | "possible" | "elevated";
  tokenExplorerUrl: string | null;
  txExplorerUrl: string | null;
}

export interface DustTrapAnalysis {
  riskLevel: DustTrapRiskLevel;
  evidence: DustTrapEvidence[];
  transfers: DustTrapTransfer[];
  summary: {
    checkedTransferCount: number;
    inboundTokenCount: number;
    inboundNftCount: number;
    urlMetadataCount: number;
    keywordMetadataCount: number;
    tinyAmountCount: number;
    reviewedRegistryMatchCount: number;
  };
  warnings: string[];
}

export interface LifeboatDustTrapApiResponse {
  ok: boolean;
  status: DustTrapScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: DustTrapRiskLevel;
  evidence: DustTrapEvidence[];
  transfers: DustTrapTransfer[];
  summary: DustTrapAnalysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}

export type DustTrapTransferInput = Omit<
  DustTrapTransfer,
  "reviewedRegistryMatch" | "metadata" | "rawValue"
> & {
  rawValue: bigint | null;
  metadata: Pick<DustTrapMetadata, "rawName" | "rawSymbol">;
};

export interface AnalyzeDustTrapOptions {
  owner: Address;
  chainId: number;
  transfers: readonly DustTrapTransferInput[];
  evidenceLimit?: number;
  transferLimit?: number;
}

const DEFAULT_EVIDENCE_LIMIT = 8;
const DEFAULT_TRANSFER_LIMIT = 16;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const URL_PATTERN =
  /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|xyz|io|app|finance|claim|airdrop|gift)\b)[^\s<>"']*/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/g;
const SUSPICIOUS_KEYWORDS = [
  "airdrop",
  "bonus",
  "claim",
  "free",
  "gift",
  "prize",
  "reward",
  "redeem",
  "voucher",
  "visit",
  "winner",
];

export function analyzeDustTrap({
  owner,
  chainId,
  transfers,
  evidenceLimit = DEFAULT_EVIDENCE_LIMIT,
  transferLimit = DEFAULT_TRANSFER_LIMIT,
}: AnalyzeDustTrapOptions): DustTrapAnalysis {
  const normalizedOwner = owner.toLowerCase();
  const ordered = dedupeTransfers(
    transfers
      .filter(
        (transfer) =>
          transfer.to.toLowerCase() === normalizedOwner &&
          transfer.from.toLowerCase() !== normalizedOwner &&
          transfer.from.toLowerCase() !== ZERO_ADDRESS,
      )
      .map((transfer) => enrichTransfer(transfer, chainId)),
  ).sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
  const evidence = buildEvidence(ordered, evidenceLimit);
  const summary = summarizeDustTransfers(ordered);

  return {
    riskLevel: dustTrapRiskLevel({ checkedTransferCount: ordered.length, evidence }),
    evidence,
    transfers: ordered.slice(0, transferLimit),
    summary,
    warnings: [
      "This read-only diagnostic reviews bounded inbound token and NFT transfer history for dust or bait signals. It does not prove an asset is malicious.",
      "Do not visit URLs from token or NFT metadata. This scanner strips untrusted URL-like text and never fetches token-provided websites.",
    ],
  };
}

export function sanitizeDustMetadataText(value: string | null | undefined): {
  displayText: string | null;
  removedUrlCount: number;
  suspiciousKeywordCount: number;
  warnings: string[];
} {
  const trimmed = value?.replace(CONTROL_PATTERN, " ").replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return {
      displayText: null,
      removedUrlCount: 0,
      suspiciousKeywordCount: 0,
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const withoutTags = trimmed.replace(HTML_TAG_PATTERN, " ");
  if (withoutTags !== trimmed) warnings.push("HTML-like metadata was stripped.");

  let removedUrlCount = 0;
  const withoutUrls = withoutTags.replace(URL_PATTERN, () => {
    removedUrlCount += 1;
    return "[link removed]";
  });
  if (removedUrlCount > 0) {
    warnings.push("URL-like metadata was stripped.");
  }

  const lowered = trimmed.toLowerCase();
  const suspiciousKeywordCount = SUSPICIOUS_KEYWORDS.filter((keyword) =>
    lowered.includes(keyword),
  ).length;
  if (suspiciousKeywordCount > 0) {
    warnings.push("Claim or reward wording was found in metadata.");
  }

  const displayText = withoutUrls.replace(/\s+/g, " ").trim().slice(0, 80);
  return {
    displayText: displayText || null,
    removedUrlCount,
    suspiciousKeywordCount,
    warnings,
  };
}

export function normalizeDustTrapOwner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function emptyDustTrapSummary(): DustTrapAnalysis["summary"] {
  return {
    checkedTransferCount: 0,
    inboundTokenCount: 0,
    inboundNftCount: 0,
    urlMetadataCount: 0,
    keywordMetadataCount: 0,
    tinyAmountCount: 0,
    reviewedRegistryMatchCount: 0,
  };
}

export function dustTrapRiskLabel(riskLevel: DustTrapRiskLevel): string {
  switch (riskLevel) {
    case "elevated":
      return "Multiple dust/bait signals";
    case "possible":
      return "Possible dust/bait signal";
    case "informational":
      return "Inbound asset context";
    case "none_detected":
      return "No dust/bait signal found";
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

export function formatDustTokenAmount({
  value,
  decimals,
  symbol,
}: {
  value: bigint;
  decimals: number;
  symbol: string | null;
}): string {
  const formatted = formatUnits(value, decimals)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
  return `${formatted}${symbol ? ` ${symbol}` : ""}`;
}

function enrichTransfer(
  transfer: DustTrapTransferInput,
  chainId: number,
): DustTrapTransfer {
  const name = sanitizeDustMetadataText(transfer.metadata.rawName);
  const symbol = sanitizeDustMetadataText(transfer.metadata.rawSymbol);
  const reviewedRegistryMatch = Boolean(
    getTokenEntry(chainId, transfer.contractAddress),
  );

  return {
    ...transfer,
    rawValue: transfer.rawValue?.toString() ?? null,
    metadata: {
      rawName: transfer.metadata.rawName,
      rawSymbol: transfer.metadata.rawSymbol,
      displayName: name.displayText,
      displaySymbol: symbol.displayText,
      removedUrlCount: name.removedUrlCount + symbol.removedUrlCount,
      suspiciousKeywordCount:
        name.suspiciousKeywordCount + symbol.suspiciousKeywordCount,
      warnings: [...name.warnings, ...symbol.warnings],
    },
    reviewedRegistryMatch,
  };
}

function buildEvidence(
  transfers: readonly DustTrapTransfer[],
  evidenceLimit: number,
): DustTrapEvidence[] {
  const evidence: DustTrapEvidence[] = [];
  const bySender = new Map<string, number>();
  for (const transfer of transfers) {
    bySender.set(
      transfer.from.toLowerCase(),
      (bySender.get(transfer.from.toLowerCase()) ?? 0) + 1,
    );
  }

  for (const transfer of transfers) {
    const items = evidenceForTransfer(transfer, bySender);
    for (const item of items) {
      if (evidence.length < evidenceLimit) evidence.push(item);
    }
  }
  return evidence;
}

function evidenceForTransfer(
  transfer: DustTrapTransfer,
  bySender: ReadonlyMap<string, number>,
): DustTrapEvidence[] {
  if (transfer.reviewedRegistryMatch) return [];

  const evidence: DustTrapEvidence[] = [];
  const displayName =
    transfer.metadata.displayName ??
    transfer.metadata.displaySymbol ??
    `${transfer.assetType.toUpperCase()} ${shortAddress(transfer.contractAddress)}`;
  const displaySymbol = transfer.metadata.displaySymbol;
  const common = {
    assetType: transfer.assetType,
    contractAddress: transfer.contractAddress,
    tokenId: transfer.tokenId,
    txHash: transfer.txHash,
    occurredAt: transfer.occurredAt,
    amount: transfer.amount,
    displayName,
    displaySymbol,
    tokenExplorerUrl: transfer.tokenExplorerUrl,
    txExplorerUrl: transfer.txExplorerUrl,
  } satisfies Omit<DustTrapEvidence, "title" | "description" | "riskLevel">;

  if (transfer.metadata.removedUrlCount > 0) {
    evidence.push({
      ...common,
      title: "Metadata contained URL-like text",
      description:
        "URL-like text was stripped from this asset metadata. Treat token-provided links as phishing risk and verify only through trusted sources.",
      riskLevel:
        transfer.assetType === "nft" || transfer.metadata.suspiciousKeywordCount > 0
          ? "elevated"
          : "possible",
    });
  }

  if (transfer.metadata.suspiciousKeywordCount > 0) {
    evidence.push({
      ...common,
      title: "Claim or reward wording found",
      description:
        "The asset metadata uses claim, reward, or similar bait-like wording. This is a review signal, not proof that the asset is malicious.",
      riskLevel: transfer.metadata.removedUrlCount > 0 ? "elevated" : "possible",
    });
  }

  if (isTinyTokenAmount(transfer)) {
    evidence.push({
      ...common,
      title: "Very small inbound token amount",
      description:
        "The inbound amount is very small relative to the token decimals. Dust can be used to lure users into interacting with unknown assets.",
      riskLevel: "possible",
    });
  }

  if ((bySender.get(transfer.from.toLowerCase()) ?? 0) >= 3) {
    evidence.push({
      ...common,
      title: "Repeated inbound assets from one sender",
      description:
        "Multiple inbound assets from the same sender appeared in the bounded history window. Review before interacting with any of them.",
      riskLevel: "possible",
    });
  }

  if (transfer.assetType === "nft" && evidence.length === 0) {
    evidence.push({
      ...common,
      title: "Unsolicited inbound NFT",
      description:
        "An inbound NFT from an unknown sender is visible in recent history. Do not visit metadata links or sign approvals to inspect it.",
      riskLevel: "informational",
    });
  }

  return evidence;
}

function summarizeDustTransfers(
  transfers: readonly DustTrapTransfer[],
): DustTrapAnalysis["summary"] {
  return {
    checkedTransferCount: transfers.length,
    inboundTokenCount: transfers.filter((item) => item.assetType === "token")
      .length,
    inboundNftCount: transfers.filter((item) => item.assetType === "nft").length,
    urlMetadataCount: transfers.filter((item) => item.metadata.removedUrlCount > 0)
      .length,
    keywordMetadataCount: transfers.filter(
      (item) => item.metadata.suspiciousKeywordCount > 0,
    ).length,
    tinyAmountCount: transfers.filter(isTinyTokenAmount).length,
    reviewedRegistryMatchCount: transfers.filter(
      (item) => item.reviewedRegistryMatch,
    ).length,
  };
}

function dustTrapRiskLevel({
  checkedTransferCount,
  evidence,
}: {
  checkedTransferCount: number;
  evidence: readonly DustTrapEvidence[];
}): DustTrapRiskLevel {
  if (checkedTransferCount === 0) return "none_detected";
  if (evidence.some((item) => item.riskLevel === "elevated")) return "elevated";
  const possibleCount = evidence.filter((item) => item.riskLevel === "possible")
    .length;
  if (possibleCount >= 2) return "elevated";
  if (possibleCount === 1) return "possible";
  if (evidence.some((item) => item.riskLevel === "informational")) {
    return "informational";
  }
  return "none_detected";
}

function isTinyTokenAmount(transfer: DustTrapTransfer): boolean {
  if (transfer.assetType !== "token") return false;
  if (!transfer.rawValue) return false;
  const rawValue = BigInt(transfer.rawValue);
  if (rawValue <= 0n) return false;
  const decimals = transfer.decimals ?? 0;
  if (decimals < 6) return rawValue === 1n;
  return rawValue <= 10n ** BigInt(Math.max(decimals - 6, 0));
}

function dedupeTransfers(
  transfers: readonly DustTrapTransfer[],
): DustTrapTransfer[] {
  const byId = new Map<string, DustTrapTransfer>();
  for (const transfer of transfers) {
    byId.set(transfer.id, transfer);
  }
  return [...byId.values()];
}

function shortAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
