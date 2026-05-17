import { getAddress, isAddress, type Address } from "viem";

import { PULSECHAIN_CHAIN_ID, getChainConfig } from "@/lib/chains";
import {
  explorerAddressUrl,
  explorerTokenUrl,
  explorerTxUrl,
} from "@/lib/explorer";
import type {
  TokenChairExplorerData,
  TokenChairSourceSignal,
  TokenChairSourceSignalKey,
} from "@/lib/token-chair-sniffer";

export interface FetchTokenChairExplorerOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

interface ExplorerFetchResult {
  ok: boolean;
  status: number | null;
  payload: unknown;
  error: string | null;
}

interface V2AddressInfo {
  hash?: string;
  is_contract?: boolean;
  is_verified?: boolean;
  name?: string | null;
  creator_address_hash?: string | null;
  creation_tx_hash?: string | null;
}

interface V2SmartContractInfo {
  is_verified?: boolean;
  is_fully_verified?: boolean;
  is_partially_verified?: boolean;
  name?: string | null;
  compiler_version?: string | null;
  verified_at?: string | null;
  abi?: unknown;
  source_code?: string | null;
  additional_sources?: unknown;
}

const SOURCE_SIGNAL_DEFINITIONS: Array<{
  key: TokenChairSourceSignalKey;
  label: string;
  terms: string[];
}> = [
  {
    key: "mintable",
    label: "Mintable",
    terms: ["mint", "mintTo", "ownerMint", "airdrop"],
  },
  {
    key: "transfer-pausable",
    label: "Transfer pausable",
    terms: ["pause", "unpause", "paused", "setPaused", "pauseTrading"],
  },
  {
    key: "trading-cooldown",
    label: "Trading cooldown",
    terms: ["cooldown", "transferDelay", "lastTransfer", "antiBot", "maxTx"],
  },
  {
    key: "blacklist",
    label: "Blacklist",
    terms: ["blacklist", "blacklisted", "isBlacklisted", "setBot", "isBot"],
  },
  {
    key: "whitelist",
    label: "Whitelist",
    terms: ["whitelist", "allowlist", "isWhitelisted", "setWhitelist"],
  },
  {
    key: "suspicious-functions",
    label: "Suspicious functions",
    terms: [
      "setTax",
      "setFee",
      "setFees",
      "setMaxWallet",
      "manualSwap",
      "rescueTokens",
      "rescueETH",
      "withdrawStuck",
      "enableTrading",
    ],
  },
];

export async function fetchTokenChairExplorerData(
  tokenAddress: Address,
  options: FetchTokenChairExplorerOptions = {},
): Promise<TokenChairExplorerData> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = pulseScanV2BaseUrl();
  const [addressRead, contractRead] = await Promise.all([
    fetchExplorerJson(`${baseUrl}/addresses/${tokenAddress}`, fetchImpl, options.signal),
    fetchExplorerJson(
      `${baseUrl}/smart-contracts/${tokenAddress}`,
      fetchImpl,
      options.signal,
    ),
  ]);

  return normalizeTokenChairExplorerResponse({
    tokenAddress,
    addressPayload: addressRead.payload,
    contractPayload: contractRead.payload,
    addressError: addressRead.ok ? null : addressRead.error,
    contractError:
      contractRead.ok || contractRead.status === 404 ? null : contractRead.error,
  });
}

export function normalizeTokenChairExplorerResponse({
  tokenAddress,
  addressPayload,
  contractPayload,
  addressError = null,
  contractError = null,
}: {
  tokenAddress: Address;
  addressPayload: unknown;
  contractPayload: unknown;
  addressError?: string | null;
  contractError?: string | null;
}): TokenChairExplorerData {
  const addressInfo = asRecord(addressPayload) as V2AddressInfo | null;
  const contractInfo = asRecord(contractPayload) as V2SmartContractInfo | null;
  const sourceVerified =
    boolOrNull(contractInfo?.is_verified) ??
    boolOrNull(addressInfo?.is_verified);
  const sourceText = collectSourceText(contractInfo);
  const abiNames = extractAbiFunctionNames(contractInfo?.abi);
  const sourceSignals =
    sourceVerified === null
      ? buildUnknownSourceSignals()
      : sourceVerified
        ? buildSourceSignals({
            sourceText,
            abiFunctionNames: abiNames,
            sourceAvailable: sourceText.length > 0,
            abiAvailable: abiNames.length > 0,
          })
        : buildUnknownSourceSignals();

  const warnings = [
    addressInfo?.is_contract === false
      ? "PulseScan did not classify this address as a contract."
      : null,
    sourceVerified === false
      ? "PulseScan did not return verified source for this contract."
      : null,
    sourceVerified === true && sourceText.length === 0
      ? "PulseScan marked the contract verified, but no source text was returned."
      : null,
    contractError,
  ].filter((warning): warning is string => Boolean(warning));
  const errors = [addressError].filter((error): error is string => Boolean(error));
  const status =
    errors.length > 0
      ? "unable-to-verify"
      : warnings.length > 0
        ? "partial"
        : "success";
  const creationTxHash = normalizeHash(addressInfo?.creation_tx_hash);

  return {
    status,
    sourceVerified,
    abiAvailable: abiNames.length > 0,
    sourceCodeAvailable: sourceText.length > 0,
    contractName: cleanString(contractInfo?.name) ?? cleanString(addressInfo?.name),
    compilerVersion: cleanString(contractInfo?.compiler_version),
    verifiedAt: cleanString(contractInfo?.verified_at),
    deployerAddress: normalizeAddress(addressInfo?.creator_address_hash),
    creationTxHash,
    explorerAddressUrl: explorerAddressUrl(PULSECHAIN_CHAIN_ID, tokenAddress),
    explorerTokenUrl: explorerTokenUrl(PULSECHAIN_CHAIN_ID, tokenAddress),
    explorerTxUrl: creationTxHash
      ? explorerTxUrl(PULSECHAIN_CHAIN_ID, creationTxHash)
      : null,
    sourceSignals,
    warnings,
    errors,
  };
}

