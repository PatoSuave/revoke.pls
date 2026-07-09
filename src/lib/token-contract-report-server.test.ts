import { describe, expect, it, vi } from "vitest";
import { getAddress, type Address } from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import { buildTokenContractReport } from "@/lib/token-contract-report-server";

const TOKEN = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const DEPLOYER = getAddress("0x000000000000000000000000000000000000dEaD");
const CREATION_TX =
  "0x1111111111111111111111111111111111111111111111111111111111111111";

function sourceResponse(abi: unknown[] = []) {
  return Response.json({
    status: "1",
    result: [
      {
        SourceCode: "contract Token {}",
        ABI: JSON.stringify(abi),
        ContractName: "Token",
        Proxy: "0",
        Implementation: "",
      },
    ],
  });
}

function creationResponse() {
  return Response.json({
    status: "1",
    result: [
      {
        contractAddress: TOKEN,
        contractCreator: DEPLOYER,
        txHash: CREATION_TX,
        blockNumber: "123456",
        timestamp: "1700000000",
        creationBytecode: "0x60006000",
      },
    ],
  });
}

function requestAction(input: RequestInfo | URL): string | null {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  return new URL(url).searchParams.get("action");
}

describe("token contract report server", () => {
  it("returns structured evidence when DeepSeek is not configured", async () => {
    const reader = {
      getBytecode: vi.fn(async () => "0x1234" as `0x${string}`),
      readContract: vi.fn(async (call: { functionName: string }) => {
        if (call.functionName === "name") return "Wrapped PLS";
        if (call.functionName === "symbol") return "WPLS";
        if (call.functionName === "decimals") return 18;
        if (call.functionName === "totalSupply") return 1000000000000000000n;
        if (call.functionName === "supportsInterface") return false;
        if (call.functionName === "asset") throw new Error("not a vault");
        if (call.functionName === "totalAssets") throw new Error("not a vault");
        throw new Error("unexpected read");
      }),
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      requestAction(input) === "getcontractcreation"
        ? creationResponse()
        : sourceResponse(),
    );

    const report = await buildTokenContractReport({
      chainId: PULSECHAIN_CHAIN_ID,
      contractAddress: TOKEN,
      includeAi: true,
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
      reader,
    });

    expect(report.status).toBe("complete");
    expect(report.ok).toBe(true);
    expect(report.chain?.chainId).toBe(PULSECHAIN_CHAIN_ID);
    expect(report.contract?.hasBytecode).toBe(true);
    expect(report.contract?.address).toBe(TOKEN);
    expect(report.contract?.creation.transactionHash).toBe(CREATION_TX);
    expect(report.contract?.creation.deployerAddress).toBe(DEPLOYER);
    expect(report.contract?.creation.lookupStatus).toBe("found");
    expect(report.contract?.creation.blockNumber).toBe(123456);
    expect(report.contract?.creation.timestamp).toBe(
      "2023-11-14T22:13:20.000Z",
    );
    expect(report.contract?.source.verified).toBe("verified");
    expect(report.standards.erc20Like).toBe(true);
    expect(report.token.symbol).toBe("WPLS");
    expect(report.ai.status).toBe("unavailable");
    expect(report.signals.map((signal) => signal.id)).toContain(
      "contract-creation",
    );
    expect(report.warnings.join(" ")).toContain("not a formal audit");
  });

  it("calls DeepSeek with Creation Scanner-compatible defaults and bounded evidence", async () => {
    const reader = {
      getBytecode: vi.fn(async () => "0x1234" as `0x${string}`),
      readContract: vi.fn(async (call: { functionName: string }) => {
        if (call.functionName === "name") return "Wrapped PLS";
        if (call.functionName === "symbol") return "WPLS";
        if (call.functionName === "decimals") return 18;
        if (call.functionName === "totalSupply") return 1000000000000000000n;
        if (call.functionName === "supportsInterface") return false;
        if (call.functionName === "asset") throw new Error("not a vault");
        if (call.functionName === "totalAssets") throw new Error("not a vault");
        throw new Error("unexpected read");
      }),
    };
    const deepSeekCalls: Array<{
      authorization: string | null;
      body: {
        max_tokens?: number;
        messages?: Array<{ content?: string; role?: string }>;
        model?: string;
        response_format?: { type?: string };
        temperature?: number;
      };
      bodyText: string;
      model?: string;
      url: string;
    }> = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.endsWith("/chat/completions")) {
        const bodyText = String(init?.body ?? "");
        const body = JSON.parse(bodyText) as {
          max_tokens?: number;
          messages?: Array<{ content?: string; role?: string }>;
          model?: string;
          response_format?: { type?: string };
          temperature?: number;
        };
        deepSeekCalls.push({
          authorization: new Headers(init?.headers).get("authorization"),
          body,
          bodyText,
          model: body.model,
          url,
        });

        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Token Contract Report",
                  contractAddress: TOKEN,
                  tokenName: "Wrapped PLS",
                  tokenSymbol: "WPLS",
                  overallVerdict: "unknown risk",
                  confidence: 68,
                  confidenceReason:
                    "Getter reads were successful, but deeper transfer and simulation checks were not collected.",
                  mainRisks: [
                    "v1 scanner did not collect sell simulation or transfer-path controls.",
                  ],
                  detailedFindings: [
                    {
                      severity: "medium",
                      heading: "Source and getter evidence only",
                      evidence: ["ERC-20-style getters returned token metadata."],
                      description:
                        "The report is based on bounded deterministic evidence.",
                      practicalEffect:
                        "The result should not be treated as proof that the token is safe.",
                    },
                  ],
                  whatNotSeen: ["No sell simulation evidence was provided."],
                  selectorWatchlist: [],
                  whatToCheckOnChain: ["Verify mint and owner controls."],
                  bottomLine:
                    "Use this as read-only context, not as a formal audit.",
                }),
              },
            },
          ],
          model: "deepseek-v4-pro",
        });
      }

      if (requestAction(input) === "getcontractcreation") {
        return creationResponse();
      }

      return sourceResponse([{ type: "function", name: "totalSupply" }]);
    });

    const report = await buildTokenContractReport({
      chainId: PULSECHAIN_CHAIN_ID,
      contractAddress: TOKEN,
      includeAi: true,
      env: { DEEPSEEK_API_KEY: "test-key", NODE_ENV: "test" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
      reader,
    });

    expect(report.ai.status).toBe("generated");
    expect(report.ai.model).toBe("deepseek-v4-pro");
    expect(deepSeekCalls).toHaveLength(1);
    expect(deepSeekCalls[0]?.url).toBe(
      "https://api.deepseek.com/chat/completions",
    );
    expect(deepSeekCalls[0]?.authorization).toBe("Bearer test-key");
    expect(deepSeekCalls[0]?.model).toBe("deepseek-v4-pro");
    expect(deepSeekCalls[0]?.body.response_format?.type).toBe("json_object");
    expect(deepSeekCalls[0]?.body.temperature).toBe(0.1);
    expect(deepSeekCalls[0]?.body.max_tokens).toBe(2200);
    const userPrompt = deepSeekCalls[0]?.body.messages?.find(
      (message) => message.role === "user",
    )?.content;
    expect(userPrompt).toContain("Feature report JSON");
    expect(userPrompt).toContain("Can anyone mint?");
    expect(userPrompt).toContain('"rawSourceCodeSent":false');
    expect(userPrompt).toContain('"rawRuntimeBytecodeSent":false');
    expect(userPrompt).toContain('"runtimeHash"');
    expect(userPrompt).toContain("Wrapped PLS");
    expect(userPrompt).toContain(CREATION_TX);
    expect(userPrompt).toContain(DEPLOYER);
    expect(userPrompt).not.toContain("contract Token {}");
    expect(userPrompt).not.toContain("0x1234");
    expect(userPrompt).not.toContain("0x60006000");
    expect(deepSeekCalls[0]?.bodyText).not.toContain("contract Token {}");
    expect(report.ai.markdown).toContain("## Token Contract Report");
    expect(report.ai.markdown).toContain("**Overall verdict:** unknown risk");
    expect(report.ai.markdown).toContain(`- Deployer: ${DEPLOYER}`);
    expect(report.ai.markdown).toContain(`- Creation tx: ${CREATION_TX}`);
    expect(report.ai.markdown).toContain("### What To Verify On-Chain");
  });

  it("rejects addresses without deployed bytecode", async () => {
    const reader = {
      getBytecode: vi.fn(async () => "0x" as `0x${string}`),
      readContract: vi.fn(),
    };
    const fetcher = vi.fn(async () => sourceResponse());

    const report = await buildTokenContractReport({
      chainId: PULSECHAIN_CHAIN_ID,
      contractAddress: TOKEN,
      includeAi: false,
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
      reader,
    });

    expect(report.status).toBe("unsupported-standard");
    expect(report.ok).toBe(false);
    expect(report.signals[0]?.id).toBe("no-bytecode");
    expect(reader.readContract).not.toHaveBeenCalled();
  });

  it("detects ERC-721, ERC-1155, proxy, and ERC-6909-like ABI signals", async () => {
    const reader = {
      getBytecode: vi.fn(async () => "0x1234" as `0x${string}`),
      readContract: vi.fn(async (call: { functionName: string; args?: readonly unknown[] }) => {
        if (call.functionName === "name") throw new Error("no name");
        if (call.functionName === "symbol") throw new Error("no symbol");
        if (call.functionName === "decimals") throw new Error("no decimals");
        if (call.functionName === "totalSupply") throw new Error("no supply");
        if (call.functionName === "supportsInterface") return true;
        throw new Error("unexpected read");
      }),
    };
    const fetcher = vi.fn(async () =>
      Response.json({
        result: [
          {
            SourceCode: "contract Multi {}",
            ABI: JSON.stringify([
              { type: "function", name: "setOperator" },
              { type: "function", name: "isOperator" },
              { type: "function", name: "allowance" },
            ]),
            ContractName: "Multi",
            Proxy: "1",
            Implementation: "0x0000000000000000000000000000000000000001",
          },
        ],
      }),
    );

    const report = await buildTokenContractReport({
      chainId: PULSECHAIN_CHAIN_ID,
      contractAddress: TOKEN,
      includeAi: false,
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
      reader,
    });

    expect(report.status).toBe("complete");
    expect(report.contract?.source.isProxy).toBe(true);
    expect(report.contract?.source.implementationAddress).toBe(
      "0x0000000000000000000000000000000000000001" as Address,
    );
    expect(report.standards.erc721).toBe(true);
    expect(report.standards.erc1155).toBe(true);
    expect(report.standards.erc6909).toBe("detected");
    expect(report.signals.map((signal) => signal.id)).toContain(
      "proxy-contract",
    );
  });
});
