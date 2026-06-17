import { afterEach, describe, expect, it, vi } from "vitest";

import type { ArbitrumApprovalApiResponse } from "@/lib/arbitrum-approval-client";
import {
  ARBITRUM_ONE_CLIENT_CHAIN_ID,
  ARBITRUM_ONE_EXPLORER_BASE_URL,
  ARBITRUM_ONE_NATIVE_SYMBOL,
  ARBITRUM_ONE_STATUS_LABEL,
  ARBITRUM_BATCH_REVOKE_UNAVAILABLE_COPY,
  ARBITRUM_NFT_REVOKE_UNAVAILABLE_COPY,
  ARBITRUM_REVOKE_UNAVAILABLE_COPY,
  arbitrumErc20RowRevokeDisabledReasonForWallet,
  arbitrumNftRowRevokeDisabledReasonForWallet,
  arbitrumExplorerAddressUrl,
  arbitrumExplorerTokenUrl,
  arbitrumExplorerTxUrl,
  arbitrumOneWalletChain,
  canEnableArbitrumErc20RowRevoke,
  canEnableArbitrumNftRowRevoke,
  fetchArbitrumApprovals,
  isArbitrumReadOnlyChainId,
  mapArbitrumApprovalApiResponse,
  resolveArbitrumReadOnlyChainId,
} from "@/lib/arbitrum-approval-client";
import { supportedChainConfigList } from "@/lib/chains";

const TOKEN = "0x2222222222222222222222222222222222222222";
const SPENDER = "0x3333333333333333333333333333333333333333";
const COLLECTION = "0x4444444444444444444444444444444444444444";
const OPERATOR = "0x5555555555555555555555555555555555555555";
const OWNER = "0x6666666666666666666666666666666666666666";

afterEach(() => {
  vi.unstubAllGlobals();
});

