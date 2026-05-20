import { defineChain, type Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { SupportedChainId } from "@/lib/chains";
import type { NftApproval } from "@/lib/nft-approvals";
import {
  ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY,
  WALLET_MISMATCH_SCAN_TARGET_COPY,
} from "@/lib/scan-target";

export const ETHEREUM_MAINNET_CLIENT_CHAIN_ID = 1;
export const ETHEREUM_MAINNET_DISPLAY_NAME = "Ethereum Mainnet";
export const ETHEREUM_MAINNET_SHORT_NAME = "Ethereum";
export const ETHEREUM_LIVE_VERIFICATION_LABEL = "Ethereum live verification";
export const ETHEREUM_MAINNET_STATUS_LABEL = "Ethereum Mainnet";
export const ETHEREUM_MAINNET_NATIVE_SYMBOL = "ETH";
export const ETHEREUM_MAINNET_EXPLORER_NAME = "Etherscan";
export const ETHEREUM_MAINNET_EXPLORER_BASE_URL = "https://etherscan.io";
export const ETHEREUM_MAINNET_PUBLIC_RPC_URL =
  "https://ethereum-rpc.publicnode.com";

export const ethereumMainnetWalletChain = defineChain({
  id: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  name: ETHEREUM_MAINNET_DISPLAY_NAME,
  nativeCurrency: {
    name: "Ether",
    symbol: ETHEREUM_MAINNET_NATIVE_SYMBOL,
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MAINNET_RPC_URL ??
          process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ??
          ETHEREUM_MAINNET_PUBLIC_RPC_URL,
      ],
    },
  },
  blockExplorers: {
    default: {
      name: ETHEREUM_MAINNET_EXPLORER_NAME,
      url: ETHEREUM_MAINNET_EXPLORER_BASE_URL,
    },
  },
});

export type WalletWriteChainId =
  | SupportedChainId
  | typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID
  | 42161
  | 10;

export type EthereumApprovalApiStatus =
  | "active-approvals-found"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface EthereumApprovalApiDiagnostics {
  chainId: typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID;
  rpcConfigured: boolean;
  explorerConfigured: boolean;
  rawApprovalLogCount: number;
  decodedErc20ApprovalCount: number;
  decodedPermit2ApprovalCount?: number;
  decodedNftApprovalCount: number;
  liveReadSuccessCount: number;
  liveReadFailureCount: number;
  incompleteVerificationCount: number;
  skippedApprovalCount: number;
  skippedReasons: Record<string, number>;
  discoveryTruncated: boolean;
  requestTimedOut: boolean;
  rateLimited: boolean;
  candidateCapHit: boolean;
  liveReadCandidateCap: number;
  liveReadCandidatesTotal: number;
  liveReadCandidatesProcessed: number;
  rpcReadConcurrency: number;
  upstreamRetryCount: number;
  incompleteReasons: string[];
}

export type EthereumErc20ApprovalApi = Omit<Approval, "rawAllowance"> & {
  rawAllowance: string;
};

export type EthereumNftApprovalApi = Omit<NftApproval, "tokenId"> & {
  tokenId?: string;
};

export interface EthereumApprovalApiResponse {
  ok: boolean;
  status: EthereumApprovalApiStatus;
  chainId: typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID;
  approvals: {
    erc20: EthereumErc20ApprovalApi[];
    nft: EthereumNftApprovalApi[];
  };
  diagnostics: EthereumApprovalApiDiagnostics;
  errors: string[];
  warnings: string[];
  missingConfig: string[];
}

export type EthereumApprovalClientState =
  | "active"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface EthereumApprovalClientMapping {
  state: EthereumApprovalClientState;
  canShowClear: boolean;
  /** True only when the API response is complete enough for wallet-side revoke. */
  revokeEnabled: boolean;
  revokeDisabledReason: string | null;
  /**
   * True when returned active rows are individually live-verified enough for
   * one-at-a-time wallet revoke, even if unrelated rows kept the scan globally
   * incomplete.
   */
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string | null;
  malformedResponse: boolean;
  activeApprovalCount: number;
  approvals: {
    erc20: Approval[];
    nft: NftApproval[];
  };
  warnings: string[];
}

