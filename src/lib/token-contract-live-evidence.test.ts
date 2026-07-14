import { describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

import {
  fetchTokenContractEvents,
  fetchTokenContractHistory,
  fetchTokenHolders,
  fetchTokenLiquidity,
  type TokenContractLiveEvidenceChain,
} from "@/lib/token-contract-live-evidence";
import type { TokenContractResolvedSelector } from "@/lib/token-contract-report";

const TOKEN = getAddress("0xbbca9774331066948A6b2a68Bc7a51B0392aF9F1");
const DEPLOYER = getAddress("0xA7fB123C454F1E1881542207c18180B6ac39C92C");
const HOLDER = getAddress("0x7777777777777777777777777777777777777777");
const PAIR = getAddress("0x2222222222222222222222222222222222222222");
const TX_A = `0x${"11".repeat(32)}` as const;
const TX_B = `0x${"22".repeat(32)}` as const;

const CHAIN: TokenContractLiveEvidenceChain = {
  chainId: 369,
  name: "PulseChain",
  apiUrl: "https://api.scan.pulsechain.com/api",
  apiKind: "blockscout-compatible",
  dexScreenerSlug: "pulsechain",
};

const SELECTORS: TokenContractResolvedSelector[] = [
  {
    selector: "0x715018a6",
    signature: "renounceOwnership()",
    candidates: ["renounceOwnership()"],
    resolution: "verified-abi",
    confidence: "exact",
    classification: "admin",
    riskCategory: "admin",
    evidenceState: "confirmed-signature",
    label: "Ownership control",
  },
  {
    selector: "0x48f2f812",
    signature: "approver(address,bool)",
    candidates: ["approver(address,bool)"],
    resolution: "verified-abi",
    confidence: "exact",
    classification: "unknown",
    riskCategory: "unknown",
    evidenceState: "confirmed-signature",
    label: "Verified ABI function",
  },
];

describe("token contract live evidence", () => {
  it("decodes bounded post-renounce controller history", async () => {
    const result = await fetchTokenContractHistory({
      contractAddress: TOKEN,
      chain: CHAIN,
      selectors: SELECTORS,
      fetcher: vi.fn(async () =>
        Response.json({
          items: [
            {
              hash: TX_B,
              block_number: 20,
              timestamp: "2026-01-01T00:01:00Z",
              from: { hash: DEPLOYER },
              raw_input: `0x48f2f812${"00".repeat(64)}`,
              status: "ok",
            },
            {
              hash: TX_A,
              block_number: 10,
              timestamp: "2026-01-01T00:00:00Z",
              from: { hash: DEPLOYER },
              raw_input: "0x715018a6",
              status: "ok",
            },
          ],
        }),
      ) as unknown as typeof fetch,
    });

    expect(result.inspectedTransactions).toBe(2);
    expect(result.postOwnershipZeroActivity).toBe(true);
    expect(result.decodedCalls[0]).toMatchObject({
      signature: "approver(address,bool)",
      afterOwnershipZero: true,
    });
  });

  it("returns at most three validated, deduplicated liquidity-ranked pairs", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return Response.json([
        pair("0x3333333333333333333333333333333333333333", 100),
        pair(PAIR, 500, { labels: ["v2"], pairCreatedAt: 1_720_000_000_000 }),
        pair("0x4444444444444444444444444444444444444444", 300),
        pair("0x5555555555555555555555555555555555555555", 200),
        pair(PAIR, 50, { labels: ["duplicate"] }),
        pair("0x6666666666666666666666666666666666666666", 900, {
          chainId: "ethereum",
        }),
        pair("0x7777777777777777777777777777777777777777", 800, {
          baseToken: { address: HOLDER },
        }),
        pair("0x8888888888888888888888888888888888888888", 400, {
          baseToken: { address: HOLDER },
          quoteToken: { address: TOKEN },
          labels: ["v1"],
        }),
      ]);
    });
    const result = await fetchTokenLiquidity({
      contractAddress: TOKEN,
      chain: CHAIN,
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      `https://api.dexscreener.com/token-pairs/v1/pulsechain/${TOKEN}`,
    );
    expect(result.pairs).toHaveLength(3);
    expect(result.pairs[0]).toMatchObject({
      pairAddress: PAIR,
      labels: ["v2"],
      pairCreatedAt: 1_720_000_000_000,
    });
    expect(result.pairs.map((pair) => pair.pairAddress)).toEqual([
      PAIR,
      getAddress("0x8888888888888888888888888888888888888888"),
      getAddress("0x4444444444444444444444444444444444444444"),
    ]);
    expect(result.pairs[1]).toMatchObject({ labels: ["v1"], pairCreatedAt: null });
    expect(result.module.status).toBe("partial");
  });

  it("collects at most ten Blockscout holder candidates", async () => {
    const result = await fetchTokenHolders({
      contractAddress: TOKEN,
      chain: CHAIN,
      fetcher: vi.fn(async () =>
        Response.json({
          items: Array.from({ length: 12 }, (_, index) => ({
            address: {
              hash:
                index === 0
                  ? HOLDER
                  : `0x${(index + 1).toString(16).padStart(40, "0")}`,
            },
          })),
        }),
      ) as unknown as typeof fetch,
    });

    expect(result.holders).toHaveLength(10);
    expect(result.holders[0]).toBe(HOLDER);
  });

  it("collects initial mint holders and ownership renouncement from bounded logs", async () => {
    const result = await fetchTokenContractEvents({
      contractAddress: TOKEN,
      chain: CHAIN,
      creationBlockNumber: 100,
      fetcher: vi.fn(async (input) => {
        const url = new URL(String(input));
        const topic = url.searchParams.get("topic0");
        if (topic?.startsWith("0xddf252ad")) {
          return Response.json({
            result: [
              {
                transactionHash: TX_A,
                blockNumber: "100",
                logIndex: "0",
                topics: [
                  topic,
                  addressTopic("0x0000000000000000000000000000000000000000"),
                  addressTopic(HOLDER),
                ],
                data: `0x${1000n.toString(16).padStart(64, "0")}`,
              },
            ],
          });
        }
        return Response.json({
          result: [
            {
              transactionHash: TX_B,
              blockNumber: "120",
              logIndex: "0",
              topics: [
                topic,
                addressTopic(DEPLOYER),
                addressTopic("0x0000000000000000000000000000000000000000"),
              ],
              data: "0x",
            },
          ],
        });
      }) as unknown as typeof fetch,
    });

    expect(result).toMatchObject({
      holderCandidates: [HOLDER],
      initialMintAmount: "1000",
      initialMintRecipients: [HOLDER],
      initialMintTransactionHash: TX_A,
      initialMintBlockNumber: 100,
    });
    expect(result.ownershipTransfers).toEqual([
      expect.objectContaining({
        transactionHash: TX_B,
        previousOwner: DEPLOYER,
        newOwner: getAddress("0x0000000000000000000000000000000000000000"),
        renounced: true,
      }),
    ]);
    });
  });

  it("falls back to Blockscout v2 address logs when legacy event requests fail", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.includes("/api/v2/addresses/") && url.pathname.endsWith("/logs")) {
        return Response.json({
          items: [
            {
              transaction_hash: TX_A,
              block_number: 100,
              index: 0,
              topics: [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                addressTopic("0x0000000000000000000000000000000000000000"),
                addressTopic(HOLDER),
              ],
              data: `0x${1000n.toString(16).padStart(64, "0")}`,
            },
            {
              transaction_hash: TX_B,
              block_number: 120,
              index: 0,
              topics: [
                "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0",
                addressTopic(DEPLOYER),
                addressTopic("0x0000000000000000000000000000000000000000"),
              ],
              data: "0x",
            },
          ],
        });
      }
      return new Response("legacy unavailable", { status: 500 });
    });

    const result = await fetchTokenContractEvents({
      contractAddress: TOKEN,
      chain: CHAIN,
      creationBlockNumber: 100,
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result.initialMintAmount).toBe("1000");
    expect(result.ownershipTransfers[0]?.renounced).toBe(true);
    expect(result.limitations.join(" ")).toContain("Blockscout v2 address-log fallback");
  });

  it("falls back to bounded RPC logs when explorer event requests fail", async () => {
    const result = await fetchTokenContractEvents({
      contractAddress: TOKEN,
      chain: { ...CHAIN, apiKind: "etherscan-v2" },
      creationBlockNumber: 100,
      fetcher: vi.fn(async () => new Response("unavailable", { status: 500 })) as unknown as typeof fetch,
      rpcLogFetcher: vi.fn(async ({ topic0 }) =>
        topic0.startsWith("0xddf252ad")
          ? [
              {
                transactionHash: TX_A,
                blockNumber: 100,
                logIndex: 0,
                topics: [
                  topic0,
                  addressTopic("0x0000000000000000000000000000000000000000"),
                  addressTopic(HOLDER),
                ],
                data: `0x${500n.toString(16).padStart(64, "0")}` as `0x${string}`,
              },
            ]
          : [],
      ),
    });

    expect(result.initialMintAmount).toBe("500");
    expect(result.limitations.join(" ")).toContain("bounded RPC eth_getLogs fallback");
  });

function addressTopic(address: string) {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function pair(
  address: string,
  liquidityUsd: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    chainId: "pulsechain",
    pairAddress: address,
    dexId: "9mm",
    baseToken: { address: TOKEN },
    quoteToken: { address: "0x1111111111111111111111111111111111111111" },
    liquidity: { usd: liquidityUsd },
    url: `https://dexscreener.com/pulsechain/${address}`,
    ...overrides,
  };
}
