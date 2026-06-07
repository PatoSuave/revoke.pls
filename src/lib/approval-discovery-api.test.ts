import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import {
  hydrateDiscoveryResult,
  hydrateNftDiscoveryResult,
  hydratePermit2DiscoveryResult,
  serializeDiscoveryResult,
  serializeNftDiscoveryResult,
  serializePermit2DiscoveryResult,
  usesServerApprovalDiscovery,
} from "@/lib/approval-discovery-api";
import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
} from "@/lib/chains";
import type {
  DiscoveredPair,
  DiscoveryResult,
  NftDiscoveredApproval,
  NftDiscoveryResult,
  Permit2DiscoveryResult,
} from "@/lib/discovery";
import { PERMIT2_ADDRESS, type Permit2DiscoveredAllowance } from "@/lib/permit2";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as Address;
const TOKEN = "0x1111111111111111111111111111111111111111" as Address;
const SPENDER = "0x2222222222222222222222222222222222222222" as Address;
const COLLECTION = "0x3333333333333333333333333333333333333333" as Address;
const SOURCE = {
  id: "test-source",
  name: "Test Source",
  url: "https://example.com",
  chainId: BSC_CHAIN_ID,
};

describe("approval discovery API serialization", () => {
  it("uses server discovery for hosted BSC, Base, and Polygon scans", () => {
    expect(usesServerApprovalDiscovery(BSC_CHAIN_ID)).toBe(true);
    expect(usesServerApprovalDiscovery(BASE_CHAIN_ID)).toBe(true);
    expect(usesServerApprovalDiscovery(POLYGON_CHAIN_ID)).toBe(true);
    expect(usesServerApprovalDiscovery(PULSECHAIN_CHAIN_ID)).toBe(false);
    expect(usesServerApprovalDiscovery(undefined)).toBe(false);
  });

  it("round-trips ERC-20 discovery bigint fields through JSON-safe strings", () => {
    const pair: DiscoveredPair = {
      chainId: BSC_CHAIN_ID,
      approvalType: "fungible",
      tokenAddress: TOKEN,
      ownerAddress: OWNER,
      spenderAddress: SPENDER,
      rawApprovalValue: 123n,
      blockNumber: 456n,
      transactionHash: "0xabc",
      logIndex: "0x1",
    };
    const result: DiscoveryResult = {
      pairs: [pair],
      source: SOURCE,
      erc20Parse: {
        rawLogs: 1,
        decodeAttempts: 1,
        erc20TopicShape: 1,
        erc721TokenApprovalShape: 0,
        unsupportedTopicShape: 0,
        missingTopics: 0,
        missingTokenAddress: 0,
        invalidTokenAddress: 0,
        missingSpenderTopic: 0,
        invalidSpenderTopic: 0,
        decodedPairs: 1,
        uniquePairs: 1,
        samplePairs: [pair],
      },
      rawCount: 1,
      truncated: false,
      windows: 1,
      requests: 1,
    };

    const serialized = serializeDiscoveryResult(result);
    expect(serialized.pairs[0].rawApprovalValue).toBe("123");
    expect(serialized.pairs[0].blockNumber).toBe("456");

    const hydrated = hydrateDiscoveryResult(serialized);
    expect(hydrated.pairs[0].rawApprovalValue).toBe(123n);
    expect(hydrated.pairs[0].blockNumber).toBe(456n);
    expect(hydrated.pairs[0].transactionHash).toBe("0xabc");
    expect(hydrated.pairs[0].logIndex).toBe("0x1");
    expect(hydrated.erc20Parse.samplePairs[0].rawApprovalValue).toBe(123n);
    expect(hydrated.erc20Parse.samplePairs[0].transactionHash).toBe("0xabc");
  });

  it("round-trips Permit2 and NFT bigint fields through JSON-safe strings", () => {
    const permit2: Permit2DiscoveredAllowance = {
      chainId: BSC_CHAIN_ID,
      approvalType: "permit2",
      permit2Address: PERMIT2_ADDRESS,
      ownerAddress: OWNER,
      tokenAddress: TOKEN,
      spenderAddress: SPENDER,
      sourceEvent: "Permit",
      rawAmount: 789n,
      expiration: 111n,
      nonce: 222n,
      blockNumber: 333n,
      transactionHash: "0xdef",
      logIndex: "0x2",
    };
    const permit2Result: Permit2DiscoveryResult = {
      allowances: [permit2],
      source: SOURCE,
      rawCount: 1,
      truncated: false,
      windows: 1,
      requests: 1,
    };
    const nft: NftDiscoveredApproval = {
      chainId: BSC_CHAIN_ID,
      kind: "tokenApproval",
      collectionAddress: COLLECTION,
      ownerAddress: OWNER,
      operatorAddress: SPENDER,
      tokenId: 42n,
      blockNumber: 43n,
      transactionHash: "0x456",
      logIndex: "0x3",
    };
    const nftResult: NftDiscoveryResult = {
      approvals: [nft],
      source: SOURCE,
      rawCount: 1,
      truncated: false,
      windows: 1,
      requests: 1,
    };

    const serializedPermit2 = serializePermit2DiscoveryResult(permit2Result);
    const serializedNft = serializeNftDiscoveryResult(nftResult);

    expect(serializedPermit2.allowances[0].rawAmount).toBe("789");
    expect(serializedPermit2.allowances[0].expiration).toBe("111");
    expect(serializedPermit2.allowances[0].nonce).toBe("222");
    expect(serializedNft.approvals[0].tokenId).toBe("42");

    expect(
      hydratePermit2DiscoveryResult(serializedPermit2).allowances[0].rawAmount,
    ).toBe(789n);
    const hydratedPermit2 =
      hydratePermit2DiscoveryResult(serializedPermit2).allowances[0];
    const hydratedNft =
      hydrateNftDiscoveryResult(serializedNft).approvals[0];
    expect(hydratedPermit2.blockNumber).toBe(333n);
    expect(hydratedPermit2.transactionHash).toBe("0xdef");
    expect(hydratedPermit2.logIndex).toBe("0x2");
    expect(hydratedNft.tokenId).toBe(42n);
    expect(hydratedNft.blockNumber).toBe(43n);
    expect(hydratedNft.transactionHash).toBe("0x456");
    expect(hydratedNft.logIndex).toBe("0x3");
  });
});
