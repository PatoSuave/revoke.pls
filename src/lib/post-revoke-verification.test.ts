import { describe, expect, it } from "vitest";

import type { NftApproval } from "@/lib/nft-approvals";
import { ZERO_ADDRESS } from "@/lib/nft-approvals";
import type { RevokeTarget } from "@/lib/revoke";

import {
  type PostRevokeReadClient,
  verifyErc20PostRevokeCleared,
  verifyNftPostRevokeCleared,
} from "./post-revoke-verification";

const OWNER = "0x1111111111111111111111111111111111111111";
const SPENDER = "0x2222222222222222222222222222222222222222";
const TOKEN = "0x3333333333333333333333333333333333333333";
const OPERATOR = "0x4444444444444444444444444444444444444444";
const COLLECTION = "0x5555555555555555555555555555555555555555";
const OTHER_APPROVED = "0x6666666666666666666666666666666666666666";

describe("post-revoke live verification", () => {
  it("confirms ERC-20 revoke only when allowance(owner, spender) is zero", async () => {
    const reads: unknown[] = [];
    const client = mockReadClient(async (parameters) => {
      reads.push(parameters);
      return 0n;
    });

    const result = await verifyErc20PostRevokeCleared({
      client,
      ownerAddress: OWNER,
      target: erc20Target(),
    });

    expect(result.state).toBe("confirmed-cleared");
    expect(reads[0]).toMatchObject({
      address: TOKEN,
      functionName: "allowance",
      args: [OWNER, SPENDER],
    });
  });

  it("does not confirm ERC-20 cleared when allowance remains nonzero", async () => {
    const result = await verifyErc20PostRevokeCleared({
      client: mockReadClient(async () => 1n),
      ownerAddress: OWNER,
      target: erc20Target(),
    });

    expect(result.state).toBe("mismatch");
  });

  it("keeps ERC-20 verification incomplete when the live read fails", async () => {
    const result = await verifyErc20PostRevokeCleared({
      client: mockReadClient(async () => {
        throw new Error("RPC unavailable");
      }),
      ownerAddress: OWNER,
      target: erc20Target(),
    });

    expect(result.state).toBe("failed");
  });

  it("uses allowance(owner, spender) for Arbitrum ERC-20 post-revoke checks", async () => {
    const reads: unknown[] = [];
    const result = await verifyErc20PostRevokeCleared({
      client: mockReadClient(async (parameters) => {
        reads.push(parameters);
        return 0n;
      }),
      ownerAddress: OWNER,
      target: {
        ...erc20Target(),
        chainId: 42161,
      },
    });

    expect(result.state).toBe("confirmed-cleared");
    expect(reads[0]).toMatchObject({
      address: TOKEN,
      functionName: "allowance",
      args: [OWNER, SPENDER],
    });
  });

  it("confirms NFT operator revoke only when isApprovedForAll returns false", async () => {
    const reads: unknown[] = [];
    const result = await verifyNftPostRevokeCleared({
      client: mockReadClient(async (parameters) => {
        reads.push(parameters);
        return false;
      }),
      ownerAddress: OWNER,
      target: nftOperatorTarget(),
    });

    expect(result.state).toBe("confirmed-cleared");
    expect(reads[0]).toMatchObject({
      address: COLLECTION,
      functionName: "isApprovedForAll",
      args: [OWNER, OPERATOR],
    });
  });

  it("does not confirm NFT operator cleared when isApprovedForAll remains true", async () => {
    const result = await verifyNftPostRevokeCleared({
      client: mockReadClient(async () => true),
      ownerAddress: OWNER,
      target: nftOperatorTarget(),
    });

    expect(result.state).toBe("mismatch");
  });

  it("keeps NFT operator verification incomplete when the live read fails", async () => {
    const result = await verifyNftPostRevokeCleared({
      client: mockReadClient(async () => {
        throw new Error("RPC unavailable");
      }),
      ownerAddress: OWNER,
      target: nftOperatorTarget(),
    });

    expect(result.state).toBe("failed");
  });

  it("confirms ERC-721 per-token revoke only when getApproved returns address zero", async () => {
    const reads: unknown[] = [];
    const result = await verifyNftPostRevokeCleared({
      client: mockReadClient(async (parameters) => {
        reads.push(parameters);
        return ZERO_ADDRESS;
      }),
      ownerAddress: OWNER,
      target: nftTokenTarget(),
    });

    expect(result.state).toBe("confirmed-cleared");
    expect(reads[0]).toMatchObject({
      address: COLLECTION,
      functionName: "getApproved",
      args: [123n],
    });
  });

  it("does not confirm ERC-721 per-token cleared when another address is approved", async () => {
    const result = await verifyNftPostRevokeCleared({
      client: mockReadClient(async () => OTHER_APPROVED),
      ownerAddress: OWNER,
      target: nftTokenTarget(),
    });

    expect(result.state).toBe("mismatch");
  });
});

function mockReadClient(
  readContract: (parameters: unknown) => Promise<unknown>,
): PostRevokeReadClient {
  return { readContract } as unknown as PostRevokeReadClient;
}

function erc20Target(): RevokeTarget {
  return {
    chainId: 369,
    tokenAddress: TOKEN,
    spenderAddress: SPENDER,
  };
}

function nftOperatorTarget(): NftApproval {
  return {
    ...baseNftApproval(),
    kind: "approvalForAll",
  };
}

function nftTokenTarget(): NftApproval {
  return {
    ...baseNftApproval(),
    kind: "tokenApproval",
    tokenId: 123n,
  };
}

function baseNftApproval(): NftApproval {
  return {
    key: "nft",
    chainId: 369,
    kind: "approvalForAll",
    standard: "erc721",
    collectionAddress: COLLECTION,
    collectionName: "Example Collection",
    operatorAddress: OPERATOR,
    operatorLabel: "Example operator",
    protocol: "Unknown",
    trusted: false,
    risk: {
      level: "medium",
      reason: "Example risk reason.",
    },
  };
}
