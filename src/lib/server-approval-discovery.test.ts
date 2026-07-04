import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BERACHAIN_CHAIN_ID,
  BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT,
  BLAST_CHAIN_ID,
  BLAST_EXPLORER_CHAIN_ID_DEFAULT,
  BSC_CHAIN_ID,
  CELO_CHAIN_ID,
  CELO_EXPLORER_CHAIN_ID_DEFAULT,
  GNOSIS_CHAIN_ID,
  GNOSIS_EXPLORER_CHAIN_ID_DEFAULT,
  LINEA_CHAIN_ID,
  LINEA_EXPLORER_CHAIN_ID_DEFAULT,
  PULSECHAIN_CHAIN_ID,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER_API_DEFAULT,
  UNICHAIN_CHAIN_ID,
  UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT,
  WORLDCHAIN_CHAIN_ID,
  WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT,
} from "@/lib/chains";
import type { DiscoverySourceConfig } from "@/lib/chains";

const createBlockscoutDiscoverySource = vi.hoisted(() => vi.fn());
const createRpcLogDiscoverySource = vi.hoisted(() => vi.fn());
const createOtterscanTransactionDiscoverySource = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/discovery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/discovery")>();
  return {
    ...actual,
    createBlockscoutDiscoverySource,
    createOtterscanTransactionDiscoverySource,
    createRpcLogDiscoverySource,
  };
});

import {
  discoverServerErc20Approvals,
  discoverServerNftApprovals,
} from "@/lib/server-approval-discovery";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";
const TOKEN = "0x0000000000000000000000000000000000000001";
const COLLECTION = "0x0000000000000000000000000000000000000002";
const SPENDER = "0x0000000000000000000000000000000000000003";
const SHARED_TEST_KEY = "shared-etherscan-test-key";
let erc20Truncated = false;
let permit2Truncated = false;
let nftTruncated = false;
let primaryErc20PairCount = 0;
let primaryNftApprovalCount = 0;
let otsErc20PairCount = 0;
let otsNftApprovalCount = 0;
let rpcErc20PairCount = 0;
let rpcNftApprovalCount = 0;
let primaryThrows = false;
let rpcThrows = false;
let dwellirRpcThrows = false;
let dwellirRpcHangs = false;
let otsThrows = false;
let publicRpcThrows = false;
let otherScanRpcThrows = false;
let otsErc20Truncated = false;
let otsPermit2Truncated = false;
let otsNftTruncated = false;
let rpcErc20Truncated = false;
let rpcPermit2Truncated = false;
let rpcNftTruncated = false;

function lastSourceConfig(): DiscoverySourceConfig {
  const call = createBlockscoutDiscoverySource.mock.calls.at(-1);
  if (!call) throw new Error("createBlockscoutDiscoverySource was not called");
  return call[0].source as DiscoverySourceConfig;
}

function rpcSourceConfigById(id: string) {
  const call = createRpcLogDiscoverySource.mock.calls.find(
    ([config]) => config.source.id === id,
  );
  if (!call) throw new Error(`${id} RPC source was not created`);
  return call[0].source as {
    id: string;
    rpcUrl?: string;
    rpcUrlEnvVar?: string;
  };
}

function rpcSourceLimitsById(id: string) {
  const call = createRpcLogDiscoverySource.mock.calls.find(
    ([config]) => config.source.id === id,
  );
  if (!call) throw new Error(`${id} RPC source was not created`);
  return call[0].limits as {
    maxRequests?: number;
    requestTimeoutMs?: number;
    maxInitialBlockSpan?: number;
    retryAttempts?: number;
  };
}

function otsSourceConfigById(id: string) {
  const call = createOtterscanTransactionDiscoverySource.mock.calls.find(
    ([config]) => config.source.id === id,
  );
  if (!call) throw new Error(`${id} OTS source was not created`);
  return call[0].source as {
    id: string;
    rpcUrl?: string;
    rpcUrlEnvVar?: string;
  };
}

function otsSourceLimitsById(id: string) {
  const call = createOtterscanTransactionDiscoverySource.mock.calls.find(
    ([config]) => config.source.id === id,
  );
  if (!call) throw new Error(`${id} OTS source was not created`);
  return call[0].limits as {
    maxRequests?: number;
    requestTimeoutMs?: number;
    pageCap?: number;
    retryAttempts?: number;
  };
}

