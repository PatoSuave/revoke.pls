import { afterEach, describe, expect, it, vi } from "vitest";
import type { Address } from "viem";

import {
  createBlockscoutDiscoverySource,
  DEFAULT_DISCOVERY_LIMITS,
  ERC20_APPROVAL_TOPIC0,
  ERC_APPROVAL_FOR_ALL_TOPIC0,
} from "./discovery";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as Address;
const SPENDER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9" as Address;
const TOKEN = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as Address;
const COLLECTION = "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab" as Address;

function pad(address: Address): string {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function source(options?: {
  requiresApiKey?: boolean;
  apiKey?: string;
  pageCap?: number;
}) {
  return createBlockscoutDiscoverySource({
    chainId: 369,
    source: {
      id: "test-source",
      name: "TestSource",
      url: "https://example.test",
      apiUrl: "https://example.test/api",
      apiKey: options?.apiKey,
      requiresApiKey: options?.requiresApiKey,
    },
    limits: {
      ...DEFAULT_DISCOVERY_LIMITS,
      pageCap: options?.pageCap ?? 1000,
      maxRequests: 10,
      requestTimeoutMs: 1000,
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
      { tokenAddress: TOKEN, spenderAddress: SPENDER },
    ]);
    expect(result.erc20Parse.erc20TopicShape).toBe(1);
    expect(result.erc20Parse.erc721TokenApprovalShape).toBe(0);
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
      {
        kind: "approvalForAll",
        collectionAddress: COLLECTION,
        operatorAddress: SPENDER,
      },
    ]);
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
});
