import { afterEach, describe, expect, it, vi } from "vitest";
import { getAddress, type Address } from "viem";

import {
  ERC20_APPROVAL_TOPIC0,
  ERC_APPROVAL_FOR_ALL_TOPIC0,
  type DiscoverySource,
} from "@/lib/discovery";
import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BSC_CHAIN_ID,
  CELO_CHAIN_ID,
  GNOSIS_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  ROBINHOOD_CHAIN_ID,
  SONIC_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
  isSupportedChainId,
  supportedChainConfigList,
} from "@/lib/chains";
import {
  ETHEREUM_EXPLORER_API_DEFAULT,
  ETHEREUM_MAINNET_CHAIN_ID,
  createEthereumDiscoverySource,
  normalizeEthereumOwner,
  scanEthereumApprovals,
} from "@/lib/ethereum-approval-api";
import { PERMIT2_ADDRESS } from "@/lib/permit2";

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
    MAINNET_RPC_URL: "https://ethereum-rpc.example",
    ETHERSCAN_API_KEY: "test-etherscan-key",
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
  permit2Allowance?: boolean;
  nftApproval?: boolean;
}): DiscoverySource {
  const source = {
    id: "ethereum-test",
    name: "Ethereum Test",
    url: "https://etherscan.io",
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
  };

  return {
    meta: source,
    async discover() {
      const pairs = options?.allowancePair
        ? [
            {
              chainId: ETHEREUM_MAINNET_CHAIN_ID,
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
        truncated: false,
        windows: 1,
        requests: 1,
        erc20Parse: emptyErc20Parse(pairs.length),
      };
    },
    async discoverNftApprovals() {
      const approvals = options?.nftApproval
        ? [
            {
              chainId: ETHEREUM_MAINNET_CHAIN_ID,
              kind: "approvalForAll" as const,
              collectionAddress: COLLECTION,
              ownerAddress: getAddress(OWNER),
              operatorAddress: SPENDER,
              blockNumber: 456n,
              transactionHash: "0x2" as const,
              logIndex: "0x2",
            },
          ]
        : [];
      return {
        source,
        approvals,
        rawCount: approvals.length,
        truncated: false,
        windows: 1,
        requests: 1,
      };
    },
    async discoverPermit2Allowances() {
      const allowances = options?.permit2Allowance
        ? [
            {
              chainId: ETHEREUM_MAINNET_CHAIN_ID,
              approvalType: "permit2" as const,
              permit2Address: PERMIT2_ADDRESS,
              ownerAddress: getAddress(OWNER),
              tokenAddress: TOKEN,
              spenderAddress: SPENDER,
              sourceEvent: "Approval" as const,
              blockNumber: 789n,
              transactionHash: "0x3" as const,
              logIndex: "0x3",
            },
          ]
        : [];
      return {
        source,
        allowances,
        rawCount: allowances.length,
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
    id: "ethereum-bulk-test",
    name: "Ethereum Bulk Test",
    url: "https://etherscan.io",
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
  };

  const pairs = Array.from({ length: count }, (_, index) => ({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
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

describe("Ethereum approval API foundation", () => {
  it("keeps Ethereum inactive in the client-supported chain list", () => {
    expect(isSupportedChainId(ETHEREUM_MAINNET_CHAIN_ID)).toBe(false);
    expect(supportedChainConfigList.map((chain) => chain.chainId)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
      POLYGON_CHAIN_ID,
      SONIC_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
      LINEA_CHAIN_ID,
      BLAST_CHAIN_ID,
      BERACHAIN_CHAIN_ID,
      CELO_CHAIN_ID,
      GNOSIS_CHAIN_ID,
      UNICHAIN_CHAIN_ID,
      WORLDCHAIN_CHAIN_ID,
      ROBINHOOD_CHAIN_ID,
    ]);
  });

  it("reports missing Ethereum RPC config without returning a false clear", async () => {
    const result = await scanEthereumApprovals(OWNER, {
      env: env({ MAINNET_RPC_URL: undefined, ETHEREUM_RPC_URL: undefined }),
      discoverySource: fakeSource(),
      reader: { readContract: vi.fn() },
    });

    expect(result.status).toBe("config-missing");
    expect(result.ok).toBe(false);
    expect(result.diagnostics.rpcConfigured).toBe(false);
    expect(result.missingConfig.join(" ")).toContain("MAINNET_RPC_URL");
  });

  it("reports missing Ethereum explorer API key config", async () => {
    const result = await scanEthereumApprovals(OWNER, {
      env: env({ ETHERSCAN_API_KEY: undefined }),
      discoverySource: fakeSource(),
      reader: { readContract: vi.fn() },
    });

    expect(result.status).toBe("config-missing");
    expect(result.ok).toBe(false);
    expect(result.diagnostics.explorerConfigured).toBe(false);
    expect(result.missingConfig.join(" ")).toContain("ETHERSCAN_API_KEY");
  });

  it("decodes Ethereum ERC-20 Approval logs through Etherscan V2 chainid=1", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        expect(url.origin + url.pathname).toBe(ETHEREUM_EXPLORER_API_DEFAULT);
        expect(url.searchParams.get("chainid")).toBe("1");
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

    const source = createEthereumDiscoverySource({
      apiUrl: ETHEREUM_EXPLORER_API_DEFAULT,
      apiKey: "test-key",
    });
    const result = await source.discover(OWNER);

    expect(result.pairs).toEqual([
      expect.objectContaining({
        chainId: ETHEREUM_MAINNET_CHAIN_ID,
        tokenAddress: TOKEN,
        ownerAddress: getAddress(OWNER),
        spenderAddress: SPENDER,
        rawApprovalValue: 123n,
      }),
    ]);
  });

  it("decodes Ethereum NFT ApprovalForAll and ERC-721 token Approval logs", async () => {
    let requestIndex = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        expect(url.searchParams.get("chainid")).toBe("1");
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

    const source = createEthereumDiscoverySource({
      apiUrl: ETHEREUM_EXPLORER_API_DEFAULT,
      apiKey: "test-key",
    });
    const result = await source.discoverNftApprovals(OWNER);

    expect(requestIndex).toBe(2);
    expect(result.approvals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chainId: ETHEREUM_MAINNET_CHAIN_ID,
          kind: "approvalForAll",
          collectionAddress: COLLECTION,
          operatorAddress: SPENDER,
        }),
        expect.objectContaining({
          chainId: ETHEREUM_MAINNET_CHAIN_ID,
          kind: "tokenApproval",
          collectionAddress: COLLECTION,
          operatorAddress: SPENDER,
          tokenId: TOKEN_ID,
        }),
      ]),
    );
  });

  it("returns active Ethereum approvals only after live allowance validation", async () => {
    const reader = {
      readContract: vi.fn(async (call: { functionName?: string }) => {
        if (call.functionName === "symbol") return "TOK";
        if (call.functionName === "decimals") return 18;
        if (call.functionName === "name") return "Token";
        if (call.functionName === "allowance") return 5n;
        throw new Error(`Unexpected call ${call.functionName}`);
      }),
    };

    const result = await scanEthereumApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({ allowancePair: true }),
      reader,
    });

    expect(result.status).toBe("active-approvals-found");
    expect(result.approvals.erc20).toHaveLength(1);
    expect(result.approvals.erc20[0]).toMatchObject({
      chainId: ETHEREUM_MAINNET_CHAIN_ID,
      tokenSymbol: "TOK",
      rawAllowance: "5",
      approvalBlockNumber: "123",
      approvalTxHash: "0x1",
      spenderLabel: "Unknown spender",
    });
    expect(result.diagnostics.liveReadFailureCount).toBe(0);
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("returns active Ethereum Permit2 approvals only after nested live validation", async () => {
    const expiration = Math.floor(Date.now() / 1000) + 3600;
    const reader = {
      readContract: vi.fn(
        async (call: { address?: Address; functionName?: string }) => {
          if (call.functionName === "symbol") return "TOK";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "Token";
          if (
            call.functionName === "allowance" &&
            call.address === PERMIT2_ADDRESS
          ) {
            return [7n, BigInt(expiration), 3n];
          }
          throw new Error(`Unexpected call ${call.functionName}`);
        },
      ),
    };

    const result = await scanEthereumApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({ permit2Allowance: true }),
      reader,
    });

    expect(result.status).toBe("active-approvals-found");
    expect(result.approvals.erc20).toHaveLength(1);
    expect(result.approvals.erc20[0]).toMatchObject({
      approvalKind: "permit2",
      approvalContractAddress: PERMIT2_ADDRESS,
      chainId: ETHEREUM_MAINNET_CHAIN_ID,
      tokenSymbol: "TOK",
      rawAllowance: "7",
      approvalBlockNumber: "789",
      approvalTxHash: "0x3",
      permit2Expiration: expiration,
      permit2Nonce: 3,
    });
    expect(result.diagnostics.decodedPermit2ApprovalCount).toBe(1);
    expect(result.diagnostics.liveReadSuccessCount).toBe(1);
    expect(result.diagnostics.liveReadFailureCount).toBe(0);
  });

  it("treats live read failures as incomplete verification, not clear", async () => {
    const result = await scanEthereumApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({ allowancePair: true }),
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "symbol") return "TOK";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "Token";
          throw new Error("rpc unavailable");
        }),
      },
    });

    expect(result.status).toBe("verification-incomplete");
    expect(result.ok).toBe(false);
    expect(result.approvals.erc20).toEqual([]);
    expect(result.diagnostics.liveReadFailureCount).toBe(1);
    expect(result.diagnostics.incompleteVerificationCount).toBe(1);
    expect(result.diagnostics.skippedReasons).toMatchObject({
      "erc20-live-read-failure": 1,
    });
    expect(result.warnings.join(" ")).toContain(
      "Ethereum ERC-20 allowance live reads failed for 1 approval candidate.",
    );
    expect(result.warnings.join(" ")).toContain("Do not treat this wallet as clear");
  });

  it("keeps verified ERC-20 rows while unrelated NFT live reads fail", async () => {
    const result = await scanEthereumApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({ allowancePair: true, nftApproval: true }),
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "symbol") return "TOK";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "Token";
          if (call.functionName === "allowance") return 5n;
          if (call.functionName === "supportsInterface") return false;
          if (call.functionName === "isApprovedForAll") {
            throw new Error("nft rpc unavailable");
          }
          throw new Error(`Unexpected call ${call.functionName}`);
        }),
      },
    });

    expect(result.status).toBe("verification-incomplete");
    expect(result.ok).toBe(false);
    expect(result.approvals.erc20).toHaveLength(1);
    expect(result.approvals.nft).toEqual([]);
    expect(result.diagnostics.liveReadSuccessCount).toBe(1);
    expect(result.diagnostics.liveReadFailureCount).toBe(1);
    expect(result.diagnostics.skippedReasons).toMatchObject({
      "nft-live-read-failure": 1,
    });
    expect(result.warnings.join(" ")).toContain(
      "Ethereum NFT approval live reads failed for 1 approval candidate.",
    );
  });

  it("returns timeout as an incomplete non-clear state", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5);

    const result = await scanEthereumApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({ allowancePair: true }),
      signal: controller.signal,
      reader: {
        readContract: vi.fn(() => new Promise(() => undefined)),
      },
    });

    expect(result.status).toBe("verification-incomplete");
    expect(result.ok).toBe(false);
    expect(result.diagnostics.requestTimedOut).toBe(true);
    expect(result.diagnostics.incompleteVerificationCount).toBeGreaterThan(0);
    expect(result.status).not.toBe("complete-clear");
  });

  it("returns candidate cap hits as verification-incomplete, not complete-clear", async () => {
    const result = await scanEthereumApprovals(OWNER, {
      env: env(),
      discoverySource: fakeBulkErc20Source(3),
      liveReadCandidateCap: 1,
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "symbol") return "TOK";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "Token";
          if (call.functionName === "allowance") return 0n;
          throw new Error(`Unexpected call ${call.functionName}`);
        }),
      },
    });

    expect(result.status).toBe("verification-incomplete");
    expect(result.ok).toBe(false);
    expect(result.approvals.erc20).toEqual([]);
    expect(result.diagnostics.candidateCapHit).toBe(true);
    expect(result.diagnostics.liveReadCandidatesTotal).toBe(3);
    expect(result.diagnostics.liveReadCandidatesProcessed).toBe(1);
    expect(result.diagnostics.skippedReasons).toMatchObject({
      "candidate-cap-hit": 2,
    });
  });

  it("preserves verified rows when the live-read cap marks the scan incomplete", async () => {
    const result = await scanEthereumApprovals(OWNER, {
      env: env(),
      discoverySource: fakeBulkErc20Source(3),
      liveReadCandidateCap: 1,
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "symbol") return "TOK";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "Token";
          if (call.functionName === "allowance") return 5n;
          throw new Error(`Unexpected call ${call.functionName}`);
        }),
      },
    });

    expect(result.status).toBe("verification-incomplete");
    expect(result.ok).toBe(false);
    expect(result.approvals.erc20).toHaveLength(1);
    expect(result.diagnostics.candidateCapHit).toBe(true);
    expect(result.diagnostics.liveReadSuccessCount).toBe(1);
  });

  it("limits Ethereum RPC live-read concurrency", async () => {
    let activeReads = 0;
    let maxActiveReads = 0;

    const result = await scanEthereumApprovals(OWNER, {
      env: env(),
      discoverySource: fakeBulkErc20Source(5),
      rpcReadConcurrency: 2,
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          activeReads += 1;
          maxActiveReads = Math.max(maxActiveReads, activeReads);
          await new Promise((resolve) => setTimeout(resolve, 1));
          activeReads -= 1;

          if (call.functionName === "symbol") return "TOK";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "Token";
          if (call.functionName === "allowance") return 5n;
          throw new Error(`Unexpected call ${call.functionName}`);
        }),
      },
    });

    expect(result.status).toBe("active-approvals-found");
    expect(maxActiveReads).toBeLessThanOrEqual(2);
    expect(result.diagnostics.rpcReadConcurrency).toBe(2);
  });

  it("reports upstream explorer failures separately from clear states", async () => {
    const meta = {
      id: "broken-etherscan",
      name: "Broken Etherscan",
      url: "https://etherscan.io",
      chainId: ETHEREUM_MAINNET_CHAIN_ID,
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

    const result = await scanEthereumApprovals(OWNER, {
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

  it("returns complete-clear only after complete live verification finds no active approvals", async () => {
    const result = await scanEthereumApprovals(OWNER, {
      env: env(),
      discoverySource: fakeSource({ allowancePair: true }),
      reader: {
        readContract: vi.fn(async (call: { functionName?: string }) => {
          if (call.functionName === "symbol") return "TOK";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "name") return "Token";
          if (call.functionName === "allowance") return 0n;
          throw new Error(`Unexpected call ${call.functionName}`);
        }),
      },
    });

    expect(result.status).toBe("complete-clear");
    expect(result.ok).toBe(true);
    expect(result.approvals.erc20).toEqual([]);
    expect(result.diagnostics.liveReadSuccessCount).toBe(1);
    expect(result.diagnostics.liveReadFailureCount).toBe(0);
  });

  it("requires server-only Ethereum RPC and API key names", async () => {
    const result = await scanEthereumApprovals(OWNER, {
      env: env({
        MAINNET_RPC_URL: undefined,
        ETHEREUM_RPC_URL: undefined,
        NEXT_PUBLIC_MAINNET_RPC_URL: "https://public-mainnet-rpc.example",
        NEXT_PUBLIC_ETHEREUM_EXPLORER_API_URL:
          "https://public-mainnet-explorer.example",
        ETHERSCAN_API_KEY: undefined,
        NEXT_PUBLIC_ETHERSCAN_API_KEY: "public-key",
      }),
      discoverySource: fakeSource(),
      reader: { readContract: vi.fn() },
    });

    expect(result.status).toBe("config-missing");
    expect(result.diagnostics.rpcConfigured).toBe(false);
    expect(result.diagnostics.explorerConfigured).toBe(false);
    expect(result.missingConfig.join(" ")).toContain("MAINNET_RPC_URL");
    expect(result.missingConfig.join(" ")).toContain("ETHERSCAN_API_KEY");
  });

  it("normalizes valid Ethereum owner input and rejects invalid input", () => {
    expect(normalizeEthereumOwner(OWNER)).toBe(getAddress(OWNER));
    expect(normalizeEthereumOwner("not-an-address")).toBeNull();
    expect(normalizeEthereumOwner(null)).toBeNull();
  });
});
