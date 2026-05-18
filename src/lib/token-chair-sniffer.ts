import { getAddress, isAddress, type Address, type Hex } from "viem";

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

export type TokenChairContractReadStatus =
  | "success"
  | "partial"
  | "unable-to-verify";

export type TokenChairSourceSignalKey =
  | "mintable"
  | "transfer-pausable"
  | "trading-cooldown"
  | "blacklist"
  | "whitelist"
  | "suspicious-functions";

export interface TokenChairSourceSignal {
  key: TokenChairSourceSignalKey;
  label: string;
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

export interface TokenChairHolderData {
  status: TokenChairContractReadStatus;
  token: TokenChairConcentrationSignal;
  lp: TokenChairConcentrationSignal & {
    pairAddress: Address | null;
  };
  warnings: string[];
  errors: string[];
}

export interface TokenChairProxySignal {
  detected: boolean | null;
  implementationAddress: Address | null;
  adminAddress: Address | null;
  beaconAddress: Address | null;
  minimalProxyTarget: Address | null;
  checks: string[];
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
  accessControl?: TokenChairAccessControlSignal;
  taxes?: TokenChairTaxSignals;
  mechanics?: TokenChairMechanicsSignals;
  explorer: TokenChairExplorerData | null;
  holders: TokenChairHolderData | null;
  warnings: string[];
  errors: string[];
}

export interface TokenChairApiResponse {
  ok: boolean;
  status: TokenChairApiStatus;
  chainId: typeof TOKEN_CHAIR_CHAIN_ID;
  tokenAddress: Address | null;
  market: TokenChairMarketData | null;
  contract: TokenChairContractData | null;
  pairs: TokenChairMarketData[];
  verdict: TokenChairVerdict;
  warnings: string[];
  errors: string[];
}

export type SniffRowStatus =
  | "checked"
  | "warning"
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
  | "contract"
  | "wallet"
  | "unknown";

export interface TokenChairAddressClassificationContext {
  tokenAddress?: Address | null;
  pairAddress?: Address | string | null;
  ownerAddress?: Address | null;
  deployerAddress?: Address | null;
  isContract?: boolean | null;
}

export interface TokenChairAddressClassification {
  address: Address;
  kind: TokenChairAddressKind;
  label: string;
  detail: string;
  explorerUrl: string;
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
};

const CONTRACT_SNIFF_DETAILS: Record<string, string> = {
  "Source verified": "Future PulseChain explorer/source check.",
  Owner: "Future owner() or ownership-event check.",
  Deployer: "Future deployment trace or explorer metadata check.",
  "Top holder concentration": "Future holder distribution check.",
  "LP concentration": "Future LP holder distribution check.",
};

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
    };
  }

  if (addressesMatch(normalized, DEAD_ADDRESS)) {
    return {
      ...base,
      kind: "burn-address",
      label: "Burn address",
      detail:
        "This is a common dead/burn address; balances here are generally inaccessible.",
    };
  }

  if (addressesMatch(normalized, context.tokenAddress)) {
    return {
      ...base,
      kind: "token-contract",
      label: "Token contract",
      detail: "This address matches the token contract being scanned.",
    };
  }

  if (addressesMatch(normalized, pairAddress)) {
    return {
      ...base,
      kind: "selected-pair",
      label: "Selected DEX pair",
      detail: "This address matches the primary DEX Screener pair for this scan.",
    };
  }

  if (addressesMatch(normalized, context.ownerAddress)) {
    return {
      ...base,
      kind: "owner",
      label: "Owner",
      detail: "This address matches the standard owner returned by read-only checks.",
    };
  }

  if (addressesMatch(normalized, context.deployerAddress)) {
    return {
      ...base,
      kind: "deployer",
      label: "Deployer",
      detail: "This address matches the deployer returned by PulseScan metadata.",
    };
  }

  if (context.isContract === true) {
    return {
      ...base,
      kind: "contract",
      label: "Contract",
      detail: "PulseScan marks this address as a contract.",
    };
  }

  if (context.isContract === false) {
    return {
      ...base,
      kind: "wallet",
      label: "Wallet",
      detail: "PulseScan does not mark this address as a contract.",
    };
  }

  return {
    ...base,
    kind: "unknown",
    label: "Unknown address",
    detail: "PulseScan did not return enough context to classify this address.",
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
  pairs = [],
  warnings = [],
  errors = [],
}: {
  status: TokenChairApiStatus;
  tokenAddress: Address | null;
  contract?: TokenChairContractData | null;
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
  contract,
}: Pick<TokenChairApiResponse, "status" | "market" | "contract">): TokenChairVerdict {
  if (status !== "success" || !market) {
    return {
      kind: "unable-to-fully-verify",
      label: "Unable to fully verify",
      displayLabel: "Chair Verdict: Nose Blocked, Could Not Verify",
      tone: "neutral",
      notes: [
        "The scanner could not read enough visible market data to form a market-only verdict.",
      ],
    };
  }

  const visibleWarnings = [
    ...getVisibleMarketWarnings(market),
    ...getVisibleContractWarnings(contract),
  ];
  if (visibleWarnings.some((warning) => warning.severity === "high")) {
    return {
      kind: "high-risk",
      label: "High risk",
      displayLabel: "Chair Verdict: This Chair Is on Fire",
      tone: "danger",
      notes: visibleWarnings.map((warning) => warning.message),
    };
  }

  if (visibleWarnings.length > 0) {
    return {
      kind: "some-warnings",
      label: "Some warnings",
      displayLabel: "Chair Verdict: Something Smells Funny",
      tone: "warning",
      notes: visibleWarnings.map((warning) => warning.message),
    };
  }

  return {
    kind: "unable-to-fully-verify",
    label: "Unable to fully verify",
    displayLabel: "Chair Verdict: Nose Blocked, Could Not Verify",
    tone: "neutral",
    notes: [
      "No major DEX Screener market warnings were found, but contract, tax, ownership, and honeypot checks are not live yet.",
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

    const mechanicsRow = buildMechanicsQuickRow(row, options.contract ?? null);
    const sourceRow = buildSourceSignalQuickRow(row, options.contract ?? null);
    if (mechanicsRow?.status === "warning") return mechanicsRow;
    if (sourceRow?.status === "warning") return sourceRow;
    if (mechanicsRow) return mechanicsRow;
    if (sourceRow) return sourceRow;

    return row;
  });
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
        value: "Source signal found",
        status: "warning",
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
      message: "DEX Screener did not return a USD price for the selected pair.",
    });
  }

  if (market.liquidityUsd === null) {
    warnings.push({
      severity: "warning",
      message: "DEX Screener did not return visible liquidity for the selected pair.",
    });
  } else if (market.liquidityUsd <= 0) {
    warnings.push({
      severity: "high",
      message: "The selected pair shows no visible USD liquidity.",
    });
  } else if (market.liquidityUsd < 1_000) {
    warnings.push({
      severity: "high",
      message: "The selected pair has very low visible liquidity.",
    });
  } else if (market.liquidityUsd < 10_000) {
    warnings.push({
      severity: "warning",
      message: "The selected pair has low visible liquidity.",
    });
  }

  if (market.pairAgeMs !== null && market.pairAgeMs < DAY_MS) {
    warnings.push({
      severity: "warning",
      message: "The selected pair appears to be less than 24 hours old.",
    });
  }

  if (market.txns24h && market.txns24h.total === 0) {
    warnings.push({
      severity: "warning",
      message: "DEX Screener shows no 24h transactions for the selected pair.",
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
      message: "Read-only PulseChain contract checks could not be completed.",
    });
  }

  if (contract.ownershipRenounced === false && contract.ownerAddress) {
    warnings.push({
      severity: "warning",
      message:
        "A standard owner function returned a non-zero owner address; owner controls may remain.",
    });
  }

  if (contract.proxy.detected === true) {
    warnings.push({
      severity: "warning",
      message:
        "A common proxy signal was found; implementation behavior can depend on proxy administration.",
    });
  } else if (contract.proxy.detected === null) {
    warnings.push({
      severity: "warning",
      message:
        "Common proxy checks were incomplete, so proxy status could not be fully verified.",
    });
  }

  if (contract.pendingOwner?.address) {
    warnings.push({
      severity: "warning",
      message:
        "A pending owner/admin getter returned an address; ownership or admin controls may be in transition.",
    });
  }

  if (contract.accessControl?.detected === true) {
    warnings.push({
      severity: "warning",
      message:
        "Common AccessControl role functions responded; role-based admin controls may exist.",
    });
  } else if (contract.accessControl?.detected === null) {
    warnings.push({
      severity: "warning",
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
        message:
          `A public ${kind} tax/fee getter returned a non-zero value; this is not a trade simulation.`,
      });
    } else if (signal?.status === "unable-to-verify") {
      warnings.push({
        severity: "warning",
        message:
          `Common ${kind} tax/fee getter checks could not be completed.`,
      });
    }
  }

  for (const warning of getMechanicsWarnings(contract.mechanics)) {
    warnings.push({ severity: "warning", message: warning });
  }

  const explorer = contract.explorer;
  if (explorer?.sourceVerified === false) {
    warnings.push({
      severity: "warning",
      message:
        "PulseScan did not return verified source for this contract, limiting source-based checks.",
    });
  } else if (explorer?.status === "unable-to-verify") {
    warnings.push({
      severity: "warning",
      message:
        "PulseScan source metadata could not be loaded, limiting source-based checks.",
    });
  }

  for (const signal of explorer?.sourceSignals ?? []) {
    if (signal.found === true) {
      warnings.push({
        severity: "warning",
        message: `${signal.label} source signal found. Review verified source before interacting.`,
      });
    }
  }

  const holders = contract.holders;
  const tokenHolderPercent = holders?.token.percent ?? null;
  const lpHolderPercent = holders?.lp.percent ?? null;
  if (
    holders &&
    tokenHolderPercent !== null &&
    tokenHolderPercent >= 20 &&
    isConcentrationWarning("top-holder", holders.token, contract)
  ) {
    warnings.push({
      severity: "warning",
      message: buildConcentrationWarningMessage(
        "top-holder",
        holders.token,
        contract,
      ),
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
      message:
        "PulseScan did not return LP holder concentration for the selected pair.",
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
        "Checked EIP-1967 implementation/admin/beacon slots and EIP-1167 bytecode. Other proxy patterns are still possible.",
    };
  }

  return {
    ...row,
    value: "Unable to verify",
    status: "unable-to-verify",
    detail:
      "Common proxy storage or bytecode checks could not be completed.",
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
      value: "Source signal found",
      status: "warning",
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

  return holder
    ? `PulseScan shows high visible LP-token holder concentration${percentCopy} at ${holder}.`
    : `PulseScan shows high visible LP-token holder concentration${percentCopy} for the selected pair.`;
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
  return !isBurnLikeClassification(classifyConcentrationSignal(signal, contract));
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
  if (classification.kind === "contract") return "a contract address";
  if (classification.kind === "wallet") return "a wallet address";
  return "an unclassified address";
}

function isBurnLikeClassification(
  classification: TokenChairAddressClassification | null,
): classification is TokenChairAddressClassification {
  return (
    classification?.kind === "zero-address" ||
    classification?.kind === "burn-address"
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
