import { getAddress, isAddress, type Address } from "viem";

import {
  LIVE_SUPPORTED_CHAIN_COUNT,
  LIVE_SUPPORTED_CHAIN_ROWS,
} from "@/lib/supported-chain-copy";

export const TOKEN_CONTRACT_REPORT_PATH = "/TokenContractReport";

export type TokenContractReportStatus =
  | "complete"
  | "partial"
  | "unsupported-standard"
  | "bad-request"
  | "config-missing"
  | "upstream-failure";

export type TokenContractReportSignalSeverity =
  | "info"
  | "low"
  | "medium"
  | "high";

export type TokenContractReportSignalStatus = "complete" | "incomplete";

export type TokenContractAiStatus =
  | "generated"
  | "unavailable"
  | "skipped";

export type TokenContractAiFailureReason =
  | "not-configured"
  | "request-aborted"
  | "timeout"
  | "authentication"
  | "insufficient-balance"
  | "rate-limited"
  | "provider-error"
  | "empty-output"
  | "truncated-output"
  | "invalid-output";

export interface TokenContractAiFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  heading: string;
  evidence: string[];
  description: string;
  practicalEffect: string;
}

export interface TokenContractAiNarrative {
  title: string;
  overallVerdict:
    | "critical risk"
    | "high risk"
    | "medium risk"
    | "low observed risk"
    | "unknown risk";
  confidence: number;
  confidenceReason: string;
  mainRisks: string[];
  detailedFindings: TokenContractAiFinding[];
  whatNotSeen: string[];
  selectorWatchlist: string[];
  whatToCheckOnChain: string[];
  bottomLine: string;
}

export interface TokenContractControlSurface {
  mint: string[];
  admin: string[];
  fees: string[];
  transferRestrictions: string[];
  liquidity: string[];
}

export type TokenContractCriticalCheckStatus =
  | "confirmed"
  | "needs_review"
  | "not_collected"
  | "not_detected"
  | "unknown";

export interface TokenContractCriticalCheck {
  question: string;
  status: TokenContractCriticalCheckStatus;
  evidence: string;
}

export type Erc6909DetectionStatus =
  | "detected"
  | "not_detected"
  | "limited";

export interface TokenContractReportChainOption {
  chainId: number;
  name: string;
  scan: "Yes" | "No";
  revoke: string;
}

export interface TokenContractReportSignal {
  id: string;
  label: string;
  severity: TokenContractReportSignalSeverity;
  evidence: string;
  status: TokenContractReportSignalStatus;
}

export interface TokenContractReportResponse {
  ok: boolean;
  status: TokenContractReportStatus;
  chain: {
    chainId: number;
    name: string;
    explorerName: string;
  } | null;
  contract: {
    address: Address;
    explorerUrl: string;
    hasBytecode: boolean;
    source: {
      verified: "verified" | "unverified" | "unknown";
      contractName: string | null;
      isProxy: boolean | null;
      implementationAddress: Address | null;
      compilerVersion: string | null;
      abiFunctionCount: number | null;
      controlSurface: TokenContractControlSurface;
      implementation: {
        address: Address;
        verified: "verified" | "unverified" | "unknown";
        contractName: string | null;
        compilerVersion: string | null;
        abiFunctionCount: number | null;
        controlSurface: TokenContractControlSurface;
      } | null;
    };
    creation: {
      transactionHash: `0x${string}` | null;
      transactionUrl: string | null;
      deployerAddress: Address | null;
      deployerUrl: string | null;
      blockNumber: number | null;
      timestamp: string | null;
      lookupStatus: "found" | "unavailable";
    };
  } | null;
  controls: {
    ownerAddress: Address | null;
    ownershipStatus: "found" | "renounced" | "conflicting" | "unavailable";
    ownerMethod: "owner" | "getOwner" | null;
    ownerCandidates: {
      owner: Address | null;
      getOwner: Address | null;
    };
  };
  audit: {
    coveragePercent: number;
    classificationConfidence: number;
    riskScore: number;
    overallSeverity: "critical" | "high" | "medium" | "low" | "unknown";
    criticalChecks: TokenContractCriticalCheck[];
  };
  standards: {
    erc20Like: boolean;
    erc721: boolean;
    erc1155: boolean;
    erc4626: boolean;
    erc6909: Erc6909DetectionStatus;
    hybrid: boolean;
  };
  token: {
    name: string | null;
    symbol: string | null;
    decimals: number | null;
    totalSupply: string | null;
    vaultAssetAddress: Address | null;
    totalAssets: string | null;
  };
  signals: TokenContractReportSignal[];
  ai: {
    status: TokenContractAiStatus;
    model: string | null;
    markdown: string | null;
    narrative: TokenContractAiNarrative | null;
    reason: TokenContractAiFailureReason | null;
    finishReason: string | null;
  };
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}

export function createEmptyTokenContractReportResponse({
  status,
  errors,
}: {
  status: TokenContractReportStatus;
  errors: string[];
}): TokenContractReportResponse {
  return {
    ok: false,
    status,
    chain: null,
    contract: null,
    controls: {
      ownerAddress: null,
      ownershipStatus: "unavailable",
      ownerMethod: null,
      ownerCandidates: {
        owner: null,
        getOwner: null,
      },
    },
    audit: {
      coveragePercent: 0,
      classificationConfidence: 0,
      riskScore: 0,
      overallSeverity: "unknown",
      criticalChecks: [],
    },
    standards: {
      erc20Like: false,
      erc721: false,
      erc1155: false,
      erc4626: false,
      erc6909: "not_detected",
      hybrid: false,
    },
    token: {
      name: null,
      symbol: null,
      decimals: null,
      totalSupply: null,
      vaultAssetAddress: null,
      totalAssets: null,
    },
    signals: [],
    ai: {
      status: "skipped",
      model: null,
      markdown: null,
      narrative: null,
      reason: null,
      finishReason: null,
    },
    warnings: [],
    errors,
    missingConfig: [],
  };
}

export const TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS =
  LIVE_SUPPORTED_CHAIN_ROWS.map((row) => ({
    chainId: Number(row.chainId),
    name: row.chain,
    scan: row.scan,
    revoke: row.revoke,
  })).filter(
    (row): row is TokenContractReportChainOption =>
      Number.isInteger(row.chainId) && row.scan === "Yes",
  );

export const TOKEN_CONTRACT_REPORT_CHAIN_COUNT =
  TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS.length;

export function normalizeTokenContractReportAddress(
  value: string | null | undefined,
): Address | null {
  const trimmed = value?.trim();
  if (!trimmed || !isAddress(trimmed)) return null;
  return getAddress(trimmed);
}

export function isTokenContractReportChainId(
  value: number | undefined,
): value is number {
  return TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS.some(
    (chain) => chain.chainId === value,
  );
}

export function getTokenContractReportChainOption(
  chainId: number | undefined,
): TokenContractReportChainOption | undefined {
  return TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS.find(
    (chain) => chain.chainId === chainId,
  );
}

export function supportedTokenContractReportChainSummary(): string {
  return TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS.map(
    (chain) => `${chain.name} chainId=${chain.chainId}`,
  ).join(", ");
}

export function tokenContractReportChainEvidenceSummary(): string {
  return `${TOKEN_CONTRACT_REPORT_CHAIN_COUNT} live chains from LIVE_SUPPORTED_CHAIN_ROWS (expected ${LIVE_SUPPORTED_CHAIN_COUNT}).`;
}

export function markdownText(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/</g, "\\<")
    .replace(/>/g, "\\>")
    .replace(/#/g, "\\#");
}
