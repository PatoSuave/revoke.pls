import { describe, expect, it, vi } from "vitest";
import {
  encodeErrorResult,
  encodeFunctionData,
  getAddress,
  keccak256,
  padHex,
  parseAbi,
  stringToHex,
  type Address,
  type Hex,
} from "viem";

import {
  EIP1967_ADMIN_SLOT,
  EIP1967_BEACON_SLOT,
  EIP1967_IMPLEMENTATION_SLOT,
  OWNERSHIP_TRANSFERRED_TOPIC,
  READ_ONLY_SIMULATION_INVARIANT,
  TOKEN_DEEP_EVIDENCE_LIMITS,
  analyzeRuntimeBytecode,
  buildReadOnlySimulationPlan,
  canonicalizeAbiFunctions,
  decodeBoundedContractHistory,
  decodeEip1967StorageValues,
  fetchFourByteDirectoryCandidates,
  resolveRuntimeSelectors,
  runReadOnlySimulationPlan,
  type ReadOnlySimulationCandidate,
} from "@/lib/token-contract-deep-evidence";

const TOKEN = getAddress("0xbbca9774331066948A6b2a68Bc7a51B0392aF9F1");
const HOLDER = getAddress("0x0000000000000000000000000000000000000011");
const CONTROLLER = getAddress("0x0000000000000000000000000000000000000022");
const ZERO = getAddress("0x0000000000000000000000000000000000000000");

const POSVE_SIX_ABI = parseAbi([
  "function transferToburn(uint256 amount)",
  "function approver(address account, bool blocked)",
  "function _Holders(uint256 index) view returns (address)",
  "function approvet(address account, bool blocked)",
  "function getTokenHolders() view returns (address[])",
  "function decreaseAllowance(address spender, uint256 subtractedValue) returns (bool)",
]);

const POSVE_SIX_SELECTORS = {
  "0x0df88456": "transferToburn(uint256)",
  "0x48f2f812": "approver(address,bool)",
  "0x4a7eb02e": "_Holders(uint256)",
  "0x6b254a9a": "approvet(address,bool)",
  "0x876b1566": "getTokenHolders()",
  "0xa457c2d7": "decreaseAllowance(address,uint256)",
} as const;

function dispatcherBytecode(selectors: readonly string[]): Hex {
  const body = selectors
    .map((selector, index) => {
      const destination = (0x100 + index * 0x10).toString(16).padStart(4, "0");
      return `63${selector.slice(2)}1461${destination}57`;
    })
    .join("");
  return `0x${body}00`;
}

function eip1967Slot(label: string): Hex {
  const hashed = BigInt(keccak256(stringToHex(label))) - 1n;
  return `0x${hashed.toString(16).padStart(64, "0")}`;
}

