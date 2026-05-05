import { describe, expect, it } from "vitest";

import {
  ZERO_ADDRESS,
  buildErc721TokenRevoke,
  buildSetApprovalForAllRevoke,
} from "./nft-approvals";

const COLLECTION = "0x4444444444444444444444444444444444444444" as const;
const OPERATOR = "0x5555555555555555555555555555555555555555" as const;

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
});
