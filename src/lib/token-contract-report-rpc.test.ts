import { createPublicClient, type Hex } from "viem";
import { describe, expect, it, vi } from "vitest";

import { PULSECHAIN_CHAIN_ID, pulsechain } from "@/lib/chains";

import {
  createTokenContractReportTransport,
  PULSECHAIN_REPORT_BACKUP_RPC_DEFAULT,
  tokenContractReportRpcUrls,
} from "./token-contract-report-rpc";

const CONTRACT_ADDRESS = "0x190bc873ba373e14ba7c1155d12cc8be78b4a6e7";

describe("token contract report RPC transport", () => {
  it("adds the PulseChainStats endpoint after the configured primary", () => {
    expect(
      tokenContractReportRpcUrls({
        chainId: PULSECHAIN_CHAIN_ID,
        primaryRpcUrl: "https://rpc.pulsechain.com",
      }),
    ).toEqual([
      "https://rpc.pulsechain.com",
      PULSECHAIN_REPORT_BACKUP_RPC_DEFAULT,
    ]);
  });

  it("does not add the PulseChain fallback to another network", () => {
    expect(
      tokenContractReportRpcUrls({
        chainId: 1,
        primaryRpcUrl: "https://ethereum.example",
      }),
    ).toEqual(["https://ethereum.example"]);
  });

  it("does not duplicate the fallback when it is already primary", () => {
    expect(
      tokenContractReportRpcUrls({
        chainId: PULSECHAIN_CHAIN_ID,
        primaryRpcUrl: `${PULSECHAIN_REPORT_BACKUP_RPC_DEFAULT}/`,
      }),
    ).toEqual([`${PULSECHAIN_REPORT_BACKUP_RPC_DEFAULT}/`]);
  });

  it("moves to the backup when the primary attempt times out", async () => {
    const requestedUrls: string[] = [];
    const bytecode: Hex = "0x6001600055";
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url === "https://primary.example/") {
        await new Promise<never>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            reject(signal.reason);
            return;
          }
          signal?.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        });
      }

      const request = JSON.parse(String(init?.body)) as {
        id: number;
      };
      return new Response(
        JSON.stringify({ jsonrpc: "2.0", id: request.id, result: bytecode }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    });
    const transport = createTokenContractReportTransport(
      ["https://primary.example", "https://backup.example"],
      { attemptTimeoutMs: 20, fetcher },
    );
    const client = createPublicClient({ chain: pulsechain, transport });

    await expect(
      client.getBytecode({ address: CONTRACT_ADDRESS }),
    ).resolves.toBe(bytecode);
    expect(requestedUrls).toEqual([
      "https://primary.example/",
      "https://backup.example/",
    ]);
  });
});
