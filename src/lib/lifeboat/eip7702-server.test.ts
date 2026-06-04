import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { BSC_CHAIN_ID, PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import { HYPEREVM_CHAIN_ID } from "@/lib/hyperevm-approval-api";
import {
  discoverEip7702Delegation,
  isEip7702DiagnosticChainId,
} from "@/lib/lifeboat/eip7702-server";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8";
const DELEGATE = "0x1234567890123456789012345678901234567890";
const TEST_ENV: NodeJS.ProcessEnv = { NODE_ENV: "test" };

function jsonRpcFetcher(result: string): typeof fetch {
  return vi.fn(async () =>
    Response.json({
      jsonrpc: "2.0",
      id: 1,
      result,
    }),
  ) as unknown as typeof fetch;
}

describe("EIP-7702 account-code server diagnostic", () => {
  it("recognizes BSC, PulseChain, and HyperEVM as bounded account-code check targets", () => {
    expect(isEip7702DiagnosticChainId(BSC_CHAIN_ID)).toBe(true);
    expect(isEip7702DiagnosticChainId(PULSECHAIN_CHAIN_ID)).toBe(true);
    expect(isEip7702DiagnosticChainId(HYPEREVM_CHAIN_ID)).toBe(true);
  });

  it("maps empty account code to none_detected", async () => {
    const fetcher = jsonRpcFetcher("0x");
    const result = await discoverEip7702Delegation({
      owner: OWNER,
      chainId: BSC_CHAIN_ID,
      fetcher,
      env: TEST_ENV,
    });

    expect(result.status).toBe("complete");
    expect(result.riskLevel).toBe("none_detected");
    expect(result.summary.hasCode).toBe(false);
    expect(fetcher).toHaveBeenCalledWith(
      "https://bsc-dataseed.bnbchain.org",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
  });

  it("maps valid EIP-7702 delegation code to elevated risk with a delegate", async () => {
    const result = await discoverEip7702Delegation({
      owner: OWNER,
      chainId: BSC_CHAIN_ID,
      fetcher: jsonRpcFetcher(`0xef0100${DELEGATE.slice(2)}`),
      env: TEST_ENV,
    });

    expect(result.status).toBe("complete");
    expect(result.riskLevel).toBe("elevated");
    expect(result.summary.hasDelegation).toBe(true);
    expect(result.summary.delegationAddress).toBe(DELEGATE);
  });

  it("maps random account bytecode to informational account-code context", async () => {
    const result = await discoverEip7702Delegation({
      owner: OWNER,
      chainId: HYPEREVM_CHAIN_ID,
      fetcher: jsonRpcFetcher("0x6001600101"),
      env: TEST_ENV,
    });

    expect(result.status).toBe("complete");
    expect(result.riskLevel).toBe("informational");
    expect(result.summary.classification).toBe("other_code");
  });

  it("maps RPC failures to incomplete upstream-failure warnings", async () => {
    const result = await discoverEip7702Delegation({
      owner: OWNER,
      chainId: PULSECHAIN_CHAIN_ID,
      fetcher: vi.fn(async () => {
        throw new Error("RPC unavailable");
      }) as unknown as typeof fetch,
      env: TEST_ENV,
    });

    expect(result.status).toBe("upstream-failure");
    expect(result.riskLevel).toBe("upstream_unavailable");
    expect(result.warnings.join(" ")).toContain("incomplete");
  });
});
