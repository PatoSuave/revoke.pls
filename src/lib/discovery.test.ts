import { afterEach, describe, expect, it, vi } from "vitest";
import { getAddress, type Address } from "viem";

import {
  BASE_CHAIN_ID,
  BASE_EXPLORER_API_DEFAULT,
  BSC_CHAIN_ID,
  BSC_DEPRECATED_V1_EXPLORER_API_URL,
  BSC_EXPLORER_API_DEFAULT,
  POLYGON_CHAIN_ID,
  POLYGON_EXPLORER_API_DEFAULT,
  PULSECHAIN_CHAIN_ID,
  type DiscoverySourceConfig,
  getChainConfig,
} from "./chains";
import {
  createBlockscoutDiscoverySource,
  DEFAULT_DISCOVERY_LIMITS,
  discoveredPairDedupeKey,
  ERC20_APPROVAL_TOPIC0,
  ERC_APPROVAL_FOR_ALL_TOPIC0,
} from "./discovery";
import {
  PERMIT2_ADDRESS,
  PERMIT2_APPROVAL_TOPIC0,
  PERMIT2_PERMIT_TOPIC0,
} from "./permit2";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as Address;
const CHECKSUM_OWNER = getAddress(OWNER);
const SPENDER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9" as Address;
const TOKEN = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as Address;
const COLLECTION = "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab" as Address;

