import { getAddress, isAddress, type Address } from "viem";

export type SmartWalletRiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type SmartWalletScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export interface SmartWalletSafeConfig {
  owners: Address[];
  threshold: number | null;
  modules: Address[];
  nonce: string | null;
}

export interface SmartWalletEvidence {
  title: string;
  description: string;
  riskLevel: SmartWalletRiskLevel;
  accountAddress: Address;
  safeOwners: Address[];
  safeThreshold: number | null;
  safeModules: Address[];
  safeNonce: string | null;
  codeLengthBytes: number;
  explorerUrl: string | null;
}

export interface SmartWalletAnalysis {
  riskLevel: SmartWalletRiskLevel;
  evidence: SmartWalletEvidence[];
  summary: {
    codeLengthBytes: number;
    hasCode: boolean;
    isSmartWalletLike: boolean;
    isSafeLike: boolean;
    ownerCount: number;
    threshold: number | null;
    moduleCount: number;
    nonce: string | null;
  };
  warnings: string[];
}

export interface LifeboatSmartWalletApiResponse {
  ok: boolean;
  status: SmartWalletScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: SmartWalletRiskLevel;
  evidence: SmartWalletEvidence[];
  summary: SmartWalletAnalysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
  supported: boolean;
  supportNotes: string[];
}

export interface AnalyzeSmartWalletOptions {
  owner: Address;
  code: string;
  safeConfig?: SmartWalletSafeConfig | null;
  explorerUrl?: string | null;
}

export function analyzeSmartWallet({
  owner,
  code,
  safeConfig = null,
  explorerUrl = null,
}: AnalyzeSmartWalletOptions): SmartWalletAnalysis {
  const normalizedCode = normalizeCode(code);
  const codeLengthBytes = codeByteLength(normalizedCode);
  const hasCode = codeLengthBytes > 0;
  const isSafeLike = Boolean(safeConfig);
  const evidence = smartWalletEvidence({
    owner,
    codeLengthBytes,
    safeConfig,
    explorerUrl,
  });
  const riskLevel = smartWalletRiskLevel({ hasCode, safeConfig });

  return {
    riskLevel,
    evidence,
    summary: {
      codeLengthBytes,
      hasCode,
      isSmartWalletLike: hasCode,
      isSafeLike,
      ownerCount: safeConfig?.owners.length ?? 0,
      threshold: safeConfig?.threshold ?? null,
      moduleCount: safeConfig?.modules.length ?? 0,
      nonce: safeConfig?.nonce ?? null,
    },
    warnings: [
      "This read-only diagnostic checks latest account code and Safe-compatible view methods only. It does not change owners, thresholds, modules, guards, or transactions.",
      "No smart-wallet configuration warning here does not prove the wallet is safe or that every module, guard, session key, or delegation has been reviewed.",
    ],
  };
}

export function emptySmartWalletSummary(): SmartWalletAnalysis["summary"] {
  return {
    codeLengthBytes: 0,
    hasCode: false,
    isSmartWalletLike: false,
    isSafeLike: false,
    ownerCount: 0,
    threshold: null,
    moduleCount: 0,
    nonce: null,
  };
}

export function normalizeSmartWalletOwner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function smartWalletRiskLabel(
  riskLevel: SmartWalletRiskLevel,
): string {
  switch (riskLevel) {
    case "elevated":
      return "Safe module review needed";
    case "possible":
      return "Smart wallet review";
    case "informational":
      return "Smart wallet detected";
    case "none_detected":
      return "No account code found";
    case "insufficient_data":
      return "Incomplete smart-wallet check";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function smartWalletEvidence({
  owner,
  codeLengthBytes,
  safeConfig,
  explorerUrl,
}: {
  owner: Address;
  codeLengthBytes: number;
  safeConfig: SmartWalletSafeConfig | null;
  explorerUrl: string | null;
}): SmartWalletEvidence[] {
  if (codeLengthBytes === 0) return [];

  if (!safeConfig) {
    return [
      {
        title: "Account code present",
        description:
          "This address has contract code, so it may be a smart wallet or contract account. This first pass could not read Safe-compatible owner and module configuration.",
        riskLevel: "possible",
        accountAddress: owner,
        safeOwners: [],
        safeThreshold: null,
        safeModules: [],
        safeNonce: null,
        codeLengthBytes,
        explorerUrl,
      },
    ];
  }

  const moduleCount = safeConfig.modules.length;
  const threshold = safeConfig.threshold;
  return [
    {
      title:
        moduleCount > 0
          ? "Safe modules enabled"
          : threshold === 1
            ? "Single-signature Safe configuration"
            : "Safe-compatible configuration",
      description:
        moduleCount > 0
          ? "The account responded to Safe-compatible reads and has one or more enabled modules. Review modules from a clean wallet or trusted Safe interface before relying on this wallet."
          : threshold === 1
            ? "The account responded to Safe-compatible reads and uses a threshold of 1. A single compromised owner can usually act for the Safe."
            : "The account responded to Safe-compatible owner and threshold reads. Review owners, threshold, modules, and pending transactions from a clean environment.",
      riskLevel: moduleCount > 0 || threshold === 1 ? "elevated" : "informational",
      accountAddress: owner,
      safeOwners: safeConfig.owners,
      safeThreshold: threshold,
      safeModules: safeConfig.modules,
      safeNonce: safeConfig.nonce,
      codeLengthBytes,
      explorerUrl,
    },
  ];
}

function smartWalletRiskLevel({
  hasCode,
  safeConfig,
}: {
  hasCode: boolean;
  safeConfig: SmartWalletSafeConfig | null;
}): SmartWalletRiskLevel {
  if (!hasCode) return "none_detected";
  if (!safeConfig) return "possible";
  if (safeConfig.modules.length > 0 || safeConfig.threshold === 1) {
    return "elevated";
  }
  return "informational";
}

function normalizeCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "0x") return "0x";
  if (!/^0x[0-9a-f]*$/i.test(trimmed)) return "0x";
  return trimmed.toLowerCase();
}

function codeByteLength(code: string): number {
  if (code === "0x") return 0;
  return Math.floor((code.length - 2) / 2);
}
