import { defineChain, type Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { NftApproval } from "@/lib/nft-approvals";
import {
  ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY,
  WALLET_MISMATCH_SCAN_TARGET_COPY,
} from "@/lib/scan-target";

export const OPTIMISM_CLIENT_CHAIN_ID = 10;
export const OPTIMISM_DISPLAY_NAME = "Optimism";
export const OPTIMISM_SHORT_NAME = "Optimism";
export const OPTIMISM_STATUS_LABEL = "Optimism verified-row revoke";
export const OPTIMISM_NATIVE_SYMBOL = "ETH";
export const OPTIMISM_EXPLORER_NAME = "Optimistic Etherscan";
export const OPTIMISM_EXPLORER_BASE_URL = "https://optimistic.etherscan.io";
export const OPTIMISM_PUBLIC_RPC_URL = "https://mainnet.optimism.io";
export const OPTIMISM_REVOKE_UNAVAILABLE_COPY =
  "Optimism revoke is available only for live-verified ERC-20 and NFT rows.";
export const OPTIMISM_NFT_REVOKE_UNAVAILABLE_COPY =
  "Optimism NFT revoke is available only for live-verified rows.";
export const OPTIMISM_BATCH_REVOKE_UNAVAILABLE_COPY =
  "Batch revoke is not enabled for Optimism.";

export const optimismWalletChain = defineChain({
  id: OPTIMISM_CLIENT_CHAIN_ID,
  name: "OP Mainnet",
  nativeCurrency: {
    name: "Ether",
    symbol: OPTIMISM_NATIVE_SYMBOL,
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [OPTIMISM_PUBLIC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: OPTIMISM_EXPLORER_NAME,
      url: OPTIMISM_EXPLORER_BASE_URL,
    },
  },
});

export type OptimismApprovalApiStatus =
  | "active-approvals-found"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface OptimismApprovalApiDiagnostics {
  chainId: typeof OPTIMISM_CLIENT_CHAIN_ID;
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

export type OptimismErc20ApprovalApi = Omit<Approval, "rawAllowance"> & {
  rawAllowance: string;
};

export type OptimismNftApprovalApi = Omit<NftApproval, "tokenId"> & {
  tokenId?: string;
};

export interface OptimismApprovalApiResponse {
  ok: boolean;
  status: OptimismApprovalApiStatus;
  chainId: typeof OPTIMISM_CLIENT_CHAIN_ID;
  approvals: {
    erc20: OptimismErc20ApprovalApi[];
    nft: OptimismNftApprovalApi[];
  };
  diagnostics: OptimismApprovalApiDiagnostics;
  errors: string[];
  warnings: string[];
  missingConfig: string[];
}

export type OptimismApprovalClientState =
  | "active"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface OptimismApprovalClientMapping {
  state: OptimismApprovalClientState;
  canShowClear: boolean;
  /** Global and batch revoke stay unavailable for Optimism. */
  revokeEnabled: false;
  revokeUnavailableReason: string;
  /** True only for live-verified active ERC-20 rows. */
  erc20RowRevokeEnabled: boolean;
  erc20RowRevokeDisabledReason: string | null;
  /** True only for live-verified active NFT rows. Global NFT revoke stays unavailable. */
  nftRowRevokeEnabled: boolean;
  nftRowRevokeDisabledReason: string | null;
  nftRevokeEnabled: false;
  nftRevokeUnavailableReason: string;
  batchRevokeEnabled: false;
  batchRevokeUnavailableReason: string;
  incompleteReason: string | null;
  malformedResponse: boolean;
  activeApprovalCount: number;
  approvals: {
    erc20: Approval[];
    nft: NftApproval[];
  };
  warnings: string[];
}

const EMPTY_DIAGNOSTICS: OptimismApprovalApiDiagnostics = {
  chainId: OPTIMISM_CLIENT_CHAIN_ID,
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

export function emptyOptimismApprovalApiResponse(
  status: OptimismApprovalApiStatus,
  errors: readonly string[] = [],
): OptimismApprovalApiResponse {
  return {
    ok: false,
    status,
    chainId: OPTIMISM_CLIENT_CHAIN_ID,
    approvals: { erc20: [], nft: [] },
    diagnostics: EMPTY_DIAGNOSTICS,
    errors: [...errors],
    warnings: [],
    missingConfig: [],
  };
}

export async function fetchOptimismApprovals({
  owner,
  signal,
}: {
  owner: Address;
  signal?: AbortSignal;
}): Promise<OptimismApprovalApiResponse> {
  const response = await fetch(
    `/api/optimism/approvals?owner=${encodeURIComponent(owner)}`,
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
      `Optimism approvals API returned ${response.status} without JSON.`,
    );
  }

  const body = (await response.json()) as OptimismApprovalApiResponse;
  if (!body || typeof body.status !== "string") {
    throw new Error("Optimism approvals API returned a malformed response.");
  }
  return body;
}

export function mapOptimismApprovalApiResponse(
  response: OptimismApprovalApiResponse,
): OptimismApprovalClientMapping {
  const warnings = [...response.warnings];
  let malformedResponse = false;
  const erc20: Approval[] = [];
  for (const approval of response.approvals.erc20) {
    const rawAllowance = parseBigIntOrNull(approval.rawAllowance);
    if (rawAllowance === null) {
      malformedResponse = true;
      warnings.push("Optimism API returned a malformed ERC-20 allowance.");
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
          "Optimism API returned an NFT token approval without a token ID.",
        );
        continue;
      }
      nft.push(rest);
      continue;
    }

    const parsedTokenId = parseBigIntOrNull(tokenId);
    if (parsedTokenId === null) {
      malformedResponse = true;
      warnings.push("Optimism API returned a malformed NFT token ID.");
      continue;
    }
    nft.push({ ...rest, tokenId: parsedTokenId });
  }

  const activeApprovalCount = erc20.length + nft.length;
  const erc20ActiveApprovalCount = erc20.filter(
    isOptimismErc20ApprovalLiveActive,
  ).length;
  const nftActiveApprovalCount = nft.filter(isOptimismNftApprovalLiveActive).length;
  const incomplete =
    response.diagnostics.liveReadFailureCount > 0 ||
    response.diagnostics.incompleteVerificationCount > 0 ||
    response.diagnostics.discoveryTruncated ||
    response.diagnostics.requestTimedOut ||
    response.diagnostics.rateLimited ||
    response.diagnostics.candidateCapHit;
  const incompleteReason =
    response.status === "verification-incomplete" ||
    incomplete ||
    malformedResponse
      ? optimismIncompleteVerificationReason({
          response,
          malformedResponse,
        })
      : null;
  const erc20RowVerifiedForRevoke =
    (response.status === "active-approvals-found" ||
      response.status === "verification-incomplete") &&
    !malformedResponse &&
    erc20ActiveApprovalCount > 0 &&
    response.diagnostics.liveReadSuccessCount >= activeApprovalCount;
  const nftRowVerifiedForRevoke =
    (response.status === "active-approvals-found" ||
      response.status === "verification-incomplete") &&
    !malformedResponse &&
    nftActiveApprovalCount > 0 &&
    response.diagnostics.liveReadSuccessCount >= activeApprovalCount;
  const base = {
    revokeEnabled: false as const,
    revokeUnavailableReason: OPTIMISM_REVOKE_UNAVAILABLE_COPY,
    erc20RowRevokeEnabled: erc20RowVerifiedForRevoke,
    erc20RowRevokeDisabledReason: optimismErc20RowRevokeDisabledReason({
      response,
      rowVerifiedForRevoke: erc20RowVerifiedForRevoke,
      malformedResponse,
      erc20ActiveApprovalCount,
      activeApprovalCount,
    }),
    nftRowRevokeEnabled: nftRowVerifiedForRevoke,
    nftRowRevokeDisabledReason: optimismNftRowRevokeDisabledReason({
      response,
      rowVerifiedForRevoke: nftRowVerifiedForRevoke,
      malformedResponse,
      nftActiveApprovalCount,
      activeApprovalCount,
    }),
    nftRevokeEnabled: false as const,
    nftRevokeUnavailableReason: OPTIMISM_NFT_REVOKE_UNAVAILABLE_COPY,
    batchRevokeEnabled: false as const,
    batchRevokeUnavailableReason: OPTIMISM_BATCH_REVOKE_UNAVAILABLE_COPY,
    incompleteReason,
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
      erc20RowRevokeEnabled: false,
      nftRowRevokeEnabled: false,
    };
  }

  if (response.status === "upstream-failure") {
    return {
      state: "upstream-failure",
      canShowClear: false,
      ...base,
      erc20RowRevokeEnabled: false,
      nftRowRevokeEnabled: false,
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
    erc20RowRevokeEnabled: false,
    nftRowRevokeEnabled: false,
  };
}

