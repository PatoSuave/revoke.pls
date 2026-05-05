import { defineChain, type Address } from "viem";

import type { Approval } from "@/lib/approvals";
import type { SupportedChainId } from "@/lib/chains";
import type { NftApproval } from "@/lib/nft-approvals";

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
  | typeof ETHEREUM_MAINNET_CLIENT_CHAIN_ID;

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
  /** True only when the API response is complete enough for wallet-side revoke. */
  revokeEnabled: boolean;
  revokeDisabledReason: string | null;
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
    response.diagnostics.discoveryTruncated;
  const apiVerifiedForRevoke =
    response.status === "active-approvals-found" &&
    response.ok &&
    !incomplete &&
    !malformedResponse &&
    activeApprovalCount > 0;
  const base = {
    revokeEnabled: apiVerifiedForRevoke,
    revokeDisabledReason: ethereumApiRevokeDisabledReason({
      response,
      incomplete,
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
    };
  }

  if (response.status === "upstream-failure") {
    return {
      state: "upstream-failure",
      canShowClear: false,
      ...base,
      revokeEnabled: false,
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
    return "Verification incomplete - revoke unavailable.";
  }
  if (response.status === "complete-clear" || activeApprovalCount === 0) {
    return "No active Ethereum approvals are available to revoke.";
  }
  return "Ethereum revoke unavailable.";
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

export function ethereumWalletRevokeDisabledReason({
  mapping,
  walletChainId,
}: {
  mapping: EthereumApprovalClientMapping | null | undefined;
  walletChainId: number | undefined;
}): string {
  if (!mapping) return "Ethereum approvals are still loading.";
  if (walletChainId !== ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return "Switch to Ethereum Mainnet.";
  }
  return mapping.revokeDisabledReason ?? "Ethereum wallet revoke is available.";
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