function rpcSourceIds() {
  return createRpcLogDiscoverySource.mock.calls.map(
    ([config]) => config.source.id,
  );
}

function otsSourceIds() {
  return createOtterscanTransactionDiscoverySource.mock.calls.map(
    ([config]) => config.source.id,
  );
}

beforeEach(() => {
  erc20Truncated = false;
  permit2Truncated = false;
  nftTruncated = false;
  primaryErc20PairCount = 0;
  primaryNftApprovalCount = 0;
  otsErc20PairCount = 0;
  otsNftApprovalCount = 0;
  rpcErc20PairCount = 0;
  rpcNftApprovalCount = 0;
  primaryThrows = false;
  rpcThrows = false;
  dwellirRpcThrows = false;
  dwellirRpcHangs = false;
  otsThrows = false;
  publicRpcThrows = false;
  otherScanRpcThrows = false;
  otsErc20Truncated = false;
  otsPermit2Truncated = false;
  otsNftTruncated = false;
  rpcErc20Truncated = false;
  rpcPermit2Truncated = false;
  rpcNftTruncated = false;
  createBlockscoutDiscoverySource.mockReset();
  createRpcLogDiscoverySource.mockReset();
  createOtterscanTransactionDiscoverySource.mockReset();
  createBlockscoutDiscoverySource.mockImplementation(
    ({ chainId, source }: { chainId: number; source: DiscoverySourceConfig }) => ({
      meta: { id: source.id, name: source.name, url: source.url, chainId },
      discover: vi.fn(async () => {
        if (primaryThrows) throw new Error("PulseScan unavailable");
        return approvalDiscoveryResult({
          chainId,
          source,
          truncated: erc20Truncated,
          pairCount: primaryErc20PairCount,
        });
      }),
      discoverNftApprovals: vi.fn(async () => {
        if (primaryThrows) throw new Error("PulseScan NFT unavailable");
        return nftDiscoveryResult({
          chainId,
          source,
          truncated: nftTruncated,
          approvalCount: primaryNftApprovalCount,
        });
      }),
      discoverPermit2Allowances: vi.fn(async () => {
        if (primaryThrows) throw new Error("PulseScan unavailable");
        return permit2DiscoveryResult({
          chainId,
          source,
          truncated: permit2Truncated,
        });
      }),
    }),
  );
  createRpcLogDiscoverySource.mockImplementation(
    ({
      chainId,
      source,
    }: {
      chainId: number;
      source: { id: string; name: string; url?: string };
    }) => ({
      meta: { id: source.id, name: source.name, url: source.url, chainId },
      discover: vi.fn(async (_owner: unknown, options?: { signal?: AbortSignal }) => {
        if (shouldRpcSourceHang(source.id)) {
          return waitForAbort(options?.signal);
        }
        if (shouldRpcSourceThrow(source.id)) {
          throw new Error(rpcSourceErrorMessage(source.id));
        }
        return approvalDiscoveryResult({
          chainId,
          source,
          truncated: rpcErc20Truncated,
          pairCount: rpcErc20PairCount,
        });
      }),
      discoverNftApprovals: vi.fn(
        async (_owner: unknown, options?: { signal?: AbortSignal }) => {
          if (shouldRpcSourceHang(source.id)) {
            return waitForAbort(options?.signal);
          }
          if (shouldRpcSourceThrow(source.id)) {
            throw new Error(rpcSourceErrorMessage(source.id));
          }
          return nftDiscoveryResult({
            chainId,
            source,
            truncated: rpcNftTruncated,
            approvalCount: rpcNftApprovalCount,
          });
        },
      ),
      discoverPermit2Allowances: vi.fn(
        async (_owner: unknown, options?: { signal?: AbortSignal }) => {
          if (shouldRpcSourceHang(source.id)) {
            return waitForAbort(options?.signal);
          }
          if (shouldRpcSourceThrow(source.id)) {
            throw new Error(rpcSourceErrorMessage(source.id));
          }
          return permit2DiscoveryResult({
            chainId,
            source,
            truncated: rpcPermit2Truncated,
          });
        },
      ),
    }),
  );
  createOtterscanTransactionDiscoverySource.mockImplementation(
    ({
      chainId,
      source,
    }: {
      chainId: number;
      source: { id: string; name: string; url?: string };
    }) => ({
      meta: { id: source.id, name: source.name, url: source.url, chainId },
      discover: vi.fn(async () => {
        if (otsThrows) {
          throw new Error("OtherScan OTS failed at https://rpc.pulsechain.box");
        }
        return approvalDiscoveryResult({
          chainId,
          source,
          truncated: otsErc20Truncated,
          pairCount: otsErc20PairCount,
        });
      }),
      discoverNftApprovals: vi.fn(async () => {
        if (otsThrows) {
          throw new Error("OtherScan OTS failed at https://rpc.pulsechain.box");
        }
        return nftDiscoveryResult({
          chainId,
          source,
          truncated: otsNftTruncated,
          approvalCount: otsNftApprovalCount,
        });
      }),
      discoverPermit2Allowances: vi.fn(async () => {
        if (otsThrows) {
          throw new Error("OtherScan OTS failed at https://rpc.pulsechain.box");
        }
        return permit2DiscoveryResult({
          chainId,
          source,
          truncated: otsPermit2Truncated,
        });
      }),
    }),
  );
});

