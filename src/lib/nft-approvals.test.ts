import { describe, expect, it } from "vitest";

import {
  ZERO_ADDRESS,
  buildErc721TokenRevoke,
  buildSetApprovalForAllRevoke,
  parseNftValidationResults,
} from "./nft-approvals";
import { BSC_CHAIN_ID } from "./chains";
import type { NftDiscoveredApproval } from "./discovery";

const COLLECTION = "0x4444444444444444444444444444444444444444" as const;
const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as const;
const OPERATOR = "0x5555555555555555555555555555555555555555" as const;
const LIBERTYSWAP_BSC_USDC =
  "0x43f403972080406e3e6602793A5072DBc4389bAb" as const;

type NftReadResult = Parameters<typeof parseNftValidationResults>[0][number];

function success(result: unknown): NftReadResult {
  return { status: "success", result };
}

describe("NFT revoke builders", () => {
  it("builds an ERC-721/ERC-1155 operator revoke with setApprovalForAll(operator, false)", () => {
    expect(
      buildSetApprovalForAllRevoke({
        collectionAddress: COLLECTION,
        operatorAddress: OPERATOR,
      }),
    ).toMatchObject({
      address: COLLECTION,
      functionName: "setApprovalForAll",
      args: [OPERATOR, false],
    });
  });

  it("builds an ERC-721 token revoke with approve(address(0), tokenId)", () => {
    expect(
      buildErc721TokenRevoke({
        collectionAddress: COLLECTION,
        tokenId: 7n,
      }),
    ).toMatchObject({
      address: COLLECTION,
      functionName: "approve",
      args: [ZERO_ADDRESS, 7n],
    });
  });

  it("enriches NFT operators with LibertySwap protocol metadata", () => {
    const candidate: NftDiscoveredApproval = {
      chainId: BSC_CHAIN_ID,
      kind: "approvalForAll",
      collectionAddress: COLLECTION,
      ownerAddress: OWNER,
      operatorAddress: LIBERTYSWAP_BSC_USDC,
    };

    const parsed = parseNftValidationResults(
      [success(true), success(false), success("Collection"), success(true)],
      OWNER,
      BSC_CHAIN_ID,
      [candidate],
    );

    expect(parsed.stats.registryMatched).toBe(1);
    expect(parsed.approvals[0]).toMatchObject({
      operatorAddress: LIBERTYSWAP_BSC_USDC,
      operatorLabel: "LibertySwap USDC",
      protocol: "LibertySwap",
      trusted: true,
      operatorProtocolMetadata: {
        protocolName: "LibertySwap",
        contractStatus: "current",
        sourceLabel: "Official LibertySwap docs",
        assetLabel: "USDC",
      },
    });
  });
});