function pad(address: Address): string {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function word(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function source(options?: {
  chainId?: number;
  apiUrl?: string;
  apiProviderKind?: DiscoverySourceConfig["apiProviderKind"];
  apiChainId?: string;
  queryParams?: Record<string, string>;
  requiresApiKey?: boolean;
  apiKey?: string;
  pageCap?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  minRequestIntervalMs?: number;
}) {
  return createBlockscoutDiscoverySource({
    chainId: options?.chainId ?? 369,
    source: {
      id: "test-source",
      name: "TestSource",
      apiProviderKind: options?.apiProviderKind,
      url: "https://example.test",
      apiUrl: options?.apiUrl ?? "https://example.test/api",
      apiUrlEnvVar: "NEXT_PUBLIC_TEST_EXPLORER_API",
      apiChainId: options?.apiChainId,
      apiKey: options?.apiKey,
      apiKeyEnvVar: "NEXT_PUBLIC_TEST_API_KEY",
      requiresApiKey: options?.requiresApiKey,
      hasApiKey: Boolean(options?.apiKey),
      hasApiUrl: true,
      usesDefaultApiUrl: true,
      queryParams: options?.queryParams,
      limitations: "test source",
    },
    limits: {
      ...DEFAULT_DISCOVERY_LIMITS,
      pageCap: options?.pageCap ?? 1000,
      maxRequests: 10,
      requestTimeoutMs: 1000,
      retryAttempts: options?.retryAttempts ?? 0,
      retryDelayMs: options?.retryDelayMs ?? 0,
      minRequestIntervalMs: options?.minRequestIntervalMs ?? 0,
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createBlockscoutDiscoverySource", () => {
  it("decodes PulseScan ERC-20 logs that include a trailing null topic", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          status: "1",
          message: "OK",
          result: [
            {
              address: TOKEN,
              data: "0x7b",
              blockNumber: "0x1",
              transactionHash: "0x1",
              logIndex: "0x0",
              topics: [ERC20_APPROVAL_TOPIC0, pad(OWNER), pad(SPENDER), null],
            },
          ],
        }),
      ),
    );

    const result = await source().discover(OWNER);

    expect(result.pairs).toEqual([
      expect.objectContaining({
        chainId: 369,
        approvalType: "fungible",
        tokenAddress: TOKEN,
        ownerAddress: CHECKSUM_OWNER,
        spenderAddress: SPENDER,
        rawApprovalValue: 123n,
        blockNumber: 1n,
        transactionHash: "0x1",
      }),
    ]);
    expect(result.erc20Parse.erc20TopicShape).toBe(1);
    expect(result.erc20Parse.erc721TokenApprovalShape).toBe(0);
  });

  it("attributes duplicate ERC-20 approvals to the newest block and log index", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          status: "1",
          message: "OK",
          result: [
            {
              address: TOKEN,
              data: "0x1",
              blockNumber: "0x1",
              transactionHash: "0x1",
              logIndex: "0x0",
              topics: [ERC20_APPROVAL_TOPIC0, pad(OWNER), pad(SPENDER), null],
            },
            {
              address: TOKEN,
              data: "0x2",
              blockNumber: "0x2",
              transactionHash: "0x2",
              logIndex: "0x0",
              topics: [ERC20_APPROVAL_TOPIC0, pad(OWNER), pad(SPENDER), null],
            },
            {
              address: TOKEN,
              data: "0x3",
              blockNumber: "0x2",
              transactionHash: "0x3",
              logIndex: "0x4",
              topics: [ERC20_APPROVAL_TOPIC0, pad(OWNER), pad(SPENDER), null],
            },
          ],
        }),
      ),
    );

    const result = await source().discover(OWNER);

    expect(result.pairs).toEqual([
      expect.objectContaining({
        rawApprovalValue: 3n,
        blockNumber: 2n,
        transactionHash: "0x3",
        logIndex: "0x4",
      }),
    ]);
  });

  it("decodes NFT ApprovalForAll logs that include a trailing null topic", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const topic0 = url.searchParams.get("topic0");
        if (topic0 === ERC_APPROVAL_FOR_ALL_TOPIC0) {
          return jsonResponse({
            status: "1",
            message: "OK",
            result: [
              {
                address: COLLECTION,
                blockNumber: "0x1",
                transactionHash: "0x2",
                logIndex: "0x0",
                topics: [
                  ERC_APPROVAL_FOR_ALL_TOPIC0,
                  pad(OWNER),
                  pad(SPENDER),
                  null,
                ],
              },
            ],
          });
        }

        return jsonResponse({ status: "0", message: "No logs found", result: [] });
      }),
    );

    const result = await source().discoverNftApprovals(OWNER);

    expect(result.approvals).toEqual([
      expect.objectContaining({
        chainId: 369,
        kind: "approvalForAll",
        collectionAddress: COLLECTION,
        ownerAddress: CHECKSUM_OWNER,
        operatorAddress: SPENDER,
      }),
    ]);
  });

  it("attributes NFT operator age from the newest approved=true ApprovalForAll event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const topic0 = url.searchParams.get("topic0");
        if (topic0 === ERC_APPROVAL_FOR_ALL_TOPIC0) {
          return jsonResponse({
            status: "1",
            message: "OK",
            result: [
              {
                address: COLLECTION,
                data: `0x${word(1n)}`,
                blockNumber: "0x1",
                transactionHash: "0x1",
                logIndex: "0x0",
                topics: [ERC_APPROVAL_FOR_ALL_TOPIC0, pad(OWNER), pad(SPENDER)],
              },
              {
                address: COLLECTION,
                data: `0x${word(0n)}`,
                blockNumber: "0x2",
                transactionHash: "0x2",
                logIndex: "0x1",
                topics: [ERC_APPROVAL_FOR_ALL_TOPIC0, pad(OWNER), pad(SPENDER)],
              },
              {
                address: COLLECTION,
                data: `0x${word(1n)}`,
                blockNumber: "0x3",
                transactionHash: "0x3",
                logIndex: "0x2",
                topics: [ERC_APPROVAL_FOR_ALL_TOPIC0, pad(OWNER), pad(SPENDER)],
              },
              {
                address: COLLECTION,
                data: `0x${word(0n)}`,
                blockNumber: "0x4",
                transactionHash: "0x4",
                logIndex: "0x3",
                topics: [ERC_APPROVAL_FOR_ALL_TOPIC0, pad(OWNER), pad(SPENDER)],
              },
            ],
          });
        }

        return jsonResponse({ status: "0", message: "No logs found", result: [] });
      }),
    );

    const result = await source().discoverNftApprovals(OWNER);

    expect(result.approvals).toEqual([
      expect.objectContaining({
        kind: "approvalForAll",
        collectionAddress: COLLECTION,
        operatorAddress: SPENDER,
        blockNumber: 3n,
        transactionHash: "0x3",
        logIndex: "0x2",
      }),
    ]);
  });

  it("discovers Permit2 nested allowances from Approval and Permit events", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("address")).toBe(PERMIT2_ADDRESS);
      const topic0 = url.searchParams.get("topic0");

      if (topic0 === PERMIT2_APPROVAL_TOPIC0) {
        return jsonResponse({
          status: "1",
          message: "OK",
          result: [
            {
              address: PERMIT2_ADDRESS,
              data: `0x${word(123n)}${word(2_000n)}`,
              blockNumber: "0x1",
              transactionHash: "0x3",
              logIndex: "0x0",
              topics: [
                PERMIT2_APPROVAL_TOPIC0,
                pad(OWNER),
                pad(TOKEN),
                pad(SPENDER),
              ],
            },
          ],
        });
      }

      if (topic0 === PERMIT2_PERMIT_TOPIC0) {
        return jsonResponse({
          status: "1",
          message: "OK",
          result: [
            {
              address: PERMIT2_ADDRESS,
              data: `0x${word(456n)}${word(3_000n)}${word(9n)}`,
              blockNumber: "0x2",
              transactionHash: "0x4",
              logIndex: "0x1",
              topics: [
                PERMIT2_PERMIT_TOPIC0,
                pad(OWNER),
                pad(TOKEN),
                pad(SPENDER),
              ],
            },
          ],
        });
      }

      return jsonResponse({ status: "1", message: "OK", result: [] });
    });
    vi.stubGlobal("fetch", fetch);

    const result = await source().discoverPermit2Allowances?.(OWNER);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result?.allowances).toHaveLength(1);
    expect(result?.allowances[0]).toMatchObject({
      chainId: 369,
      approvalType: "permit2",
      permit2Address: PERMIT2_ADDRESS,
      ownerAddress: CHECKSUM_OWNER,
      tokenAddress: TOKEN,
      spenderAddress: SPENDER,
      sourceEvent: "Permit",
      rawAmount: 456n,
      expiration: 3000n,
      nonce: 9n,
      blockNumber: 2n,
      transactionHash: "0x4",
      logIndex: "0x1",
    });
  });

  it("marks duplicate ignored pages as truncated instead of counting duplicates", async () => {
    const log = {
      address: TOKEN,
      blockNumber: "0x1",
      transactionHash: "0x1",
      logIndex: "0x0",
      topics: [ERC20_APPROVAL_TOPIC0, pad(OWNER), pad(SPENDER), null],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.searchParams.get("action") === "eth_block_number") {
          return jsonResponse({ status: "1", message: "OK", result: "0x1" });
        }
        return jsonResponse({ status: "1", message: "OK", result: [log] });
      }),
    );

    const result = await source({ pageCap: 1 }).discover(OWNER);

    expect(result.rawCount).toBe(1);
    expect(result.truncated).toBe(true);
    expect(result.pairs).toHaveLength(1);
  });

  it("fails fast when a configured discovery source requires a missing API key", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await expect(
      source({ requiresApiKey: true }).discover(OWNER),
    ).rejects.toThrow("requires an API key");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retries transient explorer rate-limit responses before failing discovery", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          status: "0",
          message: "NOTOK",
          result: "Max calls per sec rate limit reached (5/sec)",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: "1",
          message: "OK",
          result: [
            {
              address: TOKEN,
              data: "0x7b",
              blockNumber: "0x1",
              transactionHash: "0x1",
              logIndex: "0x0",
              topics: [ERC20_APPROVAL_TOPIC0, pad(OWNER), pad(SPENDER), null],
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetch);

    const result = await source({
      retryAttempts: 1,
      retryDelayMs: 0,
    }).discover(OWNER);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.pairs).toHaveLength(1);
    expect(result.truncated).toBe(false);
  });

  it("paces Etherscan V2 log requests that would otherwise start together", async () => {
    const startedAt: number[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      startedAt.push(Date.now());
      const url = new URL(String(input));
      const topic0 = url.searchParams.get("topic0");
      if (topic0 === ERC_APPROVAL_FOR_ALL_TOPIC0) {
        return jsonResponse({
          status: "1",
          message: "OK",
          result: [
            {
              address: COLLECTION,
              blockNumber: "0x1",
              transactionHash: "0x2",
              logIndex: "0x0",
              topics: [ERC_APPROVAL_FOR_ALL_TOPIC0, pad(OWNER), pad(SPENDER)],
            },
          ],
        });
      }

      return jsonResponse({ status: "0", message: "No logs found", result: [] });
    });
    vi.stubGlobal("fetch", fetch);

    await source({
      apiUrl: "https://throttled-etherscan.test/v2/api",
      apiProviderKind: "etherscan-v2",
      apiChainId: "1",
      apiKey: "test-key",
      queryParams: { chainid: "1" },
      minRequestIntervalMs: 25,
    }).discoverNftApprovals(OWNER);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(startedAt[1] - startedAt[0]).toBeGreaterThanOrEqual(20);
  });

  it("fails Base discovery fast when the Etherscan API key is missing", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const config = getChainConfig(BASE_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: BASE_CHAIN_ID,
      source: {
        ...config.discovery,
        apiKey: undefined,
        hasApiKey: false,
      },
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 2,
        requestTimeoutMs: 1000,
      },
    });

    await expect(discovery.discover(OWNER)).rejects.toThrow(
      "Base historical discovery uses Etherscan API V2",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("builds Base ERC-20 log requests with Etherscan V2 and chainid=8453", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({ status: "1", message: "OK", result: [] });
    });
    vi.stubGlobal("fetch", fetch);
    const config = getChainConfig(BASE_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: BASE_CHAIN_ID,
      source: {
        ...config.discovery,
        apiKey: "base-key",
        hasApiKey: true,
      },
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 2,
        requestTimeoutMs: 1000,
      },
    });

    await discovery.discover(OWNER);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe(BASE_EXPLORER_API_DEFAULT);
    expect(url.searchParams.get("chainid")).toBe("8453");
    expect(url.searchParams.get("module")).toBe("logs");
    expect(url.searchParams.get("action")).toBe("getLogs");
    expect(url.searchParams.get("topic0")).toBe(ERC20_APPROVAL_TOPIC0);
    expect(url.searchParams.get("topic1")).toBe(pad(OWNER));
    expect(url.searchParams.get("apikey")).toBe("base-key");
  });

  it("builds Base NFT log requests with Etherscan V2 chainid=8453", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({ status: "1", message: "OK", result: [] });
    });
    vi.stubGlobal("fetch", fetch);
    const config = getChainConfig(BASE_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: BASE_CHAIN_ID,
      source: {
        ...config.discovery,
        apiKey: "base-key",
        hasApiKey: true,
      },
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 3,
        requestTimeoutMs: 1000,
      },
    });

    await discovery.discoverNftApprovals(OWNER);

    const urls = fetch.mock.calls.map((call) => new URL(String(call[0])));
    expect(urls).toHaveLength(2);
    expect(urls.every((url) => url.searchParams.get("chainid") === "8453")).toBe(
      true,
    );
    expect(urls.map((url) => url.searchParams.get("topic0")).sort()).toEqual(
      [ERC20_APPROVAL_TOPIC0, ERC_APPROVAL_FOR_ALL_TOPIC0].sort(),
    );
  });

  it("falls back to Base chainid=8453 for Etherscan V2 sources without explicit query params", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({ status: "1", message: "OK", result: [] });
    });
    vi.stubGlobal("fetch", fetch);
    const config = getChainConfig(BASE_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: BASE_CHAIN_ID,
      source: {
        ...config.discovery,
        apiProviderKind: "etherscan-v2",
        apiChainId: undefined,
        queryParams: undefined,
        apiKey: "base-key",
        hasApiKey: true,
      },
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 2,
        requestTimeoutMs: 1000,
      },
    });

    await discovery.discover(OWNER);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(url.searchParams.get("chainid")).toBe("8453");
  });

  it("builds Polygon ERC-20 log requests with Etherscan V2 and chainid=137", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({ status: "1", message: "OK", result: [] });
    });
    vi.stubGlobal("fetch", fetch);
    const config = getChainConfig(POLYGON_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: POLYGON_CHAIN_ID,
      source: {
        ...config.discovery,
        apiKey: "polygon-key",
        hasApiKey: true,
      },
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 2,
        requestTimeoutMs: 1000,
      },
    });

    await discovery.discover(OWNER);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe(POLYGON_EXPLORER_API_DEFAULT);
    expect(url.searchParams.get("chainid")).toBe("137");
    expect(url.searchParams.get("module")).toBe("logs");
    expect(url.searchParams.get("action")).toBe("getLogs");
    expect(url.searchParams.get("topic0")).toBe(ERC20_APPROVAL_TOPIC0);
    expect(url.searchParams.get("topic1")).toBe(pad(OWNER));
    expect(url.searchParams.get("apikey")).toBe("polygon-key");
  });

  it("turns Base Etherscan V2 paid-plan errors into discovery failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          status: "0",
          message: "NOTOK",
          result:
            "This endpoint requires an Etherscan API plan with Base Mainnet access.",
        }),
      ),
    );
    const config = getChainConfig(BASE_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: BASE_CHAIN_ID,
      source: {
        ...config.discovery,
        apiKey: "base-key",
        hasApiKey: true,
      },
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 2,
        requestTimeoutMs: 1000,
      },
    });

    await expect(discovery.discover(OWNER)).rejects.toThrow(
      "Base Mainnet access",
    );
  });

  it("builds BSC BEP-20 log requests with Etherscan V2 and chainid=56", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({ status: "1", message: "OK", result: [] });
    });
    vi.stubGlobal("fetch", fetch);
    const config = getChainConfig(BSC_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: BSC_CHAIN_ID,
      source: {
        ...config.discovery,
        apiKey: "test-key",
        hasApiKey: true,
      },
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 2,
        requestTimeoutMs: 1000,
      },
    });

    await discovery.discover(OWNER);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(`${url.origin}${url.pathname}`).toBe(BSC_EXPLORER_API_DEFAULT);
    expect(url.searchParams.get("chainid")).toBe("56");
    expect(url.searchParams.get("module")).toBe("logs");
    expect(url.searchParams.get("action")).toBe("getLogs");
    expect(url.searchParams.get("topic0")).toBe(ERC20_APPROVAL_TOPIC0);
    expect(url.searchParams.get("topic1")).toBe(pad(OWNER));
    expect(url.searchParams.get("apikey")).toBe("test-key");
  });

  it("builds BSC NFT log requests with Etherscan V2 chainid=56", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({ status: "1", message: "OK", result: [] });
    });
    vi.stubGlobal("fetch", fetch);
    const config = getChainConfig(BSC_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: BSC_CHAIN_ID,
      source: {
        ...config.discovery,
        apiKey: "test-key",
        hasApiKey: true,
      },
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 3,
        requestTimeoutMs: 1000,
      },
    });

    await discovery.discoverNftApprovals(OWNER);

    const urls = fetch.mock.calls.map((call) => new URL(String(call[0])));
    expect(urls).toHaveLength(2);
    expect(urls.every((url) => url.searchParams.get("chainid") === "56")).toBe(
      true,
    );
    expect(urls.map((url) => url.searchParams.get("topic0")).sort()).toEqual(
      [ERC20_APPROVAL_TOPIC0, ERC_APPROVAL_FOR_ALL_TOPIC0].sort(),
    );
  });

  it("falls back to the supported chain ID for Etherscan V2 sources without explicit query params", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({ status: "1", message: "OK", result: [] });
    });
    vi.stubGlobal("fetch", fetch);
    const config = getChainConfig(BSC_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: BSC_CHAIN_ID,
      source: {
        ...config.discovery,
        apiProviderKind: "etherscan-v2",
        apiChainId: undefined,
        queryParams: undefined,
        apiKey: "test-key",
        hasApiKey: true,
      },
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 2,
        requestTimeoutMs: 1000,
      },
    });

    await discovery.discover(OWNER);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(url.searchParams.get("chainid")).toBe("56");
  });

  it("leaves PulseChain log requests without an Etherscan V2 chainid", async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return jsonResponse({ status: "1", message: "OK", result: [] });
    });
    vi.stubGlobal("fetch", fetch);
    const config = getChainConfig(PULSECHAIN_CHAIN_ID)!;
    const discovery = createBlockscoutDiscoverySource({
      chainId: PULSECHAIN_CHAIN_ID,
      source: config.discovery,
      limits: {
        ...DEFAULT_DISCOVERY_LIMITS,
        maxRequests: 2,
        requestTimeoutMs: 1000,
      },
    });

    await discovery.discover(OWNER);

    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(url.searchParams.has("chainid")).toBe(false);
    expect(`${url.origin}${url.pathname}`).toBe(config.discovery.apiUrl);
  });

  it("turns the BscScan V1 deprecation response into an actionable failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          status: "0",
          message: "NOTOK",
          result:
            "You are using a deprecated V1 endpoint, switch to Etherscan API V2 using https://docs.etherscan.io/v2-migration",
        }),
      ),
    );

    await expect(
      source({
        chainId: BSC_CHAIN_ID,
        apiUrl: BSC_DEPRECATED_V1_EXPLORER_API_URL,
        apiKey: "test-key",
        queryParams: { chainid: "56" },
      }).discover(OWNER),
    ).rejects.toThrow(
      "Set this chain's explorer API URL to https://api.etherscan.io/v2/api",
    );
  });

  it("includes chain ID in fungible approval dedupe keys", () => {
    const base = {
      approvalType: "fungible" as const,
      tokenAddress: TOKEN,
      spenderAddress: SPENDER,
    };

    expect(discoveredPairDedupeKey({ ...base, chainId: 369 })).not.toBe(
      discoveredPairDedupeKey({ ...base, chainId: 56 }),
    );
    expect(discoveredPairDedupeKey({ ...base, chainId: 56 })).not.toBe(
      discoveredPairDedupeKey({ ...base, chainId: 8453 }),
    );
  });
});
