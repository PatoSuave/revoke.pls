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
  | "critical"
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
  | "oversized-output"
  | "truncated-output"
  | "invalid-output";

export interface TokenContractAiFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  heading: string;
  evidence: string[];
  description: string;
  practicalEffect: string;
  citations?: Array<{
    file: string;
    startLine: number;
    endLine: number;
    evidenceIds: string[];
  }>;
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
  disposition?: "concern" | "protective" | "unresolved";
}

export type TokenContractFindingSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type TokenContractFindingState =
  | "confirmed"
  | "review-clue"
  | "unresolved"
  | "not-detected";

export type TokenContractEvidenceType =
  | "source"
  | "abi"
  | "bytecode"
  | "storage"
  | "history"
  | "simulation"
  | "explorer"
  | "rpc";

export interface TokenContractEvidenceReference {
  id: string;
  type: TokenContractEvidenceType;
  summary: string;
  file?: string;
  startLine?: number;
  endLine?: number;
  selector?: `0x${string}`;
  transactionHash?: `0x${string}`;
  blockNumber?: number;
}

export interface TokenContractFinding {
  id: string;
  category:
    | "access-control"
    | "transfer-control"
    | "supply"
    | "fees"
    | "trading"
    | "proxy"
    | "external-call"
    | "liquidity"
    | "bytecode"
    | "verification"
    | "classification";
  title: string;
  severity: TokenContractFindingSeverity;
  state: TokenContractFindingState;
  confidence: number;
  summary: string;
  practicalEffect: string;
  recommendation: string;
  evidence: TokenContractEvidenceReference[];
}

export type TokenContractReportModuleId =
  | "source"
  | "bytecode"
  | "history"
  | "simulation"
  | "liquidity"
  | "ai";

export type TokenContractReportModuleStatus =
  | "complete"
  | "partial"
  | "unavailable"
  | "skipped";

export interface TokenContractReportModule {
  id: TokenContractReportModuleId;
  label: string;
  status: TokenContractReportModuleStatus;
  evidenceCount: number;
  summary: string;
  warnings: string[];
}

export interface TokenContractResolvedSelector {
  selector: `0x${string}`;
  signature: string | null;
  candidates: string[];
  resolution: "verified-abi" | "local-watchlist" | "4byte" | "unknown";
  confidence: "exact" | "candidate" | "unknown";
  classification: "standard" | "admin" | "dangerous" | "unknown";
  label: string;
}

export interface TokenContractHistoryCall {
  transactionHash: `0x${string}`;
  blockNumber: number | null;
  timestamp: string | null;
  from: Address | null;
  selector: `0x${string}` | null;
  signature: string | null;
  success: boolean | null;
  afterOwnershipZero: boolean | null;
}

export interface TokenContractSimulationAttempt {
  id: string;
  label: string;
  from: Address | null;
  to: Address;
  functionSignature: string;
  status: "succeeded" | "reverted" | "unavailable" | "skipped";
  blockNumber: number | null;
  detail: string;
}

export interface TokenContractLiquidityPair {
  chainSlug: string;
  dexId: string | null;
  pairAddress: Address;
  baseTokenAddress: Address | null;
  quoteTokenAddress: Address | null;
  liquidityUsd: number | null;
  url: string | null;
}

export interface TokenContractOwnershipTransfer {
  transactionHash: `0x${string}`;
  blockNumber: number | null;
  previousOwner: Address | null;
  newOwner: Address | null;
  renounced: boolean;
}

export interface TokenContractHolderSnapshot {
  address: Address;
  balance: string;
  percentageOfSupply: number | null;
  sources: Array<"deployer" | "explorer" | "transfer-event">;
}

export interface TokenContractBytecodeArtifact {
  available: boolean;
  byteLength: number;
  hash: `0x${string}` | null;
  hashWithoutMetadata: `0x${string}` | null;
  metadataDetected: boolean;
  source: "rpc" | "explorer" | null;
  embeddedAddresses: Address[];
  limitations: string[];
}