function shouldRpcSourceThrow(sourceId: string) {
  return (
    rpcThrows ||
    (sourceId === "server-dwellir-pulsechain-rpc" && dwellirRpcThrows) ||
    (sourceId === "server-public-pulsechain-rpc" && publicRpcThrows) ||
    (sourceId === "server-otherscan-pulsechain-rpc" && otherScanRpcThrows)
  );
}

function shouldRpcSourceHang(sourceId: string) {
  return sourceId === "server-dwellir-pulsechain-rpc" && dwellirRpcHangs;
}

function rpcSourceErrorMessage(sourceId: string) {
  if (sourceId === "server-dwellir-pulsechain-rpc") {
    return "Dwellir failed at https://api-pulse-mainnet.n.dwellir.com/super-secret-key";
  }
  if (sourceId === "server-public-pulsechain-rpc") {
    return "Public PulseChain RPC failed at https://rpc.pulsechain.com";
  }
  return "OtherScan failed at https://rpc.pulsechain.box";
}

function waitForAbort(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_, reject) => {
    if (!signal) return;
    if (signal.aborted) {
      reject(new Error("aborted"));
      return;
    }
    signal.addEventListener("abort", () => reject(new Error("aborted")), {
      once: true,
    });
  });
}

function approvalDiscoveryResult({
  chainId,
  source,
  truncated,
  pairCount = 0,
}: {
  chainId: number;
  source: { id: string; name: string; url?: string };
  truncated: boolean;
  pairCount?: number;
}) {
  const pairs = Array.from({ length: pairCount }, (_, index) => ({
    chainId,
    approvalType: "fungible" as const,
    tokenAddress: TOKEN,
    ownerAddress: OWNER,
    spenderAddress: SPENDER,
    rawApprovalValue: BigInt(index + 1),
    blockNumber: BigInt(index + 100),
    transactionHash: `0x${String(index + 1).padStart(64, "0")}` as const,
    logIndex: `0x${index.toString(16)}`,
  }));
  return {
    pairs,
    source: { id: source.id, name: source.name, url: source.url, chainId },
    erc20Parse: {
      rawLogs: pairCount,
      decodeAttempts: pairCount,
      erc20TopicShape: pairCount,
      erc721TokenApprovalShape: 0,
      unsupportedTopicShape: 0,
      missingTopics: 0,
      missingTokenAddress: 0,
      invalidTokenAddress: 0,
      missingSpenderTopic: 0,
      invalidSpenderTopic: 0,
      decodedPairs: pairCount,
      uniquePairs: pairCount,
      samplePairs: pairs,
    },
    rawCount: pairCount,
    truncated,
    windows: 0,
    requests: 0,
  };
}

function nftDiscoveryResult({
  chainId,
  source,
  truncated,
  approvalCount = 0,
}: {
  chainId: number;
  source: { id: string; name: string; url?: string };
  truncated: boolean;
  approvalCount?: number;
}) {
  const approvals = Array.from({ length: approvalCount }, (_, index) => ({
    chainId,
    kind: "approvalForAll" as const,
    collectionAddress: COLLECTION,
    ownerAddress: OWNER,
    operatorAddress: SPENDER,
    blockNumber: BigInt(index + 100),
    transactionHash: `0x${String(index + 1).padStart(64, "0")}` as const,
    logIndex: `0x${index.toString(16)}`,
  }));
  return {
    approvals,
    source: { id: source.id, name: source.name, url: source.url, chainId },
    rawCount: approvalCount,
    truncated,
    windows: 0,
    requests: 0,
  };
}

