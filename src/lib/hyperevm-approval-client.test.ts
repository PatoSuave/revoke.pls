import { afterEach, describe, expect, it, vi } from "vitest";

import type { HyperEVMApprovalApiResponse } from "@/lib/hyperevm-approval-client";
import {
  HYPEREVM_CLIENT_CHAIN_ID,
  HYPEREVM_EXPLORER_BASE_URL,
  HYPEREVM_NATIVE_SYMBOL,
  HYPEREVM_STATUS_LABEL,
  HYPEREVM_BATCH_REVOKE_UNAVAILABLE_COPY,
  HYPEREVM_NFT_REVOKE_UNAVAILABLE_COPY,
  HYPEREVM_REVOKE_UNAVAILABLE_COPY,
  hyperevmErc20RowRevokeDisabledReasonForWallet,
  hyperevmNftRowRevokeDisabledReasonForWallet,
  hyperevmExplorerAddressUrl,
  hyperevmExplorerTokenUrl,
  hyperevmExplorerTxUrl,
  hyperevmWalletChain,
  canEnableHyperEVMErc20RowRevoke,
  canEnableHyperEVMNftRowRevoke,
  fetchHyperEVMApprovals,
  isHyperEVMReadOnlyChainId,
  mapHyperEVMApprovalApiResponse,
  resolveHyperEVMReadOnlyChainId,
} from "@/lib/hyperevm-approval-client";
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
  overrides: Partial<HyperEVMApprovalApiResponse>,
): HyperEVMApprovalApiResponse {
  return {
    ok: true,
    status: "complete-clear",
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    approvals: { erc20: [], nft: [] },
    diagnostics: {
      chainId: HYPEREVM_CLIENT_CHAIN_ID,
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

describe("HyperEVM approval client mapping", () => {
  it("identifies HyperEVM as a special wallet-recognition chain", () => {
    expect(HYPEREVM_STATUS_LABEL).toBe(
      "HyperEVM verified-row revoke",
    );
    expect(hyperevmWalletChain.id).toBe(999);
    expect(hyperevmWalletChain.nativeCurrency.symbol).toBe(
      HYPEREVM_NATIVE_SYMBOL,
    );
    expect(isHyperEVMReadOnlyChainId(999)).toBe(true);
    expect(isHyperEVMReadOnlyChainId(1)).toBe(false);
    expect(
      resolveHyperEVMReadOnlyChainId({
        walletChainId: undefined,
        wagmiChainId: 999,
      }),
    ).toBe(999);
    expect(
      resolveHyperEVMReadOnlyChainId({
        walletChainId: 369,
        wagmiChainId: 999,
      }),
    ).toBeUndefined();
  });

  it("keeps HyperEVM out of the active supported chain list", () => {
    expect(supportedChainConfigList.map((chain) => chain.chainId)).not.toContain(
      HYPEREVM_CLIENT_CHAIN_ID,
    );
  });

  it("builds Hyperevmscan links without enabling HyperEVM global or batch revoke", () => {
    expect(HYPEREVM_EXPLORER_BASE_URL).toBe("https://hyperevmscan.io");
    expect(hyperevmExplorerAddressUrl(SPENDER)).toBe(
      `https://hyperevmscan.io/address/${SPENDER}`,
    );
    expect(hyperevmExplorerTokenUrl(TOKEN)).toBe(
      `https://hyperevmscan.io/token/${TOKEN}`,
    );
    expect(hyperevmExplorerTxUrl("0xabc")).toBe(
      "https://hyperevmscan.io/tx/0xabc",
    );
  });

  it("passes the explicit owner address to the HyperEVM approvals API", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        `/api/hyperevm/approvals?owner=${encodeURIComponent(OWNER)}`,
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

    const result = await fetchHyperEVMApprovals({ owner: OWNER });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("complete-clear");
  });

  it("maps active HyperEVM approvals while keeping global and batch revoke unavailable", () => {
    const mapped = mapHyperEVMApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${HYPEREVM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: HYPEREVM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "HYPE",
              tokenName: "HyperEVM Token",
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
              formattedAllowance: "1 HYPE",
              unlimited: false,
            },
          ],
          nft: [
            {
              key: `${HYPEREVM_CLIENT_CHAIN_ID}-tokenApproval-${COLLECTION}-${OPERATOR}-7`,
              chainId: HYPEREVM_CLIENT_CHAIN_ID,
              kind: "tokenApproval",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "HyperEVM Collection",
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
    expect(mapped.revokeUnavailableReason).toBe(HYPEREVM_REVOKE_UNAVAILABLE_COPY);
    expect(mapped.erc20RowRevokeEnabled).toBe(true);
    expect(mapped.erc20RowRevokeDisabledReason).toBeNull();
    expect(mapped.nftRowRevokeEnabled).toBe(true);
    expect(mapped.nftRowRevokeDisabledReason).toBeNull();
    expect(mapped.nftRevokeEnabled).toBe(false);
    expect(mapped.nftRevokeUnavailableReason).toBe(
      HYPEREVM_NFT_REVOKE_UNAVAILABLE_COPY,
    );
    expect(mapped.batchRevokeEnabled).toBe(false);
    expect(mapped.batchRevokeUnavailableReason).toBe(
      HYPEREVM_BATCH_REVOKE_UNAVAILABLE_COPY,
    );
    expect(mapped.activeApprovalCount).toBe(2);
    expect(mapped.approvals.erc20[0]?.rawAllowance).toBe(1000000000000000000n);
    expect(mapped.approvals.erc20[0]?.approvalBlockNumber).toBe(123n);
    expect(mapped.approvals.nft[0]?.tokenId).toBe(7n);
    expect(mapped.approvals.nft[0]?.approvalBlockNumber).toBe(456n);
  });

  it("enables HyperEVM ERC-20 row revoke only for matching wallet on chain 999", () => {
    const mapped = mapHyperEVMApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${HYPEREVM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: HYPEREVM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "HYPE",
              tokenName: "HyperEVM Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "1000000000000000000",
              formattedAllowance: "1 HYPE",
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
      canEnableHyperEVMErc20RowRevoke({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(true);
    expect(
      hyperevmErc20RowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Verified ERC-20 row; revoke available.");
    expect(
      canEnableHyperEVMErc20RowRevoke({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
    expect(
      hyperevmErc20RowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Switch to HyperEVM to revoke.");
    expect(
      canEnableHyperEVMErc20RowRevoke({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: SPENDER,
      }),
    ).toBe(false);
    expect(
      canEnableHyperEVMErc20RowRevoke({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: undefined,
      }),
    ).toBe(false);
  });

  it("keeps HyperEVM ERC-20 row revoke disabled when live allowance is zero", () => {
    const mapped = mapHyperEVMApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${HYPEREVM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: HYPEREVM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "HYPE",
              tokenName: "HyperEVM Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "0",
              formattedAllowance: "0 HYPE",
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
      "No active HyperEVM ERC-20 approvals",
    );
    expect(
      canEnableHyperEVMErc20RowRevoke({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
  });

  it("keeps HyperEVM ERC-20 row revoke disabled when live verification is incomplete", () => {
    const mapped = mapHyperEVMApprovalApiResponse(
      response({
        status: "verification-incomplete",
        approvals: {
          erc20: [
            {
              key: `${HYPEREVM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: HYPEREVM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "HYPE",
              tokenName: "HyperEVM Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "1000000000000000000",
              formattedAllowance: "1 HYPE",
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
      canEnableHyperEVMErc20RowRevoke({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
  });

  it("enables HyperEVM NFT row revoke only for matching wallet on chain 999", () => {
    const mapped = mapHyperEVMApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${HYPEREVM_CLIENT_CHAIN_ID}-approvalForAll-${COLLECTION}-${OPERATOR}`,
              chainId: HYPEREVM_CLIENT_CHAIN_ID,
              kind: "approvalForAll",
              standard: "erc1155",
              collectionAddress: COLLECTION,
              collectionName: "HyperEVM Collection",
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
      HYPEREVM_NFT_REVOKE_UNAVAILABLE_COPY,
    );
    expect(
      canEnableHyperEVMNftRowRevoke({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(true);
    expect(
      hyperevmNftRowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Verified NFT row; revoke available.");
    expect(
      canEnableHyperEVMNftRowRevoke({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
    expect(
      hyperevmNftRowRevokeDisabledReasonForWallet({
        mapping: mapped,
        walletChainId: 1,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe("Switch to HyperEVM to revoke.");
    expect(
      canEnableHyperEVMNftRowRevoke({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: SPENDER,
      }),
    ).toBe(false);
    expect(
      canEnableHyperEVMNftRowRevoke({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: undefined,
      }),
    ).toBe(false);
  });

  it("keeps HyperEVM NFT row revoke disabled when live verification is incomplete", () => {
    const mapped = mapHyperEVMApprovalApiResponse(
      response({
        status: "verification-incomplete",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${HYPEREVM_CLIENT_CHAIN_ID}-approvalForAll-${COLLECTION}-${OPERATOR}`,
              chainId: HYPEREVM_CLIENT_CHAIN_ID,
              kind: "approvalForAll",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "HyperEVM Collection",
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
      canEnableHyperEVMNftRowRevoke({
        mapping: mapped,
        walletChainId: HYPEREVM_CLIENT_CHAIN_ID,
        ownerAddress: OWNER,
        connectedAddress: OWNER,
      }),
    ).toBe(false);
  });

  it("treats HyperEVM token approvals without token IDs as malformed", () => {
    const mapped = mapHyperEVMApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [],
          nft: [
            {
              key: `${HYPEREVM_CLIENT_CHAIN_ID}-tokenApproval-${COLLECTION}-${OPERATOR}-missing`,
              chainId: HYPEREVM_CLIENT_CHAIN_ID,
              kind: "tokenApproval",
              standard: "erc721",
              collectionAddress: COLLECTION,
              collectionName: "HyperEVM Collection",
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
    const mapped = mapHyperEVMApprovalApiResponse(
      response({ status: "complete-clear" }),
    );

    expect(mapped.state).toBe("complete-clear");
    expect(mapped.canShowClear).toBe(true);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.erc20RowRevokeEnabled).toBe(false);
    expect(mapped.nftRowRevokeEnabled).toBe(false);
  });

  it("never maps failed HyperEVM live reads to clear", () => {
    const mapped = mapHyperEVMApprovalApiResponse(
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
    const missing = mapHyperEVMApprovalApiResponse(
      response({ ok: false, status: "config-missing" }),
    );
    const upstream = mapHyperEVMApprovalApiResponse(
      response({ ok: false, status: "upstream-failure" }),
    );
    const truncated = mapHyperEVMApprovalApiResponse(
      response({
        status: "complete-clear",
        diagnostics: {
          ...response({}).diagnostics,
          discoveryTruncated: true,
          incompleteVerificationCount: 1,
        },
      }),
    );
    const malformed = mapHyperEVMApprovalApiResponse(
      response({
        status: "active-approvals-found",
        approvals: {
          erc20: [
            {
              key: `${HYPEREVM_CLIENT_CHAIN_ID}-${TOKEN}-${SPENDER}`,
              chainId: HYPEREVM_CLIENT_CHAIN_ID,
              tokenAddress: TOKEN,
              tokenSymbol: "HYPE",
              tokenName: "HyperEVM Token",
              tokenDecimals: 18,
              tokenCategory: "unknown",
              spenderAddress: SPENDER,
              spenderLabel: "Unknown spender",
              protocol: "Unknown",
              spenderCategory: "unknown",
              trusted: false,
              rawAllowance: "not-a-number",
              formattedAllowance: "1 HYPE",
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
