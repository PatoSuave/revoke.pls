import { afterEach, describe, expect, it, vi } from "vitest";
import { getAddress, type Address } from "viem";

import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  isSupportedChainId,
  supportedChainConfigList,
} from "@/lib/chains";
import {
  ERC20_APPROVAL_TOPIC0,
  ERC_APPROVAL_FOR_ALL_TOPIC0,
  type DiscoverySource,
} from "@/lib/discovery";
import {
  HYPEREVM_EXPLORER_API_DEFAULT,
  HYPEREVM_CHAIN_ID,
  createHyperEVMDiscoverySource,
  normalizeHyperEVMOwner,
  scanHyperEVMApprovals,
} from "@/lib/hyperevm-approval-api";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as Address;
const TOKEN = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as Address;
const SPENDER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9" as Address;
const COLLECTION = "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab" as Address;
const TOKEN_ID = 42n;

function pad(address: Address): string {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function padUint(value: bigint): string {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function env(overrides?: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    HYPEREVM_RPC_URL: "https://hyperevm-rpc.example",
    HYPEREVM_EXPLORER_API_KEY: "test-hyperevm-key",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

function emptyErc20Parse(rawLogs = 0) {
  return {
    rawLogs,
    decodeAttempts: rawLogs,
    erc20TopicShape: rawLogs,
    erc721TokenApprovalShape: 0,
    unsupportedTopicShape: 0,
    missingTopics: 0,
    missingTokenAddress: 0,
    invalidTokenAddress: 0,
    missingSpenderTopic: 0,
    invalidSpenderTopic: 0,
    decodedPairs: rawLogs,
    uniquePairs: rawLogs,
    samplePairs: [],
  };
}

function fakeSource(options?: {
  allowancePair?: boolean;
  nftApprovalForAll?: boolean;
  nftTokenApproval?: boolean;
  truncated?: boolean;
}): DiscoverySource {
  const source = {
    id: "HyperEVM-test",
    name: "HyperEVM Test",
    url: "https://hyperevmscan.io",
    chainId: HYPEREVM_CHAIN_ID,
  };

  return {
    meta: source,
    async discover() {
      const pairs = options?.allowancePair
        ? [
            {
              chainId: HYPEREVM_CHAIN_ID,
              approvalType: "fungible" as const,
              tokenAddress: TOKEN,
              ownerAddress: getAddress(OWNER),
              spenderAddress: SPENDER,
              rawApprovalValue: 100n,
              blockNumber: 123n,
              transactionHash: "0x1" as const,
              logIndex: "0x1",
            },
          ]
        : [];
      return {
        source,
        pairs,
        rawCount: pairs.length,
        truncated: Boolean(options?.truncated),
        windows: 1,
        requests: 1,
        erc20Parse: emptyErc20Parse(pairs.length),
      };
    },
    async discoverNftApprovals() {
      const approvals = [
        ...(options?.nftApprovalForAll
          ? [
              {
                chainId: HYPEREVM_CHAIN_ID,
                kind: "approvalForAll" as const,
                collectionAddress: COLLECTION,
                ownerAddress: getAddress(OWNER),
                operatorAddress: SPENDER,
                blockNumber: 456n,
                transactionHash: "0x2" as const,
                logIndex: "0x2",
              },
            ]
          : []),
        ...(options?.nftTokenApproval
          ? [
              {
                chainId: HYPEREVM_CHAIN_ID,
                kind: "tokenApproval" as const,
                collectionAddress: COLLECTION,
                ownerAddress: getAddress(OWNER),
                operatorAddress: SPENDER,
                tokenId: TOKEN_ID,
                blockNumber: 789n,
                transactionHash: "0x3" as const,
                logIndex: "0x3",
              },
            ]
          : []),
      ];
      return {
        source,
        approvals,
        rawCount: approvals.length,
        truncated: false,
        windows: 1,
        requests: 1,
      };
    },
  };
}

function numberedAddress(value: number): Address {
  return getAddress(`0x${value.toString(16).padStart(40, "0")}`);
}

function fakeBulkErc20Source(count: number): DiscoverySource {
  const source = {
    id: "HyperEVM-bulk-test",
    name: "HyperEVM Bulk Test",
    url: "https://hyperevmscan.io",
    chainId: HYPEREVM_CHAIN_ID,
  };
  const pairs = Array.from({ length: count }, (_, index) => ({
    chainId: HYPEREVM_CHAIN_ID,
    approvalType: "fungible" as const,
    tokenAddress: TOKEN,
    ownerAddress: getAddress(OWNER),
    spenderAddress: numberedAddress(1000 + index),
    rawApprovalValue: 100n,
  }));

  return {
    meta: source,
    async discover() {
      return {
        source,
        pairs,
        rawCount: pairs.length,
        truncated: false,
        windows: 1,
        requests: 1,
        erc20Parse: emptyErc20Parse(pairs.length),
      };
    },
    async discoverNftApprovals() {
      return {
        source,
        approvals: [],
        rawCount: 0,
        truncated: false,
        windows: 1,
        requests: 1,
      };
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HyperEVM approval API foundation", () => {
  it("keeps HyperEVM out of the generic client-supported chain list", () => {
    expect(isSupportedChainId(HYPEREVM_CHAIN_ID)).toBe(false);
    expect(supportedChainConfigList.map((chain) => chain.chainId)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
      POLYGON_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
    ]);
  });

  it("falls back to the public HyperEVM RPC without returning a config error", async () => {
    const result = await scanHyperEVMApprovals(OWNER, {
      env: env({
        HYPEREVM_RPC_URL: undefined,
        HYPEREVM_MAINNET_RPC_URL: undefined,
        HYPERLIQUID_EVM_RPC_URL: undefined,
      }),
      discoverySource: fakeSource(),
      reader: { readContract: vi.fn() },
    });

    expect(result.status).toBe("complete-clear");
    expect(result.ok).toBe(true);
    expect(result.diagnostics.rpcConfigured).toBe(true);
    expect(result.missingConfig.join(" ")).not.toContain("HYPEREVM_RPC_URL");
  });

  it("requires server-only HyperEVM API key names while using the public RPC fallback", async () => {
    const publicHyperEVMRpcEnv = ["NEXT_PUBLIC", "HyperEVM", "RPC_URL"].join(
      "_",
    );
    const result = await scanHyperEVMApprovals(OWNER, {
      env: env({
        HYPEREVM_RPC_URL: undefined,
        HYPEREVM_MAINNET_RPC_URL: undefined,
        HYPERLIQUID_EVM_RPC_URL: undefined,
        HYPEREVM_EXPLORER_API_KEY: undefined,
        HYPEREVM_ETHERSCAN_API_KEY: undefined,
        ETHERSCAN_API_KEY: undefined,
        BSC_EXPLORER_API_KEY: undefined,
        [publicHyperEVMRpcEnv]: "https://public-HyperEVM-rpc.example",
        NEXT_PUBLIC_HYPEREVM_EXPLORER_API_KEY: "public-key",
      }),
      discoverySource: fakeSource(),
      reader: { readContract: vi.fn() },
    });

    expect(result.status).toBe("config-missing");
    expect(result.diagnostics.rpcConfigured).toBe(true);
    expect(result.diagnostics.explorerConfigured).toBe(false);
    expect(result.missingConfig.join(" ")).not.toContain("HYPEREVM_RPC_URL");
    expect(result.missingConfig.join(" ")).toContain("HYPEREVM_EXPLORER_API_KEY");
  });

  it("accepts the server-only BSC explorer key as a HyperEVM Etherscan V2 fallback", async () => {
    const result = await scanHyperEVMApprovals(OWNER, {
      env: env({
        HYPEREVM_EXPLORER_API_KEY: undefined,
        HYPEREVM_ETHERSCAN_API_KEY: undefined,
        ETHERSCAN_API_KEY: undefined,
        BSC_EXPLORER_API_KEY: "shared-bsc-server-key",
      }),
      discoverySource: fakeSource(),
      reader: { readContract: vi.fn() },
    });

    expect(result.diagnostics.explorerConfigured).toBe(true);
    expect(result.missingConfig.join(" ")).not.toContain(
      "HYPEREVM_EXPLORER_API_KEY",
    );
  });

  it("decodes HyperEVM ERC-20 Approval logs through chainid=999", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        expect(url.origin + url.pathname).toBe(HYPEREVM_EXPLORER_API_DEFAULT);
        expect(url.searchParams.get("chainid")).toBe("999");
        expect(url.searchParams.get("module")).toBe("logs");
        expect(url.searchParams.get("action")).toBe("getLogs");
        expect(url.searchParams.get("topic0")).toBe(ERC20_APPROVAL_TOPIC0);
        expect(url.searchParams.get("topic1")).toBe(pad(OWNER));
        return jsonResponse({
          status: "1",
          message: "OK",
          result: [
            {
              address: TOKEN,
              data: "0x7b",
              blockNumber: "0x1",
              transactionHash: "0x1",
              logIndex: "0x0",
              topics: [ERC20_APPROVAL_TOPIC0, pad(OWNER), pad(SPENDER)],
            },
          ],
        });
      }),
    );

    const source = createHyperEVMDiscoverySource({
      apiUrl: HYPEREVM_EXPLORER_API_DEFAULT,
      apiKey: "test-key",
      apiChainId: "999",
    });
    const result = await source.discover(OWNER);

    expect(result.pairs).toEqual([
      expect.objectContaining({
        chainId: HYPEREVM_CHAIN_ID,
        tokenAddress: TOKEN,
        ownerAddress: getAddress(OWNER),
        spenderAddress: SPENDER,
        rawApprovalValue: 123n,
      }),
    ]);
  });

  it("decodes HyperEVM NFT ApprovalForAll and ERC-721 token Approval logs", async () => {
    let requestIndex = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        expect(url.searchParams.get("chainid")).toBe("999");
        requestIndex += 1;
        if (url.searchParams.get("topic0") === ERC_APPROVAL_FOR_ALL_TOPIC0) {
          return jsonResponse({
            status: "1",
            message: "OK",
            result: [
              {
                address: COLLECTION,
                data: "0x",
                blockNumber: "0x1",
                transactionHash: "0x1",
                logIndex: "0x0",
                topics: [ERC_APPROVAL_FOR_ALL_TOPIC0, pad(OWNER), pad(SPENDER)],
              },
            ],
          });
        }
        return jsonResponse({
          status: "1",
          message: "OK",
          result: [
            {
              address: COLLECTION,
              data: "0x",
              blockNumber: "0x2",
              transactionHash: "0x2",
              logIndex: "0x1",
              topics: [
                ERC20_APPROVAL_TOPIC0,
                pad(OWNER),
                pad(SPENDER),
                padUint(TOKEN_ID),
              ],
            },
          ],
        });
      }),
    );

    const source = createHyperEVMDiscoverySource({
      apiUrl: HYPEREVM_EXPLORER_API_DEFAULT,
      apiKey: "test-key",
      apiChainId: "999",
    });
    const result = await source.discoverNftApprovals(OWNER);

    expect(requestIndex).toBe(2);
    expect(result.approvals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chainId: HYPEREVM_CHAIN_ID,
          kind: "approvalForAll",
          collectionAddress: COLLECTION,
          operatorAddress: SPENDER,
        }),
        expect.objectContaining({
          chainId: HYPEREVM_CHAIN_ID,
          kind: "tokenApproval",
          collectionAddress: COLLECTION,
          operatorAddress: SPENDER,
          tokenId: TOKEN_ID,
        }),
      ]),
    );
  });

  it("returns active HyperEVM ERC-20 approvals only after live allowance validation", async () => {
    const result = await scanHyperEVMApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({ allowancePair: true }),
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "symbol") return "HYPE";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "HyperEVM Token";
          if (call.functionName === "allowance") return 5n;
          throw new Error(`Unexpected call ${call.functionName}`);
        }),
      },
    });

    expect(result.status).toBe("active-approvals-found");
    expect(result.approvals.erc20).toHaveLength(1);
    expect(result.approvals.erc20[0]).toMatchObject({
      chainId: HYPEREVM_CHAIN_ID,
      tokenSymbol: "HYPE",
      rawAllowance: "5",
      approvalBlockNumber: "123",
      approvalTxHash: "0x1",
      spenderLabel: "Unknown spender",
    });
    expect(result.diagnostics.liveReadFailureCount).toBe(0);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("returns active HyperEVM NFT approvals only after live NFT validation", async () => {
    const result = await scanHyperEVMApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({
        nftApprovalForAll: true,
        nftTokenApproval: true,
      }),
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "supportsInterface") return false;
          if (call.functionName === "name") return "HyperEVM Collection";
          if (call.functionName === "isApprovedForAll") return true;
          if (call.functionName === "getApproved") return SPENDER;
          throw new Error(`Unexpected call ${call.functionName}`);
        }),
      },
    });

    expect(result.status).toBe("active-approvals-found");
    expect(result.approvals.nft).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chainId: HYPEREVM_CHAIN_ID,
          kind: "approvalForAll",
          operatorAddress: SPENDER,
        }),
        expect.objectContaining({
          chainId: HYPEREVM_CHAIN_ID,
          kind: "tokenApproval",
          operatorAddress: SPENDER,
          tokenId: TOKEN_ID.toString(),
        }),
      ]),
    );
    expect(result.diagnostics.liveReadSuccessCount).toBe(2);
  });

  it("treats failed live reads as verification-incomplete, not clear", async () => {
    const result = await scanHyperEVMApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({ allowancePair: true }),
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "symbol") return "HYPE";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "HyperEVM Token";
          throw new Error("rpc unavailable");
        }),
      },
    });

    expect(result.status).toBe("verification-incomplete");
    expect(result.ok).toBe(false);
    expect(result.approvals.erc20).toEqual([]);
    expect(result.status).not.toBe("complete-clear");
    expect(result.diagnostics.skippedReasons).toMatchObject({
      "erc20-live-read-failure": 1,
    });
    expect(result.warnings.join(" ")).toContain(
      "Do not treat this wallet as clear",
    );
  });

  it("returns truncation and candidate caps as incomplete, not clear", async () => {
    const truncated = await scanHyperEVMApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({ allowancePair: true, truncated: true }),
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "symbol") return "HYPE";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "HyperEVM Token";
          if (call.functionName === "allowance") return 0n;
          throw new Error(`Unexpected call ${call.functionName}`);
        }),
      },
    });
    const capped = await scanHyperEVMApprovals(OWNER, {
      env: env(),
      discoverySource: fakeBulkErc20Source(3),
      liveReadCandidateCap: 1,
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "symbol") return "HYPE";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "HyperEVM Token";
          if (call.functionName === "allowance") return 0n;
          throw new Error(`Unexpected call ${call.functionName}`);
        }),
      },
    });

    expect(truncated.status).toBe("verification-incomplete");
    expect(truncated.diagnostics.discoveryTruncated).toBe(true);
    expect(capped.status).toBe("verification-incomplete");
    expect(capped.diagnostics.candidateCapHit).toBe(true);
    expect(capped.status).not.toBe("complete-clear");
  });

  it("redacts upstream Hyperevmscan failures before public response", async () => {
    const meta = {
      id: "broken-Hyperevmscan",
      name: "Broken Hyperevmscan",
      url: "https://hyperevmscan.io",
      chainId: HYPEREVM_CHAIN_ID,
    };
    const brokenSource: DiscoverySource = {
      meta,
      async discover() {
        throw new Error(
          "rate limit https://api.etherscan.io/v2/api?apikey=secret-key&module=logs",
        );
      },
      async discoverNftApprovals() {
        return {
          source: meta,
          approvals: [],
          rawCount: 0,
          truncated: false,
          windows: 0,
          requests: 0,
        };
      },
    };

    const result = await scanHyperEVMApprovals(OWNER, {
      env: env(),
      discoverySource: brokenSource,
      reader: { readContract: vi.fn() },
    });

    expect(result.status).toBe("upstream-failure");
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("rate limit");
    expect(result.errors.join(" ")).not.toContain("secret-key");
    expect(result.errors.join(" ")).toContain("?[redacted]");
  });

  it("normalizes valid HyperEVM owner input and rejects invalid input", () => {
    expect(normalizeHyperEVMOwner(OWNER)).toBe(getAddress(OWNER));
    expect(normalizeHyperEVMOwner("not-an-address")).toBeNull();
    expect(normalizeHyperEVMOwner(null)).toBeNull();
  });
});
