import { describe, expect, it, vi } from "vitest";
import { getAddress, type Address } from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";
import { buildTokenContractReport } from "@/lib/token-contract-report-server";

const TOKEN = getAddress("0xA1077a294dDE1B09bB078844df40758a5D0f9a27");
const DEPLOYER = getAddress("0x000000000000000000000000000000000000dEaD");
const IMPLEMENTATION = getAddress(
  "0x0000000000000000000000000000000000000001",
);
const CREATION_TX =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const RUNTIME_WITH_EMBEDDED_PUSH_DATA = `0x6340c10f197f${
  "63a0712d68" + "00".repeat(27)
}00` as `0x${string}`;

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

function aiNarrative(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    title: "Token Contract Report",
    overallVerdict: "unknown risk",
    confidence: 10,
    confidenceReason: "Coverage is limited.",
    mainRisks: [],
    detailedFindings: [],
    whatNotSeen: [],
    selectorWatchlist: [],
    whatToCheckOnChain: [],
    bottomLine: "Risk remains unknown.",
    ...overrides,
  });
}

function requestAction(input: RequestInfo | URL): string | null {
  return requestUrl(input).searchParams.get("action");
}

function requestUrl(input: RequestInfo | URL): URL {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  return new URL(url);
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

    expect(report.status).toBe("partial");
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
    expect(report.ai.reason).toBe("not-configured");
    expect(report.ai.model).toBe("deepseek-v4-pro");
    expect(report.signals.map((signal) => signal.id)).toContain(
      "contract-creation",
    );
    expect(report.warnings.join(" ")).toContain("not a formal audit");
  });

  it("falls back to Blockscout v2 source and creation metadata when legacy PulseScan endpoints fail", async () => {
    let tokenAddressLookupCalls = 0;
    const reader = {
      getBytecode: vi.fn(async () => "0x1234" as `0x${string}`),
      readContract: vi.fn(async (call: { functionName: string }) => {
        if (call.functionName === "name") return "Fallback Token";
        if (call.functionName === "symbol") return "FBK";
        if (call.functionName === "decimals") return 18;
        if (call.functionName === "totalSupply") return 1_000n;
        if (call.functionName === "supportsInterface") return false;
        if (call.functionName === "owner") return DEPLOYER;
        throw new Error("unsupported read");
      }),
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      const path = url.pathname.toLowerCase();

      if (requestAction(input) === "getsourcecode") {
        return Response.json({}, { status: 500 });
      }
      if (requestAction(input) === "getcontractcreation") {
        return Response.json({}, { status: 400 });
      }
      if (path.includes("/api/v2/smart-contracts/")) {
        const isImplementation = path.endsWith(IMPLEMENTATION.toLowerCase());
        return Response.json({
          abi: [
            {
              type: "function",
              name: isImplementation ? "setTaxFee" : "mint",
            },
          ],
          compiler_version: "v0.8.26+commit.8a97fa7a",
          is_verified: true,
          name: isImplementation ? "FallbackImplementation" : "FallbackToken",
          source_code: isImplementation
            ? "contract FallbackImplementation {}"
            : "contract FallbackToken {}",
        });
      }
      if (path.includes("/api/v2/addresses/")) {
        if (path.endsWith(IMPLEMENTATION.toLowerCase())) {
          return Response.json({
            hash: IMPLEMENTATION,
            implementation_address: null,
          });
        }
        tokenAddressLookupCalls += 1;
        if (tokenAddressLookupCalls === 1) {
          return Response.json({}, { status: 500 });
        }
        return Response.json({
          creation_tx_hash: CREATION_TX,
          creator_address_hash: DEPLOYER,
          hash: TOKEN,
          implementation_address: IMPLEMENTATION,
        });
      }
      if (path.includes("/api/v2/transactions/")) {
        return Response.json({
          block: 26744716,
          timestamp: "2026-06-09T17:06:55.000000Z",
        });
      }
      throw new Error(`Unexpected URL ${url.toString()}`);
    });

    const report = await buildTokenContractReport({
      chainId: PULSECHAIN_CHAIN_ID,
      contractAddress: TOKEN,
      includeAi: false,
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
      reader,
    });

    expect(report.contract?.source).toMatchObject({
      verified: "verified",
      contractName: "FallbackToken",
      compilerVersion: "v0.8.26+commit.8a97fa7a",
      abiFunctionCount: 1,
      isProxy: true,
      implementationAddress: IMPLEMENTATION,
    });
    expect(report.contract?.source.controlSurface.mint).toContain("mint");
    expect(report.contract?.source.controlSurface.fees).toContain("setTaxFee");
    expect(report.contract?.source.implementation).toMatchObject({
      address: IMPLEMENTATION,
      verified: "verified",
      contractName: "FallbackImplementation",
      abiFunctionCount: 1,
    });
    expect(report.contract?.creation).toMatchObject({
      transactionHash: CREATION_TX,
      deployerAddress: DEPLOYER,
      blockNumber: 26744716,
      timestamp: "2026-06-09T17:06:55.000Z",
      lookupStatus: "found",
    });
    expect(report.warnings.join(" ")).not.toContain("HTTP 500");
    expect(report.warnings.join(" ")).not.toContain("HTTP 400");
    expect(tokenAddressLookupCalls).toBe(2);
    const requestedUrls = fetcher.mock.calls.map(([input]) =>
      requestUrl(input).toString(),
    );
    expect(requestedUrls).toContain(
      `https://api.scan.pulsechain.com/api/v2/smart-contracts/${TOKEN}`,
    );
    expect(requestedUrls).toContain(
      `https://api.scan.pulsechain.com/api/v2/addresses/${TOKEN}`,
    );
    expect(requestedUrls).toContain(
      `https://api.scan.pulsechain.com/api/v2/transactions/${CREATION_TX}`,
    );
    expect(requestedUrls).toContain(
      `https://api.scan.pulsechain.com/api/v2/smart-contracts/${IMPLEMENTATION}`,
    );
  });

  it("classifies a bytecode-only Blockscout v2 response as unverified and accepts the documented creation hash alias", async () => {
    const reader = {
      getBytecode: vi.fn(async () => "0x1234" as `0x${string}`),
      readContract: vi.fn(async (call: { functionName: string }) => {
        if (call.functionName === "name") return "Unverified Token";
        if (call.functionName === "symbol") return "UVT";
        if (call.functionName === "decimals") return 18;
        if (call.functionName === "totalSupply") return 1_000n;
        if (call.functionName === "supportsInterface") return false;
        throw new Error("unsupported read");
      }),
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      const path = url.pathname.toLowerCase();

      if (requestAction(input)) {
        return Response.json({}, { status: 500 });
      }
      if (path.includes("/api/v2/smart-contracts/")) {
        return Response.json({
          creation_bytecode: "0x6000",
          deployed_bytecode: "0x6001",
          is_self_destructed: false,
        });
      }
      if (path.includes("/api/v2/addresses/")) {
        return Response.json({
          creation_transaction_hash: CREATION_TX,
          creator_address_hash: DEPLOYER,
          hash: TOKEN,
        });
      }
      if (path.includes("/api/v2/transactions/")) {
        return Response.json({
          block_number: "123456",
          timestamp: "1700000000",
        });
      }
      throw new Error(`Unexpected URL ${url.toString()}`);
    });

    const report = await buildTokenContractReport({
      chainId: PULSECHAIN_CHAIN_ID,
      contractAddress: TOKEN,
      includeAi: false,
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
      reader,
    });

    expect(report.contract?.source.verified).toBe("unverified");
    expect(report.contract?.source.abiFunctionCount).toBeNull();
    expect(report.contract?.creation.lookupStatus).toBe("found");
    expect(report.contract?.creation.transactionHash).toBe(CREATION_TX);
    expect(report.contract?.creation.deployerAddress).toBe(DEPLOYER);
  });

  it("calls DeepSeek with Creation Scanner-compatible defaults and bounded evidence", async () => {
    const reader = {
      getBytecode: vi.fn(async () => RUNTIME_WITH_EMBEDDED_PUSH_DATA),
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
        thinking?: { type?: string };
        reasoning_effort?: string;
      };
      bodyText: string;
      model?: string;
      url: string;
    }> = [];
    const fetcher = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
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
            thinking?: { type?: string };
            reasoning_effort?: string;
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
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    title: "Token Contract Report",
                    contractAddress: TOKEN,
                    tokenName: "Wrapped PLS",
                    tokenSymbol: "WPLS",
                    overallVerdict: "low observed risk",
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
                        evidence: ["source-status"],
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
      },
    );

    const report = await buildTokenContractReport({
      chainId: PULSECHAIN_CHAIN_ID,
      contractAddress: TOKEN,
      includeAi: true,
      env: {
        DEEPSEEK_API_KEY: "test-key",
        NODE_ENV: "test",
      } as NodeJS.ProcessEnv,
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
    expect(deepSeekCalls[0]?.body.max_tokens).toBe(3200);
    expect(deepSeekCalls[0]?.body.thinking?.type).toBe("disabled");
    expect(deepSeekCalls[0]?.body.reasoning_effort).toBeUndefined();
    const userPrompt = deepSeekCalls[0]?.body.messages?.find(
      (message) => message.role === "user",
    )?.content;
    expect(userPrompt).toContain("Feature report JSON");
    expect(userPrompt).toContain("Can anyone mint?");
    expect(userPrompt).toContain(
      "Every detailedFindings[].evidence item must be an exact id",
    );
    expect(userPrompt).toContain("0x40c10f19");
    expect(userPrompt).not.toContain("0xa0712d68");
    expect(userPrompt).toContain('"rawSourceCodeSent":false');
    expect(userPrompt).toContain('"rawRuntimeBytecodeSent":false');
    expect(userPrompt).toContain('"runtimeHash"');
    expect(userPrompt).toContain("Wrapped PLS");
    expect(userPrompt).toContain(CREATION_TX);
    expect(userPrompt).toContain(DEPLOYER);
    expect(userPrompt).not.toContain("contract Token {}");
    expect(userPrompt).not.toContain(RUNTIME_WITH_EMBEDDED_PUSH_DATA);
    expect(userPrompt).not.toContain("0x60006000");
    expect(deepSeekCalls[0]?.bodyText).not.toContain("contract Token {}");
    expect(
      deepSeekCalls[0]?.body.messages?.find(
        (message) => message.role === "system",
      )?.content,
    ).toContain("untrusted contract-controlled data");
    expect(report.ai.markdown).toContain("## Token Contract Report");
    expect(report.ai.markdown).toContain("**Overall verdict:** unknown risk");
    expect(report.ai.markdown).toContain(`- Deployer: ${DEPLOYER}`);
    expect(report.ai.markdown).toContain(`- Creation tx: ${CREATION_TX}`);
    expect(report.ai.markdown).toContain("### What To Verify On-Chain");
    expect(report.ai.narrative?.overallVerdict).toBe("unknown risk");
    expect(report.ai.narrative?.detailedFindings[0]?.evidence[0]).toContain(
      "Explorer source metadata",
    );
    expect(report.ai.narrative?.detailedFindings[0]?.evidence).not.toContain(
      "source-status",
    );
    expect(report.ai.reason).toBeNull();
    expect(report.ai.finishReason).toBe("stop");
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

  it("distinguishes an RPC bytecode failure from an address with no bytecode", async () => {
    const reader = {
      getBytecode: vi.fn(async () => {
        throw new Error("RPC unavailable");
      }),
      readContract: vi.fn(),
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

    expect(report.status).toBe("upstream-failure");
    expect(report.signals.map((signal) => signal.id)).toContain(
      "bytecode-unavailable",
    );
    expect(report.signals.map((signal) => signal.id)).not.toContain(
      "no-bytecode",
    );
    expect(report.ai.status).toBe("skipped");
  });

  it.each([
    {
      finishReason: "length",
      content: '{"title":"Token Contract Report"',
      expectedReason: "truncated-output",
    },
    {
      finishReason: "stop",
      content: "{}",
      expectedReason: "invalid-output",
    },
    {
      finishReason: "stop",
      content: aiNarrative({
        bottomLine: "This is a well-known token, but risk remains unknown.",
      }),
      expectedReason: "invalid-output",
    },
    {
      finishReason: "stop",
      content: aiNarrative({
        detailedFindings: [
          {
            severity: "high",
            heading: "Invented evidence",
            evidence: ["not-a-feature-finding-id"],
            description: "This claim is not grounded.",
            practicalEffect: "It must not be rendered.",
          },
        ],
      }),
      expectedReason: "invalid-output",
    },
  ])(
    "rejects DeepSeek $expectedReason responses",
    async ({ finishReason, content, expectedReason }) => {
      const reader = {
        getBytecode: vi.fn(async () => "0x1234" as `0x${string}`),
        readContract: vi.fn(async (call: { functionName: string }) => {
          if (call.functionName === "name") return "Token";
          if (call.functionName === "symbol") return "TKN";
          if (call.functionName === "decimals") return 18;
          if (call.functionName === "totalSupply") return 1_000n;
          if (call.functionName === "supportsInterface") return false;
          throw new Error("unsupported read");
        }),
      };
      const fetcher = vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url.endsWith("/chat/completions")) {
          return Response.json({
            choices: [
              {
                finish_reason: finishReason,
                message: { content },
              },
            ],
          });
        }
        return requestAction(input) === "getcontractcreation"
          ? creationResponse()
          : sourceResponse();
      });

      const report = await buildTokenContractReport({
        chainId: PULSECHAIN_CHAIN_ID,
        contractAddress: TOKEN,
        includeAi: true,
        env: {
          DEEPSEEK_API_KEY: "test-key",
          NODE_ENV: "test",
        } as NodeJS.ProcessEnv,
        fetcher: fetcher as unknown as typeof fetch,
        reader,
      });

      expect(report.ai.status).toBe("unavailable");
      expect(report.ai.reason).toBe(expectedReason);
      expect(report.ai.finishReason).toBe(finishReason);
      expect(report.ai.narrative).toBeNull();
    },
  );

  it("adds live owner and categorized verified-ABI control evidence", async () => {
    const reader = {
      getBytecode: vi.fn(async () => "0x1234" as `0x${string}`),
      readContract: vi.fn(async (call: { functionName: string }) => {
        if (call.functionName === "name") return "Control Token";
        if (call.functionName === "symbol") return "CTRL";
        if (call.functionName === "decimals") return 18;
        if (call.functionName === "totalSupply") return 1_000n;
        if (call.functionName === "supportsInterface") return false;
        if (call.functionName === "owner") return DEPLOYER;
        throw new Error("unsupported read");
      }),
    };
    const abi = [
      { type: "function", name: "mint" },
      { type: "function", name: "setTaxFee" },
      { type: "function", name: "blacklist" },
      { type: "function", name: "upgradeTo" },
      { type: "function", name: "addLiquidity" },
    ];
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      requestAction(input) === "getcontractcreation"
        ? creationResponse()
        : sourceResponse(abi),
    );

    const report = await buildTokenContractReport({
      chainId: PULSECHAIN_CHAIN_ID,
      contractAddress: TOKEN,
      includeAi: false,
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
      reader,
    });

    expect(report.controls).toEqual({
      ownerAddress: DEPLOYER,
      ownershipStatus: "found",
      ownerMethod: "owner",
      ownerCandidates: {
        owner: DEPLOYER,
        getOwner: null,
      },
    });
    expect(report.contract?.source.abiFunctionCount).toBe(abi.length);
    expect(report.contract?.source.controlSurface.mint).toContain("mint");
    expect(report.contract?.source.controlSurface.fees).toContain("setTaxFee");
    expect(
      report.contract?.source.controlSurface.transferRestrictions,
    ).toContain("blacklist");
    expect(report.contract?.source.controlSurface.admin).toContain("upgradeTo");
    expect(report.contract?.source.controlSurface.liquidity).toContain(
      "addLiquidity",
    );
    expect(report.signals.map((signal) => signal.id)).toEqual(
      expect.arrayContaining([
        "owner-control",
        "abi-mint-surface",
        "abi-admin-surface",
        "abi-fee-surface",
        "abi-transfer-control-surface",
        "abi-liquidity-surface",
      ]),
    );
    expect(report.audit.coveragePercent).toBeGreaterThan(0);
  });

  it("reports conflicting owner getters instead of accepting a false renounce or arbitrary owner", async () => {
    const zeroAddress = getAddress(
      "0x0000000000000000000000000000000000000000",
    );
    const reader = {
      getBytecode: vi.fn(async () => "0x1234" as `0x${string}`),
      readContract: vi.fn(async (call: { functionName: string }) => {
        if (call.functionName === "name") return "Conflict Token";
        if (call.functionName === "symbol") return "CNF";
        if (call.functionName === "decimals") return 18;
        if (call.functionName === "totalSupply") return 1_000n;
        if (call.functionName === "supportsInterface") return false;
        if (call.functionName === "owner") return zeroAddress;
        if (call.functionName === "getOwner") return DEPLOYER;
        throw new Error("unsupported read");
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
      includeAi: false,
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
      reader,
    });

    expect(report.controls).toEqual({
      ownerAddress: null,
      ownershipStatus: "conflicting",
      ownerMethod: null,
      ownerCandidates: {
        owner: zeroAddress,
        getOwner: DEPLOYER,
      },
    });
    expect(report.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "owner-getter-conflict",
          severity: "medium",
          status: "incomplete",
        }),
      ]),
    );
    expect(report.signals.map((signal) => signal.id)).not.toContain(
      "owner-renounced",
    );
  });

  it("detects ERC-721, ERC-1155, proxy, and ERC-6909-like ABI signals", async () => {
    const reader = {
      getBytecode: vi.fn(async () => "0x1234" as `0x${string}`),
      readContract: vi.fn(
        async (call: { functionName: string; args?: readonly unknown[] }) => {
          if (call.functionName === "name") throw new Error("no name");
          if (call.functionName === "symbol") throw new Error("no symbol");
          if (call.functionName === "decimals") throw new Error("no decimals");
          if (call.functionName === "totalSupply") throw new Error("no supply");
          if (call.functionName === "supportsInterface") {
            return call.args?.[0] !== "0xffffffff";
          }
          throw new Error("unexpected read");
        },
      ),
    };
    const implementation = IMPLEMENTATION;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (requestAction(input) === "getcontractcreation") {
        return creationResponse();
      }
      const url =
        typeof input === "string"
          ? new URL(input)
          : input instanceof URL
            ? input
            : new URL(input.url);
      if (
        url.searchParams.get("address")?.toLowerCase() ===
        implementation.toLowerCase()
      ) {
        return sourceResponse([
          { type: "function", name: "mint" },
          { type: "function", name: "setTaxFee" },
          { type: "function", name: "blacklist" },
        ]);
      }
      return Response.json({
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
            Implementation: implementation,
          },
        ],
      });
    });

    const report = await buildTokenContractReport({
      chainId: PULSECHAIN_CHAIN_ID,
      contractAddress: TOKEN,
      includeAi: false,
      env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      fetcher: fetcher as unknown as typeof fetch,
      reader,
    });

    expect(report.status).toBe("partial");
    expect(report.contract?.source.isProxy).toBe(true);
    expect(report.contract?.source.implementationAddress).toBe(
      implementation as Address,
    );
    expect(report.contract?.source.implementation).toMatchObject({
      address: implementation,
      verified: "verified",
      abiFunctionCount: 3,
    });
    expect(report.contract?.source.controlSurface.mint).toContain("mint");
    expect(report.contract?.source.controlSurface.fees).toContain("setTaxFee");
    expect(
      report.contract?.source.controlSurface.transferRestrictions,
    ).toContain("blacklist");
    expect(report.standards.erc721).toBe(true);
    expect(report.standards.erc1155).toBe(true);
    expect(report.standards.erc6909).toBe("detected");
    expect(report.signals.map((signal) => signal.id)).toContain(
      "proxy-contract",
    );
    expect(report.signals.map((signal) => signal.id)).toContain(
      "proxy-implementation-source",
    );
  });
});
