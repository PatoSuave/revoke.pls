import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ABSTRACT_CHAIN_ID,
  KATANA_CHAIN_ID,
  MONAD_CHAIN_ID,
  PLASMA_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  SEI_CHAIN_ID,
} from "@/lib/chains";
import { resetServerApprovalApiRateLimitForTests } from "@/lib/server-approval-api-controls";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

const discoverServerErc20Approvals = vi.hoisted(() => vi.fn());
const discoverServerNftApprovals = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-approval-discovery", () => ({
  discoverServerErc20Approvals,
  discoverServerNftApprovals,
  isServerDiscoveryChainId: (chainId: number) =>
    [
      369, 56, 8453, 137, 146, 43114, 5000, 59144, 81457, 80094, 42220, 100,
      130, 480, 4663, 143, 747474, 1329, 9745, 2741,
    ].includes(chainId),
  normalizeServerDiscoveryOwner: (value: string | null) =>
    value && /^0x[a-fA-F0-9]{40}$/.test(value) ? value : null,
  serverDiscoveryTimeoutSignal: (signal?: AbortSignal) => ({
    signal: signal ?? new AbortController().signal,
    cleanup: vi.fn(),
  }),
}));

afterEach(() => {
  resetServerApprovalApiRateLimitForTests();
  discoverServerErc20Approvals.mockReset();
  discoverServerNftApprovals.mockReset();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function completeErc20Response(chainId: number) {
  return {
    ok: true,
    status: "complete",
    chainId,
    erc20: {
      pairs: [],
      source: { id: "mock", name: "Mock", url: "https://example.test", chainId },
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
      truncated: false,
      windows: 0,
      requests: 0,
    },
    permit2: {
      allowances: [],
      source: { id: "mock", name: "Mock", url: "https://example.test", chainId },
      rawCount: 0,
      truncated: false,
      windows: 0,
      requests: 0,
    },
    warnings: [],
    errors: [],
    missingConfig: [],
  };
}

describe("shared server approval discovery route hardening", () => {
  it("accepts PulseChain hosted server discovery", async () => {
    discoverServerErc20Approvals.mockImplementation(async ({ chainId }) =>
      completeErc20Response(chainId),
    );

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/discovery/approvals?chainId=${PULSECHAIN_CHAIN_ID}&scope=erc20&owner=${OWNER}`,
        { headers: { "x-forwarded-for": "203.0.113.19" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expectNoStore(response);
    expect(body.chainId).toBe(PULSECHAIN_CHAIN_ID);
    expect(discoverServerErc20Approvals).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: PULSECHAIN_CHAIN_ID, owner: OWNER }),
    );
  });

  it("keeps invalid owners as bad requests before rate limiting", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/discovery/approvals?chainId=${POLYGON_CHAIN_ID}&scope=erc20&owner=nope`,
        { headers: { "x-forwarded-for": "203.0.113.20" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.status).toBe("bad-request");
    expect(discoverServerErc20Approvals).not.toHaveBeenCalled();
  });

  it.each([
    MONAD_CHAIN_ID,
    KATANA_CHAIN_ID,
    SEI_CHAIN_ID,
    PLASMA_CHAIN_ID,
    ABSTRACT_CHAIN_ID,
  ] as const)("accepts new Etherscan V2 chainId=%s", async (chainId) => {
    discoverServerErc20Approvals.mockImplementation(async () =>
      completeErc20Response(chainId),
    );

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/discovery/approvals?chainId=${chainId}&scope=erc20&owner=${OWNER}`,
        { headers: { "x-forwarded-for": `203.0.113.${chainId % 200}` } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.chainId).toBe(chainId);
    expect(discoverServerErc20Approvals).toHaveBeenCalledWith(
      expect.objectContaining({ chainId, owner: OWNER }),
    );
    discoverServerErc20Approvals.mockClear();
  });

  it("rejects caller-controlled discovery ranges before rate limiting", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/discovery/approvals?chainId=${POLYGON_CHAIN_ID}&scope=erc20&owner=${OWNER}&fromBlock=1`,
        { headers: { "x-forwarded-for": "203.0.113.21" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("bad-request");
    expect(body.errors.join(" ")).toContain("bounded windows");
    expect(discoverServerErc20Approvals).not.toHaveBeenCalled();
  });

  it("rate-limits repeated public discovery requests before upstream calls", async () => {
    discoverServerErc20Approvals.mockImplementation(async ({ chainId }) =>
      completeErc20Response(chainId),
    );

    let response: Response | null = null;
    for (let i = 0; i < 21; i += 1) {
      response = await GET(
        new Request(
          `https://pulserevoke.test/api/discovery/approvals?chainId=${POLYGON_CHAIN_ID}&scope=erc20&owner=${OWNER}`,
          { headers: { "x-forwarded-for": "203.0.113.22" } },
        ),
      );
    }

    expect(response?.status).toBe(429);
    expectNoStore(response!);
    expect(response?.headers.get("Retry-After")).toBeTruthy();
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("20");
    const body = await response!.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe("upstream-failure");
    expect(body.rateLimited).toBe(true);
    expect(body.errors.join(" ")).toContain("rate limit");
    expect(discoverServerErc20Approvals).toHaveBeenCalledTimes(20);
  });
});
