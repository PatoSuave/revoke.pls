import { getAddress, isAddress, type Address, type Hex } from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import { getSpenderMetadataEntry, getTokenEntry } from "@/lib/registry";

export const TOKEN_CHAIR_SNIFFER_ROUTE = "/app/token-chair-sniffer";
export const TOKEN_CHAIR_API_ROUTE = "/api/token-chair-sniffer/market";
export const TOKEN_CHAIR_CHAIN_ID = "pulsechain";
export const TOKEN_CHAIR_CHAIN_LABEL = "PulseChain";
export const DEX_SCREENER_TOKEN_PAIRS_URL =
  `https://api.dexscreener.com/token-pairs/v1/${TOKEN_CHAIR_CHAIN_ID}`;

export const TOKEN_CHAIR_DISCLAIMER =
  "Token Chair Sniffer highlights visible risk signals only. It does not guarantee that a token is safe. Scam contracts can hide behavior, change settings, or behave differently after launch.";

export type TokenChairApiStatus =
  | "success"
  | "no-pair-found"
  | "upstream-unavailable"
  | "malformed-response"
  | "bad-request";

export type TokenChairVerdictKind =
  | "low-visible-risk"
  | "some-warnings"
  | "high-risk"
  | "unable-to-fully-verify";

export interface TokenChairVerdict {
  kind: TokenChairVerdictKind;
  label:
    | "Low visible risk"
    | "Some warnings"
    | "High risk"
    | "Unable to fully verify";
  displayLabel:
    | "Chair Verdict: Smells Okay"
    | "Chair Verdict: Something Smells Funny"
    | "Chair Verdict: This Chair Is on Fire"
    | "Chair Verdict: Nose Blocked, Could Not Verify";
  tone: "success" | "warning" | "danger" | "neutral";
  notes: string[];
  reasons: TokenChairVerdictReason[];
}

export interface TokenChairVerdictReason {
  severity: "info" | "warning" | "high";
  label: string;
  detail: string;
}

export interface TokenChairTxnWindow {
  buys: number;
  sells: number;
  total: number;
}

export interface TokenChairMarketData {
  tokenAddress: Address;
  tokenName: string;
  tokenSymbol: string;
  pairAddress: string;
  dexName: string;
  dexId: string | null;
  priceUsd: string | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  txns24h: TokenChairTxnWindow | null;
  fdv: number | null;
  marketCap: number | null;
  pairCreatedAt: number | null;
  pairAgeMs: number | null;
  pairAgeLabel: string;
  dexScreenerUrl: string | null;
  quoteTokenSymbol: string | null;
  quoteTokenName: string | null;
  pairCount: number;
}

export type TokenChairDextoolsStatus =
  | "not-configured"
  | "success"
  | "partial"
  | "rate-limited"
  | "unable-to-verify";

export interface TokenChairDextoolsSocialLink {
  label: string;
  url: string;
}

export interface TokenChairDextoolsData {
  status: TokenChairDextoolsStatus;
  sourceLabel: "DEXTools";
  tokenAddress: Address;
  pairAddress: Address | null;
  priceUsd: string | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  dextScore: number | null;
  holderCount: number | null;
  tokenUrl: string | null;
  pairUrl: string | null;
  websiteUrl: string | null;
  socials: TokenChairDextoolsSocialLink[];
  warnings: string[];
  errors: string[];
}

export type TokenChairContractReadStatus =
  | "success"
  | "partial"
  | "unable-to-verify";

export interface TokenChairPairContractData {
  status: TokenChairContractReadStatus;
  pairAddress: Address | null;
  token0: Address | null;
  token1: Address | null;
  containsScannedToken: boolean | null;
  reserve0Raw: string | null;
  reserve1Raw: string | null;
  scannedTokenReserveRaw: string | null;
  quoteTokenReserveRaw: string | null;
  totalSupplyRaw: string | null;
  warnings: string[];
  errors: string[];
}

export type TokenChairPulseXPairVersion = "v1" | "v2";

export interface TokenChairPulseXPairData {
  status: TokenChairContractReadStatus;
  version: TokenChairPulseXPairVersion;
  label: string;
  factoryAddress: Address;
  pairAddress: Address | null;
  quoteTokenAddress: Address;
  quoteTokenSymbol: string;
  quoteTokenName: string;
  token0: Address | null;
  token1: Address | null;
  containsScannedToken: boolean | null;
  reserve0Raw: string | null;
  reserve1Raw: string | null;
  scannedTokenReserveRaw: string | null;
  quoteTokenReserveRaw: string | null;
  totalSupplyRaw: string | null;
  warnings: string[];
  errors: string[];
}

export type TokenChairSourceSignalKey =
  | "mintable"
  | "transfer-pausable"
  | "trading-cooldown"
  | "blacklist"
  | "whitelist"
  | "trading-gates"
  | "fee-controls"
  | "rescue-functions"
  | "ownership-controls"
  | "suspicious-functions";

export type TokenChairSourceSignalSeverity = "warning" | "high";

export interface TokenChairSourceSignal {
  key: TokenChairSourceSignalKey;
  label: string;
  severity: TokenChairSourceSignalSeverity;
  found: boolean | null;
  matches: string[];
  detail: string;
}

export interface TokenChairExplorerData {
  status: TokenChairContractReadStatus;
  sourceVerified: boolean | null;
  abiAvailable: boolean | null;
  sourceCodeAvailable: boolean | null;
  contractName: string | null;
  compilerVersion: string | null;
  verifiedAt: string | null;
  deployerAddress: Address | null;
  creationTxHash: `0x${string}` | null;
  explorerAddressUrl: string;
  explorerTokenUrl: string;
  explorerTxUrl: string | null;
  sourceSignals: TokenChairSourceSignal[];
  warnings: string[];
  errors: string[];
}

export interface TokenChairConcentrationSignal {
  percent: number | null;
  address: Address | null;
  isContract: boolean | null;
  holdersCount: number | null;
  sampledHolderCount: number;
  totalSupplyRaw: string | null;
  valueRaw: string | null;
}

export interface TokenChairHolderDistributionRow {
  rank: number;
  address: Address | null;
  percent: number | null;
  isContract: boolean | null;
  valueRaw: string | null;
}

export interface TokenChairHolderDistribution {
  sampledHolderCount: number;
  pageCount: number;
  maxPagesReached: boolean;
  holdersCount: number | null;
  totalSupplyRaw: string | null;
  top1Percent: number | null;
  top5Percent: number | null;
  top10Percent: number | null;
  burnDeadPercent: number | null;
  selectedPairPercent: number | null;
  topHolders: TokenChairHolderDistributionRow[];
}

export interface TokenChairHolderData {
  status: TokenChairContractReadStatus;
  token: TokenChairConcentrationSignal;
  lp: TokenChairConcentrationSignal & {
    pairAddress: Address | null;
  };
  distribution: TokenChairHolderDistribution | null;
  lpDistribution: TokenChairHolderDistribution | null;
  warnings: string[];
  errors: string[];
}

export type TokenChairLpLockerStatus =
  | "not-applicable"
  | "success"
  | "partial"
  | "unable-to-verify";

export interface TokenChairLpLockRecord {
  lockId: string;
  tokenAddress: Address;
  ownerAddress: Address;
  amountRaw: string;
  unlockTime: string;
  unlockDateIso: string | null;
  withdrawn: boolean;
  isLocked: boolean;
  lpSupplyPercent: number | null;
}

export interface TokenChairLpLockerData {
  status: TokenChairLpLockerStatus;
  lockerAddress: Address | null;
  lockerLabel: string | null;
  pairAddress: Address | null;
  checkedLockCount: number;
  totalLocks: string | null;
  maxLocksReached: boolean;
  matchedLocks: TokenChairLpLockRecord[];
  activeLocks: TokenChairLpLockRecord[];
  withdrawableLocks: TokenChairLpLockRecord[];
  lockedAmountRaw: string | null;
  lockedPercent: number | null;
  nextUnlockTime: string | null;
  nextUnlockDateIso: string | null;
  ownerAddresses: Address[];
  warnings: string[];
  errors: string[];
}

export interface TokenChairProxySignal {
  detected: boolean | null;
  implementationAddress: Address | null;
  adminAddress: Address | null;
  beaconAddress: Address | null;
  minimalProxyTarget: Address | null;
  publicImplementationAddress?: Address | null;
  publicAdminAddress?: Address | null;
  detectedKinds?: string[];
  checks: string[];
}

export type TokenChairAdminGetterCategory =
  | "admin"
  | "operator"
  | "fee-wallet"
  | "treasury"
  | "router";

export interface TokenChairAdminGetterSignal {
  functionName: string;
  address: Address;
  category: TokenChairAdminGetterCategory;
}

export interface TokenChairPendingOwnerSignal {
  address: Address | null;
  functionName: "pendingOwner" | "pendingAdmin" | "newOwner" | null;
}

export interface TokenChairAccessControlSignal {
  detected: boolean | null;
  defaultAdminRole: Hex | null;
  roleAdmin: Hex | null;
  checks: string[];
}

export type TokenChairTaxGetterStatus =
  | "found"
  | "not-found"
  | "unable-to-verify";

export interface TokenChairTaxGetterSignal {
  status: TokenChairTaxGetterStatus;
  valueRaw: string | null;
  functionName: string | null;
  checkedFunctions: string[];
}

export interface TokenChairTaxSignals {
  buy: TokenChairTaxGetterSignal;
  sell: TokenChairTaxGetterSignal;
}

export type TokenChairPublicGetterStatus =
  | "found"
  | "not-found"
  | "unable-to-verify";

export interface TokenChairBooleanGetterSignal {
  status: TokenChairPublicGetterStatus;
  value: boolean | null;
  functionName: string | null;
  checkedFunctions: string[];
}

export interface TokenChairNumericGetterSignal {
  status: TokenChairPublicGetterStatus;
  valueRaw: string | null;
  functionName: string | null;
  checkedFunctions: string[];
}

export interface TokenChairMechanicsSignals {
  paused: TokenChairBooleanGetterSignal;
  tradingEnabled: TokenChairBooleanGetterSignal;
  limitsInEffect: TokenChairBooleanGetterSignal;
  maxTx: TokenChairNumericGetterSignal;
  maxWallet: TokenChairNumericGetterSignal;
}

export type TokenChairEventHistoryLogName =
  | "ownershipTransferred"
  | "roleGranted"
  | "roleRevoked"
  | "paused"
  | "unpaused";

export interface TokenChairEventCounter {
  count: number;
  latestBlockNumber: string | null;
}

export interface TokenChairEventHistorySignal {
  status: TokenChairContractReadStatus;
  fromBlock: string | null;
  toBlock: string | null;
  lookbackBlocks: string;
  ownershipTransferred: TokenChairEventCounter;
  roleGranted: TokenChairEventCounter;
  roleRevoked: TokenChairEventCounter;
  paused: TokenChairEventCounter;
  unpaused: TokenChairEventCounter;
  warnings: string[];
  errors: string[];
}

export interface TokenChairContractData {
  tokenAddress: Address;
  status: TokenChairContractReadStatus;
  tokenName: string | null;
  tokenSymbol: string | null;
  decimals: number | null;
  ownerAddress: Address | null;
  ownerFunction: "owner" | "getOwner" | null;
  ownershipRenounced: boolean | null;
  proxy: TokenChairProxySignal;
  pendingOwner?: TokenChairPendingOwnerSignal;
  adminGetters?: TokenChairAdminGetterSignal[];
  accessControl?: TokenChairAccessControlSignal;
  taxes?: TokenChairTaxSignals;
  mechanics?: TokenChairMechanicsSignals;
  eventHistory?: TokenChairEventHistorySignal;
  explorer: TokenChairExplorerData | null;
  holders: TokenChairHolderData | null;
  lpLocker?: TokenChairLpLockerData | null;
  warnings: string[];
  errors: string[];
}

export interface TokenChairApiResponse {
  ok: boolean;
  status: TokenChairApiStatus;
  chainId: typeof TOKEN_CHAIR_CHAIN_ID;
  tokenAddress: Address | null;
  market: TokenChairMarketData | null;
  dextools: TokenChairDextoolsData | null;
  pairContract: TokenChairPairContractData | null;
  pulsexPairs: TokenChairPulseXPairData[];
  contract: TokenChairContractData | null;
  pairs: TokenChairMarketData[];
  verdict: TokenChairVerdict;
  warnings: string[];
  errors: string[];
}

export type SniffRowStatus =
  | "checked"
  | "warning"
  | "danger"
  | "not-checked"
  | "unable-to-verify";

export interface SniffSignalRow {
  label: string;
  value: string;
  status: SniffRowStatus;
  detail: string;
}

export interface TokenChairSourceSignalDetailRow extends SniffSignalRow {
  matches: string[];
}

