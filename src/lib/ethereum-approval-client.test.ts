import { describe, expect, it } from "vitest";

import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  ETHEREUM_READ_ONLY_MODE_LABEL,
  ethereumTokenDisplayDescription,
  isEthereumReadOnlyChainId,
  mapEthereumApprovalApiResponse,
  type EthereumApprovalApiResponse,
} from "./ethereum-approval-client";
import { supportedChainConfigList } from "./chains";

const TOKEN = "0x2222222222222222222222222222222222222222";
const SPENDER = "0x3333333333333333333333333333333333333333";
const COLLECTION = "0x4444444444444444444444444444444444444444";
const OPERATOR = "0x5555555555555555555555555555555555555555";

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
    },
    errors: [],
    warnings: [],
    missingConfig: [],
    ...overrides,
  };
}

describe("Ethereum approval client mapping", () => {
  it("identifies Ethereum Mainnet as gated read-only mode", () => {
    expect(ETHEREUM_READ_ONLY_MODE_LABEL).toBe("Ethereum read-only mode");
    expect(isEthereumReadOnlyChainId(1)).toBe(true);
    expect(isEthereumReadOnlyChainId(369)).toBe(false);
  });

  it("keeps Ethereum Mainnet out of the active supported chain list", () => {
    expect(supportedChainConfigList.map((chain) => chain.chainId)).not.toContain(
      ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
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
  });

  it("maps active ERC-20 and NFT approvals without enabling revoke", () => {
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
              tokenId: "7",
              risk: {
                level: "medium",
                reason: "Unknown operator approved for a single NFT.",
              },
            },
          ],
        },
      }),
    );

    expect(mapped.state).toBe("active");
    expect(mapped.canShowClear).toBe(false);
    expect(mapped.revokeEnabled).toBe(false);
    expect(mapped.activeApprovalCount).toBe(2);
    expect(mapped.approvals.erc20[0]?.rawAllowance).toBe(1000000000000000000n);
    expect(mapped.approvals.nft[0]?.tokenId).toBe(7n);
  });

  it("shows clear only for complete-clear with no incomplete diagnostics", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({ status: "complete-clear" }),
    );

    expect(mapped.state).toBe("complete-clear");
    expect(mapped.canShowClear).toBe(true);
  });

  it("never maps failed live-read diagnostics to clear", () => {
    const mapped = mapEthereumApprovalApiResponse(
      response({
        status: "complete-clear",
        diagnostics: {
          ...response({}).diagnostics,
          liveReadFailureCount: 1,
          incompleteVerificationCount: 1,
        },
      }),
    );

    expect(mapped.state).toBe("verification-incomplete");
    expect(mapped.canShowClear).toBe(false);
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
    expect(upstream.state).toBe("upstream-failure");
    expect(upstream.canShowClear).toBe(false);
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
  });
});