async function fetchExplorerJson(
  url: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
): Promise<ExplorerFetchResult> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal,
    });
  } catch (error) {
    return {
      ok: false,
      status: null,
      payload: null,
      error: explorerErrorMessage(error),
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload: null,
      error: `PulseScan returned HTTP ${response.status}.`,
    };
  }

  try {
    return {
      ok: true,
      status: response.status,
      payload: await response.json(),
      error: null,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      payload: null,
      error: "PulseScan returned a response that could not be parsed as JSON.",
    };
  }
}

function buildSourceSignals({
  sourceText,
  abiFunctionNames,
  sourceAvailable,
  abiAvailable,
}: {
  sourceText: string;
  abiFunctionNames: readonly string[];
  sourceAvailable: boolean;
  abiAvailable: boolean;
}): TokenChairSourceSignal[] {
  const lowerSource = sourceText.toLowerCase();
  const lowerAbiNames = abiFunctionNames.map((name) => name.toLowerCase());

  return SOURCE_SIGNAL_DEFINITIONS.map((definition) => {
    const matches = definition.terms.filter((term) => {
      const lowerTerm = term.toLowerCase();
      return (
        lowerAbiNames.some((name) => name.includes(lowerTerm)) ||
        lowerSource.includes(lowerTerm)
      );
    });

    return {
      key: definition.key,
      label: definition.label,
      found: matches.length > 0,
      matches,
      detail:
        matches.length > 0
          ? `Matched verified ABI/source terms: ${matches.join(", ")}. This is a signal to review, not a scam verdict.`
          : `Verified ABI/source was scanned for common ${definition.label.toLowerCase()} terms and none were flagged by this lightweight pass.`,
    };
  }).map((signal) => ({
    ...signal,
    found: sourceAvailable || abiAvailable ? signal.found : null,
    detail:
      sourceAvailable || abiAvailable
        ? signal.detail
        : "PulseScan source or ABI data was unavailable, so this row cannot be checked.",
  }));
}

function buildUnknownSourceSignals(): TokenChairSourceSignal[] {
  return SOURCE_SIGNAL_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    found: null,
    matches: [],
    detail:
      "PulseScan did not return verified source or ABI data, so this row cannot be checked.",
  }));
}

function pulseScanV2BaseUrl(): string {
  const apiUrl =
    getChainConfig(PULSECHAIN_CHAIN_ID)?.explorer.apiUrl ??
    "https://api.scan.pulsechain.com/api";
  return apiUrl.replace(/\/api\/?$/, "/api/v2").replace(/\/$/, "");
}

function collectSourceText(
  contractInfo: V2SmartContractInfo | null,
): string {
  if (!contractInfo) return "";
  const parts = [
    cleanString(contractInfo.source_code),
    ...normalizeAdditionalSourceText(contractInfo.additional_sources),
  ].filter((value): value is string => Boolean(value));
  return parts.join("\n");
}

function normalizeAdditionalSourceText(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(asRecord(item)?.source_code))
    .filter((source): source is string => Boolean(source));
}

function extractAbiFunctionNames(value: unknown): string[] {
  const abi = parseAbiValue(value);
  if (!Array.isArray(abi)) return [];
  const names = new Set<string>();
  for (const item of abi) {
    const record = asRecord(item);
    if (record?.type !== "function") continue;
    const name = cleanString(record.name);
    if (name) names.add(name);
  }
  return [...names];
}

function parseAbiValue(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Contract source code not verified") return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function normalizeAddress(value: unknown): Address | null {
  if (typeof value !== "string" || !isAddress(value)) return null;
  return getAddress(value);
}

function normalizeHash(value: unknown): `0x${string}` | null {
  if (typeof value !== "string") return null;
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) return null;
  return value as `0x${string}`;
}

function explorerErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "PulseScan source metadata request timed out.";
  }
  return "PulseScan source metadata is temporarily unavailable.";
}