export interface TokenChairDextoolsDetailRow extends SniffSignalRow {
  sourceLabel: "DEXTools";
  href?: string;
}

export interface ContractSniffCard {
  label: string;
  value: string;
  status: SniffRowStatus;
  detail: string;
  href?: string;
}

export type TokenChairConcentrationKind = "top-holder" | "lp-holder";

export interface TokenChairConcentrationDetailRow extends SniffSignalRow {
  kind: TokenChairConcentrationKind;
  address: Address | null;
  href?: string;
  percentLabel: string;
  holderCountLabel: string;
  classificationLabel: string;
  classificationDetail: string;
  classificationSourceLabel: string;
}

export interface TokenChairLpControlSummary extends SniffSignalRow {
  address: Address | null;
  href?: string;
  holderLabel: string;
  holderAddressLabel: string;
  holderPercentLabel: string;
  burnDeadPercentLabel: string;
  sampledRowsLabel: string;
  holderSourceLabel: string;
  lockerStatusLabel: string;
  lockerUnlockLabel: string;
  evidenceRows: TokenChairLpControlEvidenceRow[];
}

export type TokenChairLpControlEvidenceKey =
  | "largest-holder"
  | "holder-context"
  | "burn-dead-sample"
  | "formal-lock";

export interface TokenChairLpControlEvidenceRow extends SniffSignalRow {
  key: TokenChairLpControlEvidenceKey;
}

export interface TokenChairEventHistoryDetailRow extends SniffSignalRow {
  eventName: TokenChairEventHistoryLogName;
  count: number;
  latestBlockNumber: string | null;
}

export type TokenChairPairCandidateStatus =
  | "selected"
  | "warning"
  | "available";

export interface TokenChairPairCandidateRow {
  rank: number;
  pairAddress: string;
  pairLabel: string;
  dexName: string;
  quoteLabel: string;
  priceUsd: string;
  liquidityUsd: string;
  volume24h: string;
  txns24h: string;
  pairAgeLabel: string;
  status: TokenChairPairCandidateStatus;
  statusLabel: string;
  detail: string;
  dexScreenerUrl: string | null;
}

export type TokenChairAddressKind =
  | "zero-address"
  | "burn-address"
  | "token-contract"
  | "selected-pair"
  | "owner"
  | "deployer"
  | "proxy-admin"
  | "proxy-implementation"
  | "admin-getter"
  | "known-token"
  | "known-spender"
  | "contract"
  | "wallet"
  | "unknown";

export interface TokenChairAddressClassificationContext {
  tokenAddress?: Address | null;
  pairAddress?: Address | string | null;
  ownerAddress?: Address | null;
  deployerAddress?: Address | null;
  proxyAdminAddress?: Address | null;
  proxyImplementationAddress?: Address | null;
  adminGetterAddresses?: readonly Address[];
  isContract?: boolean | null;
}

export interface TokenChairAddressClassification {
  address: Address;
  kind: TokenChairAddressKind;
  label: string;
  detail: string;
  explorerUrl: string;
  sourceLabel?: string;
  registryProtocol?: string;
  registryCategory?: string;
}

interface NormalizeOptions {
  now?: number;
}

type NormalizePairReason = "malformed" | "wrong-chain" | "token-mismatch";

interface NormalizePairResult {
  market: TokenChairMarketData | null;
  reason: NormalizePairReason | null;
}

