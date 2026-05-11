import { afterEach, describe, expect, it, vi } from "vitest";

import type { ArbitrumApprovalApiResponse } from "@/lib/arbitrum-approval-client";
import {
  ARBITRUM_ONE_CLIENT_CHAIN_ID,
  ARBITRUM_ONE_EXPLORER_BASE_URL,
  ARBITRUM_ONE_NATIVE_SYMBOL,
  ARBITRUM_ONE_STATUS_LABEL,
  ARBITRUM_REVOKE_UNAVAILABLE_COPY,
  arbitrumExplorerAddressUrl,
  arbitrumExplorerTokenUrl,
  arbitrumExplorerTxUrl,
  arbitrumOneWalletChain,
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
    expect(ARBITRUM_ONE_STATUS_LABEL).toBe("Arbitrum One read-only beta");
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

  it("builds Arbiscan links without enabling Arbitrum revoke", () => {
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
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(
        `/api/arbitrum/approvals?owner=${encodeURIComponent(OWNER)}`,
      );
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

  it("maps active Arbitrum approvals as read-only rows with revoke unavailable", () => {
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
    expect(mapped.activeApprovalCount).toBe(2);
    expect(mapped.approvals.erc20[0]?.rawAllowance).toBe(1000000000000000000n);
    expect(mapped.approvals.nft[0]?.tokenId).toBe(7n);
  });

  it("shows clear only for complete-clear with no incomplete diagnostics", () => {
    const mapped = mapArbitrumApprovalApiResponse(
      response({ status: "complete-clear" }),
    );

    expect(mapped.state).toBe("complete-clear");
    expect(mapped.canShowClear).toBe(true);
    expect(mapped.revokeEnabled).toBe(false);
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
  });
});