describe("token contract deep evidence", () => {
  it("canonically resolves all six POSVE selectors from verified ABI first", async () => {
    const fourByteLookup = vi.fn(async () => ["invented()"]);
    const runtimeBytecode = dispatcherBytecode(Object.keys(POSVE_SIX_SELECTORS));

    const result = await resolveRuntimeSelectors({
      runtimeBytecode,
      abi: POSVE_SIX_ABI,
      fourByteLookup,
    });

    expect(result.counts).toMatchObject({
      observed: 6,
      resolved: 6,
      ambiguous: 0,
      unresolved: 0,
      fourByteLookups: 0,
    });
    expect(fourByteLookup).not.toHaveBeenCalled();
    for (const [selector, signature] of Object.entries(POSVE_SIX_SELECTORS)) {
      expect(result.selectors).toContainEqual(
        expect.objectContaining({
          selector,
          state: "resolved",
          source: "verified-abi",
          resolvedSignature: signature,
        }),
      );
    }
    expect(
      result.abi.functions.find(
        (item) => item.signature === "getTokenHolders()",
      ),
    ).toMatchObject({
      stateMutability: "view",
      inputs: [],
      outputs: [
        expect.objectContaining({ type: "address[]", canonicalType: "address[]" }),
      ],
    });
  });

  it("retains canonical tuple signatures, mutability, inputs, and outputs", () => {
    const abi = [
      {
        type: "function",
        name: "inspect",
        stateMutability: "view",
        inputs: [
          {
            name: "records",
            type: "tuple[]",
            components: [
              { name: "account", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
        ],
        outputs: [{ name: "ok", type: "bool" }],
      },
    ];

    expect(canonicalizeAbiFunctions(abi).functions[0]).toMatchObject({
      signature: "inspect((address,uint256)[])",
      stateMutability: "view",
      inputs: [
        expect.objectContaining({
          canonicalType: "(address,uint256)[]",
        }),
      ],
      outputs: [expect.objectContaining({ canonicalType: "bool" })],
    });
  });

  it("marks oversized and deeply nested ABI input partial without unbounded recursion", async () => {
    let nested: Record<string, unknown> = { name: "leaf", type: "uint256" };
    for (let depth = 0; depth < 12; depth += 1) {
      nested = { name: `level${depth}`, type: "tuple", components: [nested] };
    }
    const oversized = Array.from(
      { length: TOKEN_DEEP_EVIDENCE_LIMITS.maxAbiItems + 1 },
      (_, index) =>
        index === 0
          ? {
              type: "function",
              name: "deep",
              stateMutability: "view",
              inputs: [nested],
              outputs: [],
            }
          : { type: "event", name: `Event${index}`, inputs: [] },
    );

    const result = canonicalizeAbiFunctions(oversized);

    expect(result).toMatchObject({
      inputItemCount: TOKEN_DEEP_EVIDENCE_LIMITS.maxAbiItems + 1,
      omittedItemCount: 1,
      limitExceededFunctionCount: 1,
      partial: true,
      functions: [],
    });
    const resolution = await resolveRuntimeSelectors({
      runtimeBytecode: "0x00",
      abi: oversized,
    });
    expect(resolution.partial).toBe(true);
    expect(resolution.warnings.join(" ")).toContain(
      "ABI normalization was partial",
    );
  });

  it("disassembles real instructions without treating PUSH data as opcodes", () => {
    const fakePushData = `63deadbeef55f1ff${"00".repeat(24)}`;
    const runtime = `0x7f${fakePushData}63a9059cbb1461002b575b55f1ff`;

    const analysis = analyzeRuntimeBytecode(runtime);

    expect(analysis.status).toBe("complete");
    expect(analysis.selectors.map((item) => item.selector)).toEqual([
      "0xa9059cbb",
    ]);
    expect(analysis.selectors[0]).toMatchObject({
      evidence: "dispatcher-comparison",
      jumpDestinations: [43],
    });
    expect(analysis.sensitiveOpcodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "SSTORE", count: 1 }),
        expect.objectContaining({ name: "CALL", count: 1 }),
        expect.objectContaining({ name: "SELFDESTRUCT", count: 1 }),
      ]),
    );
    expect(analysis.functionSlices).toEqual([
      expect.objectContaining({
        selector: "0xa9059cbb",
        startOffset: 43,
        sensitiveOpcodes: ["SSTORE", "CALL", "SELFDESTRUCT"],
      }),
    ]);
  });

  it("marks embedded-address evidence partial when its cap is reached", () => {
    const bytecode = `0x${Array.from({ length: 65 }, (_, index) => {
      const address = (index + 1).toString(16).padStart(40, "0");
      return `73${address}`;
    }).join("")}`;

    const analysis = analyzeRuntimeBytecode(bytecode);

    expect(analysis.status).toBe("partial");
    expect(analysis.embeddedAddresses).toHaveLength(
      TOKEN_DEEP_EVIDENCE_LIMITS.maxEmbeddedAddresses,
    );
    expect(analysis.warnings.join(" ")).toContain(
      "Embedded-address evidence was capped",
    );
  });

  it("keeps colliding 4byte candidates ambiguous and no-result selectors unresolved", async () => {
    const lookup = vi.fn(async (selector: `0x${string}`) => {
      if (selector === "0x42966c68") {
        return ["burn(uint256)", "collate_propagate_storage(bytes16)"];
      }
      return [];
    });
    const result = await resolveRuntimeSelectors({
      runtimeBytecode: dispatcherBytecode(["0x42966c68", "0x12345678"]),
      abi: [],
      localWatchlist: {},
      fourByteLookup: lookup,
    });

    expect(result.selectors.find((item) => item.selector === "0x42966c68"))
      .toMatchObject({
        state: "ambiguous",
        source: "4byte-directory",
        resolvedSignature: null,
        possibleSignatures: [
          "burn(uint256)",
          "collate_propagate_storage(bytes16)",
        ],
      });
    expect(result.selectors.find((item) => item.selector === "0x12345678"))
      .toMatchObject({
        state: "unresolved",
        source: "unresolved",
        resolvedSignature: null,
        possibleSignatures: [],
      });
    expect(result.counts).toMatchObject({
      ambiguous: 1,
      unresolved: 1,
      fourByteLookups: 2,
    });
  });

  it("bounds and validates 4byte.directory candidate responses", async () => {
    const ambiguousFetcher = vi.fn(async () =>
      Response.json({
        results: [
          { text_signature: "burn(uint256)" },
          { text_signature: "collate_propagate_storage(bytes16)" },
          { text_signature: "wrongSelector(address)" },
        ],
      }),
    );
    const ambiguous = await fetchFourByteDirectoryCandidates("0x42966c68", {
      fetcher: ambiguousFetcher as unknown as typeof fetch,
    });
    expect(ambiguous).toMatchObject({
      status: "resolved",
      selector: "0x42966c68",
      candidates: ["burn(uint256)", "collate_propagate_storage(bytes16)"],
      discardedCandidateCount: 1,
    });

    const empty = await fetchFourByteDirectoryCandidates("0x12345678", {
      fetcher: vi.fn(async () => Response.json({ results: [] })) as unknown as typeof fetch,
    });
    expect(empty).toMatchObject({
      status: "no-result",
      candidates: [],
      error: null,
    });

    const paginated = await fetchFourByteDirectoryCandidates("0x42966c68", {
      maxCandidates: 1,
      fetcher: vi.fn(async () =>
        Response.json({
          count: 2,
          next: "https://www.4byte.directory/api/v1/signatures/?page=2",
          results: [{ text_signature: "burn(uint256)" }],
        }),
      ) as unknown as typeof fetch,
    });
    expect(paginated).toMatchObject({
      status: "partial",
      candidates: ["burn(uint256)"],
      unreturnedCandidateCount: 1,
    });
    const paginatedResolution = await resolveRuntimeSelectors({
      runtimeBytecode: dispatcherBytecode(["0x42966c68"]),
      abi: [],
      localWatchlist: {},
      fourByteLookup: vi.fn(async () => paginated),
    });
    expect(paginatedResolution.selectors[0]).toMatchObject({
      state: "ambiguous",
      source: "4byte-directory",
      resolvedSignature: null,
      possibleSignatures: ["burn(uint256)"],
    });
  });

  it("uses exact EIP-1967 slots and decodes padded slot addresses", () => {
    expect(EIP1967_IMPLEMENTATION_SLOT).toBe(
      eip1967Slot("eip1967.proxy.implementation"),
    );
    expect(EIP1967_ADMIN_SLOT).toBe(eip1967Slot("eip1967.proxy.admin"));
    expect(EIP1967_BEACON_SLOT).toBe(eip1967Slot("eip1967.proxy.beacon"));

    const evidence = decodeEip1967StorageValues({
      implementation: padHex(TOKEN, { size: 32 }),
      admin: padHex(CONTROLLER, { size: 32 }),
      beacon: "0x0",
    });

    expect(evidence).toMatchObject({
      implementationAddress: TOKEN,
      adminAddress: CONTROLLER,
      beaconAddress: null,
      proxyEvidence: "present",
    });
    expect(evidence.readings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "implementation", state: "set" }),
        expect.objectContaining({ kind: "admin", state: "set" }),
        expect.objectContaining({ kind: "beacon", state: "empty" }),
      ]),
    );
  });

  it("caps simulation plans at twelve and represents read-only reverts", async () => {
    const candidates = Array.from(
      { length: 20 },
      (_, index): ReadOnlySimulationCandidate => ({
        id: `call-${index}`,
        kind: "custom",
        from: HOLDER,
        to: TOKEN,
        data: `0x${index.toString(16).padStart(8, "0")}`,
        functionSignature: null,
        evidenceIds: [],
      }),
    );
    const plan = buildReadOnlySimulationPlan(candidates);
    expect(plan.calls).toHaveLength(TOKEN_DEEP_EVIDENCE_LIMITS.maxSimulations);
    expect(plan).toMatchObject({
      rpcMethod: "eth_call",
      omittedCount: 8,
      capped: true,
    });
    expect(READ_ONLY_SIMULATION_INVARIANT).toEqual({
      rpcMethod: "eth_call",
      capturedBlockRequired: true,
      submitsTransactions: false,
      signsTransactions: false,
      fundsAccounts: false,
      relaysTransactions: false,
    });

    const errorAbi = parseAbi(["error Blocked(address account)"]);
    const revertData = encodeErrorResult({
      abi: errorAbi,
      errorName: "Blocked",
      args: [HOLDER],
    });
    const result = await runReadOnlySimulationPlan({
      plan: buildReadOnlySimulationPlan([candidates[0]]),
      blockNumber: 123_456n,
      errorAbi,
      ethCall: vi.fn(async () => {
        throw { message: "execution reverted", data: revertData };
      }),
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: "call-0",
        status: "revert",
        blockNumber: "123456",
        revert: expect.objectContaining({
          kind: "custom-error",
          name: "Blocked",
          args: [HOLDER],
          data: revertData,
        }),
      }),
    ]);

    const returnedFalse = await runReadOnlySimulationPlan({
      plan: buildReadOnlySimulationPlan([
        { ...candidates[0], interpretReturnAsBoolean: true },
      ]),
      blockNumber: 123_456n,
      ethCall: vi.fn(async () => `0x${"00".repeat(32)}` as Hex),
    });
    expect(returnedFalse).toEqual([
      expect.objectContaining({
        status: "returned-false",
        returnData: `0x${"00".repeat(32)}`,
      }),
    ]);

    const timedOut = await runReadOnlySimulationPlan({
      plan: buildReadOnlySimulationPlan([candidates[0]]),
      blockNumber: 123_456n,
      timeoutMs: 100,
      ethCall: vi.fn(() => new Promise<Hex>(() => undefined)),
    });
    expect(timedOut).toEqual([
      expect.objectContaining({
        status: "rpc-error",
        error: expect.stringContaining("timed out"),
      }),
    ]);
  });

  it("decodes at most fifty recent calls and marks controller activity after owner zero", () => {
    const abi = parseAbi([
      "function approver(address account, bool blocked)",
    ]);
    const input = encodeFunctionData({
      abi,
      functionName: "approver",
      args: [HOLDER, true],
    });
    const topic = (address: Address) => padHex(address, { size: 32 });
    const calls = Array.from({ length: 55 }, (_, index) => ({
      transactionHash: `0x${index.toString(16).padStart(64, "0")}`,
      from: CONTROLLER,
      to: TOKEN,
      input,
      blockNumber: 101 + index,
      success: true,
    }));

    const history = decodeBoundedContractHistory({
      calls,
      abi,
      privilegedSignatures: ["approver(address,bool)"],
      controllerAddresses: [CONTROLLER],
      ownershipLogs: [
        {
          transactionHash: `0x${"ab".repeat(32)}`,
          blockNumber: 100,
          topics: [
            OWNERSHIP_TRANSFERRED_TOPIC,
            topic(CONTROLLER),
            topic(ZERO),
          ],
        },
      ],
    });

    expect(history).toMatchObject({
      inputCallCount: 55,
      omittedCallCount: 5,
      partial: true,
    });
    expect(history.calls).toHaveLength(50);
    expect(history.calls[0]).toMatchObject({
      blockNumber: "155",
      state: "decoded",
      functionSignature: "approver(address,bool)",
      args: [HOLDER, true],
      configuredPrivilegedCall: true,
      fromConfiguredController: true,
      afterOwnerReachedZero: true,
    });
    expect(history.ownershipTransfers).toEqual([
      expect.objectContaining({
        previousOwner: CONTROLLER,
        newOwner: ZERO,
        renounced: true,
      }),
    ]);

    const sameBlock = decodeBoundedContractHistory({
      calls: [
        {
          from: CONTROLLER,
          to: TOKEN,
          input,
          blockNumber: 100,
        },
      ],
      abi,
      ownershipLogs: [
        {
          blockNumber: 90,
          topics: [
            OWNERSHIP_TRANSFERRED_TOPIC,
            topic(ZERO),
            topic(CONTROLLER),
          ],
        },
        {
          blockNumber: 100,
          topics: [
            OWNERSHIP_TRANSFERRED_TOPIC,
            topic(CONTROLLER),
            topic(ZERO),
          ],
        },
      ],
    });
    expect(sameBlock.calls[0].afterOwnerReachedZero).toBeNull();
  });
});
