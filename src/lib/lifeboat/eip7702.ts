import { getAddress, isAddress, type Address } from "viem";

export const EIP7702_DELEGATION_PREFIX = "0xef0100";
export const EIP7702_DELEGATION_CODE_BYTES = 23;

export type Eip7702RiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "insufficient_data"
  | "upstream_unavailable"
  | "unsupported";

export type Eip7702ScanStatus =
  | "idle"
  | "scanning"
  | "complete"
  | "unsupported"
  | "config-missing"
  | "bad-request"
  | "upstream-failure";

export interface Eip7702Evidence {
  accountAddress: Address;
  code: string;
  codeLengthBytes: number;
  delegationAddress: Address | null;
  classification:
    | "empty"
    | "eip7702_delegation"
    | "other_code"
    | "invalid_delegation";
  explorerUrl: string | null;
  delegationExplorerUrl: string | null;
  description: string;
}

export interface Eip7702Analysis {
  riskLevel: Eip7702RiskLevel;
  evidence: Eip7702Evidence[];
  summary: {
    codeLengthBytes: number;
    hasCode: boolean;
    hasDelegation: boolean;
    delegationAddress: Address | null;
    classification: Eip7702Evidence["classification"];
  };
  warnings: string[];
}

export interface LifeboatEip7702ApiResponse {
  ok: boolean;
  status: Eip7702ScanStatus;
  chainId: number;
  chainName: string;
  owner: Address | null;
  riskLevel: Eip7702RiskLevel;
  evidence: Eip7702Evidence[];
  summary: Eip7702Analysis["summary"];
  warnings: string[];
  errors: string[];
  missingConfig: string[];
  supported: boolean;
  supportNotes: string[];
}

export interface AnalyzeEip7702DelegationOptions {
  owner: Address;
  code: string;
  explorerUrl?: string | null;
  delegationExplorerUrl?: (address: Address) => string;
}

export function analyzeEip7702Delegation({
  owner,
  code,
  explorerUrl = null,
  delegationExplorerUrl,
}: AnalyzeEip7702DelegationOptions): Eip7702Analysis {
  const normalizedCode = normalizeCode(code);
  const parsed = parseEip7702DelegationCode(normalizedCode);
  const codeLengthBytes = codeByteLength(normalizedCode);
  const evidence = evidenceForCode({
    owner,
    code: normalizedCode,
    codeLengthBytes,
    parsed,
    explorerUrl,
    delegationExplorerUrl,
  });

  return {
    riskLevel: riskLevelForClassification(parsed.classification),
    evidence,
    summary: {
      codeLengthBytes,
      hasCode: normalizedCode !== "0x",
      hasDelegation: parsed.classification === "eip7702_delegation",
      delegationAddress: parsed.delegationAddress,
      classification: parsed.classification,
    },
    warnings: [
      "This read-only diagnostic checks account code for the EIP-7702 delegation designator. It does not clear delegation, sign authorizations, or repair accounts.",
      "No EIP-7702 delegation found does not prove the wallet is safe or that the seed phrase/private key was not compromised.",
    ],
  };
}

export function parseEip7702DelegationCode(code: string): {
  classification: Eip7702Evidence["classification"];
  delegationAddress: Address | null;
} {
  const normalizedCode = normalizeCode(code);
  if (normalizedCode === "0x") {
    return { classification: "empty", delegationAddress: null };
  }

  if (!normalizedCode.startsWith(EIP7702_DELEGATION_PREFIX)) {
    return { classification: "other_code", delegationAddress: null };
  }

  const expectedHexLength = EIP7702_DELEGATION_PREFIX.length + 40;
  if (normalizedCode.length !== expectedHexLength) {
    return { classification: "invalid_delegation", delegationAddress: null };
  }

  const delegationAddress = `0x${normalizedCode.slice(
    EIP7702_DELEGATION_PREFIX.length,
  )}`;
  if (!isAddress(delegationAddress)) {
    return { classification: "invalid_delegation", delegationAddress: null };
  }

  return {
    classification: "eip7702_delegation",
    delegationAddress: getAddress(delegationAddress),
  };
}

export function emptyEip7702Summary(): Eip7702Analysis["summary"] {
  return {
    codeLengthBytes: 0,
    hasCode: false,
    hasDelegation: false,
    delegationAddress: null,
    classification: "empty",
  };
}

export function normalizeEip7702Owner(value: string | null): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function eip7702RiskLabel(riskLevel: Eip7702RiskLevel): string {
  switch (riskLevel) {
    case "elevated":
      return "Active EIP-7702 delegation";
    case "possible":
      return "Delegation-like code review";
    case "informational":
      return "Account code present";
    case "none_detected":
      return "No delegation code found";
    case "insufficient_data":
      return "Incomplete delegation check";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "unsupported":
      return "Unsupported network";
    case "not_checked":
    default:
      return "Not scanned";
  }
}

function evidenceForCode({
  owner,
  code,
  codeLengthBytes,
  parsed,
  explorerUrl,
  delegationExplorerUrl,
}: {
  owner: Address;
  code: string;
  codeLengthBytes: number;
  parsed: ReturnType<typeof parseEip7702DelegationCode>;
  explorerUrl: string | null;
  delegationExplorerUrl?: (address: Address) => string;
}): Eip7702Evidence[] {
  if (parsed.classification === "empty") return [];

  const delegationAddress = parsed.delegationAddress;
  return [
    {
      accountAddress: owner,
      code,
      codeLengthBytes,
      delegationAddress,
      classification: parsed.classification,
      explorerUrl,
      delegationExplorerUrl: delegationAddress
        ? delegationExplorerUrl?.(delegationAddress) ?? null
        : null,
      description: descriptionForClassification(parsed.classification),
    },
  ];
}

function riskLevelForClassification(
  classification: Eip7702Evidence["classification"],
): Eip7702RiskLevel {
  if (classification === "empty") return "none_detected";
  if (classification === "eip7702_delegation") return "elevated";
  if (classification === "invalid_delegation") return "possible";
  return "informational";
}

function descriptionForClassification(
  classification: Eip7702Evidence["classification"],
): string {
  switch (classification) {
    case "eip7702_delegation":
      return "The account code matches the EIP-7702 delegation designator format. Review the delegate contract before adding gas or interacting from this address.";
    case "invalid_delegation":
      return "The account code starts with the EIP-7702 delegation prefix but does not match the expected 23-byte designator length.";
    case "other_code":
      return "This address has code, but it is not the standard EIP-7702 delegation designator. It may be a contract address rather than a normal EOA.";
    case "empty":
    default:
      return "No account code was returned at latest block.";
  }
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
