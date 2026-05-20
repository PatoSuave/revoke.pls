import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import {
  buildHybridTokenAddressSet,
  buildPermit2AllowanceContracts,
  collectDiscoveryReadFailures,
  collectPermit2ReadFailures,
  parseDiscoveryResults,
  parsePermit2AllowanceResults,
  type ReadResult,
} from "./approvals";
import { BSC_CHAIN_ID } from "./chains";
import { FUNGIBLE_APPROVAL_SHAPE_COPY } from "./diagnostic-copy";
import type { DiscoveredPair, NftDiscoveredApproval } from "./discovery";
import { PERMIT2_ADDRESS, type Permit2DiscoveredAllowance } from "./permit2";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as Address;
const TOKEN = "0x1111111111111111111111111111111111111111" as Address;
const SPENDER = "0x2222222222222222222222222222222222222222" as Address;
const OTHER_SPENDER =
  "0x3333333333333333333333333333333333333333" as Address;
const LIBERTYSWAP_BSC_USDT =
  "0xc438D51F296fF3e53d061293D2bC4Bb9fb2f7f19" as Address;
const CHAIN_ID = 56;

function pair(
  tokenAddress: Address,
  spenderAddress: Address,
  chainId = CHAIN_ID,
): DiscoveredPair {
  return {
    chainId,
    approvalType: "fungible",
    tokenAddress,
    ownerAddress: OWNER,
    spenderAddress,
  };
}

function permit2Candidate(
  tokenAddress: Address,
  spenderAddress: Address,
  chainId = CHAIN_ID,
): Permit2DiscoveredAllowance {
  return {
    chainId,
    approvalType: "permit2",
    permit2Address: PERMIT2_ADDRESS,
    tokenAddress,
    ownerAddress: OWNER,
    spenderAddress,
    sourceEvent: "Permit",
  };
}

function nftApproval(collectionAddress: Address): NftDiscoveredApproval {
  return {
    chainId: CHAIN_ID,
    kind: "approvalForAll",
    collectionAddress,
    ownerAddress: OWNER,
    operatorAddress: SPENDER,
  };
}

function success(result: unknown): ReadResult {
  return { status: "success", result };
}

function failure(name: string): ReadResult {
  const error = new Error("read failed");
  error.name = name;
  return { status: "failure", error };
}

describe("ERC-20 discovery live-read diagnostics", () => {
  it("groups read failures by metadata and allowance read type", () => {
    const pairs: DiscoveredPair[] = [
      pair(TOKEN, SPENDER),
      pair(TOKEN, OTHER_SPENDER),
    ];
    const results: ReadResult[] = [
      failure("SymbolReadError"),
      failure("DecimalsReadError"),
      failure("NameReadError"),
      failure("AllowanceReadError"),
      success(0n),
    ];

    const diagnostics = collectDiscoveryReadFailures(results, pairs);

    expect(diagnostics.symbol).toBe(1);
    expect(diagnostics.decimals).toBe(1);
    expect(diagnostics.name).toBe(1);
    expect(diagnostics.allowance).toBe(1);
    expect(diagnostics.metadataFailed).toBe(3);
    expect(diagnostics.allowanceSucceeded).toBe(1);
    expect(diagnostics.allowanceFailed).toBe(1);
    expect(diagnostics.allowanceTotal).toBe(2);
    expect(diagnostics.samples.map((sample) => sample.kind)).toEqual([
      "symbol",
      "decimals",
      "name",
      "allowance",
    ]);
    expect(diagnostics.samples[3]).toMatchObject({
      kind: "allowance",
      tokenAddress: TOKEN,
      spenderAddress: SPENDER,
      error: "AllowanceReadError",
    });
  });

  it("keeps a successful allowance when token metadata reads fail", () => {
    const pairs: DiscoveredPair[] = [
      pair(TOKEN, SPENDER),
    ];
    const results: ReadResult[] = [
      failure("SymbolReadError"),
      failure("DecimalsReadError"),
      failure("NameReadError"),
      success(123n),
    ];

    const parsed = parseDiscoveryResults(results, OWNER, CHAIN_ID, pairs);

    expect(parsed.stats.active).toBe(1);
    expect(parsed.approvals).toHaveLength(1);
    expect(parsed.approvals[0]).toMatchObject({
      tokenAddress: TOKEN,
      spenderAddress: SPENDER,
      tokenDecimals: null,
      spenderLabel: "Unknown spender",
      formattedAllowance: "Raw allowance: 123 units",
    });
  });

  it("enriches discovered approvals with LibertySwap protocol metadata", () => {
    const pairs: DiscoveredPair[] = [
      pair(TOKEN, LIBERTYSWAP_BSC_USDT, BSC_CHAIN_ID),
    ];
    const parsed = parseDiscoveryResults(
      [success("TOK"), success(18), success("Token"), success(1n)],
      OWNER,
      BSC_CHAIN_ID,
      pairs,
    );

    expect(parsed.stats.registryMatched).toBe(1);
    expect(parsed.approvals[0]).toMatchObject({
      spenderAddress: LIBERTYSWAP_BSC_USDT,
      spenderLabel: "LibertySwap USDT",
      protocol: "LibertySwap",
      trusted: true,
      spenderProtocolMetadata: {
        protocolName: "LibertySwap",
        contractStatus: "current",
        sourceLabel: "Official LibertySwap docs",
        assetLabel: "USDT",
      },
    });
  });

  it("marks discovered fungible approvals as hybrid when NFT approvals share the contract", () => {
    const pairs: DiscoveredPair[] = [pair(TOKEN, SPENDER)];
    const hybridTokenAddresses = buildHybridTokenAddressSet({
      erc20Pairs: pairs,
      nftApprovals: [nftApproval(TOKEN)],
    });

    const parsed = parseDiscoveryResults(
      [success("TOK"), success(18), success("Token"), success(1n)],
      OWNER,
      CHAIN_ID,
      pairs,
      { hybridTokenAddresses },
    );

    expect(parsed.approvals[0]).toMatchObject({
      tokenAddress: TOKEN,
      tokenCategory: "hybrid",
    });
  });

  it("does not treat failed allowance reads as confirmed zero allowances", () => {
    const pairs: DiscoveredPair[] = [
      pair(TOKEN, SPENDER),
    ];
    const results: ReadResult[] = [
      success("TOK"),
      success(18),
      success("Token"),
      failure("AllowanceReadError"),
    ];

    const diagnostics = collectDiscoveryReadFailures(results, pairs);
    const parsed = parseDiscoveryResults(results, OWNER, CHAIN_ID, pairs);

    expect(diagnostics.allowance).toBe(1);
    expect(diagnostics.allowanceFailed).toBe(1);
    expect(diagnostics.allowanceSucceeded).toBe(0);
    expect(parsed.stats.active).toBe(0);
    expect(parsed.approvals).toHaveLength(0);
  });

  it("uses neutral fungible approval-shape diagnostics copy", () => {
    expect(FUNGIBLE_APPROVAL_SHAPE_COPY).toContain("Fungible token approvals");
    expect(FUNGIBLE_APPROVAL_SHAPE_COPY).not.toContain("PulseChain");
    expect(FUNGIBLE_APPROVAL_SHAPE_COPY).not.toContain("Ethereum");
  });
});

