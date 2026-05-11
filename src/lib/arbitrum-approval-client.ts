import { defineChain, type Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { NftApproval } from "@/lib/nft-approvals";

export const ARBITRUM_ONE_CLIENT_CHAIN_ID = 42161;
export const ARBITRUM_ONE_DISPLAY_NAME = "Arbitrum One";
export const ARBITRUM_ONE_SHORT_NAME = "Arbitrum";
export const ARBITRUM_ONE_STATUS_LABEL = "Arbitrum One read-only beta";
export const ARBITRUM_ONE_NATIVE_SYMBOL = "ETH";
export const ARBITRUM_ONE_EXPLORER_NAME = "Arbiscan";
export const ARBITRUM_ONE_EXPLORER_BASE_URL = "https://arbiscan.io";
export const ARBITRUM_ONE_PUBLIC_RPC_URL = "https://arb1.arbitrum.io/rpc";
export const ARBITRUM_REVOKE_UNAVAILABLE_COPY =
  "Arbitrum revoke is not enabled in this read-only beta.";

export const arbitrumOneWalletChain = defineChain({
  id: ARBITRUM_ONE_CLIENT_CHAIN_ID,
  name: ARBITRUM_ONE_DISPLAY_NAME,
  nativeCurrency: {
    name: "Ether",
    symbol: ARBITRUM_ONE_NATIVE_SYMBOL,
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ARBITRUM_ONE_PUBLIC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: ARBITRUM_ONE_EXPLORER_NAME,
      url: ARBITRUM_ONE_EXPLORER_BASE_URL,
    },
  },
});