function isOptimismErc20ApprovalLiveActive(approval: Approval): boolean {
  return (
    approval.chainId === OPTIMISM_CLIENT_CHAIN_ID &&
    approval.rawAllowance > 0n
  );
}

function isOptimismNftApprovalLiveActive(approval: NftApproval): boolean {
  return (
    approval.chainId === OPTIMISM_CLIENT_CHAIN_ID &&
    (approval.kind === "approvalForAll" || approval.tokenId !== undefined)
  );
}

function optimismErc20RowRevokeDisabledReason({
  response,
  rowVerifiedForRevoke,
  malformedResponse,
  erc20ActiveApprovalCount,
  activeApprovalCount,
}: {
  response: OptimismApprovalApiResponse;
  rowVerifiedForRevoke: boolean;
  malformedResponse: boolean;
  erc20ActiveApprovalCount: number;
  activeApprovalCount: number;
}): string | null {
  if (rowVerifiedForRevoke) return null;
  if (response.status === "config-missing") {
    return "Optimism API configuration is missing - revoke unavailable.";
  }
  if (response.status === "upstream-failure") {
    return "Optimism explorer or RPC failed - revoke unavailable.";
  }
  if (malformedResponse) {
    return "Revoke unavailable until current approval state is verified.";
  }
  if (erc20ActiveApprovalCount === 0) {
    return "No active Optimism ERC-20 approvals are available to revoke.";
  }
  if (response.diagnostics.liveReadSuccessCount < activeApprovalCount) {
    return "Revoke unavailable until current approval state is verified.";
  }
  return "Revoke unavailable until current approval state is verified.";
}