const EMPTY_DIAGNOSTICS: EthereumApprovalApiDiagnostics = {
  chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  rpcConfigured: false,
  explorerConfigured: false,
  rawApprovalLogCount: 0,
  decodedErc20ApprovalCount: 0,
  decodedPermit2ApprovalCount: 0,
  decodedNftApprovalCount: 0,
  liveReadSuccessCount: 0,
  liveReadFailureCount: 0,
  incompleteVerificationCount: 0,
  skippedApprovalCount: 0,
  skippedReasons: {},
  discoveryTruncated: false,
  requestTimedOut: false,
  rateLimited: false,
  candidateCapHit: false,
  liveReadCandidateCap: 0,
  liveReadCandidatesTotal: 0,
  liveReadCandidatesProcessed: 0,
  rpcReadConcurrency: 0,
  upstreamRetryCount: 0,
  incompleteReasons: [],
};

export function emptyEthereumApprovalApiResponse(
  status: EthereumApprovalApiStatus,
  errors: readonly string[] = [],
): EthereumApprovalApiResponse {
  return {
    ok: false,
    status,
    chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    approvals: { erc20: [], nft: [] },
    diagnostics: EMPTY_DIAGNOSTICS,
    errors: [...errors],
    warnings: [],
    missingConfig: [],
  };
}