function permit2DiscoveryResult({
  chainId,
  source,
  truncated,
}: {
  chainId: number;
  source: { id: string; name: string; url?: string };
  truncated: boolean;
}) {
  return {
    allowances: [],
    source: { id: source.id, name: source.name, url: source.url, chainId },
    rawCount: 0,
    truncated,
    windows: 0,
    requests: 0,
  };
}

describe("server approval discovery shared Etherscan key", () => {
  it("uses PulseScan primary discovery for PulseChain when it finds approval history", async () => {
    primaryErc20PairCount = 1;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });
    const source = lastSourceConfig();

    expect(response.ok).toBe(true);
    expect(source.apiProviderKind).toBe("blockscout-compatible");
    expect(source.apiUrl).toBe("https://api.scan.pulsechain.com/api");
    expect(source.requiresApiKey).toBe(false);
    expect(source.apiKeyEnvVars).toBeUndefined();
    expect(response.erc20.pairs).toHaveLength(1);
    expect(createRpcLogDiscoverySource).not.toHaveBeenCalled();
  });

  it("confirms empty PulseScan ERC-20 history with PulseChain fallbacks before returning clear", async () => {
    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("complete");
    expect(response.erc20.source.id).toBe("server-otherscan-pulsechain-ots");
    expect(response.permit2.source.id).toBe(
      "server-otherscan-pulsechain-ots",
    );
    expect(otsSourceIds()).toEqual(["server-otherscan-pulsechain-ots"]);
  });

  it("uses fallback ERC-20 approvals when PulseScan returns empty history", async () => {
    otsErc20PairCount = 1;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("complete");
    expect(response.erc20.source.id).toBe("server-otherscan-pulsechain-ots");
    expect(response.erc20.pairs).toHaveLength(1);
    expect(response.erc20.pairs[0].tokenAddress).toBe(TOKEN);
  });

  it("keeps empty PulseScan ERC-20 history verification-incomplete when fallbacks cannot confirm", async () => {
    otsErc20Truncated = true;
    otsPermit2Truncated = true;
    publicRpcThrows = true;
    otherScanRpcThrows = true;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("verification-incomplete");
    expect(response.erc20.source.id).toBe("server-pulsescan-pulsechain");
    expect(response.erc20.truncated).toBe(true);
    expect(response.permit2.truncated).toBe(true);
    expect(response.warnings.join(" ")).toContain(
      "Do not treat this wallet as clear",
    );
  });

  it("confirms empty PulseScan NFT history with PulseChain fallbacks before returning clear", async () => {
    const response = await discoverServerNftApprovals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("complete");
    expect(response.nft.source.id).toBe("server-otherscan-pulsechain-ots");
    expect(otsSourceIds()).toEqual(["server-otherscan-pulsechain-ots"]);
  });

  it("keeps empty PulseScan NFT history verification-incomplete when fallbacks cannot confirm", async () => {
    otsNftTruncated = true;
    publicRpcThrows = true;
    otherScanRpcThrows = true;

    const response = await discoverServerNftApprovals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("verification-incomplete");
    expect(response.nft.source.id).toBe("server-pulsescan-pulsechain");
    expect(response.nft.truncated).toBe(true);
    expect(response.warnings.join(" ")).toContain(
      "Do not treat this wallet as clear",
    );
  });

  it("uses the Dwellir RPC fallback only after PulseScan discovery fails", async () => {
    primaryThrows = true;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: {
        NODE_ENV: "test",
        PULSECHAIN_DISCOVERY_RPC_URL:
          "https://api-pulse-mainnet.n.dwellir.com/test-key",
      },
    });
    const source = rpcSourceConfigById("server-dwellir-pulsechain-rpc");

    expect(response.ok).toBe(true);
    expect(response.erc20.source.id).toBe("server-dwellir-pulsechain-rpc");
    expect(source.rpcUrl).toBe(
      "https://api-pulse-mainnet.n.dwellir.com/test-key",
    );
    expect(source.rpcUrlEnvVar).toContain("PULSECHAIN_DISCOVERY_RPC_URL");
    expect(rpcSourceLimitsById("server-dwellir-pulsechain-rpc")).toMatchObject({
      maxRequests: 20,
      requestTimeoutMs: 5000,
      maxInitialBlockSpan: 2_000_000,
      retryAttempts: 0,
    });
    expect(rpcSourceIds()).toEqual([
      "server-dwellir-pulsechain-rpc",
      "server-public-pulsechain-rpc",
      "server-otherscan-pulsechain-rpc",
    ]);
    expect(otsSourceIds()).toEqual(["server-otherscan-pulsechain-ots"]);
    expect(createBlockscoutDiscoverySource).toHaveBeenCalledTimes(1);
    expect(createRpcLogDiscoverySource).toHaveBeenCalledTimes(3);
    expect(createOtterscanTransactionDiscoverySource).toHaveBeenCalledTimes(1);
  });

  it("uses OtherScan OTS transaction fallback when PulseScan fails and Dwellir is not configured", async () => {
    primaryThrows = true;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });
    const source = otsSourceConfigById("server-otherscan-pulsechain-ots");

    expect(response.ok).toBe(true);
    expect(response.erc20.source.id).toBe("server-otherscan-pulsechain-ots");
    expect(source.rpcUrl).toBe("https://rpc.pulsechain.box");
    expect(source.rpcUrlEnvVar).toContain("PULSECHAIN_OTHERSCAN_RPC_URL");
    expect(otsSourceLimitsById("server-otherscan-pulsechain-ots")).toMatchObject({
      maxRequests: 18,
      requestTimeoutMs: 5_000,
      pageCap: 500,
      retryAttempts: 0,
    });
    expect(otsSourceIds()).toEqual(["server-otherscan-pulsechain-ots"]);
    expect(rpcSourceIds()).toEqual([
      "server-public-pulsechain-rpc",
      "server-otherscan-pulsechain-rpc",
    ]);
  });

  it("uses public PulseChain RPC fallback when PulseScan and OtherScan OTS fail", async () => {
    primaryThrows = true;
    otsThrows = true;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });
    const source = rpcSourceConfigById("server-public-pulsechain-rpc");

    expect(response.ok).toBe(true);
    expect(response.erc20.source.id).toBe("server-public-pulsechain-rpc");
    expect(source.rpcUrl).toBe("https://rpc.pulsechain.com");
    expect(source.rpcUrlEnvVar).toBeUndefined();
    expect(rpcSourceLimitsById("server-public-pulsechain-rpc")).toMatchObject({
      maxRequests: 4,
      requestTimeoutMs: 5_000,
      maxInitialBlockSpan: 10_000,
      retryAttempts: 0,
    });
    expect(otsSourceIds()).toEqual(["server-otherscan-pulsechain-ots"]);
    expect(rpcSourceIds()).toEqual([
      "server-public-pulsechain-rpc",
      "server-otherscan-pulsechain-rpc",
    ]);
  });

  it("uses OtherScan RPC fallback when PulseScan, OTS, and public PulseChain RPC fail", async () => {
    primaryThrows = true;
    otsThrows = true;
    publicRpcThrows = true;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });
    const source = rpcSourceConfigById("server-otherscan-pulsechain-rpc");

    expect(response.ok).toBe(true);
    expect(response.erc20.source.id).toBe("server-otherscan-pulsechain-rpc");
    expect(source.rpcUrl).toBe("https://rpc.pulsechain.box");
    expect(source.rpcUrlEnvVar).toContain("PULSECHAIN_OTHERSCAN_RPC_URL");
    expect(rpcSourceLimitsById("server-otherscan-pulsechain-rpc")).toMatchObject(
      {
        maxRequests: 4,
        requestTimeoutMs: 5_000,
        maxInitialBlockSpan: 10_000,
        retryAttempts: 0,
      },
    );
    expect(otsSourceIds()).toEqual(["server-otherscan-pulsechain-ots"]);
    expect(rpcSourceIds()).toEqual([
      "server-public-pulsechain-rpc",
      "server-otherscan-pulsechain-rpc",
    ]);
  });

  it("uses OtherScan OTS fallback after configured Dwellir fallback fails", async () => {
    primaryThrows = true;
    dwellirRpcThrows = true;

    const response = await discoverServerNftApprovals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: {
        NODE_ENV: "test",
        PULSECHAIN_DISCOVERY_RPC_URL:
          "https://api-pulse-mainnet.n.dwellir.com/test-key",
      },
    });

    expect(response.ok).toBe(true);
    expect(response.nft.source.id).toBe("server-otherscan-pulsechain-ots");
    expect(otsSourceIds()).toEqual(["server-otherscan-pulsechain-ots"]);
    expect(rpcSourceIds()).toEqual([
      "server-dwellir-pulsechain-rpc",
      "server-public-pulsechain-rpc",
      "server-otherscan-pulsechain-rpc",
    ]);
  });

  it("keeps later fallbacks reachable when configured Dwellir RPC hangs", async () => {
    vi.useFakeTimers();
    primaryThrows = true;
    dwellirRpcHangs = true;

    try {
      const pending = discoverServerErc20Approvals({
        chainId: PULSECHAIN_CHAIN_ID,
        owner: OWNER,
        env: {
          NODE_ENV: "test",
          PULSECHAIN_DISCOVERY_RPC_URL:
            "https://api-pulse-mainnet.n.dwellir.com/test-key",
        },
      });

      await vi.advanceTimersByTimeAsync(6_000);
      const response = await pending;

      expect(response.ok).toBe(true);
      expect(response.erc20.source.id).toBe("server-otherscan-pulsechain-ots");
      expect(response.permit2.source.id).toBe(
        "server-otherscan-pulsechain-ots",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps truncated Dwellir fallback discovery verification-incomplete", async () => {
    primaryThrows = true;
    rpcErc20Truncated = true;
    rpcPermit2Truncated = true;
    otsErc20Truncated = true;
    otsPermit2Truncated = true;
    publicRpcThrows = true;
    otherScanRpcThrows = true;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: {
        NODE_ENV: "test",
        PULSECHAIN_DISCOVERY_RPC_URL:
          "https://api-pulse-mainnet.n.dwellir.com/test-key",
      },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("verification-incomplete");
    expect(response.erc20.truncated).toBe(true);
    expect(response.permit2.truncated).toBe(true);
    expect(response.warnings.join(" ")).toContain(
      "Do not treat this wallet as clear",
    );
  });

  it("continues past truncated OtherScan OTS discovery to a complete RPC fallback", async () => {
    primaryThrows = true;
    otsErc20Truncated = true;
    otsPermit2Truncated = true;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("complete");
    expect(response.erc20.source.id).toBe("server-public-pulsechain-rpc");
    expect(response.permit2.source.id).toBe("server-public-pulsechain-rpc");
  });

  it("redacts Dwellir key material when fallback discovery also fails", async () => {
    primaryThrows = true;
    rpcThrows = true;
    otsThrows = true;

    const response = await discoverServerErc20Approvals({
      chainId: PULSECHAIN_CHAIN_ID,
      owner: OWNER,
      env: {
        NODE_ENV: "test",
        PULSECHAIN_DISCOVERY_RPC_URL:
          "https://api-pulse-mainnet.n.dwellir.com/super-secret-key",
      },
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe("upstream-failure");
    expect(response.errors.join(" ")).toContain("all RPC fallbacks failed");
    expect(response.errors.join(" ")).not.toContain("super-secret-key");
    expect(response.errors.join(" ")).toContain("[redacted]");
  });

  it.each([
    {
      chainId: LINEA_CHAIN_ID,
      displayName: "Linea",
      chainid: LINEA_EXPLORER_CHAIN_ID_DEFAULT,
      keyEnvNames: ["LINEA_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    },
    {
      chainId: BLAST_CHAIN_ID,
      displayName: "Blast",
      chainid: BLAST_EXPLORER_CHAIN_ID_DEFAULT,
      keyEnvNames: ["BLAST_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    },
    {
      chainId: BERACHAIN_CHAIN_ID,
      displayName: "Berachain",
      chainid: BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT,
      keyEnvNames: ["BERACHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    },
    {
      chainId: CELO_CHAIN_ID,
      displayName: "Celo",
      chainid: CELO_EXPLORER_CHAIN_ID_DEFAULT,
      keyEnvNames: ["CELO_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    },
    {
      chainId: GNOSIS_CHAIN_ID,
      displayName: "Gnosis",
      chainid: GNOSIS_EXPLORER_CHAIN_ID_DEFAULT,
      keyEnvNames: ["GNOSIS_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    },
    {
      chainId: UNICHAIN_CHAIN_ID,
      displayName: "Unichain",
      chainid: UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT,
      keyEnvNames: ["UNICHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    },
    {
      chainId: WORLDCHAIN_CHAIN_ID,
      displayName: "World Chain",
      chainid: WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT,
      keyEnvNames: ["WORLDCHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
    },
  ] as const)(
    "uses server-only ETHERSCAN_API_KEY fallback for $displayName",
    async ({ chainId, chainid, keyEnvNames }) => {
      const response = await discoverServerErc20Approvals({
        chainId,
        owner: OWNER,
        env: { NODE_ENV: "test", ETHERSCAN_API_KEY: SHARED_TEST_KEY },
      });
      const source = lastSourceConfig();

      expect(response.ok).toBe(true);
      expect(source.apiProviderKind).toBe("etherscan-v2");
      expect(source.apiUrl).toBe("https://api.etherscan.io/v2/api");
      expect(source.queryParams).toEqual({ chainid });
      expect(source.apiKey).toBe(SHARED_TEST_KEY);
      expect(source.apiKeyEnvVars).toEqual(keyEnvNames);
      expect(source.apiKeyEnvVars?.join(" ")).not.toContain("NEXT_PUBLIC");
      expect(source.hasApiKey).toBe(true);
    },
  );

  it("uses Robinhood Blockscout discovery without an Etherscan key", async () => {
    const response = await discoverServerErc20Approvals({
      chainId: ROBINHOOD_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test" },
    });
    const source = lastSourceConfig();

    expect(response.ok).toBe(true);
    expect(source.id).toBe("server-blockscout-robinhood-chain");
    expect(source.name).toBe(
      "Server-side Robinhood Blockscout (Robinhood Chain logs)",
    );
    expect(source.apiProviderKind).toBe("blockscout-compatible");
    expect(source.apiProviderName).toBe("Robinhood Blockscout");
    expect(source.apiUrl).toBe(ROBINHOOD_EXPLORER_API_DEFAULT);
    expect(source.apiUrlEnvVar).toBe(
      "ROBINHOOD_EXPLORER_API_URL / NEXT_PUBLIC_ROBINHOOD_EXPLORER_API_URL",
    );
    expect(source.apiKeyEnvVars).toBeUndefined();
    expect(source.requiresApiKey).toBe(false);
    expect(source.queryParams).toBeUndefined();
  });

  it("reports missing config without accepting browser-visible explorer keys", async () => {
    const response = await discoverServerNftApprovals({
      chainId: LINEA_CHAIN_ID,
      owner: OWNER,
      env: {
        NODE_ENV: "test",
        NEXT_PUBLIC_LINEA_EXPLORER_API_KEY: "public-test-key",
      },
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe("config-missing");
    expect(response.missingConfig).toEqual([
      "LINEA_EXPLORER_API_KEY or ETHERSCAN_API_KEY",
    ]);
    expect(createBlockscoutDiscoverySource).not.toHaveBeenCalled();
  });

  it("marks truncated ERC-20 or Permit2 discovery as verification-incomplete", async () => {
    erc20Truncated = true;
    permit2Truncated = true;

    const response = await discoverServerErc20Approvals({
      chainId: BSC_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test", ETHERSCAN_API_KEY: SHARED_TEST_KEY },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("verification-incomplete");
    expect(response.erc20.truncated).toBe(true);
    expect(response.permit2.truncated).toBe(true);
    expect(response.warnings.join(" ")).toContain(
      "Do not treat this wallet as clear",
    );
  });

  it("marks truncated NFT discovery as verification-incomplete", async () => {
    nftTruncated = true;

    const response = await discoverServerNftApprovals({
      chainId: BSC_CHAIN_ID,
      owner: OWNER,
      env: { NODE_ENV: "test", ETHERSCAN_API_KEY: SHARED_TEST_KEY },
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe("verification-incomplete");
    expect(response.nft.truncated).toBe(true);
    expect(response.warnings.join(" ")).toContain(
      "Do not treat this wallet as clear",
    );
  });
});