function optimismNftRowRevokeDisabledReason({
  response,
  rowVerifiedForRevoke,
  malformedResponse,
  nftActiveApprovalCount,
  activeApprovalCount,
}: {
  response: OptimismApprovalApiResponse;
  rowVerifiedForRevoke: boolean;
  malformedResponse: boolean;
  nftActiveApprovalCount: number;
  activeApprovalCount: number;
}): string | null {
  if (rowVerifiedForRevoke) return null;
  if (response.status === "config-missing") {
    return "Optimism API configuration is missing - revoke unavailable.";
  }
  if (response.status === "upstream-failure") {
    return "Optimism explorer or RPC failed - revoke unavailable.";
  }
  if (malformedResponse) {
    return "Revoke unavailable until current approval state is verified.";
  }
  if (nftActiveApprovalCount === 0) {
    return "No active Optimism NFT approvals are available to revoke.";
  }
  if (response.diagnostics.liveReadSuccessCount < activeApprovalCount) {
    return "Revoke unavailable until current approval state is verified.";
  }
  return "Revoke unavailable until current approval state is verified.";
}

export function canEnableOptimismErc20RowRevoke({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: OptimismApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): boolean {
  return (
    mapping?.erc20RowRevokeEnabled === true &&
    walletChainId === OPTIMISM_CLIENT_CHAIN_ID &&
    optimismAddressesMatch(ownerAddress, connectedAddress)
  );
}

export function optimismErc20RowRevokeDisabledReasonForWallet({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: OptimismApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): string {
  if (!mapping) return "Optimism approvals are still loading.";
  if (!connectedAddress) return ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY;
  if (walletChainId !== OPTIMISM_CLIENT_CHAIN_ID) {
    return "Switch to OP Mainnet to revoke.";
  }
  if (!optimismAddressesMatch(ownerAddress, connectedAddress)) {
    return WALLET_MISMATCH_SCAN_TARGET_COPY;
  }
  return (
    mapping.erc20RowRevokeDisabledReason ??
    "Verified ERC-20 row; revoke available."
  );
}

export function canEnableOptimismNftRowRevoke({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: OptimismApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): boolean {
  return (
    mapping?.nftRowRevokeEnabled === true &&
    walletChainId === OPTIMISM_CLIENT_CHAIN_ID &&
    optimismAddressesMatch(ownerAddress, connectedAddress)
  );
}

export function optimismNftRowRevokeDisabledReasonForWallet({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: OptimismApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): string {
  if (!mapping) return "Optimism approvals are still loading.";
  if (!connectedAddress) return ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY;
  if (walletChainId !== OPTIMISM_CLIENT_CHAIN_ID) {
    return "Switch to OP Mainnet to revoke.";
  }
  if (!optimismAddressesMatch(ownerAddress, connectedAddress)) {
    return WALLET_MISMATCH_SCAN_TARGET_COPY;
  }
  return (
    mapping.nftRowRevokeDisabledReason ??
    "Verified NFT row; revoke available."
  );
}

function optimismAddressesMatch(
  ownerAddress: Address | undefined,
  connectedAddress: Address | undefined,
): boolean {
  if (!ownerAddress || !connectedAddress) return false;
  return ownerAddress.toLowerCase() === connectedAddress.toLowerCase();
}

function optimismIncompleteVerificationReason({
  response,
  malformedResponse,
}: {
  response: OptimismApprovalApiResponse;
  malformedResponse: boolean;
}): string {
  if (malformedResponse) return "Optimism API response was malformed.";

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

  return details.length > 0
    ? `Verification incomplete (${details.join("; ")}).`
    : "Verification incomplete.";
}

function parseBigIntOrNull(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function optimismExplorerAddressUrl(address: Address | string): string {
  return `${OPTIMISM_EXPLORER_BASE_URL}/address/${address}`;
}

export function optimismExplorerTokenUrl(address: Address | string): string {
  return `${OPTIMISM_EXPLORER_BASE_URL}/token/${address}`;
}

export function optimismExplorerTxUrl(hash: string): string {
  return `${OPTIMISM_EXPLORER_BASE_URL}/tx/${hash}`;
}

export function isOptimismReadOnlyChainId(
  chainId: number | undefined,
): chainId is typeof OPTIMISM_CLIENT_CHAIN_ID {
  return chainId === OPTIMISM_CLIENT_CHAIN_ID;
}

export function resolveOptimismReadOnlyChainId({
  walletChainId,
  wagmiChainId,
}: {
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
}): typeof OPTIMISM_CLIENT_CHAIN_ID | undefined {
  if (isOptimismReadOnlyChainId(walletChainId)) {
    return OPTIMISM_CLIENT_CHAIN_ID;
  }

  return walletChainId === undefined && isOptimismReadOnlyChainId(wagmiChainId)
    ? OPTIMISM_CLIENT_CHAIN_ID
    : undefined;
}