function response(
  overrides: Partial<ArbitrumApprovalApiResponse>,
): ArbitrumApprovalApiResponse {
  return {
    ok: true,
    status: "complete-clear",
    chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    approvals: { erc20: [], nft: [] },
    diagnostics: {
      chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
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

describe("Arbitrum approval client mapping", () => {
  it("identifies Arbitrum One as a read-only wallet-recognition chain", () => {
    expect(ARBITRUM_ONE_STATUS_LABEL).toBe(
      "Arbitrum One verified row revoke",
    );
    expect(arbitrumOneWalletChain.id).toBe(42161);
    expect(arbitrumOneWalletChain.nativeCurrency.symbol).toBe(
      ARBITRUM_ONE_NATIVE_SYMBOL,
    );
    expect(isArbitrumReadOnlyChainId(42161)).toBe(true);
    expect(isArbitrumReadOnlyChainId(1)).toBe(false);
    expect(
      resolveArbitrumReadOnlyChainId({
        walletChainId: undefined,
        wagmiChainId: 42161,
      }),
    ).toBe(42161);
    expect(
      resolveArbitrumReadOnlyChainId({
        walletChainId: 369,
        wagmiChainId: 42161,
      }),
    ).toBeUndefined();
  });

  it("keeps Arbitrum One out of the active supported chain list", () => {
    expect(supportedChainConfigList.map((chain) => chain.chainId)).not.toContain(
      ARBITRUM_ONE_CLIENT_CHAIN_ID,
    );
  });

  it("builds Arbiscan links without enabling Arbitrum global or batch revoke", () => {
    expect(ARBITRUM_ONE_EXPLORER_BASE_URL).toBe("https://arbiscan.io");
    expect(arbitrumExplorerAddressUrl(SPENDER)).toBe(
      `https://arbiscan.io/address/${SPENDER}`,
    );
    expect(arbitrumExplorerTokenUrl(TOKEN)).toBe(
      `https://arbiscan.io/token/${TOKEN}`,
    );
    expect(arbitrumExplorerTxUrl("0xabc")).toBe(
      "https://arbiscan.io/tx/0xabc",
    );
  });

  it("passes the explicit owner address to the Arbitrum approvals API", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        `/api/arbitrum/approvals?owner=${encodeURIComponent(OWNER)}`,
      );
      expect(init?.cache).toBe("no-store");
      return new Response(
        JSON.stringify(response({ status: "complete-clear" })),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });
    vi.stubGlobal("fetch", fetch);

    const result = await fetchArbitrumApprovals({ owner: OWNER });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("complete-clear");
  });

  it("maps active Arbitrum ERC-20 approvals as verified row revoke candidates", () => {
    const mapped = mapArbitrumApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${ARBITRUM_ONE_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "ARB",
              tokenName: "Arbitrum Token",
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
              formattedAllowance: "1 ARB",
              unlimited: false,
            },
          ],
          nft: [
            {
              key: `${ARBITRUM_ONE_CLIENT_CHAIN_ID}-tokenApproval-${COLLECTION}-${OPERATOR}-7`,
              chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
              kind: "tokenApproval",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "Arbitrum Collection",
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
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.revokeUnavailableReason).toBe(ARBITRUM_REVOKE_UNAVAILABLE_COPY);
    expect(mapped.erc20RowRevokeEnabled).toBe(true);
    expect(mapped.erc20RowRevokeDisabledReason).toBeNull();
    expect(mapped.nftRowRevokeEnabled).toBe(true);
    expect(mapped.nftRowRevokeDisabledReason).toBeNull();
    expect(mapped.nftRevokeEnabled).toBe(false);
    expect(mapped.nftRevokeUnavailableReason).toBe(
      ARBITRUM_NFT_REVOKE_UNAVAILABLE_COPY,
    );
    expect(mapped.batchRevokeEnabled).toBe(false);
    expect(mapped.batchRevokeUnavailableReason).toBe(
      ARBITRUM_BATCH_REVOKE_UNAVAILABLE_COPY,
    );
    expect(mapped.activeApprovalCount).toBe(2);
    expect(mapped.approvals.erc20[0]?.rawAllowance).toBe(1000000000000000000n);
    expect(mapped.approvals.erc20[0]?.approvalBlockNumber).toBe(123n);
    expect(mapped.approvals.nft[0]?.tokenId).toBe(7n);
    expect(mapped.approvals.nft[0]?.approvalBlockNumber).toBe(456n);
  });

  it("enables Arbitrum ERC-20 row revoke only for matching wallet on chain 42161", () => {
    const mapped = mapArbitrumApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${ARBITRUM_ONE_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "ARB",
              tokenName: "Arbitrum Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "1000000000000000000",
              formattedAllowance: "1 ARB",
              unlimited: false,
            },
          ],
          nft: [],
        },
        diagnostics: {
          ...response({}).diagnostics,
          liveReadSuccessCount: 1,
        },
      }),
    );

    expect(
      canEnableArbitrumErc20RowRevoke({
        mapping: mapped,
        walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(true);
    expect(
      canEnableArbitrumErc20RowRevoke({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
    expect(
      arbitrumErc20RowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Switch to Arbitrum One to revoke.");
    expect(
      canEnableArbitrumErc20RowRevoke({
        mapping: mapped,
        walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: SPENDER,
      }),
    ).toBe(false);
    expect(
      canEnableArbitrumErc20RowRevoke({
        mapping: mapped,
        walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: undefined,
      }),
    ).toBe(false);
  });

  it("keeps Arbitrum ERC-20 row revoke disabled when live allowance is zero", () => {
    const mapped = mapArbitrumApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${ARBITRUM_ONE_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "ARB",
              tokenName: "Arbitrum Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "0",
              formattedAllowance: "0 ARB",
              unlimited: false,
            },
          ],
          nft: [],
        },
        diagnostics: {
          ...response({}).diagnostics,
          liveReadSuccessCount: 1,
        },
      }),
    );

    expect(mapped.erc20RowRevokeEnabled).toBe(false);
    expect(mapped.erc20RowRevokeDisabledReason).toContain(
      "No active Arbitrum ERC-20 approvals",
    );
    expect(
      canEnableArbitrumErc20RowRevoke({
        mapping: mapped,
        walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
  });

  it("enables Arbitrum NFT row revoke only for matching wallet on chain 42161", () => {
    const mapped = mapArbitrumApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${ARBITRUM_ONE_CLIENT_CHAIN_ID}-approvalForAll-${COLLECTION}-${OPERATOR}`,
              chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
              kind: "approvalForAll",
              standard: "erc1155",
              collectionAddress: COLLECTION,
              collectionName: "Arbitrum Collection",
              operatorAddress: OPERATOR,
              operatorLabel: "Unknown operator",
              protocol: "Unknown",
              trusted: false,
              risk: {
                level: "medium",
                reason: "Unknown operator approved for all NFTs.",
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

    expect(mapped.erc20RowRevokeEnabled).toBe(false);
    expect(mapped.nftRowRevokeEnabled).toBe(true);
    expect(mapped.nftRowRevokeDisabledReason).toBeNull();
    expect(mapped.nftRevokeEnabled).toBe(false);
    expect(mapped.nftRevokeUnavailableReason).toBe(
      ARBITRUM_NFT_REVOKE_UNAVAILABLE_COPY,
    );
    expect(
      canEnableArbitrumNftRowRevoke({
        mapping: mapped,
        walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(true);
    expect(
      canEnableArbitrumNftRowRevoke({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
    expect(
      arbitrumNftRowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Switch to Arbitrum One to revoke.");
    expect(
      canEnableArbitrumNftRowRevoke({
        mapping: mapped,
        walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: SPENDER,
      }),
    ).toBe(false);
    expect(
      canEnableArbitrumNftRowRevoke({
        mapping: mapped,
        walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: undefined,
      }),
    ).toBe(false);
  });

  it("keeps Arbitrum NFT row revoke disabled when live verification is incomplete", () => {
    const mapped = mapArbitrumApprovalApiResponse(
      response({
        status: "verification-incomplete",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${ARBITRUM_ONE_CLIENT_CHAIN_ID}-approvalForAll-${COLLECTION}-${OPERATOR}`,
              chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
              kind: "approvalForAll",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "Arbitrum Collection",
              operatorAddress: OPERATOR,
              operatorLabel: "Unknown operator",
              protocol: "Unknown",
              trusted: false,
              risk: {
                level: "high",
                reason: "Unknown operator approved for all NFTs.",
              },
            },
          ],
        },
        diagnostics: {
          ...response({}).diagnostics,
          liveReadSuccessCount: 0,
          liveReadFailureCount: 1,
          incompleteVerificationCount: 1,
          skippedReasons: { "nft-live-read-failure": 1 },
        },
      }),
    );

    expect(mapped.state).toBe("verification-incomplete");
    expect(mapped.nftRowRevokeEnabled).toBe(false);
    expect(mapped.nftRowRevokeDisabledReason).toContain(
      "current approval state is verified",
    );
    expect(mapped.incompleteReason).toContain("1 NFT live read failed");
    expect(
      canEnableArbitrumNftRowRevoke({
        mapping: mapped,
        walletChainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
  });

  it("treats Arbitrum token approvals without token IDs as malformed", () => {
    const mapped = mapArbitrumApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${ARBITRUM_ONE_CLIENT_CHAIN_ID}-tokenApproval-${COLLECTION}-${OPERATOR}-missing`,
              chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
              kind: "tokenApproval",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "Arbitrum Collection",
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
    expect(mapped.approvals.nft).toEqual([]);
    expect(mapped.nftRowRevokeEnabled).toBe(false);
    expect(mapped.warnings.join(" ")).toContain("without a token ID");
  });

  it("shows clear only for complete-clear with no incomplete diagnostics", () => {
    const mapped = mapArbitrumApprovalApiResponse(
      response({ status: "complete-clear" }),
    );

    expect(mapped.state).toBe("complete-clear");
    expect(mapped.canShowClear).toBe(true);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.erc20RowRevokeEnabled).toBe(false);
    expect(mapped.nftRowRevokeEnabled).toBe(false);
  });

  it("never maps failed Arbitrum live reads to clear", () => {
    const mapped = mapArbitrumApprovalApiResponse(
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
    expect(mapped.erc20RowRevokeEnabled).toBe(false);
    expect(mapped.nftRowRevokeEnabled).toBe(false);
    expect(mapped.incompleteReason).toContain("1 ERC-20 live read failed");
  });

  it("maps config, upstream, truncation, and malformed rows to non-clear states", () => {
    const missing = mapArbitrumApprovalApiResponse(
      response({ ok: false, status: "config-missing" }),
    );
    const upstream = mapArbitrumApprovalApiResponse(
      response({ ok: false, status: "upstream-failure" }),
    );
    const truncated = mapArbitrumApprovalApiResponse(
      response({
        status: "complete-clear",
        diagnostics: {
          ...response({}).diagnostics,
          discoveryTruncated: true,
          incompleteVerificationCount: 1,
        },
      }),
    );
    const malformed = mapArbitrumApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${ARBITRUM_ONE_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "ARB",
              tokenName: "Arbitrum Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "not-a-number",
              formattedAllowance: "1 ARB",
              unlimited: false,
            },
          ],
          nft: [],
        },
      }),
    );

    expect(missing.state).toBe("config-missing");
    expect(missing.canShowClear).toBe(false);
    expect(upstream.state).toBe("upstream-failure");
    expect(upstream.canShowClear).toBe(false);
    expect(truncated.state).toBe("verification-incomplete");
    expect(truncated.canShowClear).toBe(false);
    expect(malformed.state).toBe("verification-incomplete");
    expect(malformed.malformedResponse).toBe(true);
    expect(malformed.canShowClear).toBe(false);
    expect(malformed.erc20RowRevokeEnabled).toBe(false);
    expect(malformed.nftRowRevokeEnabled).toBe(false);
  });
});