interface VisibleMarketWarning {
  severity: "warning" | "high";
  label: string;
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PULSESCAN_BASE_URL = "https://scan.pulsechain.com";
const ZERO_ADDRESS = getAddress("0x0000000000000000000000000000000000000000");
const DEAD_ADDRESS = getAddress("0x000000000000000000000000000000000000dEaD");

const QUICK_SNIFF_DETAILS: Record<string, string> = {
  "Buy tax": "Needs a verified tax source or trade simulation. This MVP does not check it.",
  "Sell tax": "Needs a verified tax source or trade simulation. This MVP does not check it.",
  "Ownership renounced": "Reads standard owner() or getOwner() when available. Hidden/admin controls are not ruled out.",
  "Hidden owner": "Needs source and bytecode review.",
  "Obfuscated address": "Needs bytecode and source review.",
  "Suspicious functions": "Needs source and bytecode review.",
  Honeypot: "Honeypot execution is not run in this MVP.",
  "Proxy contract": "Checks common proxy storage slots and minimal-proxy bytecode patterns only.",
  Mintable: "Needs source, ABI, or bytecode review.",
  "Transfer pausable": "Needs source, ABI, or bytecode review.",
  "Trading cooldown": "Needs source, ABI, or bytecode review.",
  Blacklist: "Needs source, ABI, or bytecode review.",
  Whitelist: "Needs source, ABI, or bytecode review.",
  "Trading gates": "Needs source, ABI, or bytecode review.",
  "Fee controls": "Needs source, ABI, or bytecode review.",
  "Rescue functions": "Needs source, ABI, or bytecode review.",
  "Ownership controls": "Needs source, ABI, or bytecode review.",
};

const CONTRACT_SNIFF_DETAILS: Record<string, string> = {
  "Source verified": "Reads PulseScan source and ABI metadata when available.",
  Owner: "Reads standard owner() or getOwner() when available.",
  "Admin getters": "Reads common public admin, operator, treasury, router, and fee-wallet getters when available.",
  "Proxy details": "Checks common proxy storage slots, public implementation/admin getters, and minimal-proxy bytecode.",
  Deployer: "Reads PulseScan creation metadata when available.",
  "Top holder concentration": "Reads PulseScan token holder data when available.",
  "LP concentration": "Reads PulseScan holder data for the selected pair when available.",
};

const EVENT_HISTORY_DETAIL_DEFINITIONS: Array<{
  eventName: TokenChairEventHistoryLogName;
  label: string;
}> = [
  { eventName: "ownershipTransferred", label: "Ownership transfers" },
  { eventName: "roleGranted", label: "Role grants" },
  { eventName: "roleRevoked", label: "Role revokes" },
  { eventName: "paused", label: "Pause events" },
  { eventName: "unpaused", label: "Unpause events" },
];

const DEX_NAME_OVERRIDES: Record<string, string> = {
  pulsex: "PulseX",
  "pulsex-v1": "PulseX V1",
  "pulsex-v2": "PulseX V2",
  "9inch": "9inch",
  nineinch: "9inch",
  phux: "Phux",
};

export function normalizeTokenChairAddress(
  input: string | null | undefined,
): Address | null {
  const value = input?.trim();
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function normalizeTokenChairQueryToken(
  value: string | string[] | null | undefined,
): Address | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return normalizeTokenChairAddress(candidate);
}

export function buildTokenChairSnifferUrl(
  tokenAddress: Address | string | null | undefined,
): string {
  const normalized = normalizeTokenChairAddress(tokenAddress);
  if (!normalized) return TOKEN_CHAIR_SNIFFER_ROUTE;
  const params = new URLSearchParams({ token: normalized });
  return `${TOKEN_CHAIR_SNIFFER_ROUTE}?${params.toString()}`;
}

export function classifyTokenChairAddress(
  address: Address | string | null | undefined,
  context: TokenChairAddressClassificationContext = {},
): TokenChairAddressClassification | null {
  const normalized = normalizeTokenChairAddress(address);
  if (!normalized) return null;

  const pairAddress = normalizeTokenChairAddress(context.pairAddress);
  const base = {
    address: normalized,
    explorerUrl: pulseScanAddressUrl(normalized),
  };

  if (addressesMatch(normalized, ZERO_ADDRESS)) {
    return {
      ...base,
      kind: "zero-address",
      label: "Zero address",
      detail:
        "This is the zero address, commonly used for renounced ownership or inaccessible balances.",
      sourceLabel: "Address convention",
    };
  }

  if (addressesMatch(normalized, DEAD_ADDRESS)) {
    return {
      ...base,
      kind: "burn-address",
      label: "Burn address",
      detail:
        "This is a common dead/burn address; balances here are generally inaccessible.",
      sourceLabel: "Address convention",
    };
  }

  if (addressesMatch(normalized, context.tokenAddress)) {
    return {
      ...base,
      kind: "token-contract",
      label: "Token contract",
      detail: "This address matches the token contract being scanned.",
      sourceLabel: "Scan input",
    };
  }

  if (addressesMatch(normalized, pairAddress)) {
    return {
      ...base,
      kind: "selected-pair",
      label: "Selected DEX pair",
      detail: "This address matches the primary DEX Screener pair for this scan.",
      sourceLabel: "DEX Screener pair context",
    };
  }

  if (addressesMatch(normalized, context.ownerAddress)) {
    return {
      ...base,
      kind: "owner",
      label: "Owner",
      detail: "This address matches the standard owner returned by read-only checks.",
      sourceLabel: "Read-only contract checks",
    };
  }

  if (addressesMatch(normalized, context.deployerAddress)) {
    return {
      ...base,
      kind: "deployer",
      label: "Deployer",
      detail: "This address matches the deployer returned by PulseScan metadata.",
      sourceLabel: "PulseScan metadata",
    };
  }

  if (addressesMatch(normalized, context.proxyAdminAddress)) {
    return {
      ...base,
      kind: "proxy-admin",
      label: "Proxy admin",
      detail: "This address matches a visible proxy admin signal.",
      sourceLabel: "Read-only proxy checks",
    };
  }

  if (addressesMatch(normalized, context.proxyImplementationAddress)) {
    return {
      ...base,
      kind: "proxy-implementation",
      label: "Proxy implementation",
      detail: "This address matches a visible proxy implementation signal.",
      sourceLabel: "Read-only proxy checks",
    };
  }

  if (context.adminGetterAddresses?.some((item) => addressesMatch(normalized, item))) {
    return {
      ...base,
      kind: "admin-getter",
      label: "Admin getter address",
      detail:
        "This address was returned by a public admin/operator/fee-wallet getter.",
      sourceLabel: "Read-only contract checks",
    };
  }

  const knownSpender = getSpenderMetadataEntry(PULSECHAIN_CHAIN_ID, normalized);
  if (knownSpender) {
    const categoryLabel =
      knownSpender.category === "locker"
        ? "locker"
        : `${knownSpender.protocol} ${knownSpender.category}`;
    return {
      ...base,
      kind: "known-spender",
      label: knownSpender.label,
      detail: `Known ${categoryLabel} entry in the Pulse Revoke registry. This label is context only, not a risk rating.`,
      sourceLabel: "Pulse Revoke registry",
      registryProtocol: knownSpender.protocol,
      registryCategory: knownSpender.category,
    };
  }

  const knownToken = getTokenEntry(PULSECHAIN_CHAIN_ID, normalized);
  if (knownToken) {
    return {
      ...base,
      kind: "known-token",
      label: `${knownToken.symbol} token`,
      detail: `Known PulseChain token registry entry for ${knownToken.name} (${knownToken.category}). This label is context only, not a risk rating.`,
      sourceLabel: "Pulse Revoke registry",
      registryCategory: knownToken.category,
    };
  }

  if (context.isContract === true) {
    return {
      ...base,
      kind: "contract",
      label: "Contract",
      detail: "PulseScan marks this address as a contract.",
      sourceLabel: "PulseScan metadata",
    };
  }

  if (context.isContract === false) {
    return {
      ...base,
      kind: "wallet",
      label: "Wallet",
      detail: "PulseScan does not mark this address as a contract.",
      sourceLabel: "PulseScan metadata",
    };
  }

  return {
    ...base,
    kind: "unknown",
    label: "Unknown address",
    detail: "PulseScan did not return enough context to classify this address.",
    sourceLabel: "PulseScan metadata",
  };
}

export function normalizeDexScreenerTokenPairsResponse(
  payload: unknown,
  tokenAddress: Address,
  options: NormalizeOptions = {},
): TokenChairApiResponse {
  if (!Array.isArray(payload)) {
    return createTokenChairApiResponse({
      status: "malformed-response",
      tokenAddress,
      errors: ["DEX Screener returned a malformed token-pairs response."],
    });
  }

  if (payload.length === 0) {
    return createTokenChairApiResponse({
      status: "no-pair-found",
      tokenAddress,
      warnings: [
        "DEX Screener did not return a PulseChain pair for this token address.",
      ],
    });
  }

  const now = options.now ?? Date.now();
  const pairs: TokenChairMarketData[] = [];
  const reasons: Record<NormalizePairReason, number> = {
    malformed: 0,
    "wrong-chain": 0,
    "token-mismatch": 0,
  };

  for (const item of payload) {
    const result = normalizeDexScreenerPair(item, tokenAddress, now);
    if (result.market) {
      pairs.push(result.market);
    } else if (result.reason) {
      reasons[result.reason] += 1;
    }
  }

  if (pairs.length === 0) {
    if (reasons.malformed > 0) {
      return createTokenChairApiResponse({
        status: "malformed-response",
        tokenAddress,
        errors: [
          "DEX Screener returned pair data, but the expected market fields were missing.",
        ],
      });
    }

    return createTokenChairApiResponse({
      status: "no-pair-found",
      tokenAddress,
      warnings: [
        "DEX Screener did not return a matching PulseChain pair for this token address.",
      ],
    });
  }

  const sortedPairs = sortMarketPairs(pairs).map((pair) => ({
    ...pair,
    pairCount: pairs.length,
  }));
  const warnings = [
    ...(reasons.malformed > 0
      ? ["Some DEX Screener pairs were ignored because fields were incomplete."]
      : []),
    ...(sortedPairs.every((pair) => pair.liquidityUsd === null)
      ? [
          "DEX Screener did not return liquidity for any matching pair, so pair selection is weak.",
        ]
      : []),
  ];

  return createTokenChairApiResponse({
    status: "success",
    tokenAddress,
    pairs: sortedPairs,
    warnings,
  });
}

export function createTokenChairApiResponse({
  status,
  tokenAddress,
  contract = null,
  dextools = null,
  pairContract = null,
  pulsexPairs = [],
  pairs = [],
  warnings = [],
  errors = [],
}: {
  status: TokenChairApiStatus;
  tokenAddress: Address | null;
  contract?: TokenChairContractData | null;
  dextools?: TokenChairDextoolsData | null;
  pairContract?: TokenChairPairContractData | null;
  pulsexPairs?: TokenChairPulseXPairData[];
  pairs?: TokenChairMarketData[];
  warnings?: string[];
  errors?: string[];
}): TokenChairApiResponse {
  const market = pairs[0] ?? null;
  const response: Omit<TokenChairApiResponse, "verdict"> = {
    ok: status === "success",
    status,
    chainId: TOKEN_CHAIR_CHAIN_ID,
    tokenAddress,
    market,
    dextools,
    pairContract,
    pulsexPairs,
    contract,
    pairs,
    warnings,
    errors,
  };

  return {
    ...response,
    verdict: getTokenChairVerdict(response),
  };
}

export function getTokenChairVerdict({
  status,
  market,
  dextools,
  pairContract,
  contract,
}: Pick<TokenChairApiResponse, "status" | "market" | "pairContract" | "contract"> & {
  dextools?: TokenChairDextoolsData | null;
}): TokenChairVerdict {
  if (status !== "success" || !market) {
    return {
      kind: "unable-to-fully-verify",
      label: "Unable to fully verify",
      displayLabel: "Chair Verdict: Nose Blocked, Could Not Verify",
      tone: "neutral",
      notes: [
        "The scanner could not read enough visible market data to form a market-only verdict.",
      ],
      reasons: [
        {
          severity: "info",
          label: "Market data unavailable",
          detail:
            "The scanner could not read enough visible market data to form a market-only verdict.",
        },
      ],
    };
  }

  const visibleWarnings = [
    ...getVisibleMarketWarnings(market),
    ...getVisibleDextoolsWarnings(market, dextools ?? null),
    ...getVisiblePairContractWarnings(pairContract),
    ...getVisibleContractWarnings(contract),
  ];
  if (visibleWarnings.some((warning) => warning.severity === "high")) {
    return {
      kind: "high-risk",
      label: "High risk",
      displayLabel: "Chair Verdict: This Chair Is on Fire",
      tone: "danger",
      notes: visibleWarnings.map((warning) => warning.message),
      reasons: visibleWarnings.map(verdictReasonFromVisibleWarning),
    };
  }

  if (visibleWarnings.length > 0) {
    return {
      kind: "some-warnings",
      label: "Some warnings",
      displayLabel: "Chair Verdict: Something Smells Funny",
      tone: "warning",
      notes: visibleWarnings.map((warning) => warning.message),
      reasons: visibleWarnings.map(verdictReasonFromVisibleWarning),
    };
  }

  return {
    kind: "unable-to-fully-verify",
    label: "Unable to fully verify",
    displayLabel: "Chair Verdict: Nose Blocked, Could Not Verify",
    tone: "neutral",
    notes: [
      "No major DEX Screener market warnings were found, but hidden-owner, bytecode, and honeypot checks are still not live yet.",
    ],
    reasons: [
      {
        severity: "info",
        label: "Read-only limits",
        detail:
          "No major DEX Screener market warnings were found, but hidden-owner, bytecode, and honeypot checks are still not live yet.",
      },
    ],
  };
}

export function buildQuickSniffRows(options: {
  unableToVerify?: boolean;
  contract?: TokenChairContractData | null;
} = {}): SniffSignalRow[] {
  const fallbackStatus: SniffRowStatus = options.unableToVerify
    ? "unable-to-verify"
    : "not-checked";
  const fallbackValue = fallbackStatus === "unable-to-verify"
    ? "Unable to verify"
    : "Not checked yet";

  return Object.entries(QUICK_SNIFF_DETAILS).map(([label, detail]) => ({
    label,
    value: fallbackValue,
    status: fallbackStatus,
    detail,
  })).map((row) => {
    if (row.label === "Buy tax") {
      return buildTaxGetterQuickRow(row, options.contract?.taxes?.buy ?? null, "buy");
    }

    if (row.label === "Sell tax") {
      return buildTaxGetterQuickRow(row, options.contract?.taxes?.sell ?? null, "sell");
    }

    if (row.label === "Ownership renounced") {
      return buildOwnershipQuickRow(row, options.contract ?? null);
    }

    if (row.label === "Proxy contract") {
      return buildProxyQuickRow(row, options.contract ?? null);
    }

    if (row.label === "Hidden owner") {
      return buildHiddenOwnerQuickRow(row, options.contract ?? null);
    }

    const mechanicsRow = buildMechanicsQuickRow(row, options.contract ?? null);
    const sourceRow = buildSourceSignalQuickRow(row, options.contract ?? null);
    if (mechanicsRow?.status === "warning") return mechanicsRow;
    if (sourceRow?.status === "warning") return sourceRow;
    if (mechanicsRow) return mechanicsRow;
    if (sourceRow) return sourceRow;

    return row;
  });
}

function buildHiddenOwnerQuickRow(
  row: SniffSignalRow,
  contract: TokenChairContractData | null,
): SniffSignalRow {
  if (!contract) return row;

  const getters = contract.adminGetters ?? [];
  if (getters.length > 0) {
    return {
      ...row,
      value: "Admin getter found",
      status: "warning",
      detail:
        `Visible public admin/operator/fee-wallet getters returned ${getters.map((getter) => getter.functionName).join(", ")}. This is not hidden-owner proof, but it is control context to review.`,
    };
  }

  if (contract.accessControl?.detected === true) {
    return {
      ...row,
      value: "Role signal found",
      status: "warning",
      detail:
        "Common AccessControl role functions responded. Role-based controls may exist even when standard ownership appears renounced.",
    };
  }

  return row;
}

function verdictReasonFromVisibleWarning(
  warning: VisibleMarketWarning,
): TokenChairVerdictReason {
  return {
    severity: warning.severity,
    label: warning.label,
    detail: warning.message,
  };
}

export function buildContractSniffCards(options: {
  unableToVerify?: boolean;
  contract?: TokenChairContractData | null;
} = {}): ContractSniffCard[] {
  const fallbackStatus: SniffRowStatus = options.unableToVerify
    ? "unable-to-verify"
    : "not-checked";
  const fallbackValue = fallbackStatus === "unable-to-verify"
    ? "Unable to verify"
    : "Not checked yet";

  return Object.entries(CONTRACT_SNIFF_DETAILS).map(([label, detail]) => ({
    label,
    value: fallbackValue,
    status: fallbackStatus,
    detail,
  })).map((card) => {
    if (card.label === "Source verified") {
      return buildSourceVerifiedContractCard(card, options.contract ?? null);
    }

    if (card.label === "Owner") {
      return buildOwnerContractCard(card, options.contract ?? null);
    }

    if (card.label === "Admin getters") {
      return buildAdminGettersContractCard(card, options.contract ?? null);
    }

    if (card.label === "Proxy details") {
      return buildProxyDetailsContractCard(card, options.contract ?? null);
    }

    if (card.label === "Deployer") {
      return buildDeployerContractCard(card, options.contract ?? null);
    }

    if (card.label === "Top holder concentration") {
      return buildTopHolderContractCard(card, options.contract ?? null);
    }

    if (card.label === "LP concentration") {
      return buildLpConcentrationContractCard(card, options.contract ?? null);
    }

    return card;
  });
}

export function buildSourceSignalDetailRows(options: {
  contract?: TokenChairContractData | null;
} = {}): TokenChairSourceSignalDetailRow[] {
  const explorer = options.contract?.explorer;
  if (!explorer) return [];

  return explorer.sourceSignals.map((signal) => {
    if (signal.found === true) {
      return {
        label: signal.label,
        value: sourceSignalValue(signal),
        status: sourceSignalStatus(signal),
        detail: signal.detail,
        matches: signal.matches,
      };
    }

    if (signal.found === false) {
      return {
        label: signal.label,
        value: "Not flagged by source scan",
        status: "checked",
        detail: signal.detail,
        matches: [],
      };
    }

    return {
      label: signal.label,
      value: "Unable to verify",
      status: "unable-to-verify",
      detail: signal.detail,
      matches: [],
    };
  });
}

export function buildDextoolsDetailRows(options: {
  dextools?: TokenChairDextoolsData | null;
} = {}): TokenChairDextoolsDetailRow[] {
  const dextools = options.dextools;
  if (!dextools) return [];
  if (dextools.status === "not-configured") return [];

  const rows: TokenChairDextoolsDetailRow[] = [
    {
      sourceLabel: "DEXTools",
      label: "DEXTScore",
      value:
        dextools.dextScore === null
          ? "Not returned"
          : `${formatDextScore(dextools.dextScore)}/99`,
      status:
        dextools.status === "rate-limited" ||
        dextools.status === "unable-to-verify"
          ? "unable-to-verify"
          : dextools.dextScore !== null && dextools.dextScore < 50
            ? "warning"
            : "checked",
      detail:
        "External DEXTools score context when returned. It is not a safety verdict, certification, or Token Chair audit result.",
      href: dextools.tokenUrl ?? dextools.pairUrl ?? undefined,
    },
    {
      sourceLabel: "DEXTools",
      label: "Holder count",
      value:
        dextools.holderCount === null
          ? "Not returned"
          : dextools.holderCount.toLocaleString("en-US"),
      status:
        dextools.status === "rate-limited" ||
        dextools.status === "unable-to-verify"
          ? "unable-to-verify"
          : "checked",
      detail:
        "External holder-count context from DEXTools when available. Holder count should be reviewed with distribution, liquidity, and volume.",
      href: dextools.tokenUrl ?? undefined,
    },
    {
      sourceLabel: "DEXTools",
      label: "Market cross-check",
      value:
        dextools.priceUsd || dextools.liquidityUsd !== null
          ? "Returned"
          : "Not returned",
      status:
        dextools.status === "success" || dextools.status === "partial"
          ? "checked"
          : "unable-to-verify",
      detail:
        `Price ${formatPriceUsd(dextools.priceUsd)}. Liquidity ${formatUsd(dextools.liquidityUsd)}. 24h volume ${formatUsd(dextools.volume24h)}.`,
      href: dextools.pairUrl ?? dextools.tokenUrl ?? undefined,
    },
  ];

  return rows;
}

export function buildEventHistoryDetailRows(options: {
  contract?: TokenChairContractData | null;
} = {}): TokenChairEventHistoryDetailRow[] {
  const eventHistory = options.contract?.eventHistory;
  if (!eventHistory) return [];

  return EVENT_HISTORY_DETAIL_DEFINITIONS.map(({ eventName, label }) => {
    const counter = eventHistory[eventName];
    const latest = counter.latestBlockNumber;
    const eventLabel = counter.count === 1 ? "event" : "events";

    if (eventHistory.status === "unable-to-verify") {
      return {
        eventName,
        count: counter.count,
        latestBlockNumber: latest,
        label,
        value: "Unable to verify",
        status: "unable-to-verify",
        detail:
          "The recent event-window log read failed for this scan. This does not prove the event is absent.",
      };
    }

    if (counter.count > 0) {
      return {
        eventName,
        count: counter.count,
        latestBlockNumber: latest,
        label,
        value: `${counter.count} recent ${eventLabel}`,
        status: "warning",
        detail: latest
          ? `Latest matching event returned in block ${latest}. Review recent contract history before interacting.`
          : "Matching events were returned, but the latest block number was not available.",
      };
    }

    if (eventHistory.status === "partial") {
      return {
        eventName,
        count: 0,
        latestBlockNumber: null,
        label,
        value: "Unable to verify",
        status: "unable-to-verify",
        detail:
          "No matching logs were counted, but at least one recent event-window read failed.",
      };
    }

    return {
      eventName,
      count: 0,
      latestBlockNumber: null,
      label,
      value: "No recent events",
      status: "checked",
      detail:
        "No matching logs were returned in the bounded recent event window. Older events are not ruled out.",
    };
  });
}

export function buildConcentrationDetailRows(options: {
  contract?: TokenChairContractData | null;
} = {}): TokenChairConcentrationDetailRow[] {
  const contract = options.contract;
  const holders = contract?.holders;
  if (!contract || !holders) return [];

  return [
    buildConcentrationDetailRow("top-holder", holders.token, contract),
    buildConcentrationDetailRow("lp-holder", holders.lp, contract),
  ];
}

export function buildLpControlSummary(options: {
  contract?: TokenChairContractData | null;
} = {}): TokenChairLpControlSummary | null {
  const contract = options.contract;
  const holders = contract?.holders;
  if (!contract || !holders) return null;

  const lp = holders.lp;
  const distribution = holders.lpDistribution;
  const classification = classifyConcentrationSignal(lp, contract);
  const holderPercentLabel =
    lp.percent === null ? "Unable to verify" : formatSignalPercent(lp.percent);
  const burnDeadPercentLabel = distribution?.burnDeadPercent === null ||
    distribution?.burnDeadPercent === undefined
    ? "Not returned"
    : formatSignalPercent(distribution.burnDeadPercent);
  const sampledRowsLabel = distribution
    ? `${distribution.sampledHolderCount.toLocaleString("en-US")} sampled rows`
    : "Not returned";
  const holderLabel = classification?.label ?? "Unknown address";
  const holderAddressLabel = lp.address
    ? shortenSignalAddress(lp.address)
    : "Not returned";
  const holderSourceLabel = classificationSourceLabel(classification);
  const lpLocker = contract.lpLocker ?? null;
  const lockerStatusLabel = lpLockerStatusLabel(lpLocker);
  const lockerUnlockLabel = lpLockerUnlockLabel(lpLocker);
  const evidenceRows = buildLpControlEvidenceRows({
    classification,
    distribution,
    holderLabel,
    holderPercentLabel,
    lp,
    lpLocker,
  });
  const base = {
    address: lp.address,
    href: classification?.explorerUrl,
    holderLabel,
    holderAddressLabel,
    holderPercentLabel,
    burnDeadPercentLabel,
    sampledRowsLabel,
    holderSourceLabel,
    lockerStatusLabel,
    lockerUnlockLabel,
    evidenceRows,
  };

  if (lp.percent === null) {
    return {
      ...base,
      label: "LP control",
      value: "Unable to verify",
      status: "unable-to-verify",
      detail:
        "PulseScan did not return LP-token holder concentration for the selected pair.",
    };
  }

  if (isBurnLikeClassification(classification)) {
    return {
      ...base,
      label: "LP control",
      value: "Burn/dead LP holder",
      status: "checked",
      detail:
        `Largest visible LP-token holder is ${holderPercentLabel} at ${warningHolderLabel(classification)}. This is useful context, but it is not proof of a formal liquidity lock.`,
    };
  }

  if (isKnownLockerClassification(classification)) {
    if (lpLocker?.activeLocks.length) {
      return {
        ...base,
        label: "LP control",
        value: "Readable LP lock found",
        status: "checked",
        detail: lpLockerSummaryDetail(lpLocker),
      };
    }

    if (lpLocker?.withdrawableLocks.length) {
      return {
        ...base,
        label: "LP control",
        value: "Locker position withdrawable",
        status: "warning",
        detail: lpLockerSummaryDetail(lpLocker),
      };
    }

    return {
      ...base,
      label: "LP control",
      value: "Known locker holds visible LP",
      status: lpLocker?.status === "unable-to-verify" ? "unable-to-verify" : "checked",
      detail:
        !lpLocker
          ? `Largest visible LP-token holder is ${holderPercentLabel} at ${classification.label}. Token Chair matched the holder to a known locker registry label, but it has not read the lock position, owner, or unlock date yet.`
          : lpLocker.status === "unable-to-verify"
          ? `Largest visible LP-token holder is ${holderPercentLabel} at ${classification.label}. Token Chair matched a known locker label, but the locker position read did not return usable data.`
          : `Largest visible LP-token holder is ${holderPercentLabel} at ${classification.label}. Token Chair matched the holder to a known locker registry label, but no active readable lock record was found in the bounded scan.`,
    };
  }

  if (
    distribution?.burnDeadPercent !== null &&
    distribution?.burnDeadPercent !== undefined &&
    distribution.burnDeadPercent >= 50
  ) {
    return {
      ...base,
      label: "LP control",
      value: "Major burn/dead LP balance",
      status: "checked",
      detail:
        `PulseScan sampled ${formatSignalPercent(distribution.burnDeadPercent)} of LP tokens at zero/dead addresses. Treat this as burn/dead context, not a formal liquidity-lock proof.`,
    };
  }

  if (lp.percent >= 50) {
    return {
      ...base,
      label: "LP control",
      value: lpControlWarningValue(classification),
      status: "warning",
      detail: lpControlWarningDetail(lp, contract, classification),
    };
  }

  return {
    ...base,
    label: "LP control",
    value: "No dominant LP holder",
    status: "checked",
    detail:
      `Largest visible LP-token holder is ${holderPercentLabel}. This is sampled PulseScan context only.`,
  };
}

export function withTokenChairContractData(
  response: TokenChairApiResponse,
  contract: TokenChairContractData,
): TokenChairApiResponse {
  const withContract: Omit<TokenChairApiResponse, "verdict"> = {
    ...response,
    contract,
    warnings: [...response.warnings, ...contract.warnings],
    errors: [...response.errors, ...contract.errors],
  };

  return {
    ...withContract,
    verdict: getTokenChairVerdict(withContract),
  };
}

export function withTokenChairPairContractData(
  response: TokenChairApiResponse,
  pairContract: TokenChairPairContractData,
): TokenChairApiResponse {
  const withPairContract: Omit<TokenChairApiResponse, "verdict"> = {
    ...response,
    pairContract,
    warnings: [...response.warnings, ...pairContract.warnings],
    errors: [...response.errors, ...pairContract.errors],
  };

  return {
    ...withPairContract,
    verdict: getTokenChairVerdict(withPairContract),
  };
}

export function withTokenChairPulseXPairData(
  response: TokenChairApiResponse,
  pulsexPairs: TokenChairPulseXPairData[],
): TokenChairApiResponse {
  const withPulseX: Omit<TokenChairApiResponse, "verdict"> = {
    ...response,
    pulsexPairs,
  };

  return {
    ...withPulseX,
    verdict: getTokenChairVerdict(withPulseX),
  };
}

function buildLpControlEvidenceRows({
  classification,
  distribution,
  holderLabel,
  holderPercentLabel,
  lp,
  lpLocker,
}: {
  classification: TokenChairAddressClassification | null;
  distribution: TokenChairHolderDistribution | null;
  holderLabel: string;
  holderPercentLabel: string;
  lp: TokenChairHolderData["lp"];
  lpLocker: TokenChairLpLockerData | null;
}): TokenChairLpControlEvidenceRow[] {
  const dominant = lp.percent !== null && lp.percent >= 50;
  const burnLike = isBurnLikeClassification(classification);
  const burnDeadPercent = distribution?.burnDeadPercent ?? null;
  const holderAddress = lp.address ? shortenSignalAddress(lp.address) : null;

  return [
    {
      key: "largest-holder",
      label: "Largest LP holder",
      value: lp.percent === null ? "Unable to verify" : holderPercentLabel,
      status:
        lp.percent === null
          ? "unable-to-verify"
          : dominant && !burnLike && !isKnownLockerClassification(classification)
            ? "warning"
            : "checked",
      detail:
        lp.percent === null
          ? "PulseScan did not return the largest visible LP-token holder for the selected pair."
          : holderAddress
            ? `${holderPercentLabel} of sampled LP tokens appears at ${holderAddress}.`
            : `${holderPercentLabel} of sampled LP tokens appears at the largest returned holder.`,
    },
    {
      key: "holder-context",
      label: "Holder context",
      value: holderLabel,
      status: lpHolderContextStatus(classification, dominant),
      detail: classification
        ? classification.detail
        : "PulseScan did not return enough holder address context to classify the largest LP holder.",
    },
    {
      key: "burn-dead-sample",
      label: "Burn/dead sample",
      value:
        burnDeadPercent === null
          ? "Not returned"
          : formatSignalPercent(burnDeadPercent),
      status:
        burnDeadPercent === null
          ? "unable-to-verify"
          : burnDeadPercent >= 50 || burnLike
            ? "checked"
            : "not-checked",
      detail:
        burnDeadPercent === null
          ? "PulseScan did not return sampled zero/dead LP-token balance context."
          : burnDeadPercent > 0
            ? `${formatSignalPercent(burnDeadPercent)} of sampled LP tokens appears at zero/dead addresses. This is burn context only, not formal lock proof.`
            : "No zero/dead LP-token balance appeared in the sampled holder rows.",
    },
    {
      key: "formal-lock",
      label: "Locker evidence",
      value: lpLockerEvidenceValue(lpLocker, classification),
      status: lpLockerEvidenceStatus(lpLocker, classification),
      detail: lpLockerEvidenceDetail(lpLocker, classification, holderLabel),
    },
  ];
}

function lpHolderContextStatus(
  classification: TokenChairAddressClassification | null,
  dominant: boolean,
): SniffRowStatus {
  if (!classification) return "unable-to-verify";
  if (isBurnLikeClassification(classification)) return "checked";
  if (isKnownLockerClassification(classification)) return "checked";
  if (!dominant) return "checked";
  return "warning";
}

function lpLockerStatusLabel(lpLocker: TokenChairLpLockerData | null): string {
  if (!lpLocker || lpLocker.status === "not-applicable") return "Not checked";
  if (lpLocker.activeLocks.length) return "Active lock found";
  if (lpLocker.withdrawableLocks.length) return "Unlockable";
  if (lpLocker.matchedLocks.length) return "No active lock";
  if (lpLocker.status === "unable-to-verify") return "Unable to verify";
  return "No readable lock";
}

function lpLockerUnlockLabel(lpLocker: TokenChairLpLockerData | null): string {
  if (!lpLocker || lpLocker.status === "not-applicable") return "Not checked";
  return formatLockerUnlockDate(lpLocker.nextUnlockDateIso) ?? "Not returned";
}

function lpLockerEvidenceValue(
  lpLocker: TokenChairLpLockerData | null,
  classification: TokenChairAddressClassification | null,
): string {
  if (lpLocker?.activeLocks.length) return "Lock record found";
  if (lpLocker?.withdrawableLocks.length) return "Unlockable record";
  if (lpLocker?.matchedLocks.length) return "No active lock";
  if (lpLocker?.status === "unable-to-verify") return "Unable to verify";
  if (isKnownLockerClassification(classification)) return "Known locker holder";
  return "Not verified";
}

function lpLockerEvidenceStatus(
  lpLocker: TokenChairLpLockerData | null,
  classification: TokenChairAddressClassification | null,
): SniffRowStatus {
  if (lpLocker?.activeLocks.length) return "checked";
  if (lpLocker?.withdrawableLocks.length) return "warning";
  if (lpLocker?.matchedLocks.length) return "warning";
  if (lpLocker?.status === "unable-to-verify") return "unable-to-verify";
  if (isKnownLockerClassification(classification)) return "checked";
  return "unable-to-verify";
}

function lpLockerEvidenceDetail(
  lpLocker: TokenChairLpLockerData | null,
  classification: TokenChairAddressClassification | null,
  holderLabel: string,
): string {
  if (lpLocker?.activeLocks.length) return lpLockerSummaryDetail(lpLocker);
  if (lpLocker?.withdrawableLocks.length) return lpLockerSummaryDetail(lpLocker);
  if (lpLocker?.matchedLocks.length) {
    return `${holderLabel} has readable lock records for the selected pair, but none are currently active. Review withdrawn and unlockable records before treating the LP as locked.`;
  }
  if (lpLocker?.status === "unable-to-verify") {
    return lpLocker.errors[0] ??
      "Token Chair matched a known locker holder, but the locker position read failed.";
  }
  if (isKnownLockerClassification(classification)) {
    return `${holderLabel} is a known locker label from the Pulse Revoke registry. Token Chair has not found a readable active lock record yet.`;
  }
  return "Token Chair has not matched a known locker holder or read locker contracts, unlock dates, or vesting positions. Treat LP-holder and burn/dead rows as visible context only.";
}

function lpLockerSummaryDetail(lpLocker: TokenChairLpLockerData): string {
  const percent = lpLocker.lockedPercent === null
    ? "an unknown share"
    : formatSignalPercent(lpLocker.lockedPercent);
  const amount = lpLocker.lockedAmountRaw ?? "an unknown raw amount";
  const unlock = formatLockerUnlockDate(lpLocker.nextUnlockDateIso);
  const ownerCount = lpLocker.ownerAddresses.length;
  const ownerCopy = ownerCount === 1
    ? `owner ${shortenSignalAddress(lpLocker.ownerAddresses[0]!)}`
    : `${ownerCount.toLocaleString("en-US")} owners`;

  if (lpLocker.activeLocks.length) {
    const unlockCopy = unlock ? ` Next unlock: ${unlock}.` : "";
    return `Token Chair read ${lpLocker.activeLocks.length.toLocaleString("en-US")} active lock record${lpLocker.activeLocks.length === 1 ? "" : "s"} for the selected pair at ${lpLocker.lockerLabel ?? "the matched locker"}, totaling ${percent} of LP supply (${amount} raw LP tokens) across ${ownerCopy}.${unlockCopy}`;
  }

  if (lpLocker.withdrawableLocks.length) {
    return `Token Chair found readable lock records for the selected pair at ${lpLocker.lockerLabel ?? "the matched locker"}, but the visible records are unlockable or expired rather than actively locked.`;
  }

  return `Token Chair checked ${lpLocker.checkedLockCount.toLocaleString("en-US")} locker record${lpLocker.checkedLockCount === 1 ? "" : "s"} and did not find an active readable lock for the selected pair.`;
}

function formatLockerUnlockDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function withTokenChairDextoolsData(
  response: TokenChairApiResponse,
  dextools: TokenChairDextoolsData,
): TokenChairApiResponse {
  const withDextools: Omit<TokenChairApiResponse, "verdict"> = {
    ...response,
    dextools,
  };

  return {
    ...withDextools,
    verdict: getTokenChairVerdict(withDextools),
  };
}

export function withTokenChairExplorerData(
  response: TokenChairApiResponse,
  explorer: TokenChairExplorerData,
): TokenChairApiResponse {
  const contract = response.contract
    ? { ...response.contract, explorer }
    : null;
  const withExplorer: Omit<TokenChairApiResponse, "verdict"> = {
    ...response,
    contract,
    warnings: [...response.warnings, ...explorer.warnings],
    errors: [...response.errors, ...explorer.errors],
  };

  return {
    ...withExplorer,
    verdict: getTokenChairVerdict(withExplorer),
  };
}

export function withTokenChairHolderData(
  response: TokenChairApiResponse,
  holders: TokenChairHolderData,
): TokenChairApiResponse {
  const contract = response.contract
    ? { ...response.contract, holders }
    : null;
  const withHolders: Omit<TokenChairApiResponse, "verdict"> = {
    ...response,
    contract,
    warnings: [...response.warnings, ...holders.warnings],
    errors: [...response.errors, ...holders.errors],
  };

  return {
    ...withHolders,
    verdict: getTokenChairVerdict(withHolders),
  };
}

export function withTokenChairLpLockerData(
  response: TokenChairApiResponse,
  lpLocker: TokenChairLpLockerData,
): TokenChairApiResponse {
  const contract = response.contract
    ? { ...response.contract, lpLocker }
    : null;
  const withLpLocker: Omit<TokenChairApiResponse, "verdict"> = {
    ...response,
    contract,
    warnings: [...response.warnings, ...lpLocker.warnings],
    errors: [...response.errors, ...lpLocker.errors],
  };

  return {
    ...withLpLocker,
    verdict: getTokenChairVerdict(withLpLocker),
  };
}

export function formatUsd(value: number | null): string {
  if (!isFiniteNumber(value)) return "Not returned";
  const maximumFractionDigits = value > 0 && value < 1 ? 6 : value < 100 ? 2 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

export function formatPriceUsd(value: string | null): string {
  const cleaned = value?.trim();
  if (!cleaned) return "Not returned";
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return cleaned;
  if (numeric > 0 && numeric < 0.000001) return "<$0.000001";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: numeric < 1 ? 8 : numeric < 100 ? 4 : 2,
  }).format(numeric);
}