export async function fetchEthereumApprovals({
  owner,
  signal,
}: {
  owner: Address;
  signal?: AbortSignal;
}): Promise<EthereumApprovalApiResponse> {
  const response = await fetch(
    `/api/ethereum/approvals?owner=${encodeURIComponent(owner)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal,
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      `Ethereum approvals API returned ${response.status} without JSON.`,
    );
  }

  const body = (await response.json()) as EthereumApprovalApiResponse;
  if (!body || typeof body.status !== "string") {
    throw new Error("Ethereum approvals API returned a malformed response.");
  }
  return body;
}

export function mapEthereumApprovalApiResponse(
  response: EthereumApprovalApiResponse,
): EthereumApprovalClientMapping {
  const warnings = [...response.warnings];
  let malformedResponse = false;
  const erc20: Approval[] = [];
  for (const approval of response.approvals.erc20) {
    const rawAllowance = parseBigIntOrNull(approval.rawAllowance);
    if (rawAllowance === null) {
      malformedResponse = true;
      warnings.push("Ethereum API returned a malformed ERC-20 allowance.");
      continue;
    }
    erc20.push({ ...approval, rawAllowance });
  }

  const nft: NftApproval[] = [];
  for (const approval of response.approvals.nft) {
    const { tokenId, ...rest } = approval;
    if (tokenId === undefined) {
      if (approval.kind === "tokenApproval") {
        malformedResponse = true;
        warnings.push(
          "Ethereum API returned an NFT token approval without a token ID.",
        );
        continue;
      }
      nft.push(rest);
      continue;
    }

    const parsedTokenId = parseBigIntOrNull(tokenId);
    if (parsedTokenId === null) {
      malformedResponse = true;
      warnings.push("Ethereum API returned a malformed NFT token ID.");
      continue;
    }
    nft.push({ ...rest, tokenId: parsedTokenId });
  }
  const activeApprovalCount = erc20.length + nft.length;
  const incomplete =
    response.diagnostics.liveReadFailureCount > 0 ||
    response.diagnostics.incompleteVerificationCount > 0 ||
    response.diagnostics.discoveryTruncated ||
    response.diagnostics.requestTimedOut ||
    response.diagnostics.rateLimited ||
    response.diagnostics.candidateCapHit;
  const apiVerifiedForRevoke =
    response.status === "active-approvals-found" &&
    response.ok &&
    !incomplete &&
    !malformedResponse &&
    activeApprovalCount > 0;
  const rowVerifiedForRevoke =
    (response.status === "active-approvals-found" ||
      response.status === "verification-incomplete") &&
    !malformedResponse &&
    activeApprovalCount > 0 &&
    response.diagnostics.liveReadSuccessCount >= activeApprovalCount;
  const base = {
    revokeEnabled: apiVerifiedForRevoke,
    revokeDisabledReason: ethereumApiRevokeDisabledReason({
      response,
      incomplete,
      malformedResponse,
      activeApprovalCount,
    }),
    rowRevokeEnabled: rowVerifiedForRevoke,
    rowRevokeDisabledReason: ethereumRowRevokeDisabledReason({
      response,
      rowVerifiedForRevoke,
      malformedResponse,
      activeApprovalCount,
    }),
    malformedResponse,
    activeApprovalCount,
    approvals: { erc20, nft },
    warnings,
  };

  if (response.status === "config-missing") {
    return {
      state: "config-missing",
      canShowClear: false,
      ...base,
      revokeEnabled: false,
      rowRevokeEnabled: false,
    };
  }

  if (response.status === "upstream-failure") {
    return {
      state: "upstream-failure",
      canShowClear: false,
      ...base,
      revokeEnabled: false,
      rowRevokeEnabled: false,
    };
  }

  if (
    response.status === "verification-incomplete" ||
    incomplete ||
    malformedResponse
  ) {
    return {
      state: "verification-incomplete",
      canShowClear: false,
      ...base,
      revokeEnabled: false,
    };
  }

  if (response.status === "active-approvals-found") {
    return {
      state: "active",
      canShowClear: false,
      ...base,
    };
  }

  return {
    state: "complete-clear",
    canShowClear: !malformedResponse,
    ...base,
    revokeEnabled: false,
    rowRevokeEnabled: false,
  };
}

function ethereumApiRevokeDisabledReason({
  response,
  incomplete,
  malformedResponse,
  activeApprovalCount,
}: {
  response: EthereumApprovalApiResponse;
  incomplete: boolean;
  malformedResponse: boolean;
  activeApprovalCount: number;
}): string | null {
  if (
    response.status === "active-approvals-found" &&
    response.ok &&
    !incomplete &&
    !malformedResponse &&
    activeApprovalCount > 0
  ) {
    return null;
  }

  if (response.status === "config-missing") {
    return "Ethereum API configuration is missing - revoke unavailable.";
  }
  if (response.status === "upstream-failure") {
    return "Ethereum explorer or RPC failed - revoke unavailable.";
  }
  if (malformedResponse) {
    return "Ethereum API response was malformed - revoke unavailable.";
  }
  if (response.status === "verification-incomplete" || incomplete) {
    return ethereumIncompleteVerificationReason(response);
  }
  if (response.status === "complete-clear" || activeApprovalCount === 0) {
    return "No active Ethereum approvals are available to revoke.";
  }
  return "Ethereum revoke unavailable.";
}

function ethereumRowRevokeDisabledReason({
  response,
  rowVerifiedForRevoke,
  malformedResponse,
  activeApprovalCount,
}: {
  response: EthereumApprovalApiResponse;
  rowVerifiedForRevoke: boolean;
  malformedResponse: boolean;
  activeApprovalCount: number;
}): string | null {
  if (rowVerifiedForRevoke) return null;
  if (response.status === "config-missing") {
    return "Ethereum API configuration is missing - revoke unavailable.";
  }
  if (response.status === "upstream-failure") {
    return "Ethereum explorer or RPC failed - revoke unavailable.";
  }
  if (malformedResponse) {
    return "This row was not fully verified.";
  }
  if (activeApprovalCount === 0) {
    return "No active Ethereum approvals are available to revoke.";
  }
  if (response.diagnostics.liveReadSuccessCount < activeApprovalCount) {
    return "This row was not fully verified.";
  }
  return "This row was not fully verified.";
}

function ethereumIncompleteVerificationReason(
  response: EthereumApprovalApiResponse,
): string {
  const { diagnostics } = response;
  const reasons = diagnostics.skippedReasons ?? {};
  const erc20LiveReadFailures = reasons["erc20-live-read-failure"] ?? 0;
  const nftLiveReadFailures = reasons["nft-live-read-failure"] ?? 0;
  const details: string[] = [];

  if (diagnostics.discoveryTruncated || (reasons["discovery-truncated"] ?? 0) > 0) {
    details.push("discovery was truncated");
  }
  if (diagnostics.requestTimedOut || (reasons["request-timed-out"] ?? 0) > 0) {
    details.push("request timed out");
  }
  if (diagnostics.rateLimited) {
    details.push("upstream rate limited");
  }
  if (diagnostics.candidateCapHit || (reasons["candidate-cap-hit"] ?? 0) > 0) {
    const processed = diagnostics.liveReadCandidatesProcessed;
    const total = diagnostics.liveReadCandidatesTotal;
    details.push(
      total > 0
        ? `candidate cap hit; ${processed} of ${total} checked`
        : "candidate cap hit",
    );
  }
  if (erc20LiveReadFailures > 0) {
    details.push(
      `${erc20LiveReadFailures} ERC-20 live read${erc20LiveReadFailures === 1 ? "" : "s"} failed`,
    );
  }
  if (nftLiveReadFailures > 0) {
    details.push(
      `${nftLiveReadFailures} NFT live read${nftLiveReadFailures === 1 ? "" : "s"} failed`,
    );
  }

  const unclassifiedLiveReadFailures = Math.max(
    diagnostics.liveReadFailureCount -
      erc20LiveReadFailures -
      nftLiveReadFailures,
    0,
  );
  if (unclassifiedLiveReadFailures > 0) {
    details.push(
      `${unclassifiedLiveReadFailures} live read${unclassifiedLiveReadFailures === 1 ? "" : "s"} failed`,
    );
  }

  if (details.length === 0 && diagnostics.incompleteVerificationCount > 0) {
    details.push(
      `${diagnostics.incompleteVerificationCount} incomplete verification check${diagnostics.incompleteVerificationCount === 1 ? "" : "s"}`,
    );
  }

  const suffix = details.length > 0 ? ` (${details.join("; ")})` : "";
  return `Verification incomplete${suffix} - revoke unavailable.`;
}

export function canEnableEthereumWalletRevoke({
  mapping,
  walletChainId,
}: {
  mapping: EthereumApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
}): boolean {
  return (
    mapping?.revokeEnabled === true &&
    walletChainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID
  );
}

export function canEnableEthereumWalletRowRevoke({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: EthereumApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): boolean {
  return (
    mapping?.rowRevokeEnabled === true &&
    walletChainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID &&
    ethereumAddressesMatch(ownerAddress, connectedAddress)
  );
}

export function ethereumWalletRevokeDisabledReason({
  mapping,
  walletChainId,
}: {
  mapping: EthereumApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
}): string {
  if (!mapping) return "Ethereum approvals are still loading.";
  if (walletChainId === undefined) return ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY;
  if (walletChainId !== ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return "Switch to Ethereum Mainnet to revoke.";
  }
  return mapping.revokeDisabledReason ?? "Ethereum wallet revoke is available.";
}

export function ethereumWalletRowRevokeDisabledReason({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: EthereumApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): string {
  if (!mapping) return "Ethereum approvals are still loading.";
  if (!connectedAddress) return ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY;
  if (walletChainId !== ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return "Switch to Ethereum Mainnet to revoke.";
  }
  if (!ethereumAddressesMatch(ownerAddress, connectedAddress)) {
    return WALLET_MISMATCH_SCAN_TARGET_COPY;
  }
  return mapping.rowRevokeDisabledReason ?? "Verified row; revoke available.";
}

function ethereumAddressesMatch(
  ownerAddress: Address | undefined,
  connectedAddress: Address | undefined,
): boolean {
  if (!ownerAddress || !connectedAddress) return false;
  return ownerAddress.toLowerCase() === connectedAddress.toLowerCase();
}

function parseBigIntOrNull(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function ethereumExplorerAddressUrl(address: Address | string): string {
  return `${ETHEREUM_MAINNET_EXPLORER_BASE_URL}/address/${address}`;
}

export function ethereumExplorerTokenUrl(address: Address | string): string {
  return `${ETHEREUM_MAINNET_EXPLORER_BASE_URL}/token/${address}`;
}

export function ethereumExplorerTxUrl(hash: string): string {
  return `${ETHEREUM_MAINNET_EXPLORER_BASE_URL}/tx/${hash}`;
}

export function isEthereumReadOnlyChainId(
  chainId: number | undefined,
): chainId is typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID {
  return chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID;
}

export function resolveEthereumReadOnlyChainId({
  walletChainId,
  wagmiChainId,
}: {
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
}): typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID | undefined {
  if (isEthereumReadOnlyChainId(walletChainId)) {
    return ETHEREUM_MAINNET_CLIENT_CHAIN_ID;
  }

  return walletChainId === undefined && isEthereumReadOnlyChainId(wagmiChainId)
    ? ETHEREUM_MAINNET_CLIENT_CHAIN_ID
    : undefined;
}

export function ethereumTokenDisplayDescription(
  tokenName: string | undefined,
  tokenAddress: Address | string,
): string {
  const cleaned = tokenName?.trim();
  if (!cleaned) return "Ethereum token";

  if (containsPulseChainCopy(cleaned)) {
    return "Ethereum token";
  }

  if (cleaned.toLowerCase() === String(tokenAddress).toLowerCase()) {
    return "Ethereum token";
  }

  return cleaned;
}

export function ethereumTokenDisplaySymbol(
  tokenSymbol: string | undefined,
): string {
  const cleaned = tokenSymbol?.trim();
  if (!cleaned) return "Token";
  return containsPulseChainCopy(cleaned) ? "Token" : cleaned;
}

export function ethereumApprovalDisplayAllowance(input: {
  formattedAllowance: string;
  unlimited: boolean;
}): string {
  if (input.unlimited) return "Unlimited";
  return containsPulseChainCopy(input.formattedAllowance)
    ? "Token allowance"
    : input.formattedAllowance;
}

function containsPulseChainCopy(value: string): boolean {
  return (
    /\bfrom\s+pulse\s*chain\b/i.test(value) ||
    /\bon\s+pulse\s*chain\b/i.test(value) ||
    /\bpulsechain\b/i.test(value)
  );
}
