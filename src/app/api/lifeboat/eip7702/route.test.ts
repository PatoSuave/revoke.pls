import { afterEach, describe, expect, it, vi } from "vitest";

import { resetLifeboatEip7702RateLimitForTests } from "@/lib/lifeboat/eip7702-api-controls";
import { emptyEip7702Summary } from "@/lib/lifeboat/eip7702";
import { LINEA_CHAIN_ID } from "@/lib/chains";
import { GET } from "./route";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";

const discoverEip7702Delegation = vi.hoisted(() => vi.fn());
const diagnosticChainIds = vi.hoisted(() => [
  1, 10, 56, 100, 130, 137, 146, 369, 480, 999, 5000, 8453, 42161, 42220,
  43114, 59144, 80094, 81457, 4663,
]);

vi.mock("@/lib/lifeboat/eip7702-server", () => ({
  discoverEip7702Delegation,
  eip7702TimeoutSignal: (signal?: AbortSignal) => ({
    signal: signal ?? new AbortController().signal,
    cleanup: vi.fn(),
  }),
  isEip7702DiagnosticChainId: (chainId: number) =>
    diagnosticChainIds.includes(chainId),
}));

afterEach(() => {
  resetLifeboatEip7702RateLimitForTests();
  discoverEip7702Delegation.mockReset();
});

function expectNoStore(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
  expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
}

function completeEip7702Response(chainId: number) {
  return {
    ok: true,
    status: "complete",
    chainId,
    chainName: "Linea",
    owner: OWNER,
    riskLevel: "none_detected",
    evidence: [],
    summary: emptyEip7702Summary(),
    warnings: [],
    errors: [],
    missingConfig: [],
    supported: true,
    supportNotes: ["This diagnostic reads latest account code only."],
  };
}

describe("Wallet Lifeboat EIP-7702 route", () => {
  it("keeps invalid chain IDs generic instead of listing the old 8-chain set", async () => {
    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/eip7702?chainId=123456&owner=${OWNER}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expectNoStore(response);
    expect(body.errors.join(" ")).toContain("supported Pulse Revoke chain IDs");
    expect(body.errors.join(" ")).not.toContain("chainId=1, 10");
    expect(discoverEip7702Delegation).not.toHaveBeenCalled();
  });

  it("accepts a newly covered 19-chain diagnostic target", async () => {
    discoverEip7702Delegation.mockImplementation(async ({ chainId }) =>
      completeEip7702Response(chainId),
    );

    const response = await GET(
      new Request(
        `https://pulserevoke.test/api/lifeboat/eip7702?chainId=${LINEA_CHAIN_ID}&owner=${OWNER}`,
        { headers: { "x-forwarded-for": "203.0.113.77" } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expectNoStore(response);
    expect(body.status).toBe("complete");
    expect(discoverEip7702Delegation).toHaveBeenCalledTimes(1);
    const call = discoverEip7702Delegation.mock.calls[0]?.[0];
    expect(call).toMatchObject({ chainId: LINEA_CHAIN_ID });
    expect(call.owner.toLowerCase()).toBe(OWNER);
  });
});
