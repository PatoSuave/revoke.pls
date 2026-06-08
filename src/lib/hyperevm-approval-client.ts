import { defineChain, type Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { NftApproval } from "@/lib/nft-approvals";
import {
  ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY,
  WALLET_MISMATCH_SCAN_TARGET_COPY,
} from "@/lib/scan-target";

export const HYPEREVM_CLIENT_CHAIN_ID = 999;
export const HYPEREVM_DISPLAY_NAME = "HyperEVM";
export const HYPEREVM_SHORT_NAME = "HyperEVM";
export const HYPEREVM_STATUS_LABEL = "HyperEVM verified-row revoke";
export const HYPEREVM_NATIVE_SYMBOL = "HYPE";
export const HYPEREVM_EXPLORER_NAME = "Hyperevmscan";
export const HYPEREVM_EXPLORER_BASE_URL = "https://hyperevmscan.io";
export const HYPEREVM_PUBLIC_RPC_URL = "https://rpc.hyperliquid.xyz/evm";
export const HYPEREVM_REVOKE_UNAVAILABLE_COPY =
  "HyperEVM revoke is available only for live-verified ERC-20 and NFT rows.";
export const HYPEREVM_NFT_REVOKE_UNAVAILABLE_COPY =
  "HyperEVM NFT revoke is available only for live-verified rows.";
export const HYPEREVM_BATCH_REVOKE_UNAVAILABLE_COPY =
  "Batch revoke is not enabled for HyperEVM.";

export const hyperevmWalletChain = defineChain({
  id: HYPEREVM_CLIENT_CHAIN_ID,
  name: "HyperEVM",
  nativeCurrency: {
    name: "HYPE",
    symbol: HYPEREVM_NATIVE_SYMBOL,
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [HYPEREVM_PUBLIC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: HYPEREVM_EXPLORER_NAME,
      url: HYPEREVM_EXPLORER_BASE_URL,
    },
  },
});

export type HyperEVMApprovalApiStatus =
  | "active-approvals-found"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface HyperEVMApprovalApiDiagnostics {
  chainId: typeof HYPEREVM_CLIENT_CHAIN_ID;
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

export type HyperEVMErc20ApprovalApi = Omit<
  Approval,
  "approvalBlockNumber" | "rawAllowance"
> & {
  approvalBlockNumber?: string;
  rawAllowance: string;
};

export type HyperEVMNftApprovalApi = Omit<
  NftApproval,
  "approvalBlockNumber" | "tokenId"
> & {
  approvalBlockNumber?: string;
  tokenId?: string;
};

export interface HyperEVMApprovalApiResponse {
  ok: boolean;
  status: HyperEVMApprovalApiStatus;
  chainId: typeof HYPEREVM_CLIENT_CHAIN_ID;
  approvals: {
    erc20: HyperEVMErc20ApprovalApi[];
    nft: HyperEVMNftApprovalApi[];
  };
  diagnostics: HyperEVMApprovalApiDiagnostics;
  errors: string[];
  warnings: string[];
  missingConfig: string[];
}

export type HyperEVMApprovalClientState =
  | "active"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface HyperEVMApprovalClientMapping {
  state: HyperEVMApprovalClientState;
  canShowClear: boolean;
  /** Global and batch revoke stay unavailable for HyperEVM. */
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

const EMPTY_DIAGNOSTICS: HyperEVMApprovalApiDiagnostics = {
  chainId: HYPEREVM_CLIENT_CHAIN_ID,
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

export function emptyHyperEVMApprovalApiResponse(
  status: HyperEVMApprovalApiStatus,
  errors: readonly string[] = [],
): HyperEVMApprovalApiResponse {
  return {
    ok: false,
    status,
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    approvals: { erc20: [], nft: [] },
    diagnostics: EMPTY_DIAGNOSTICS,
    errors: [...errors],
    warnings: [],
    missingConfig: [],
  };
}

export async function fetchHyperEVMApprovals({
  owner,
  signal,
}: {
  owner: Address;
  signal?: AbortSignal;
}): Promise<HyperEVMApprovalApiResponse> {
  const response = await fetch(
    `/api/hyperevm/approvals?owner=${encodeURIComponent(owner)}`,
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
      `HyperEVM approvals API returned ${response.status} without JSON.`,
    );
  }

  const body = (await response.json()) as HyperEVMApprovalApiResponse;
  if (!body || typeof body.status !== "string") {
    throw new Error("HyperEVM approvals API returned a malformed response.");
  }
  return body;
}

export function mapHyperEVMApprovalApiResponse(
  response: HyperEVMApprovalApiResponse,
): HyperEVMApprovalClientMapping {
  const warnings = [...response.warnings];
  let malformedResponse = false;
  const erc20: Approval[] = [];
  for (const approval of response.approvals.erc20) {
    const {
      approvalBlockNumber,
      rawAllowance: rawAllowanceValue,
      ...rest
    } = approval;
    const rawAllowance = parseBigIntOrNull(rawAllowanceValue);
    if (rawAllowance === null) {
      malformedResponse = true;
      warnings.push("HyperEVM API returned a malformed ERC-20 allowance.");
      continue;
    }
    const parsedApprovalBlockNumber =
      parseOptionalBigIntOrNull(approvalBlockNumber);
    if (parsedApprovalBlockNumber === null) {
      malformedResponse = true;
      warnings.push(
        "HyperEVM API returned a malformed approval block number.",
      );
      continue;
    }
    erc20.push({
      ...rest,
      ...(parsedApprovalBlockNumber !== undefined
        ? { approvalBlockNumber: parsedApprovalBlockNumber }
        : {}),
      rawAllowance,
    });
  }

  const nft: NftApproval[] = [];
  for (const approval of response.approvals.nft) {
    const { approvalBlockNumber, tokenId, ...rest } = approval;
    const parsedApprovalBlockNumber =
      parseOptionalBigIntOrNull(approvalBlockNumber);
    if (parsedApprovalBlockNumber === null) {
      malformedResponse = true;
      warnings.push(
        "HyperEVM API returned a malformed approval block number.",
      );
      continue;
    }
    const hydrated = {
      ...rest,
      ...(parsedApprovalBlockNumber !== undefined
        ? { approvalBlockNumber: parsedApprovalBlockNumber }
        : {}),
    };
    if (tokenId === undefined) {
      if (approval.kind === "tokenApproval") {
        malformedResponse = true;
        warnings.push(
          "HyperEVM API returned an NFT token approval without a token ID.",
        );
        continue;
      }
      nft.push(hydrated);
      continue;
    }

    const parsedTokenId = parseBigIntOrNull(tokenId);
    if (parsedTokenId === null) {
      malformedResponse = true;
      warnings.push("HyperEVM API returned a malformed NFT token ID.");
      continue;
    }
    nft.push({ ...hydrated, tokenId: parsedTokenId });
  }

  const activeApprovalCount = erc20.length + nft.length;
  const erc20ActiveApprovalCount = erc20.filter(
    isHyperEVMErc20ApprovalLiveActive,
  ).length;
  const nftActiveApprovalCount = nft.filter(isHyperEVMNftApprovalLiveActive).length;
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
      ? hyperevmIncompleteVerificationReason({
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
    revokeUnavailableReason: HYPEREVM_REVOKE_UNAVAILABLE_COPY,
    erc20RowRevokeEnabled: erc20RowVerifiedForRevoke,
    erc20RowRevokeDisabledReason: hyperevmErc20RowRevokeDisabledReason({
      response,
      rowVerifiedForRevoke: erc20RowVerifiedForRevoke,
      malformedResponse,
      erc20ActiveApprovalCount,
      activeApprovalCount,
    }),
    nftRowRevokeEnabled: nftRowVerifiedForRevoke,
    nftRowRevokeDisabledReason: hyperevmNftRowRevokeDisabledReason({
      response,
      rowVerifiedForRevoke: nftRowVerifiedForRevoke,
      malformedResponse,
      nftActiveApprovalCount,
      activeApprovalCount,
    }),
    nftRevokeEnabled: false as const,
    nftRevokeUnavailableReason: HYPEREVM_NFT_REVOKE_UNAVAILABLE_COPY,
    batchRevokeEnabled: false as const,
    batchRevokeUnavailableReason: HYPEREVM_BATCH_REVOKE_UNAVAILABLE_COPY,
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

function isHyperEVMErc20ApprovalLiveActive(approval: Approval): boolean {
  return (
    approval.chainId === HYPEREVM_CLIENT_CHAIN_ID &&
    approval.rawAllowance > 0n
  );
}

function isHyperEVMNftApprovalLiveActive(approval: NftApproval): boolean {
  return (
    approval.chainId === HYPEREVM_CLIENT_CHAIN_ID &&
    (approval.kind === "approvalForAll" || approval.tokenId !== undefined)
  );
}

function hyperevmErc20RowRevokeDisabledReason({
  response,
  rowVerifiedForRevoke,
  malformedResponse,
  erc20ActiveApprovalCount,
  activeApprovalCount,
}: {
  response: HyperEVMApprovalApiResponse;
  rowVerifiedForRevoke: boolean;
  malformedResponse: boolean;
  erc20ActiveApprovalCount: number;
  activeApprovalCount: number;
}): string | null {
  if (rowVerifiedForRevoke) return null;
  if (response.status === "config-missing") {
    return "HyperEVM API configuration is missing - revoke unavailable.";
  }
  if (response.status === "upstream-failure") {
    return "HyperEVM explorer or RPC failed - revoke unavailable.";
  }
  if (malformedResponse) {
    return "Revoke unavailable until current approval state is verified.";
  }
  if (erc20ActiveApprovalCount === 0) {
    return "No active HyperEVM ERC-20 approvals are available to revoke.";
  }
  if (response.diagnostics.liveReadSuccessCount < activeApprovalCount) {
    return "Revoke unavailable until current approval state is verified.";
  }
  return "Revoke unavailable until current approval state is verified.";
}

function hyperevmNftRowRevokeDisabledReason({
  response,
  rowVerifiedForRevoke,
  malformedResponse,
  nftActiveApprovalCount,
  activeApprovalCount,
}: {
  response: HyperEVMApprovalApiResponse;
  rowVerifiedForRevoke: boolean;
  malformedResponse: boolean;
  nftActiveApprovalCount: number;
  activeApprovalCount: number;
}): string | null {
  if (rowVerifiedForRevoke) return null;
  if (response.status === "config-missing") {
    return "HyperEVM API configuration is missing - revoke unavailable.";
  }
  if (response.status === "upstream-failure") {
    return "HyperEVM explorer or RPC failed - revoke unavailable.";
  }
  if (malformedResponse) {
    return "Revoke unavailable until current approval state is verified.";
  }
  if (nftActiveApprovalCount === 0) {
    return "No active HyperEVM NFT approvals are available to revoke.";
  }
  if (response.diagnostics.liveReadSuccessCount < activeApprovalCount) {
    return "Revoke unavailable until current approval state is verified.";
  }
  return "Revoke unavailable until current approval state is verified.";
}

export function canEnableHyperEVMErc20RowRevoke({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: HyperEVMApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): boolean {
  return (
    mapping?.erc20RowRevokeEnabled === true &&
    walletChainId === HYPEREVM_CLIENT_CHAIN_ID &&
    hyperevmAddressesMatch(ownerAddress, connectedAddress)
  );
}

export function hyperevmErc20RowRevokeDisabledReasonForWallet({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: HyperEVMApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): string {
  if (!mapping) return "HyperEVM approvals are still loading.";
  if (!connectedAddress) return ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY;
  if (walletChainId !== HYPEREVM_CLIENT_CHAIN_ID) {
    return "Switch to HyperEVM to revoke.";
  }
  if (!hyperevmAddressesMatch(ownerAddress, connectedAddress)) {
    return WALLET_MISMATCH_SCAN_TARGET_COPY;
  }
  return (
    mapping.erc20RowRevokeDisabledReason ??
    "Verified ERC-20 row; revoke available."
  );
}

export function canEnableHyperEVMNftRowRevoke({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: HyperEVMApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): boolean {
  return (
    mapping?.nftRowRevokeEnabled === true &&
    walletChainId === HYPEREVM_CLIENT_CHAIN_ID &&
    hyperevmAddressesMatch(ownerAddress, connectedAddress)
  );
}

export function hyperevmNftRowRevokeDisabledReasonForWallet({
  mapping,
  walletChainId,
  ownerAddress,
  connectedAddress,
}: {
  mapping: HyperEVMApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
  ownerAddress: Address | undefined;
  connectedAddress: Address | undefined;
}): string {
  if (!mapping) return "HyperEVM approvals are still loading.";
  if (!connectedAddress) return ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY;
  if (walletChainId !== HYPEREVM_CLIENT_CHAIN_ID) {
    return "Switch to HyperEVM to revoke.";
  }
  if (!hyperevmAddressesMatch(ownerAddress, connectedAddress)) {
    return WALLET_MISMATCH_SCAN_TARGET_COPY;
  }
  return (
    mapping.nftRowRevokeDisabledReason ??
    "Verified NFT row; revoke available."
  );
}

function hyperevmAddressesMatch(
  ownerAddress: Address | undefined,
  connectedAddress: Address | undefined,
): boolean {
  if (!ownerAddress || !connectedAddress) return false;
  return ownerAddress.toLowerCase() === connectedAddress.toLowerCase();
}

function hyperevmIncompleteVerificationReason({
  response,
  malformedResponse,
}: {
  response: HyperEVMApprovalApiResponse;
  malformedResponse: boolean;
}): string {
  if (malformedResponse) return "HyperEVM API response was malformed.";

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

function parseOptionalBigIntOrNull(
  value: string | undefined,
): bigint | undefined | null {
  return value === undefined ? undefined : parseBigIntOrNull(value);
}

export function hyperevmExplorerAddressUrl(address: Address | string): string {
  return `${HYPEREVM_EXPLORER_BASE_URL}/address/${address}`;
}

export function hyperevmExplorerTokenUrl(address: Address | string): string {
  return `${HYPEREVM_EXPLORER_BASE_URL}/token/${address}`;
}

export function hyperevmExplorerTxUrl(hash: string): string {
  return `${HYPEREVM_EXPLORER_BASE_URL}/tx/${hash}`;
}

export function isHyperEVMReadOnlyChainId(
  chainId: number | undefined,
): chainId is typeof HYPEREVM_CLIENT_CHAIN_ID {
  return chainId === HYPEREVM_CLIENT_CHAIN_ID;
}

export function resolveHyperEVMReadOnlyChainId({
  walletChainId,
  wagmiChainId,
}: {
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
}): typeof HYPEREVM_CLIENT_CHAIN_ID | undefined {
  if (isHyperEVMReadOnlyChainId(walletChainId)) {
    return HYPEREVM_CLIENT_CHAIN_ID;
  }

  return walletChainId === undefined && isHyperEVMReadOnlyChainId(wagmiChainId)
    ? HYPEREVM_CLIENT_CHAIN_ID
    : undefined;
}