function formatDextScore(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function numericPriceUsd(value: string | null): number | null {
  if (!value) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function relativeDifference(a: number, b: number): number {
  const larger = Math.max(Math.abs(a), Math.abs(b));
  if (larger === 0) return 0;
  return Math.abs(a - b) / larger;
}

export function formatCompactNumber(value: number | null): string {
  if (!isFiniteNumber(value)) return "Not returned";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatTxns24h(txns: TokenChairTxnWindow | null): string {
  if (!txns) return "Not returned";
  return `${txns.total.toLocaleString("en-US")} total`;
}

export function buildPairCandidateRows(
  pairs: readonly TokenChairMarketData[],
  limit = 6,
): TokenChairPairCandidateRow[] {
  return pairs.slice(0, Math.max(0, limit)).map((pair, index) => {
    const isSelected = index === 0;
    const warning = pairCandidateWarning(pair);
    const status: TokenChairPairCandidateStatus = isSelected
      ? "selected"
      : warning
        ? "warning"
        : "available";

    return {
      rank: index + 1,
      pairAddress: pair.pairAddress,
      pairLabel: shortenPairAddress(pair.pairAddress),
      dexName: pair.dexName,
      quoteLabel: pair.quoteTokenSymbol
        ? `/${pair.quoteTokenSymbol}`
        : "/quote not returned",
      priceUsd: formatPriceUsd(pair.priceUsd),
      liquidityUsd: formatUsd(pair.liquidityUsd),
      volume24h: formatUsd(pair.volume24h),
      txns24h: formatTxns24h(pair.txns24h),
      pairAgeLabel: pair.pairAgeLabel,
      status,
      statusLabel: isSelected
        ? "Selected pair"
        : warning ?? "Visible market data",
      detail: pair.quoteTokenSymbol
        ? `Quoted against ${pair.quoteTokenSymbol}${
            pair.quoteTokenName ? ` (${pair.quoteTokenName})` : ""
          }.`
        : "DEX Screener did not return quote-token metadata.",
      dexScreenerUrl: pair.dexScreenerUrl,
    };
  });
}

export function formatPairAge(
  pairCreatedAt: number | null,
  now = Date.now(),
): string {
  if (!isFiniteNumber(pairCreatedAt) || pairCreatedAt <= 0) {
    return "Not returned";
  }

  const ageMs = Math.max(0, now - pairCreatedAt);
  if (ageMs < 60 * 60 * 1000) return "<1h";
  if (ageMs < 2 * DAY_MS) {
    return `${Math.max(1, Math.floor(ageMs / (60 * 60 * 1000)))}h`;
  }
  if (ageMs < 90 * DAY_MS) {
    return `${Math.floor(ageMs / DAY_MS)}d`;
  }
  if (ageMs < 365 * DAY_MS) {
    return `${Math.max(1, Math.floor(ageMs / (30 * DAY_MS)))}mo`;
  }
  return `${(ageMs / (365 * DAY_MS)).toFixed(1)}y`;
}

export function formatDexName(dexId: string | null): string {
  const cleaned = dexId?.trim();
  if (!cleaned) return "Unknown DEX";
  const override = DEX_NAME_OVERRIDES[cleaned.toLowerCase()];
  if (override) return override;
  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeDexScreenerPair(
  item: unknown,
  tokenAddress: Address,
  now: number,
): NormalizePairResult {
  const pair = asRecord(item);
  if (!pair) return { market: null, reason: "malformed" };

  const chainId = cleanString(pair.chainId);
  if (chainId?.toLowerCase() !== TOKEN_CHAIR_CHAIN_ID) {
    return { market: null, reason: "wrong-chain" };
  }

  const baseToken = asRecord(pair.baseToken);
  const quoteToken = asRecord(pair.quoteToken);
  const baseAddress = normalizeTokenChairAddress(cleanString(baseToken?.address));
  const quoteAddress = normalizeTokenChairAddress(cleanString(quoteToken?.address));
  const tokenIsBase = addressesMatch(baseAddress, tokenAddress);
  const tokenIsQuote = addressesMatch(quoteAddress, tokenAddress);
  if (!tokenIsBase && !tokenIsQuote) {
    return { market: null, reason: "token-mismatch" };
  }

  const displayToken = tokenIsBase ? baseToken : quoteToken;
  const counterToken = tokenIsBase ? quoteToken : baseToken;
  const pairAddress = cleanString(pair.pairAddress);
  if (!displayToken || !pairAddress) {
    return { market: null, reason: "malformed" };
  }

  const dexId = cleanString(pair.dexId);
  const pairCreatedAt = finiteNumberOrNull(pair.pairCreatedAt);
  const pairAgeMs = pairCreatedAt === null ? null : Math.max(0, now - pairCreatedAt);
  const txns24h = normalizeTxnWindow(pair.txns);
  const dexScreenerUrl =
    normalizeDexScreenerUrl(cleanString(pair.url)) ??
    `https://dexscreener.com/${TOKEN_CHAIR_CHAIN_ID}/${pairAddress}`;

  return {
    market: {
      tokenAddress,
      tokenName: cleanString(displayToken.name) ?? "Unknown token",
      tokenSymbol: cleanString(displayToken.symbol) ?? "TOKEN",
      pairAddress,
      dexName: formatDexName(dexId),
      dexId,
      priceUsd: stringOrNumber(pair.priceUsd),
      liquidityUsd: finiteNumberOrNull(asRecord(pair.liquidity)?.usd),
      volume24h: finiteNumberOrNull(asRecord(pair.volume)?.h24),
      txns24h,
      fdv: finiteNumberOrNull(pair.fdv),
      marketCap: finiteNumberOrNull(pair.marketCap),
      pairCreatedAt,
      pairAgeMs,
      pairAgeLabel: formatPairAge(pairCreatedAt, now),
      dexScreenerUrl,
      quoteTokenSymbol: cleanString(counterToken?.symbol),
      quoteTokenName: cleanString(counterToken?.name),
      pairCount: 1,
    },
    reason: null,
  };
}

function getVisibleMarketWarnings(
  market: TokenChairMarketData,
): VisibleMarketWarning[] {
  const warnings: VisibleMarketWarning[] = [];

  if (market.priceUsd === null) {
    warnings.push({
      severity: "warning",
      label: "Missing price",
      message: "DEX Screener did not return a USD price for the selected pair.",
    });
  }

  if (market.liquidityUsd === null) {
    warnings.push({
      severity: "warning",
      label: "Missing liquidity",
      message: "DEX Screener did not return visible liquidity for the selected pair.",
    });
  } else if (market.liquidityUsd <= 0) {
    warnings.push({
      severity: "high",
      label: "No visible liquidity",
      message: "The selected pair shows no visible USD liquidity.",
    });
  } else if (market.liquidityUsd < 1_000) {
    warnings.push({
      severity: "high",
      label: "Very low liquidity",
      message: "The selected pair has very low visible liquidity.",
    });
  } else if (market.liquidityUsd < 10_000) {
    warnings.push({
      severity: "warning",
      label: "Low liquidity",
      message: "The selected pair has low visible liquidity.",
    });
  }

  if (market.pairAgeMs !== null && market.pairAgeMs < DAY_MS) {
    warnings.push({
      severity: "warning",
      label: "New pair",
      message: "The selected pair appears to be less than 24 hours old.",
    });
  }

  if (market.txns24h && market.txns24h.total === 0) {
    warnings.push({
      severity: "warning",
      label: "No recent transactions",
      message: "DEX Screener shows no 24h transactions for the selected pair.",
    });
  }

  return warnings;
}

function getVisibleDextoolsWarnings(
  market: TokenChairMarketData,
  dextools: TokenChairDextoolsData | null,
): VisibleMarketWarning[] {
  if (!dextools || dextools.status === "not-configured") return [];
  if (dextools.status === "rate-limited" || dextools.status === "unable-to-verify") {
    return [];
  }

  const warnings: VisibleMarketWarning[] = [];
  const marketPrice = numericPriceUsd(market.priceUsd);
  const dextoolsPrice = numericPriceUsd(dextools.priceUsd);
  if (
    marketPrice !== null &&
    dextoolsPrice !== null &&
    relativeDifference(marketPrice, dextoolsPrice) >= 0.15
  ) {
    warnings.push({
      severity: "warning",
      label: "Market source mismatch",
      message:
        "DEXTools and DEX Screener returned notably different USD price context. Review both market sources before relying on the quote.",
    });
  }

  if (
    isFiniteNumber(market.liquidityUsd) &&
    isFiniteNumber(dextools.liquidityUsd) &&
    market.liquidityUsd > 0 &&
    dextools.liquidityUsd > 0 &&
    relativeDifference(market.liquidityUsd, dextools.liquidityUsd) >= 0.5
  ) {
    warnings.push({
      severity: "warning",
      label: "Liquidity source mismatch",
      message:
        "DEXTools and DEX Screener returned notably different visible liquidity context. Treat liquidity-dependent conclusions carefully.",
    });
  }

  if (dextools.dextScore !== null && dextools.dextScore < 50) {
    warnings.push({
      severity: "warning",
      label: "Low external score",
      message:
        "DEXTools returned a low DEXTScore. This is external context only, not a Token Chair safety verdict.",
    });
  }

  return warnings;
}

function getVisiblePairContractWarnings(
  pairContract: TokenChairPairContractData | null,
): VisibleMarketWarning[] {
  if (!pairContract) return [];
  const warnings: VisibleMarketWarning[] = [];

  if (pairContract.status === "unable-to-verify") {
    warnings.push({
      severity: "warning",
      label: "Pair check incomplete",
      message:
        "Read-only selected-pair contract checks could not be completed.",
    });
  }

  if (pairContract.containsScannedToken === false) {
    warnings.push({
      severity: "high",
      label: "Pair token mismatch",
      message:
        "The selected pair contract did not report the scanned token in token0/token1.",
    });
  } else if (pairContract.containsScannedToken === null) {
    warnings.push({
      severity: "warning",
      label: "Pair token check incomplete",
      message:
        "The selected pair contract token0/token1 values could not be fully verified.",
    });
  }

  if (
    pairContract.reserve0Raw === "0" ||
    pairContract.reserve1Raw === "0"
  ) {
    warnings.push({
      severity: "warning",
      label: "Zero reserve",
      message:
        "The selected pair contract returned a zero raw reserve on one side.",
    });
  }

  return warnings;
}

function getVisibleContractWarnings(
  contract: TokenChairContractData | null,
): VisibleMarketWarning[] {
  if (!contract) return [];

  const warnings: VisibleMarketWarning[] = [];

  if (contract.status === "unable-to-verify") {
    warnings.push({
      severity: "warning",
      label: "Contract check incomplete",
      message: "Read-only PulseChain contract checks could not be completed.",
    });
  }

  if (contract.ownershipRenounced === false && contract.ownerAddress) {
    warnings.push({
      severity: "warning",
      label: "Owner present",
      message:
        "A standard owner function returned a non-zero owner address; owner controls may remain.",
    });
  }

  if (contract.proxy.detected === true) {
    warnings.push({
      severity: "warning",
      label: "Proxy signal",
      message:
        "A common proxy signal was found; implementation behavior can depend on proxy administration.",
    });
  } else if (contract.proxy.detected === null) {
    warnings.push({
      severity: "warning",
      label: "Proxy check incomplete",
      message:
        "Common proxy checks were incomplete, so proxy status could not be fully verified.",
    });
  }

  if (contract.pendingOwner?.address) {
    warnings.push({
      severity: "warning",
      label: "Pending owner/admin",
      message:
        "A pending owner/admin getter returned an address; ownership or admin controls may be in transition.",
    });
  }

  if (contract.adminGetters && contract.adminGetters.length > 0) {
    const labels = contract.adminGetters
      .map((getter) => `${getter.functionName}()`)
      .join(", ");
    warnings.push({
      severity: "warning",
      label: "Admin getters",
      message:
        `Public admin/operator/fee-wallet getters returned visible addresses: ${labels}. Review who controls those addresses before interacting.`,
    });
  }

  if (contract.accessControl?.detected === true) {
    warnings.push({
      severity: "warning",
      label: "AccessControl",
      message:
        "Common AccessControl role functions responded; role-based admin controls may exist.",
    });
  } else if (contract.accessControl?.detected === null) {
    warnings.push({
      severity: "warning",
      label: "AccessControl incomplete",
      message:
        "Common AccessControl checks were incomplete, so role-based controls could not be fully verified.",
    });
  }

  for (const tax of [
    ["buy", contract.taxes?.buy] as const,
    ["sell", contract.taxes?.sell] as const,
  ]) {
    const [kind, signal] = tax;
    if (signal?.status === "found" && isNonZeroRawNumber(signal.valueRaw)) {
      warnings.push({
        severity: "warning",
        label: `${kind} tax getter`,
        message:
          `A public ${kind} tax/fee getter returned a non-zero value; this is not a trade simulation.`,
      });
    } else if (signal?.status === "unable-to-verify") {
      warnings.push({
        severity: "warning",
        label: `${kind} tax check incomplete`,
        message:
          `Common ${kind} tax/fee getter checks could not be completed.`,
      });
    }
  }

  for (const warning of getMechanicsWarnings(contract.mechanics)) {
    warnings.push({ severity: "warning", label: "Trading mechanics", message: warning });
  }

  for (const warning of contract.eventHistory?.warnings ?? []) {
    warnings.push({ severity: "warning", label: "Recent events", message: warning });
  }

  const explorer = contract.explorer;
  if (explorer?.sourceVerified === false) {
    warnings.push({
      severity: "warning",
      label: "Source not verified",
      message:
        "PulseScan did not return verified source for this contract, limiting source-based checks.",
    });
  } else if (explorer?.status === "unable-to-verify") {
    warnings.push({
      severity: "warning",
      label: "Source unavailable",
      message:
        "PulseScan source metadata could not be loaded, limiting source-based checks.",
    });
  }

  for (const signal of explorer?.sourceSignals ?? []) {
    if (signal.found === true) {
      warnings.push({
        severity: signal.severity,
        label: signal.label,
        message: `${signal.label} ${signal.severity === "high" ? "higher-severity" : "warning"} source signal found. Review verified source before interacting.`,
      });
    }
  }

  const holders = contract.holders;
  const tokenHolderPercent = holders?.token.percent ?? null;
  const lpHolderPercent = holders?.lp.percent ?? null;
  const top1Percent = holders?.distribution?.top1Percent ?? tokenHolderPercent;
  const top10Percent = holders?.distribution?.top10Percent ?? null;
  if (
    holders &&
    top1Percent !== null &&
    top1Percent >= 20 &&
    isConcentrationWarning("top-holder", holders.token, contract)
  ) {
    warnings.push({
      severity: "warning",
      label: "Holder concentration",
      message: buildConcentrationWarningMessage(
        "top-holder",
        holders.token,
        contract,
      ),
    });
  }

  if (
    holders &&
    top10Percent !== null &&
    top10Percent >= 50 &&
    (top1Percent === null || top1Percent < 20)
  ) {
    warnings.push({
      severity: "warning",
      label: "Top-10 holder concentration",
      message:
        `PulseScan sampled top-10 holders account for ${formatSignalPercent(top10Percent)} of supply. Review holder distribution before interacting.`,
    });
  }

  if (
    holders &&
    lpHolderPercent !== null &&
    lpHolderPercent >= 50 &&
    isConcentrationWarning("lp-holder", holders.lp, contract)
  ) {
    warnings.push({
      severity: "warning",
      label: "LP concentration",
      message: buildConcentrationWarningMessage(
        "lp-holder",
        holders.lp,
        contract,
      ),
    });
  } else if (
    holders &&
    holders.lp.percent === null &&
    holders.status !== "unable-to-verify"
  ) {
    warnings.push({
      severity: "warning",
      label: "LP holder unavailable",
      message:
        "PulseScan did not return LP holder concentration for the selected pair.",
    });
  }

  if (contract.lpLocker?.withdrawableLocks.length) {
    warnings.push({
      severity: "warning",
      label: "Locker unlockable",
      message:
        "A known locker returned readable records for the selected pair, but at least one visible record is unlockable or expired.",
    });
  } else if (
    contract.lpLocker?.status === "partial" &&
    contract.lpLocker.matchedLocks.length === 0
  ) {
    warnings.push({
      severity: "warning",
      label: "Locker position incomplete",
      message:
        "A known locker holder was matched, but no selected-pair lock record was found in the bounded locker scan.",
    });
  } else if (contract.lpLocker?.status === "unable-to-verify") {
    warnings.push({
      severity: "warning",
      label: "Locker read incomplete",
      message:
        "A known locker holder was matched, but the native locker position read could not be completed.",
    });
  }

  return warnings;
}

function buildTaxGetterQuickRow(
  row: SniffSignalRow,
  signal: TokenChairTaxGetterSignal | null,
  kind: "buy" | "sell",
): SniffSignalRow {
  if (!signal) return row;

  if (signal.status === "found" && signal.valueRaw !== null && signal.functionName) {
    const nonZero = isNonZeroRawNumber(signal.valueRaw);
    return {
      ...row,
      value: `Getter returned ${signal.valueRaw}`,
      status: nonZero ? "warning" : "checked",
      detail:
        `Public ${signal.functionName}() returned raw ${kind} tax/fee value ${signal.valueRaw}. This is not a trade simulation and may not reflect dynamic transfer behavior.`,
    };
  }

  if (signal.status === "unable-to-verify") {
    return {
      ...row,
      value: "Unable to verify",
      status: "unable-to-verify",
      detail:
        `Common public ${kind} tax/fee getter reads could not be completed.`,
    };
  }

  return {
    ...row,
    value: "Not checked yet",
    status: "not-checked",
    detail:
      `No common public ${kind} tax/fee getter responded. Trade simulation and bytecode tax analysis are not live yet.`,
  };
}

function buildOwnershipQuickRow(
  row: SniffSignalRow,
  contract: TokenChairContractData | null,
): SniffSignalRow {
  if (!contract) return row;

  if (contract.ownershipRenounced === true) {
    return {
      ...row,
      value: "Appears renounced",
      status: "checked",
      detail:
        "A standard owner function returned the zero address. This does not rule out hidden controls.",
    };
  }

  if (contract.ownershipRenounced === false && contract.ownerAddress) {
    return {
      ...row,
      value: "Not renounced",
      status: "warning",
      detail: `${contract.ownerFunction ?? "owner"}() returned ${contract.ownerAddress}.`,
    };
  }

  if (contract.status === "unable-to-verify") {
    return {
      ...row,
      value: "Unable to verify",
      status: "unable-to-verify",
      detail:
        "The read-only contract check could not verify standard ownership functions.",
    };
  }

  return {
    ...row,
    value: "Unable to verify",
    status: "unable-to-verify",
    detail:
      "No standard owner() or getOwner() value was readable. Hidden ownership is not ruled out.",
  };
}

function buildProxyQuickRow(
  row: SniffSignalRow,
  contract: TokenChairContractData | null,
): SniffSignalRow {
  if (!contract) return row;

  if (contract.proxy.detected === true) {
    return {
      ...row,
      value: "Proxy signal found",
      status: "warning",
      detail: contract.proxy.checks.join(" ") ||
        "A common proxy signal was found by read-only checks.",
    };
  }

  if (contract.proxy.detected === false) {
    return {
      ...row,
      value: "Common proxy signal not found",
      status: "checked",
      detail:
        "Checked EIP-1967 implementation/admin/beacon slots, public implementation/admin getters, and EIP-1167 bytecode. Other proxy patterns are still possible.",
    };
  }

  return {
    ...row,
    value: "Unable to verify",
    status: "unable-to-verify",
      detail:
      "Common proxy storage, getter, or bytecode checks could not be completed.",
  };
}

function buildMechanicsQuickRow(
  row: SniffSignalRow,
  contract: TokenChairContractData | null,
): SniffSignalRow | null {
  const mechanics = contract?.mechanics;
  if (!mechanics) return null;

  if (row.label === "Transfer pausable") {
    return buildPausedQuickRow(row, mechanics.paused);
  }

  if (row.label === "Trading cooldown") {
    return buildTradingLimitQuickRow(row, mechanics);
  }

  return null;
}

function buildPausedQuickRow(
  row: SniffSignalRow,
  signal: TokenChairBooleanGetterSignal,
): SniffSignalRow | null {
  if (signal.status !== "found" || signal.value === null || !signal.functionName) {
    return null;
  }

  return {
    ...row,
    value: signal.value ? "Paused getter true" : "Paused getter false",
    status: signal.value ? "warning" : "checked",
    detail:
      `Public ${signal.functionName}() returned ${signal.value}. This reports a visible pause state only and does not prove future pause controls are absent.`,
  };
}

function buildTradingLimitQuickRow(
  row: SniffSignalRow,
  mechanics: TokenChairMechanicsSignals,
): SniffSignalRow | null {
  const limitSignal = mechanics.limitsInEffect;
  if (
    limitSignal.status === "found" &&
    limitSignal.value !== null &&
    limitSignal.functionName
  ) {
    return {
      ...row,
      value: limitSignal.value
        ? "Limit getter true"
        : "Limit getter false",
      status: limitSignal.value ? "warning" : "checked",
      detail:
        `Public ${limitSignal.functionName}() returned ${limitSignal.value}. This is a trading-limit state signal, not a sell simulation.`,
    };
  }

  for (const signal of [mechanics.maxTx, mechanics.maxWallet]) {
    if (
      signal.status === "found" &&
      signal.valueRaw !== null &&
      signal.functionName &&
      isNonZeroRawNumber(signal.valueRaw)
    ) {
      return {
        ...row,
        value: "Limit getter found",
        status: "warning",
        detail:
          `Public ${signal.functionName}() returned raw value ${signal.valueRaw}. This may indicate transaction or wallet limits, but it is not a cooldown simulation.`,
      };
    }
  }

  return null;
}

function buildSourceSignalQuickRow(
  row: SniffSignalRow,
  contract: TokenChairContractData | null,
): SniffSignalRow | null {
  const signalKey = quickRowSourceSignalKey(row.label);
  if (!signalKey) return null;
  const explorer = contract?.explorer;
  const signal = explorer?.sourceSignals.find((item) => item.key === signalKey);

  if (!explorer || !signal || signal.found === null) {
    return {
      ...row,
      value: explorer?.sourceVerified === false
        ? "Unable to verify"
        : row.value,
      status: explorer?.sourceVerified === false
        ? "unable-to-verify"
        : row.status,
      detail:
        explorer?.sourceVerified === false
          ? "PulseScan did not return verified source, so this source-based row cannot be checked."
          : row.detail,
    };
  }

  if (signal.found) {
    return {
      ...row,
      value: sourceSignalValue(signal),
      status: sourceSignalStatus(signal),
      detail: signal.detail,
    };
  }

  return {
    ...row,
    value: "Not flagged by source scan",
    status: "checked",
    detail: signal.detail,
  };
}

function sourceSignalStatus(
  signal: TokenChairSourceSignal,
): SniffRowStatus {
  return signal.severity === "high" ? "danger" : "warning";
}

function sourceSignalValue(signal: TokenChairSourceSignal): string {
  return signal.severity === "high"
    ? "High source signal"
    : "Source signal found";
}

function buildOwnerContractCard(
  card: ContractSniffCard,
  contract: TokenChairContractData | null,
): ContractSniffCard {
  if (!contract) return card;

  if (contract.ownershipRenounced === true) {
    return {
      ...card,
      value: "Appears renounced",
      status: "checked",
      detail:
        "A standard owner function returned the zero address. Hidden controls are not ruled out.",
    };
  }

  if (contract.ownerAddress) {
    return {
      ...card,
      value: shortenSignalAddress(contract.ownerAddress),
      status: "warning",
      href: pulseScanAddressUrl(contract.ownerAddress),
      detail: `${contract.ownerFunction ?? "owner"}() returned a non-zero owner address.`,
    };
  }

  if (contract.status === "unable-to-verify") {
    return {
      ...card,
      value: "Unable to verify",
      status: "unable-to-verify",
      detail: "Standard ownership functions could not be read.",
    };
  }

  return {
    ...card,
    value: "Unable to verify",
    status: "unable-to-verify",
    detail:
      "No standard owner() or getOwner() value was readable from the token contract.",
  };
}

function buildAdminGettersContractCard(
  card: ContractSniffCard,
  contract: TokenChairContractData | null,
): ContractSniffCard {
  if (!contract) return card;

  const getters = contract.adminGetters ?? [];
  if (getters.length > 0) {
    const first = getters[0];
    return {
      ...card,
      value: `${getters.length} visible getter${getters.length === 1 ? "" : "s"}`,
      status: "warning",
      href: pulseScanAddressUrl(first.address),
      detail:
        `Public admin/operator/fee-wallet getter signals returned: ${getters.map((getter) => `${getter.functionName}() -> ${shortenSignalAddress(getter.address)}`).join(", ")}. These are control-context signals, not proof of malicious behavior.`,
    };
  }

  if (contract.status === "unable-to-verify") {
    return {
      ...card,
      value: "Unable to verify",
      status: "unable-to-verify",
      detail: "Common public admin getter checks could not be completed.",
    };
  }

  return {
    ...card,
    value: "No common getters found",
    status: "checked",
    detail:
      "Common public admin/operator/fee-wallet getters did not return visible addresses. Hidden controls are not ruled out.",
  };
}

function buildProxyDetailsContractCard(
  card: ContractSniffCard,
  contract: TokenChairContractData | null,
): ContractSniffCard {
  if (!contract) return card;

  if (contract.proxy.detected === true) {
    const kinds = contract.proxy.detectedKinds?.length
      ? contract.proxy.detectedKinds.join(", ")
      : "common signal";
    const href =
      contract.proxy.implementationAddress ??
      contract.proxy.publicImplementationAddress ??
      contract.proxy.minimalProxyTarget ??
      contract.proxy.adminAddress ??
      contract.proxy.publicAdminAddress ??
      contract.proxy.beaconAddress;
    return {
      ...card,
      value: kinds,
      status: "warning",
      href: href ? pulseScanAddressUrl(href) : undefined,
      detail:
        contract.proxy.checks.join(" ") ||
        "Common proxy checks returned a visible proxy-related signal.",
    };
  }

  if (contract.proxy.detected === false) {
    return {
      ...card,
      value: "Common signal not found",
      status: "checked",
      detail:
        "Checked EIP-1967 implementation/admin/beacon slots, public implementation/admin getters, and EIP-1167 bytecode. Other proxy patterns are still possible.",
    };
  }

  return {
    ...card,
    value: "Unable to verify",
    status: "unable-to-verify",
    detail: "Common proxy storage, getter, or bytecode checks could not be completed.",
  };
}

function buildSourceVerifiedContractCard(
  card: ContractSniffCard,
  contract: TokenChairContractData | null,
): ContractSniffCard {
  const explorer = contract?.explorer;
  if (!explorer) return card;

  if (explorer.sourceVerified === true) {
    return {
      ...card,
      value: "Verified on PulseScan",
      status: "checked",
      href: explorer.explorerTokenUrl,
      detail: [
        explorer.contractName ?? "Contract source is verified.",
        explorer.compilerVersion ? `Compiler ${explorer.compilerVersion}.` : null,
      ].filter(Boolean).join(" "),
    };
  }

  if (explorer.sourceVerified === false) {
    return {
      ...card,
      value: "Not verified on PulseScan",
      status: "warning",
      href: explorer.explorerAddressUrl,
      detail:
        "PulseScan did not return verified source, so source-based checks are limited.",
    };
  }

  return {
    ...card,
    value: "Unable to verify",
    status: "unable-to-verify",
    detail: "PulseScan source metadata could not be loaded.",
  };
}

function buildDeployerContractCard(
  card: ContractSniffCard,
  contract: TokenChairContractData | null,
): ContractSniffCard {
  const explorer = contract?.explorer;
  if (!explorer) return card;

  if (explorer.deployerAddress) {
    return {
      ...card,
      value: shortenSignalAddress(explorer.deployerAddress),
      status: "checked",
      href: pulseScanAddressUrl(explorer.deployerAddress),
      detail: explorer.creationTxHash
        ? "PulseScan returned creator and creation transaction metadata. Classified as Deployer."
        : "PulseScan returned creator metadata without a creation transaction hash. Classified as Deployer.",
    };
  }

  if (explorer.status === "unable-to-verify") {
    return {
      ...card,
      value: "Unable to verify",
      status: "unable-to-verify",
      detail: "PulseScan deployer metadata could not be loaded.",
    };
  }

  return {
    ...card,
    value: "Unable to verify",
    status: "unable-to-verify",
    detail: "PulseScan did not return creator metadata for this contract.",
  };
}

function buildTopHolderContractCard(
  card: ContractSniffCard,
  contract: TokenChairContractData | null,
): ContractSniffCard {
  const signal = contract?.holders?.token;
  if (!signal) return card;

  if (signal.percent === null) {
    return {
      ...card,
      value: "Unable to verify",
      status: "unable-to-verify",
      detail: "PulseScan did not return token holder concentration data.",
    };
  }

  return {
    ...card,
    value: formatSignalPercent(signal.percent),
    status: concentrationStatus("top-holder", signal, contract),
    href: classifyConcentrationSignal(signal, contract)?.explorerUrl,
    detail: [
      signal.address ? describeConcentrationSignal(signal, contract, "top-holder") : null,
      signal.holdersCount !== null
        ? `${signal.holdersCount.toLocaleString("en-US")} holders reported.`
        : null,
    ].filter(Boolean).join(" "),
  };
}

function buildLpConcentrationContractCard(
  card: ContractSniffCard,
  contract: TokenChairContractData | null,
): ContractSniffCard {
  const signal = contract?.holders?.lp;
  if (!signal) return card;

  if (signal.percent === null) {
    return {
      ...card,
      value: "Unable to verify",
      status: "unable-to-verify",
      detail:
        "PulseScan did not return LP-token holder concentration for the selected pair.",
    };
  }

  return {
    ...card,
    value: formatSignalPercent(signal.percent),
    status: concentrationStatus("lp-holder", signal, contract),
    href: classifyConcentrationSignal(signal, contract)?.explorerUrl,
    detail: signal.address
      ? describeConcentrationSignal(signal, contract, "lp-holder")
      : "Largest visible LP holder concentration returned by PulseScan.",
  };
}

function buildConcentrationDetailRow(
  kind: TokenChairConcentrationKind,
  signal: TokenChairConcentrationSignal,
  contract: TokenChairContractData,
): TokenChairConcentrationDetailRow {
  const classification = classifyConcentrationSignal(signal, contract);
  const percentLabel =
    signal.percent === null ? "Unable to verify" : formatSignalPercent(signal.percent);
  const holderCountLabel = signal.holdersCount === null
    ? "Not returned"
    : signal.holdersCount.toLocaleString("en-US");
  const status = concentrationStatus(kind, signal, contract);
  const classificationLabel = classification?.label ?? "Unknown address";
  const classificationDetail =
    classification?.detail ?? "PulseScan did not return enough holder address context.";
  const classificationSource = classificationSourceLabel(classification);

  return {
    kind,
    label: kind === "top-holder" ? "Top holder" : "LP holder",
    value: concentrationValue(kind, signal, contract),
    status,
    detail: concentrationDetail(kind, signal, contract),
    address: signal.address,
    href: classification?.explorerUrl,
    percentLabel,
    holderCountLabel,
    classificationLabel,
    classificationDetail,
    classificationSourceLabel: classificationSource,
  };
}

function buildConcentrationWarningMessage(
  kind: "top-holder" | "lp-holder",
  signal: TokenChairConcentrationSignal,
  contract: TokenChairContractData,
): string {
  const percent = signal.percent === null ? null : formatSignalPercent(signal.percent);
  const classification = classifyConcentrationSignal(signal, contract);
  const holder = classification ? warningHolderLabel(classification) : null;
  const percentCopy = percent ? ` (${percent})` : "";

  if (kind === "top-holder") {
    return holder
      ? `PulseScan shows high visible top-holder concentration${percentCopy} at ${holder}.`
      : `PulseScan shows high visible top-holder concentration${percentCopy} for this token.`;
  }

  if (classification?.kind === "known-spender") {
    const category = classification.registryCategory ?? "protocol";
    if (category === "locker") {
      return `PulseScan shows high visible LP-token holder concentration${percentCopy} at a known locker contract from the Pulse Revoke registry. Token Chair has not read the lock position, owner, or unlock date yet.`;
    }
    return `PulseScan shows high visible LP-token holder concentration${percentCopy} at a known ${category} contract from the Pulse Revoke registry. Review that holder before treating the LP as locked.`;
  }

  return holder
    ? `PulseScan shows high visible LP-token holder concentration${percentCopy} at ${holder}.`
    : `PulseScan shows high visible LP-token holder concentration${percentCopy} for the selected pair.`;
}

function classificationSourceLabel(
  classification: TokenChairAddressClassification | null,
): string {
  return classification?.sourceLabel ?? "Visible scan context";
}

function lpControlWarningValue(
  classification: TokenChairAddressClassification | null,
): string {
  if (classification?.kind === "owner") return "Owner controls visible LP";
  if (classification?.kind === "deployer") return "Deployer controls visible LP";
  if (classification?.kind === "known-spender") {
    if (classification.registryCategory === "locker") {
      return "Known locker holds visible LP";
    }
    return "Known protocol holds visible LP";
  }
  if (classification?.kind === "known-token") {
    return "Known token contract holds visible LP";
  }
  if (classification?.kind === "wallet") return "Wallet controls visible LP";
  if (classification?.kind === "contract") return "Contract controls visible LP";
  if (classification?.kind === "token-contract") return "Token contract holds visible LP";
  if (classification?.kind === "selected-pair") return "Pair holds visible LP";
  return "Dominant LP holder";
}

function lpControlWarningDetail(
  signal: TokenChairConcentrationSignal,
  contract: TokenChairContractData,
  classification: TokenChairAddressClassification | null,
): string {
  const percent = signal.percent === null
    ? "an unknown share"
    : formatSignalPercent(signal.percent);
  const holder = classification ? warningHolderLabel(classification) : "an unclassified address";
  const address = signal.address ? ` (${shortenSignalAddress(signal.address)})` : "";

  if (classification?.kind === "owner" || classification?.kind === "deployer") {
    return `PulseScan shows ${holder}${address} holding ${percent} of visible LP tokens. That may mean removable liquidity is controlled by the project-side address unless other lock/burn evidence exists.`;
  }

  if (classification?.kind === "contract") {
    return `PulseScan shows a contract address${address} holding ${percent} of visible LP tokens. Review that contract before treating this as locked liquidity.`;
  }

  if (classification?.kind === "known-spender") {
    const category = classification.registryCategory ?? "protocol";
    const protocol = classification.registryProtocol
      ? ` for ${classification.registryProtocol}`
      : "";
    if (category === "locker") {
      return `PulseScan shows a known locker contract${protocol}${address} holding ${percent} of visible LP tokens. This is visible locker context, but Token Chair has not read the lock position, owner, or unlock date yet.`;
    }
    return `PulseScan shows a known ${category} contract${protocol}${address} holding ${percent} of visible LP tokens. The Pulse Revoke registry label can explain the holder, but it is not proof of locked liquidity. Review the holder contract and position before interacting.`;
  }

  if (classification?.kind === "known-token") {
    return `PulseScan shows a known registry token contract${address} holding ${percent} of visible LP tokens. Treat this as address context only; review the holder before interacting.`;
  }

  if (classification?.kind === "wallet") {
    return `PulseScan shows a wallet address${address} holding ${percent} of visible LP tokens. This can indicate removable liquidity control.`;
  }

  return `PulseScan shows ${holder}${address} holding ${percent} of visible LP tokens. Review the holder before interacting.`;
}

function concentrationStatus(
  kind: TokenChairConcentrationKind,
  signal: TokenChairConcentrationSignal,
  contract: TokenChairContractData,
): SniffRowStatus {
  if (signal.percent === null) return "unable-to-verify";
  const threshold = kind === "top-holder" ? 20 : 50;
  if (signal.percent < threshold) return "checked";
  return isConcentrationWarning(kind, signal, contract) ? "warning" : "checked";
}

function concentrationValue(
  kind: TokenChairConcentrationKind,
  signal: TokenChairConcentrationSignal,
  contract: TokenChairContractData,
): string {
  if (signal.percent === null) return "Unable to verify";
  const classification = classifyConcentrationSignal(signal, contract);
  if (isBurnLikeClassification(classification)) {
    return kind === "lp-holder"
      ? "Burn/dead LP holder"
      : "Burn/dead token holder";
  }
  if (kind === "lp-holder" && isKnownLockerClassification(classification)) {
    return "Known locker LP holder";
  }
  if (signal.percent >= (kind === "top-holder" ? 20 : 50)) {
    return "High visible concentration";
  }
  return "Visible concentration returned";
}

function concentrationDetail(
  kind: TokenChairConcentrationKind,
  signal: TokenChairConcentrationSignal,
  contract: TokenChairContractData,
): string {
  if (signal.percent === null) {
    return kind === "top-holder"
      ? "PulseScan did not return token holder concentration data."
      : "PulseScan did not return LP-token holder concentration for the selected pair.";
  }

  const classification = classifyConcentrationSignal(signal, contract);
  const prefix = kind === "top-holder"
    ? "Largest visible token holder"
    : "Largest visible LP-token holder";
  const percent = formatSignalPercent(signal.percent);

  if (isBurnLikeClassification(classification)) {
    return `${prefix} is ${percent} at ${warningHolderLabel(classification)}. This can be useful context, but it is not proof of an LP lock or a full liquidity analysis.`;
  }

  if (kind === "lp-holder" && classification?.kind === "known-spender") {
    const category = classification.registryCategory ?? "protocol";
    if (category === "locker") {
      return `${prefix} is ${percent} at ${classification.label}, a known locker from the Pulse Revoke registry. This is visible locker context; Token Chair has not read the lock position, owner, or unlock date yet.`;
    }
    return `${prefix} is ${percent} at ${classification.label}, a known ${category} contract from the Pulse Revoke registry. This explains the holder context but is not proof of locked liquidity.`;
  }

  if (signal.percent >= (kind === "top-holder" ? 20 : 50)) {
    return `${prefix} is ${percent}. Review the holder address context before interacting.`;
  }

  return `${prefix} is ${percent}. This is visible PulseScan holder context only.`;
}

function isConcentrationWarning(
  kind: TokenChairConcentrationKind,
  signal: TokenChairConcentrationSignal,
  contract: TokenChairContractData,
): boolean {
  if (signal.percent === null) return false;
  const threshold = kind === "top-holder" ? 20 : 50;
  if (signal.percent < threshold) return false;
  const classification = classifyConcentrationSignal(signal, contract);
  return !isBurnLikeClassification(classification) &&
    !isKnownLockerClassification(classification);
}

function getMechanicsWarnings(
  mechanics: TokenChairMechanicsSignals | null | undefined,
): string[] {
  if (!mechanics) return [];

  return [
    mechanics.paused.status === "found" && mechanics.paused.value === true
      ? "A public pause-state getter returned true; transfers may currently be paused."
      : null,
    mechanics.tradingEnabled.status === "found" &&
    mechanics.tradingEnabled.value === false
      ? "A public trading-state getter returned false; trading may not be open through that getter."
      : null,
    mechanics.limitsInEffect.status === "found" &&
    mechanics.limitsInEffect.value === true
      ? "A public trading-limits getter returned true; transaction or wallet limits may be active."
      : null,
    mechanics.maxTx.status === "found" &&
    isNonZeroRawNumber(mechanics.maxTx.valueRaw)
      ? "A public max transaction getter returned a non-zero raw value."
      : null,
    mechanics.maxWallet.status === "found" &&
    isNonZeroRawNumber(mechanics.maxWallet.valueRaw)
      ? "A public max wallet getter returned a non-zero raw value."
      : null,
  ].filter((warning): warning is string => Boolean(warning));
}

function classifyConcentrationSignal(
  signal: TokenChairConcentrationSignal,
  contract: TokenChairContractData,
): TokenChairAddressClassification | null {
  return classifyTokenChairAddress(signal.address, {
    tokenAddress: contract.tokenAddress,
    pairAddress: contract.holders?.lp.pairAddress ?? null,
    ownerAddress: contract.ownerAddress,
    deployerAddress: contract.explorer?.deployerAddress ?? null,
    proxyAdminAddress:
      contract.proxy.adminAddress ?? contract.proxy.publicAdminAddress ?? null,
    proxyImplementationAddress:
      contract.proxy.implementationAddress ??
      contract.proxy.publicImplementationAddress ??
      contract.proxy.minimalProxyTarget ??
      null,
    adminGetterAddresses: contract.adminGetters?.map((getter) => getter.address) ?? [],
    isContract: signal.isContract,
  });
}

function describeConcentrationSignal(
  signal: TokenChairConcentrationSignal,
  contract: TokenChairContractData,
  kind: "top-holder" | "lp-holder",
): string {
  const classification = classifyConcentrationSignal(signal, contract);
  const addressCopy = signal.address
    ? shortenSignalAddress(signal.address)
    : "unknown address";
  const prefix =
    kind === "top-holder" ? "Top visible holder" : "Largest visible LP holder";

  if (!classification) {
    return `${prefix} ${addressCopy}.`;
  }

  return `${prefix} ${addressCopy}. ${classification.label}: ${classification.detail}`;
}

function warningHolderLabel(
  classification: TokenChairAddressClassification,
): string {
  if (classification.kind === "zero-address") return "the zero address";
  if (classification.kind === "burn-address") return "a common burn address";
  if (classification.kind === "token-contract") return "the token contract";
  if (classification.kind === "selected-pair") return "the selected DEX pair";
  if (classification.kind === "owner") return "the standard owner address";
  if (classification.kind === "deployer") return "the deployer address";
  if (classification.kind === "proxy-admin") return "a proxy admin address";
  if (classification.kind === "proxy-implementation") {
    return "a proxy implementation address";
  }
  if (classification.kind === "admin-getter") {
    return "an address returned by a public admin getter";
  }
  if (classification.kind === "known-token") return "a known token contract";
  if (classification.kind === "known-spender") {
    const category = classification.registryCategory ?? "protocol";
    if (category === "locker") return "a known locker contract";
    return `a known ${category} contract`;
  }
  if (classification.kind === "contract") return "a contract address";
  if (classification.kind === "wallet") return "a wallet address";
  return "an unclassified address";
}

function isBurnLikeClassification(
  classification: TokenChairAddressClassification | null,
): classification is TokenChairAddressClassification & {
  kind: "zero-address" | "burn-address";
} {
  return (
    classification?.kind === "zero-address" ||
    classification?.kind === "burn-address"
  );
}

function isKnownLockerClassification(
  classification: TokenChairAddressClassification | null,
): classification is TokenChairAddressClassification & {
  kind: "known-spender";
  registryCategory: "locker";
} {
  return (
    classification?.kind === "known-spender" &&
    classification.registryCategory === "locker"
  );
}

function isNonZeroRawNumber(value: string | null): boolean {
  if (value === null) return false;
  try {
    return BigInt(value) !== 0n;
  } catch {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric !== 0;
  }
}

function sortMarketPairs(
  pairs: readonly TokenChairMarketData[],
): TokenChairMarketData[] {
  return [...pairs].sort((a, b) => {
    const liquidity = nullableNumberRank(b.liquidityUsd) - nullableNumberRank(a.liquidityUsd);
    if (liquidity !== 0) return liquidity;
    const volume = nullableNumberRank(b.volume24h) - nullableNumberRank(a.volume24h);
    if (volume !== 0) return volume;
    return nullableNumberRank(b.pairCreatedAt) - nullableNumberRank(a.pairCreatedAt);
  });
}

function normalizeTxnWindow(value: unknown): TokenChairTxnWindow | null {
  const h24 = asRecord(asRecord(value)?.h24);
  if (!h24) return null;
  const buys = finiteNumberOrNull(h24.buys);
  const sells = finiteNumberOrNull(h24.sells);
  if (buys === null && sells === null) return null;
  const normalizedBuys = Math.max(0, Math.floor(buys ?? 0));
  const normalizedSells = Math.max(0, Math.floor(sells ?? 0));
  return {
    buys: normalizedBuys,
    sells: normalizedSells,
    total: normalizedBuys + normalizedSells,
  };
}

function normalizeDexScreenerUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "dexscreener.com") {
      return null;
    }
    return url.toString();
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

function stringOrNumber(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  return null;
}

function finiteNumberOrNull(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nullableNumberRank(value: number | null): number {
  return isFiniteNumber(value) ? value : -1;
}

function addressesMatch(
  left: Address | null | undefined,
  right: Address | null | undefined,
): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

function quickRowSourceSignalKey(
  label: string,
): TokenChairSourceSignalKey | null {
  if (label === "Mintable") return "mintable";
  if (label === "Transfer pausable") return "transfer-pausable";
  if (label === "Trading cooldown") return "trading-cooldown";
  if (label === "Blacklist") return "blacklist";
  if (label === "Whitelist") return "whitelist";
  if (label === "Trading gates") return "trading-gates";
  if (label === "Fee controls") return "fee-controls";
  if (label === "Rescue functions") return "rescue-functions";
  if (label === "Ownership controls") return "ownership-controls";
  if (label === "Suspicious functions") return "suspicious-functions";
  return null;
}

function shortenSignalAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function pulseScanAddressUrl(address: Address | string): string {
  return `${PULSESCAN_BASE_URL}/address/${address}`;
}

function shortenPairAddress(address: string): string {
  return address.length >= 10
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;
}

function pairCandidateWarning(
  pair: TokenChairMarketData,
): string | null {
  if (pair.liquidityUsd === null) return "Liquidity not returned";
  if (pair.liquidityUsd <= 0) return "No visible liquidity";
  if (pair.liquidityUsd < 1_000) return "Very low liquidity";
  if (pair.liquidityUsd < 10_000) return "Low liquidity";
  if (pair.pairAgeMs !== null && pair.pairAgeMs < DAY_MS) return "New pair";
  if (pair.txns24h?.total === 0) return "No 24h transactions";
  return null;
}

function formatSignalPercent(value: number): string {
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 2 : 1,
  })}%`;
}
