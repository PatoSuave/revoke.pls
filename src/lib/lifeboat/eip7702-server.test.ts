import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CHAIN_CAPABILITY_CHAIN_IDS } from "@/lib/chain-capabilities";
import {
  BSC_CHAIN_ID,
  CELO_CHAIN_ID,
  LINEA_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
} from "@/lib/chains";
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
  it("recognizes all capability chains as bounded account-code check targets", () => {
    expect(CHAIN_CAPABILITY_CHAIN_IDS).toHaveLength(19);
    for (const chainId of CHAIN_CAPABILITY_CHAIN_IDS) {
      expect(isEip7702DiagnosticChainId(chainId)).toBe(true);
    }
    expect(isEip7702DiagnosticChainId(123456)).toBe(false);
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
    expect(result.supportNotes.join(" ")).toContain("confirmed");
    expect(fetcher).toHaveBeenCalledWith(
      "https://bsc-dataseed.bnbchain.org",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
  });

  it("uses existing generic chain RPC config for newly covered chains", async () => {
    const fetcher = jsonRpcFetcher("0x");
    const result = await discoverEip7702Delegation({
      owner: OWNER,
      chainId: LINEA_CHAIN_ID,
      fetcher,
      env: TEST_ENV,
    });

    expect(result.status).toBe("complete");
    expect(result.chainName).toBe("Linea");
    expect(result.supportNotes.join(" ")).toContain("confirmed");
    expect(fetcher).toHaveBeenCalledWith(
      "https://rpc.linea.build",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
  });

  it("keeps unknown EIP-7702 support separate from account-code read coverage", async () => {
    const result = await discoverEip7702Delegation({
      owner: OWNER,
      chainId: PULSECHAIN_CHAIN_ID,
      fetcher: jsonRpcFetcher("0x"),
      env: TEST_ENV,
    });

    expect(result.status).toBe("complete");
    expect(result.supportNotes.join(" ")).toContain("not marked confirmed");
  });

  it("marks Celo as confirmed for EIP-7702 diagnostics", async () => {
    const result = await discoverEip7702Delegation({
      owner: OWNER,
      chainId: CELO_CHAIN_ID,
      fetcher: jsonRpcFetcher("0x"),
      env: TEST_ENV,
    });

    expect(result.status).toBe("complete");
    expect(result.supportNotes.join(" ")).toContain("confirmed");
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