export type ArbitrumApprovalApiStatus =
  | "active-approvals-found"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface ArbitrumApprovalApiDiagnostics {
  chainId: typeof ARBITRUM_ONE_CLIENT_CHAIN_ID;
  rpcConfigured: boolean;
  explorerConfigured: boolean;
  rawApprovalLogCount: number;
  decodedErc20ApprovalCount: number;
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

export type ArbitrumErc20ApprovalApi = Omit<Approval, "rawAllowance"> & {
  rawAllowance: string;
};

export type ArbitrumNftApprovalApi = Omit<NftApproval, "tokenId"> & {
  tokenId?: string;
};

export interface ArbitrumApprovalApiResponse {
  ok: boolean;
  status: ArbitrumApprovalApiStatus;
  chainId: typeof ARBITRUM_ONE_CLIENT_CHAIN_ID;
  approvals: {
    erc20: ArbitrumErc20ApprovalApi[];
    nft: ArbitrumNftApprovalApi[];
  };
  diagnostics: ArbitrumApprovalApiDiagnostics;
  errors: string[];
  warnings: string[];
  missingConfig: string[];
}

export type ArbitrumApprovalClientState =
  | "active"
  | "complete-clear"
  | "verification-incomplete"
  | "config-missing"
  | "upstream-failure";

export interface ArbitrumApprovalClientMapping {
  state: ArbitrumApprovalClientState;
  canShowClear: boolean;
  revokeEnabled: false;
  revokeUnavailableReason: string;
  incompleteReason: string | null;
  malformedResponse: boolean;
  activeApprovalCount: number;
  approvals: {
    erc20: Approval[];
    nft: NftApproval[];
  };
  warnings: string[];
}

const EMPTY_DIAGNOSTICS: ArbitrumApprovalApiDiagnostics = {
  chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
  rpcConfigured: false,
  explorerConfigured: false,
  rawApprovalLogCount: 0,
  decodedErc20ApprovalCount: 0,
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

export function emptyArbitrumApprovalApiResponse(
  status: ArbitrumApprovalApiStatus,
  errors: readonly string[] = [],
): ArbitrumApprovalApiResponse {
  return {
    ok: false,
    status,
    chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    approvals: { erc20: [], nft: [] },
    diagnostics: EMPTY_DIAGNOSTICS,
    errors: [...errors],
    warnings: [],
    missingConfig: [],
  };
}

export async function fetchArbitrumApprovals({
  owner,
  signal,
}: {
  owner: Address;
  signal?: AbortSignal;
}): Promise<ArbitrumApprovalApiResponse> {
  const response = await fetch(
    `/api/arbitrum/approvals?owner=${encodeURIComponent(owner)}`,
    {
      method: "GET",
      headers: { accept: "application/json" },
      signal,
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      `Arbitrum approvals API returned ${response.status} without JSON.`,
    );
  }

  const body = (await response.json()) as ArbitrumApprovalApiResponse;
  if (!body || typeof body.status !== "string") {
    throw new Error("Arbitrum approvals API returned a malformed response.");
  }
  return body;
}

export function mapArbitrumApprovalApiResponse(
  response: ArbitrumApprovalApiResponse,
): ArbitrumApprovalClientMapping {
  const warnings = [...response.warnings];
  let malformedResponse = false;
  const erc20: Approval[] = [];
  for (const approval of response.approvals.erc20) {
    const rawAllowance = parseBigIntOrNull(approval.rawAllowance);
    if (rawAllowance === null) {
      malformedResponse = true;
      warnings.push("Arbitrum API returned a malformed ERC-20 allowance.");
      continue;
    }
    erc20.push({ ...approval, rawAllowance });
  }

  const nft: NftApproval[] = [];
  for (const approval of response.approvals.nft) {
    const { tokenId, ...rest } = approval;
    if (tokenId === undefined) {
      nft.push(rest);
      continue;
    }

    const parsedTokenId = parseBigIntOrNull(tokenId);
    if (parsedTokenId === null) {
      malformedResponse = true;
      warnings.push("Arbitrum API returned a malformed NFT token ID.");
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
  const incompleteReason =
    response.status === "verification-incomplete" ||
    incomplete ||
    malformedResponse
      ? arbitrumIncompleteVerificationReason({
          response,
          malformedResponse,
        })
      : null;
  const base = {
    revokeEnabled: false as const,
    revokeUnavailableReason: ARBITRUM_REVOKE_UNAVAILABLE_COPY,
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
    };
  }

  if (response.status === "upstream-failure") {
    return {
      state: "upstream-failure",
      canShowClear: false,
      ...base,
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
  };
}

function arbitrumIncompleteVerificationReason({
  response,
  malformedResponse,
}: {
  response: ArbitrumApprovalApiResponse;
  malformedResponse: boolean;
}): string {
  if (malformedResponse) return "Arbitrum API response was malformed.";

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

export function arbitrumExplorerAddressUrl(address: Address | string): string {
  return `${ARBITRUM_ONE_EXPLORER_BASE_URL}/address/${address}`;
}

export function arbitrumExplorerTokenUrl(address: Address | string): string {
  return `${ARBITRUM_ONE_EXPLORER_BASE_URL}/token/${address}`;
}

export function arbitrumExplorerTxUrl(hash: string): string {
  return `${ARBITRUM_ONE_EXPLORER_BASE_URL}/tx/${hash}`;
}

export function isArbitrumReadOnlyChainId(
  chainId: number | undefined,
): chainId is typeof ARBITRUM_ONE_CLIENT_CHAIN_ID {
  return chainId === ARBITRUM_ONE_CLIENT_CHAIN_ID;
}

export function resolveArbitrumReadOnlyChainId({
  walletChainId,
  wagmiChainId,
}: {
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
}): typeof ARBITRUM_ONE_CLIENT_CHAIN_ID | undefined {
  if (isArbitrumReadOnlyChainId(walletChainId)) {
    return ARBITRUM_ONE_CLIENT_CHAIN_ID;
  }

  return walletChainId === undefined && isArbitrumReadOnlyChainId(wagmiChainId)
    ? ARBITRUM_ONE_CLIENT_CHAIN_ID
    : undefined;
}