describe("Permit2 nested allowance parsing", () => {
  it("builds Permit2 allowance reads against owner, token, and spender", () => {
    const candidates = [permit2Candidate(TOKEN, SPENDER)];

    const built = buildPermit2AllowanceContracts(OWNER, candidates, CHAIN_ID);

    expect(built.uniqueTokens).toEqual([TOKEN]);
    expect(built.contracts.at(-1)).toMatchObject({
      address: PERMIT2_ADDRESS,
      functionName: "allowance",
      args: [OWNER, TOKEN, SPENDER],
      chainId: CHAIN_ID,
    });
  });

  it("keeps active non-expired Permit2 allowances as Permit2 rows", () => {
    const candidates = [permit2Candidate(TOKEN, SPENDER)];
    const hybridTokenAddresses = buildHybridTokenAddressSet({
      permit2Allowances: candidates,
      nftApprovals: [nftApproval(TOKEN)],
    });
    const parsed = parsePermit2AllowanceResults(
      [
        success("TOK"),
        success(18),
        success("Token"),
        success([123n, 2_000n, 7n]),
      ],
      OWNER,
      CHAIN_ID,
      candidates,
      { nowUnix: 1_000, hybridTokenAddresses },
    );

    expect(parsed.stats.active).toBe(1);
    expect(parsed.approvals[0]).toMatchObject({
      approvalKind: "permit2",
      approvalContractAddress: PERMIT2_ADDRESS,
      tokenAddress: TOKEN,
      tokenCategory: "hybrid",
      spenderAddress: SPENDER,
      formattedAllowance: "~0 TOK",
      permit2Expiration: 2000,
      permit2Nonce: 7,
    });
  });

  it("drops expired Permit2 allowances even when the amount is nonzero", () => {
    const candidates = [permit2Candidate(TOKEN, SPENDER)];
    const parsed = parsePermit2AllowanceResults(
      [
        success("TOK"),
        success(18),
        success("Token"),
        success([123n, 999n, 7n]),
      ],
      OWNER,
      CHAIN_ID,
      candidates,
      { nowUnix: 1_000 },
    );

    expect(parsed.stats.active).toBe(0);
    expect(parsed.approvals).toHaveLength(0);
  });

  it("counts malformed Permit2 allowance reads as live-read failures", () => {
    const candidates = [permit2Candidate(TOKEN, SPENDER)];
    const diagnostics = collectPermit2ReadFailures(
      [success("TOK"), success(18), success("Token"), success("bad")],
      candidates,
    );

    expect(diagnostics.allowanceFailed).toBe(1);
    expect(diagnostics.samples[0]).toMatchObject({
      kind: "allowance",
      tokenAddress: TOKEN,
      spenderAddress: SPENDER,
      error: "Unexpected Permit2 allowance read result",
    });
  });
});
