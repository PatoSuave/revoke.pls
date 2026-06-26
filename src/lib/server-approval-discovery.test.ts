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
  UNICHAIN_CHAIN_ID,
  UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT,
  WORLDCHAIN_CHAIN_ID,
  WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT,
} from "@/lib/chains";
import type { DiscoverySourceConfig } from "@/lib/chains";

const createBlockscoutDiscoverySource = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));

vi.mock("@/lib/discovery", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/discovery")>();
  return {
    ...actual,
    createBlockscoutDiscoverySource,
  };
});

import {
  discoverServerErc20Approvals,
  discoverServerNftApprovals,
} from "@/lib/server-approval-discovery";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";
const SHARED_TEST_KEY = "shared-etherscan-test-key";
let erc20Truncated = false;
let permit2Truncated = false;
let nftTruncated = false;

function lastSourceConfig(): DiscoverySourceConfig {
  const call = createBlockscoutDiscoverySource.mock.calls.at(-1);
  if (!call) throw new Error("createBlockscoutDiscoverySource was not called");
  return call[0].source as DiscoverySourceConfig;
}

beforeEach(() => {
  erc20Truncated = false;
  permit2Truncated = false;
  nftTruncated = false;
  createBlockscoutDiscoverySource.mockReset();
  createBlockscoutDiscoverySource.mockImplementation(
    ({ chainId, source }: { chainId: number; source: DiscoverySourceConfig }) => ({
      meta: { id: source.id, name: source.name, url: source.url, chainId },
      discover: vi.fn(async () => ({
        pairs: [],
        source: { id: source.id, name: source.name, url: source.url, chainId },
        erc20Parse: {
          rawLogs: 0,
          decodeAttempts: 0,
          erc20TopicShape: 0,
          erc721TokenApprovalShape: 0,
          unsupportedTopicShape: 0,
          missingTopics: 0,
          missingTokenAddress: 0,
          invalidTokenAddress: 0,
          missingSpenderTopic: 0,
          invalidSpenderTopic: 0,
          decodedPairs: 0,
          uniquePairs: 0,
          samplePairs: [],
        },
        rawCount: 0,
        truncated: erc20Truncated,
        windows: 0,
        requests: 0,
      })),
      discoverNftApprovals: vi.fn(async () => ({
        approvals: [],
        source: { id: source.id, name: source.name, url: source.url, chainId },
        rawCount: 0,
        truncated: nftTruncated,
        windows: 0,
        requests: 0,
      })),
      discoverPermit2Allowances: vi.fn(async () => ({
        allowances: [],
        source: { id: source.id, name: source.name, url: source.url, chainId },
        rawCount: 0,
        truncated: permit2Truncated,
        windows: 0,
        requests: 0,
      })),
    }),
  );
});

describe("server approval discovery shared Etherscan key", () => {
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
