import { afterEach, describe, expect, it, vi } from "vitest";

import type { OptimismApprovalApiResponse } from "@/lib/optimism-approval-client";
import {
  OPTIMISM_CLIENT_CHAIN_ID,
  OPTIMISM_EXPLORER_BASE_URL,
  OPTIMISM_NATIVE_SYMBOL,
  OPTIMISM_STATUS_LABEL,
  OPTIMISM_BATCH_REVOKE_UNAVAILABLE_COPY,
  OPTIMISM_NFT_REVOKE_UNAVAILABLE_COPY,
  OPTIMISM_REVOKE_UNAVAILABLE_COPY,
  optimismErc20RowRevokeDisabledReasonForWallet,
  optimismNftRowRevokeDisabledReasonForWallet,
  optimismExplorerAddressUrl,
  optimismExplorerTokenUrl,
  optimismExplorerTxUrl,
  optimismWalletChain,
  canEnableOptimismErc20RowRevoke,
  canEnableOptimismNftRowRevoke,
  fetchOptimismApprovals,
  isOptimismReadOnlyChainId,
  mapOptimismApprovalApiResponse,
  resolveOptimismReadOnlyChainId,
} from "@/lib/optimism-approval-client";
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
  overrides: Partial<OptimismApprovalApiResponse>,
): OptimismApprovalApiResponse {
  return {
    ok: true,
    status: "complete-clear",
    chainId: OPTIMISM_CLIENT_CHAIN_ID,
    approvals: { erc20: [], nft: [] },
    diagnostics: {
      chainId: OPTIMISM_CLIENT_CHAIN_ID,
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

describe("Optimism approval client mapping", () => {
  it("identifies OP Mainnet as a special wallet-recognition chain", () => {
    expect(OPTIMISM_STATUS_LABEL).toBe(
      "Optimism verified-row revoke",
    );
    expect(optimismWalletChain.id).toBe(10);
    expect(optimismWalletChain.nativeCurrency.symbol).toBe(
      OPTIMISM_NATIVE_SYMBOL,
    );
    expect(isOptimismReadOnlyChainId(10)).toBe(true);
    expect(isOptimismReadOnlyChainId(1)).toBe(false);
    expect(
      resolveOptimismReadOnlyChainId({
        walletChainId: undefined,
        wagmiChainId: 10,
      }),
    ).toBe(10);
    expect(
      resolveOptimismReadOnlyChainId({
        walletChainId: 369,
        wagmiChainId: 10,
      }),
    ).toBeUndefined();
  });

  it("keeps OP Mainnet out of the active supported chain list", () => {
    expect(supportedChainConfigList.map((chain) => chain.chainId)).not.toContain(
      OPTIMISM_CLIENT_CHAIN_ID,
    );
  });

  it("builds Optimistic Etherscan links without enabling Optimism global or batch revoke", () => {
    expect(OPTIMISM_EXPLORER_BASE_URL).toBe("https://optimistic.etherscan.io");
    expect(optimismExplorerAddressUrl(SPENDER)).toBe(
      `https://optimistic.etherscan.io/address/${SPENDER}`,
    );
    expect(optimismExplorerTokenUrl(TOKEN)).toBe(
      `https://optimistic.etherscan.io/token/${TOKEN}`,
    );
    expect(optimismExplorerTxUrl("0xabc")).toBe(
      "https://optimistic.etherscan.io/tx/0xabc",
    );
  });

  it("passes the explicit owner address to the Optimism approvals API", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        `/api/optimism/approvals?owner=${encodeURIComponent(OWNER)}`,
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

    const result = await fetchOptimismApprovals({ owner: OWNER });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("complete-clear");
  });

  it("maps active Optimism approvals while keeping global and batch revoke unavailable", () => {
    const mapped = mapOptimismApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${OPTIMISM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: OPTIMISM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "OP",
              tokenName: "Optimism Token",
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
              formattedAllowance: "1 OP",
              unlimited: false,
            },
          ],
          nft: [
            {
              key: `${OPTIMISM_CLIENT_CHAIN_ID}-tokenApproval-${COLLECTION}-${OPERATOR}-7`,
              chainId: OPTIMISM_CLIENT_CHAIN_ID,
              kind: "tokenApproval",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "Optimism Collection",
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
    expect(mapped.revokeUnavailableReason).toBe(OPTIMISM_REVOKE_UNAVAILABLE_COPY);
    expect(mapped.erc20RowRevokeEnabled).toBe(true);
    expect(mapped.erc20RowRevokeDisabledReason).toBeNull();
    expect(mapped.nftRowRevokeEnabled).toBe(true);
    expect(mapped.nftRowRevokeDisabledReason).toBeNull();
    expect(mapped.nftRevokeEnabled).toBe(false);
    expect(mapped.nftRevokeUnavailableReason).toBe(
      OPTIMISM_NFT_REVOKE_UNAVAILABLE_COPY,
    );
    expect(mapped.batchRevokeEnabled).toBe(false);
    expect(mapped.batchRevokeUnavailableReason).toBe(
      OPTIMISM_BATCH_REVOKE_UNAVAILABLE_COPY,
    );
    expect(mapped.activeApprovalCount).toBe(2);
    expect(mapped.approvals.erc20[0]?.rawAllowance).toBe(1000000000000000000n);
    expect(mapped.approvals.erc20[0]?.approvalBlockNumber).toBe(123n);
    expect(mapped.approvals.nft[0]?.tokenId).toBe(7n);
    expect(mapped.approvals.nft[0]?.approvalBlockNumber).toBe(456n);
  });

  it("enables Optimism ERC-20 row revoke only for matching wallet on chain 10", () => {
    const mapped = mapOptimismApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${OPTIMISM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: OPTIMISM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "OP",
              tokenName: "Optimism Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "1000000000000000000",
              formattedAllowance: "1 OP",
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
      canEnableOptimismErc20RowRevoke({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(true);
    expect(
      optimismErc20RowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Verified ERC-20 row; revoke available.");
    expect(
      canEnableOptimismErc20RowRevoke({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
    expect(
      optimismErc20RowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Switch to OP Mainnet to revoke.");
    expect(
      canEnableOptimismErc20RowRevoke({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: SPENDER,
      }),
    ).toBe(false);
    expect(
      canEnableOptimismErc20RowRevoke({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: undefined,
      }),
    ).toBe(false);
  });

  it("keeps Optimism ERC-20 row revoke disabled when live allowance is zero", () => {
    const mapped = mapOptimismApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${OPTIMISM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: OPTIMISM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "OP",
              tokenName: "Optimism Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "0",
              formattedAllowance: "0 OP",
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
      "No active Optimism ERC-20 approvals",
    );
    expect(
      canEnableOptimismErc20RowRevoke({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
  });

  it("keeps Optimism ERC-20 row revoke disabled when live verification is incomplete", () => {
    const mapped = mapOptimismApprovalApiResponse(
      response({
        status: "verification-incomplete",
        approvals: {
          erc20: [
            {
              key: `${OPTIMISM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: OPTIMISM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "OP",
              tokenName: "Optimism Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "1000000000000000000",
              formattedAllowance: "1 OP",
              unlimited: false,
            },
          ],
          nft: [],
        },
        diagnostics: {
          ...response({}).diagnostics,
          liveReadSuccessCount: 0,
          liveReadFailureCount: 1,
          incompleteVerificationCount: 1,
          skippedReasons: { "erc20-live-read-failure": 1 },
        },
      }),
    );

    expect(mapped.state).toBe("verification-incomplete");
    expect(mapped.erc20RowRevokeEnabled).toBe(false);
    expect(mapped.erc20RowRevokeDisabledReason).toContain(
      "current approval state is verified",
    );
    expect(mapped.incompleteReason).toContain("1 ERC-20 live read failed");
    expect(
      canEnableOptimismErc20RowRevoke({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
  });

  it("enables Optimism NFT row revoke only for matching wallet on chain 10", () => {
    const mapped = mapOptimismApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${OPTIMISM_CLIENT_CHAIN_ID}-approvalForAll-${COLLECTION}-${OPERATOR}`,
              chainId: OPTIMISM_CLIENT_CHAIN_ID,
              kind: "approvalForAll",
              standard: "erc1155",
              collectionAddress: COLLECTION,
              collectionName: "Optimism Collection",
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
      OPTIMISM_NFT_REVOKE_UNAVAILABLE_COPY,
    );
    expect(
      canEnableOptimismNftRowRevoke({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(true);
    expect(
      optimismNftRowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Verified NFT row; revoke available.");
    expect(
      canEnableOptimismNftRowRevoke({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
    expect(
      optimismNftRowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Switch to OP Mainnet to revoke.");
    expect(
      canEnableOptimismNftRowRevoke({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: SPENDER,
      }),
    ).toBe(false);
    expect(
      canEnableOptimismNftRowRevoke({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: undefined,
      }),
    ).toBe(false);
  });

  it("keeps Optimism NFT row revoke disabled when live verification is incomplete", () => {
    const mapped = mapOptimismApprovalApiResponse(
      response({
        status: "verification-incomplete",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${OPTIMISM_CLIENT_CHAIN_ID}-approvalForAll-${COLLECTION}-${OPERATOR}`,
              chainId: OPTIMISM_CLIENT_CHAIN_ID,
              kind: "approvalForAll",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "Optimism Collection",
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
      canEnableOptimismNftRowRevoke({
        mapping: mapped,
        walletChainId: OPTIMISM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
  });

  it("treats Optimism token approvals without token IDs as malformed", () => {
    const mapped = mapOptimismApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${OPTIMISM_CLIENT_CHAIN_ID}-tokenApproval-${COLLECTION}-${OPERATOR}-missing`,
              chainId: OPTIMISM_CLIENT_CHAIN_ID,
              kind: "tokenApproval",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "Optimism Collection",
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
    const mapped = mapOptimismApprovalApiResponse(
      response({ status: "complete-clear" }),
    );

    expect(mapped.state).toBe("complete-clear");
    expect(mapped.canShowClear).toBe(true);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.erc20RowRevokeEnabled).toBe(false);
    expect(mapped.nftRowRevokeEnabled).toBe(false);
  });

  it("never maps failed Optimism live reads to clear", () => {
    const mapped = mapOptimismApprovalApiResponse(
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
    const missing = mapOptimismApprovalApiResponse(
      response({ ok: false, status: "config-missing" }),
    );
    const upstream = mapOptimismApprovalApiResponse(
      response({ ok: false, status: "upstream-failure" }),
    );
    const truncated = mapOptimismApprovalApiResponse(
      response({
        status: "complete-clear",
        diagnostics: {
          ...response({}).diagnostics,
          discoveryTruncated: true,
          incompleteVerificationCount: 1,
        },
      }),
    );
    const malformed = mapOptimismApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${OPTIMISM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: OPTIMISM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "OP",
              tokenName: "Optimism Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "not-a-number",
              formattedAllowance: "1 OP",
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
