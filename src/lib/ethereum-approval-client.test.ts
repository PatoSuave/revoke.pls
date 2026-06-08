import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ETHEREUM_LIVE_VERIFICATION_LABEL,
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  ETHEREUM_MAINNET_EXPLORER_BASE_URL,
  ETHEREUM_MAINNET_NATIVE_SYMBOL,
  ETHEREUM_MAINNET_STATUS_LABEL,
  canEnableEthereumWalletRevoke,
  canEnableEthereumWalletRowRevoke,
  ethereumApprovalDisplayAllowance,
  ethereumExplorerTxUrl,
  ethereumTokenDisplayDescription,
  ethereumTokenDisplaySymbol,
  ethereumWalletRowRevokeDisabledReason,
  ethereumWalletRevokeDisabledReason,
  ethereumMainnetWalletChain,
  fetchEthereumApprovals,
  isEthereumReadOnlyChainId,
  mapEthereumApprovalApiResponse,
  resolveEthereumReadOnlyChainId,
  type EthereumApprovalApiResponse,
} from "./ethereum-approval-client";
import { supportedChainConfigList } from "./chains";
import {
  ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY,
  WALLET_MISMATCH_SCAN_TARGET_COPY,
} from "./scan-target";

const TOKEN = "0x2222222222222222222222222222222222222222";
const SPENDER = "0x3333333333333333333333333333333333333333";
const COLLECTION = "0x4444444444444444444444444444444444444444";
const OPERATOR = "0x5555555555555555555555555555555555555555";
const OWNER = "0x6666666666666666666666666666666666666666";

afterEach(() => {
  vi.unstubAllGlobals();
});

function response(
  overrides: Partial<EthereumApprovalApiResponse>,
): EthereumApprovalApiResponse {
  return {
    ok: true,
    status: "complete-clear",
    chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    approvals: { erc20: [], nft: [] },
    diagnostics: {
      chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      rpcConfigured: true,
      explorerConfigured: true,
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
      liveReadCandidateCap: 500,
      liveReadCandidatesTotal: 0,
      liveReadCandidatesProcessed: 0,
      rpcReadConcurrency: 8,
      upstreamRetryCount: 0,
      incompleteReasons: [],
    },
    errors: [],
    warnings: [],
    missingConfig: [],
    ...overrides,
  };
}

