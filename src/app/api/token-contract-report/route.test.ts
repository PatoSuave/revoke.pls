import { afterEach, describe, expect, it } from "vitest";
import { getAddress } from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import { resetTokenContractReportApiRateLimitForTests } from "@/lib/token-contract-report-api-controls";
import type { TokenContractReportResponse } from "@/lib/token-contract-report";
import { handleTokenContractReportPost } from "./handler";

const TOKEN = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");

afterEach(() => {
  resetTokenContractReportApiRateLimitForTests();
});

describe("token contract report API route", () => {
  it("rejects malformed JSON without invoking the builder", async () => {
    let called = false;
    const response = await handleTokenContractReportPost(
      new Request("https://pulserevoke.test/api/token-contract-report", {
        method: "POST",
        body: "{",
      }),
      async () => {
        called = true;
        throw new Error("should not run");
      },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(body.status).toBe("bad-request");
    expect(called).toBe(false);
  });

  it("returns a successful no-store report from the builder", async () => {
    const report: TokenContractReportResponse = {
      ok: true,
      status: "complete",
      chain: {
        chainId: PULSECHAIN_CHAIN_ID,
        name: "PulseChain",
        explorerName: "PulseScan",
      },
      contract: {
        address: TOKEN,
        explorerUrl: `https://scan.pulsechain.com/token/${TOKEN}`,
        hasBytecode: true,
        source: {
          verified: "verified",
          contractName: "Token",
          isProxy: false,
          implementationAddress: null,
        },
        creation: {
          transactionHash: null,
          transactionUrl: null,
          deployerAddress: null,
          deployerUrl: null,
          blockNumber: null,
          timestamp: null,
          lookupStatus: "unavailable",
        },
      },
      standards: {
        erc20Like: true,
        erc721: false,
        erc1155: false,
        erc4626: false,
        erc6909: "not_detected",
        hybrid: false,
      },
      token: {
        name: "Token",
        symbol: "TKN",
        decimals: 18,
        totalSupply: "1000",
        vaultAssetAddress: null,
        totalAssets: null,
      },
      signals: [],
      ai: { status: "unavailable", model: null, markdown: null },
      warnings: [],
      errors: [],
      missingConfig: [],
    };
    const response = await handleTokenContractReportPost(
      new Request("https://pulserevoke.test/api/token-contract-report", {
        method: "POST",
        body: JSON.stringify({
          chainId: PULSECHAIN_CHAIN_ID,
          contractAddress: TOKEN,
        }),
      }),
      async (options) => {
        expect(options.chainId).toBe(PULSECHAIN_CHAIN_ID);
        expect(options.contractAddress).toBe(TOKEN);
        expect(options.includeAi).toBe(true);
        return report;
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Token-Contract-Report")).toBe("server");
    expect(body.status).toBe("complete");
  });

  it("rate limits before building reports", async () => {
    let calls = 0;
    async function builder(): Promise<TokenContractReportResponse> {
      calls += 1;
      return {
        ok: true,
        status: "complete",
        chain: null,
        contract: null,
        standards: {
          erc20Like: false,
          erc721: false,
          erc1155: false,
          erc4626: false,
          erc6909: "not_detected",
          hybrid: false,
        },
        token: {
          name: null,
          symbol: null,
          decimals: null,
          totalSupply: null,
          vaultAssetAddress: null,
          totalAssets: null,
        },
        signals: [],
        ai: { status: "skipped", model: null, markdown: null },
        warnings: [],
        errors: [],
        missingConfig: [],
      };
    }

    let lastResponse: Response | null = null;
    for (let index = 0; index < 11; index += 1) {
      lastResponse = await handleTokenContractReportPost(
        new Request("https://pulserevoke.test/api/token-contract-report", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.10" },
          body: JSON.stringify({
            chainId: PULSECHAIN_CHAIN_ID,
            contractAddress: TOKEN,
          }),
        }),
        builder,
      );
    }

    expect(calls).toBe(10);
    expect(lastResponse?.status).toBe(429);
    expect(lastResponse?.headers.get("Retry-After")).toBeTruthy();
  });
});
