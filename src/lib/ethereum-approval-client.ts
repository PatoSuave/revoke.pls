import type { Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { NftApproval } from "@/lib/nft-approvals";

export const ETHEREUM_MAINNET_CLIENT_CHAIN_ID = 1;
export const ETHEREUM_MAINNET_DISPLAY_NAME = "Ethereum Mainnet";
export const ETHEREUM_MAINNET_SHORT_NAME = "Ethereum";
export const ETHEREUM_READ_ONLY_MODE_LABEL = "Ethereum read-only mode";
export const ETHEREUM_MAINNET_NATIVE_SYMBOL = "ETH";
export const ETHEREUM_MAINNET_EXPLORER_NAME = "Etherscan";
export const ETHEREUM_MAINNET_EXPLORER_BASE_URL = "https://etherscan.io";

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
  decodedNftApprovalCount: number;
  liveReadSuccessCount: number;
  liveReadFailureCount: number;
  incompleteVerificationCount: number;
  skippedApprovalCount: number;
  skippedReasons: Record<string, number>;
  discoveryTruncated: boolean;
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
  revokeEnabled: false;
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
  decodedNftApprovalCount: 0,
  liveReadSuccessCount: 0,
  liveReadFailureCount: 0,
  incompleteVerificationCount: 0,
  skippedApprovalCount: 0,
  skippedReasons: {},
  discoveryTruncated: false,
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
  const erc20: Approval[] = [];
  for (const approval of response.approvals.erc20) {
    const rawAllowance = parseBigIntOrNull(approval.rawAllowance);
    if (rawAllowance === null) {
      warnings.push("Ethereum API returned a malformed ERC-20 allowance.");
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
      warnings.push("Ethereum API returned a malformed NFT token ID.");
      continue;
    }
    nft.push({ ...rest, tokenId: parsedTokenId });
  }
  const activeApprovalCount = erc20.length + nft.length;
  const incomplete =
    response.diagnostics.liveReadFailureCount > 0 ||
    response.diagnostics.incompleteVerificationCount > 0 ||
    response.diagnostics.discoveryTruncated;

  if (response.status === "config-missing") {
    return {
      state: "config-missing",
      canShowClear: false,
      revokeEnabled: false,
      activeApprovalCount,
      approvals: { erc20, nft },
      warnings,
    };
  }

  if (response.status === "upstream-failure") {
    return {
      state: "upstream-failure",
      canShowClear: false,
      revokeEnabled: false,
      activeApprovalCount,
      approvals: { erc20, nft },
      warnings,
    };
  }

  if (response.status === "verification-incomplete" || incomplete) {
    return {
      state: "verification-incomplete",
      canShowClear: false,
      revokeEnabled: false,
      activeApprovalCount,
      approvals: { erc20, nft },
      warnings,
    };
  }

  if (response.status === "active-approvals-found") {
    return {
      state: "active",
      canShowClear: false,
      revokeEnabled: false,
      activeApprovalCount,
      approvals: { erc20, nft },
      warnings,
    };
  }

  return {
    state: "complete-clear",
    canShowClear: true,
    revokeEnabled: false,
    activeApprovalCount,
    approvals: { erc20, nft },
    warnings,
  };
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

export function isEthereumReadOnlyChainId(
  chainId: number | undefined,
): chainId is typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID {
  return chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID;
}

export function ethereumTokenDisplayDescription(
  tokenName: string | undefined,
  tokenAddress: Address | string,
): string {
  const cleaned = tokenName?.trim();
  if (!cleaned) return "Ethereum token";

  // The gated Ethereum view must not reuse PulseChain-specific bridge/fork
  // language as token description copy. Keep the symbol visible, but use a
  // neutral descriptor when returned metadata is chain-specific or ambiguous.
  if (/\bpulse\s*chain\b/i.test(cleaned) || /\bpulsechain\b/i.test(cleaned)) {
    return "Ethereum token";
  }

  if (cleaned.toLowerCase() === String(tokenAddress).toLowerCase()) {
    return "Ethereum token";
  }

  return cleaned;
}