describe("Ethereum approval client mapping", () => {
  it("identifies Ethereum Mainnet status and verification labels", () => {
    expect(ETHEREUM_LIVE_VERIFICATION_LABEL).toBe(
      "Ethereum live verification",
    );
    expect(ETHEREUM_MAINNET_STATUS_LABEL).toBe("Ethereum Mainnet");
    expect(ethereumMainnetWalletChain.id).toBe(1);
    expect(ethereumMainnetWalletChain.nativeCurrency.symbol).toBe(
      ETHEREUM_MAINNET_NATIVE_SYMBOL,
    );
    expect(isEthereumReadOnlyChainId(1)).toBe(true);
    expect(isEthereumReadOnlyChainId(369)).toBe(false);
    expect(
      resolveEthereumReadOnlyChainId({
        walletChainId: undefined,
        wagmiChainId: 1,
      }),
    ).toBe(1);
    expect(
      resolveEthereumReadOnlyChainId({
        walletChainId: 369,
        wagmiChainId: 1,
      }),
    ).toBeUndefined();
  });

  it("keeps Ethereum Mainnet out of the active supported chain list", () => {
    expect(supportedChainConfigList.map((chain) => chain.chainId)).not.toContain(
      ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    );
  });

  it("builds Etherscan links without making Ethereum an active supported chain", () => {
    expect(ETHEREUM_MAINNET_EXPLORER_BASE_URL).toBe("https://etherscan.io");
    expect(ethereumExplorerTxUrl("0xabc")).toBe(
      "https://etherscan.io/tx/0xabc",
    );
  });

  it("uses neutral Ethereum token descriptions for PulseChain-specific metadata", () => {
    expect(
      ethereumTokenDisplayDescription(
        "WBTC from PulseChain",
        "0x2222222222222222222222222222222222222222",
      ),
    ).toBe("Ethereum token");
    expect(
      ethereumTokenDisplayDescription(
        "GIFF on Pulse Chain",
        "0x2222222222222222222222222222222222222222",
      ),
    ).toBe("Ethereum token");
    expect(
      ethereumTokenDisplayDescription(
        "Wrapped BTC",
        "0x2222222222222222222222222222222222222222",
      ),
    ).toBe("Wrapped BTC");
    expect(
      ethereumTokenDisplayDescription(
        undefined,
        "0x2222222222222222222222222222222222222222",
      ),
    ).toBe("Ethereum token");
    expect(ethereumTokenDisplaySymbol("Wrapped BTC from PulseChain")).toBe(
      "Token",
    );
    expect(ethereumTokenDisplaySymbol("WBTC")).toBe("WBTC");
    expect(
      ethereumApprovalDisplayAllowance({
        formattedAllowance: "10 Wrapped BTC from PulseChain",
        unlimited: false,
      }),
    ).toBe("Token allowance");
    expect(
      ethereumApprovalDisplayAllowance({
        formattedAllowance: "10 WBTC",
        unlimited: false,
      }),
    ).toBe("10 WBTC");
    expect(
      ethereumApprovalDisplayAllowance({
        formattedAllowance: "Wrapped BTC from PulseChain",
        unlimited: true,
      }),
    ).toBe("Unlimited");
  });

  it("maps verified active ERC-20 and NFT approvals as eligible for wallet revoke", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${ETHEREUM_MAINNET_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "TKN",
              tokenName: "Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              approvalBlockNumber: "123",
              approvalTxHash: "0x1",
              rawAllowance: "1000000000000000000",
              formattedAllowance: "1 TKN",
              unlimited: false,
            },
          ],
          nft: [
            {
              key: `${ETHEREUM_MAINNET_CLIENT_CHAIN_ID}-tokenApproval-${COLLECTION}-${OPERATOR}-7`,
              chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
              kind: "tokenApproval",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "Collectible",
              operatorAddress: OPERATOR,
              operatorLabel: "Unknown operator",
              protocol: "Unknown",
              trusted: false,
              approvalBlockNumber: "456",
              approvalTxHash: "0x2",
              tokenId: "7",
              risk: {
                level: "medium",
                reason: "Unknown operator approved for a single NFT.",
              },
            },
          ],
        },
        diagnostics: {
          ...response({}).diagnostics,
          liveReadSuccessCount: 2,
        },
      }),
    );

    expect(mapped.state).toBe("active");
    expect(mapped.canShowClear).toBe(false);
    expect(mapped.revokeEnabled).toBe(true);
    expect(mapped.revokeDisabledReason).toBeNull();
    expect(mapped.rowRevokeEnabled).toBe(true);
    expect(mapped.rowRevokeDisabledReason).toBeNull();
    expect(mapped.activeApprovalCount).toBe(2);
    expect(mapped.approvals.erc20[0]?.rawAllowance).toBe(1000000000000000000n);
    expect(mapped.approvals.erc20[0]?.approvalBlockNumber).toBe(123n);
    expect(mapped.approvals.nft[0]?.tokenId).toBe(7n);
    expect(mapped.approvals.nft[0]?.approvalBlockNumber).toBe(456n);
    expect(
      canEnableEthereumWalletRevoke({
        mapping: mapped,
        walletChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      }),
    ).toBe(true);
    expect(
      canEnableEthereumWalletRevoke({ mapping: mapped, walletChainId: 369 }),
    ).toBe(false);
    expect(
      canEnableEthereumWalletRowRevoke({
        mapping: mapped,
        walletChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(true);
    expect(
      canEnableEthereumWalletRowRevoke({
        mapping: mapped,
        walletChainId: 369,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
    expect(
      canEnableEthereumWalletRowRevoke({
        mapping: mapped,
        walletChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: "0x7777777777777777777777777777777777777777",
      }),
    ).toBe(false);
    expect(
      ethereumWalletRevokeDisabledReason({
        mapping: mapped,
        walletChainId: 369,
      }),
    ).toBe("Switch to Ethereum Mainnet to revoke.");
    expect(
      ethereumWalletRevokeDisabledReason({
        mapping: mapped,
        walletChainId: undefined,
      }),
    ).toBe(ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY);
    expect(
      ethereumWalletRowRevokeDisabledReason({
        mapping: mapped,
        walletChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Verified row; revoke available.");
    expect(
      ethereumWalletRowRevokeDisabledReason({
        mapping: mapped,
        walletChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: "0x7777777777777777777777777777777777777777",
      }),
    ).toBe(WALLET_MISMATCH_SCAN_TARGET_COPY);
    expect(
      ethereumWalletRowRevokeDisabledReason({
        mapping: mapped,
        walletChainId: undefined,
        ownerAddress: OWNER,
        connectedAddress: undefined,
      }),
    ).toBe(ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY);
  });

  it("passes the explicit owner address to the Ethereum approvals API", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        `/api/ethereum/approvals?owner=${encodeURIComponent(OWNER)}`,
      );
      expect(init?.cache).toBe("no-store");
      return new Response(JSON.stringify(response({ status: "complete-clear" })), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetch);

    const result = await fetchEthereumApprovals({ owner: OWNER });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("complete-clear");
  });

  it("shows clear only for complete-clear with no incomplete diagnostics", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({ status: "complete-clear" }),
    );

    expect(mapped.state).toBe("complete-clear");
    expect(mapped.canShowClear).toBe(true);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.rowRevokeEnabled).toBe(false);
  });

  it("never maps failed live-read diagnostics to clear", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({
        status: "complete-clear",
        diagnostics: {
          ...response({}).diagnostics,
          liveReadFailureCount: 1,
          incompleteVerificationCount: 1,
          skippedReasons: {
            "erc20-live-read-failure": 1,
          },
        },
      }),
    );

    expect(mapped.state).toBe("verification-incomplete");
    expect(mapped.canShowClear).toBe(false);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.rowRevokeEnabled).toBe(false);
    expect(mapped.revokeDisabledReason).toContain("1 ERC-20 live read failed");
  });

  it("keeps globally incomplete Ethereum scans non-clear while verified rows remain individually revokable", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({
        status: "verification-incomplete",
        ok: false,
        approvals: {
          erc20: [
            {
              key: `${ETHEREUM_MAINNET_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "TKN",
              tokenName: "Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "1000000000000000000",
              formattedAllowance: "1 TKN",
              unlimited: false,
            },
          ],
          nft: [],
        },
        diagnostics: {
          ...response({}).diagnostics,
          decodedErc20ApprovalCount: 1,
          decodedNftApprovalCount: 5,
          liveReadSuccessCount: 1,
          liveReadFailureCount: 5,
          incompleteVerificationCount: 5,
          skippedApprovalCount: 5,
          skippedReasons: {
            "nft-live-read-failure": 5,
          },
        },
      }),
    );

    expect(mapped.state).toBe("verification-incomplete");
    expect(mapped.canShowClear).toBe(false);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.revokeDisabledReason).toContain("5 NFT live reads failed");
    expect(mapped.rowRevokeEnabled).toBe(true);
    expect(mapped.rowRevokeDisabledReason).toBeNull();
    expect(
      canEnableEthereumWalletRevoke({
        mapping: mapped,
        walletChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      }),
    ).toBe(false);
    expect(
      canEnableEthereumWalletRowRevoke({
        mapping: mapped,
        walletChainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(true);
  });

  it("includes exact Ethereum incomplete verification buckets in the disabled reason", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({
        status: "verification-incomplete",
        ok: false,
        diagnostics: {
          ...response({}).diagnostics,
          liveReadFailureCount: 3,
          incompleteVerificationCount: 4,
          discoveryTruncated: true,
          skippedReasons: {
            "erc20-live-read-failure": 2,
            "nft-live-read-failure": 1,
            "discovery-truncated": 1,
          },
        },
      }),
    );

    expect(mapped.state).toBe("verification-incomplete");
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.revokeDisabledReason).toBe(
      "Verification incomplete (discovery was truncated; 2 ERC-20 live reads failed; 1 NFT live read failed) - revoke unavailable.",
    );
  });

  it("maps config-missing and upstream-failure to non-clear states", () => {
    const missing = mapEthereumApprovalApiResponse(
      response({ ok: false, status: "config-missing" }),
    );
    const upstream = mapEthereumApprovalApiResponse(
      response({ ok: false, status: "upstream-failure" }),
    );

    expect(missing.state).toBe("config-missing");
    expect(missing.canShowClear).toBe(false);
    expect(missing.revokeEnabled).toBe(false);
    expect(upstream.state).toBe("upstream-failure");
    expect(upstream.canShowClear).toBe(false);
    expect(upstream.revokeEnabled).toBe(false);
  });

  it("maps truncated discovery to verification-incomplete, not clear", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({
        status: "complete-clear",
        diagnostics: {
          ...response({}).diagnostics,
          discoveryTruncated: true,
          incompleteVerificationCount: 1,
        },
      }),
    );

    expect(mapped.state).toBe("verification-incomplete");
    expect(mapped.canShowClear).toBe(false);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.revokeDisabledReason).toContain("discovery was truncated");
  });

  it("disables Ethereum revoke when a returned approval is malformed", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${ETHEREUM_MAINNET_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "TKN",
              tokenName: "Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "not-a-number",
              formattedAllowance: "1 TKN",
              unlimited: false,
            },
          ],
          nft: [],
        },
      }),
    );

    expect(mapped.state).toBe("verification-incomplete");
    expect(mapped.malformedResponse).toBe(true);
    expect(mapped.canShowClear).toBe(false);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.revokeDisabledReason).toContain("malformed");
  });

  it("treats Ethereum token approvals without token IDs as malformed", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${ETHEREUM_MAINNET_CLIENT_CHAIN_ID}-tokenApproval-${COLLECTION}-${OPERATOR}-missing`,
              chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
              kind: "tokenApproval",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "Collectible",
              operatorAddress: OPERATOR,
              operatorLabel: "Unknown operator",
              protocol: "Unknown",
              trusted: false,
              risk: {
                level: "medium",
                reason: "Unknown operator approved for a single NFT.",
              },
            },
          ],
        },
        diagnostics: {
          ...response({}).diagnostics,
          liveReadSuccessCount: 1,
        },
      }),
    );

    expect(mapped.state).toBe("verification-incomplete");
    expect(mapped.malformedResponse).toBe(true);
    expect(mapped.canShowClear).toBe(false);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.rowRevokeEnabled).toBe(false);
    expect(mapped.approvals.nft).toEqual([]);
    expect(mapped.warnings.join(" ")).toContain("without a token ID");
  });
});