export type TokenContractReportStreamEvent =
  | {
      type: "base";
      report: TokenContractReportResponse;
    }
  | {
      type: "module";
      module: TokenContractReportModule;
      report?: TokenContractReportResponse;
    }
  | {
      type: "final";
      report: TokenContractReportResponse;
    }
  | {
      type: "error";
      error: string;
    };

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
  schemaVersion: 2;
  generatedAt: string;
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
    ownershipStatus:
      | "found"
      | "zero_address"
      | "renounced"
      | "conflicting"
      | "unavailable";
    ownerMethod: "owner" | "getOwner" | null;
    ownerCandidates: {
      owner: Address | null;
      getOwner: Address | null;
    };
    effectiveControllerAddresses: Address[];
    ownerZeroRemovesAllControl: boolean | null;
  };
  audit: {
    coveragePercent: number;
    classificationConfidence: number;
    riskScore: number;
    overallSeverity: "critical" | "high" | "medium" | "low" | "unknown";
    criticalChecks: TokenContractCriticalCheck[];
    completedChecks: number;
    reviewChecks: number;
    notEvaluatedChecks: number;
    totalChecks: number;
  };
  verdict: {
    severity: "critical" | "high" | "medium" | "low" | "unknown";
    label:
      | "critical observed risk"
      | "high observed risk"
      | "medium observed risk"
      | "low observed risk"
      | "risk unresolved";
    confidence: number;
    confidenceLabel: "high" | "moderate" | "limited";
    summary: string;
    basis: "deterministic";
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
    formattedTotalSupply: string | null;
    vaultAssetAddress: Address | null;
    totalAssets: string | null;
  };
  signals: TokenContractReportSignal[];
  findings: TokenContractFinding[];
  modules: Record<TokenContractReportModuleId, TokenContractReportModule>;
  selectors: TokenContractResolvedSelector[];
  bytecode: {
    runtime: TokenContractBytecodeArtifact;
    creation: TokenContractBytecodeArtifact;
  };
  holders: {
    sampled: TokenContractHolderSnapshot[];
    deployerBalance: string | null;
    deployerPercent: number | null;
    sampledSupplyPercent: number | null;
    limitations: string[];
  };
  supplyHistory: {
    initialMintAmount: string | null;
    initialMintRecipients: Address[];
    initialMintTransactionHash: `0x${string}` | null;
    initialMintBlockNumber: number | null;
    currentSupplyDiffersFromInitialMint: boolean | null;
    limitations: string[];
  };
  history: {
    inspectedTransactions: number;
    decodedCalls: TokenContractHistoryCall[];
    ownershipTransfers: TokenContractOwnershipTransfer[];
    postOwnershipZeroActivity: boolean | null;
    limitations: string[];
  };
  simulation: {
    blockNumber: number | null;
    attempts: TokenContractSimulationAttempt[];
    limitations: string[];
  };
  liquidity: {
    pairs: TokenContractLiquidityPair[];
    limitations: string[];
  };
  ai: {
    status: TokenContractAiStatus;
    model: string | null;
    markdown: string | null;
    narrative: TokenContractAiNarrative | null;
    reason: TokenContractAiFailureReason | null;
    finishReason: string | null;
  };
  warnings: string[];
  reportBoundaries: string[];
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
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
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
      effectiveControllerAddresses: [],
      ownerZeroRemovesAllControl: null,
    },
    audit: {
      coveragePercent: 0,
      classificationConfidence: 0,
      riskScore: 0,
      overallSeverity: "unknown",
      criticalChecks: [],
      completedChecks: 0,
      reviewChecks: 0,
      notEvaluatedChecks: 0,
      totalChecks: 0,
    },
    verdict: {
      severity: "unknown",
      label: "risk unresolved",
      confidence: 0,
      confidenceLabel: "limited",
      summary: "No deterministic contract verdict is available.",
      basis: "deterministic",
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
      formattedTotalSupply: null,
      vaultAssetAddress: null,
      totalAssets: null,
    },
    signals: [],
    findings: [],
    modules: createEmptyTokenContractReportModules(),
    selectors: [],
    bytecode: {
      runtime: emptyBytecodeArtifact(),
      creation: emptyBytecodeArtifact(),
    },
    holders: {
      sampled: [],
      deployerBalance: null,
      deployerPercent: null,
      sampledSupplyPercent: null,
      limitations: [],
    },
    supplyHistory: {
      initialMintAmount: null,
      initialMintRecipients: [],
      initialMintTransactionHash: null,
      initialMintBlockNumber: null,
      currentSupplyDiffersFromInitialMint: null,
      limitations: [],
    },
    history: {
      inspectedTransactions: 0,
      decodedCalls: [],
      ownershipTransfers: [],
      postOwnershipZeroActivity: null,
      limitations: [],
    },
    simulation: {
      blockNumber: null,
      attempts: [],
      limitations: [],
    },
    liquidity: {
      pairs: [],
      limitations: [],
    },
    ai: {
      status: "skipped",
      model: null,
      markdown: null,
      narrative: null,
      reason: null,
      finishReason: null,
    },
    warnings: [],
    reportBoundaries: [
      "This report is read-only contract context. It is not a formal audit, financial advice, legal advice, or proof that a token is safe.",
    ],
    errors,
    missingConfig: [],
  };
}

function emptyBytecodeArtifact(): TokenContractBytecodeArtifact {
  return {
    available: false,
    byteLength: 0,
    hash: null,
    hashWithoutMetadata: null,
    metadataDetected: false,
    source: null,
    embeddedAddresses: [],
    limitations: [],
  };
}

export function createEmptyTokenContractReportModules(): TokenContractReportResponse["modules"] {
  const createModule = (
    id: TokenContractReportModuleId,
    label: string,
  ): TokenContractReportModule => ({
    id,
    label,
    status: "unavailable",
    evidenceCount: 0,
    summary: "This evidence module did not run.",
    warnings: [],
  });
  return {
    source: createModule("source", "Verified source"),
    bytecode: createModule("bytecode", "Runtime bytecode"),
    history: createModule("history", "Contract history"),
    simulation: createModule("simulation", "Read-only simulation"),
    liquidity: createModule("liquidity", "DEX liquidity"),
    ai: createModule("ai", "AI explanation"),
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
