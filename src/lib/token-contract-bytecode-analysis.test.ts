import { describe, expect, it } from "vitest";
import { getAddress } from "viem";

import { analyzeBytecodeControlFlow } from "@/lib/token-contract-bytecode-analysis";
import { analyzeRuntimeBytecode } from "@/lib/token-contract-deep-evidence";

describe("bounded token bytecode control-flow analysis", () => {
  it("builds PUSH-aware blocks and associates reachable opcodes with a dispatcher path", () => {
    const runtime =
      `0x7f${"5b55f1ff"}${"00".repeat(28)}` +
      "63a9059cbb1461002b575b55f1ff";

    const analysis = analyzeRuntimeBytecode(runtime);
    const controlFlow = analysis.controlFlow;

    expect(controlFlow.status).toBe("complete");
    expect(controlFlow.blocks.map((block) => block.startOffset)).toEqual([0, 43]);
    expect(controlFlow.dispatcherSelectors).toEqual([
      {
        selector: "0xa9059cbb",
        comparisonLocations: [33],
        entryOffsets: [43],
      },
    ]);
    expect(controlFlow.selectorPaths).toEqual([
      expect.objectContaining({
        selector: "0xa9059cbb",
        status: "complete",
        reachableBlockOffsets: [43],
        sensitiveOpcodes: expect.arrayContaining([
          expect.objectContaining({ name: "SSTORE", locations: [44] }),
          expect.objectContaining({ name: "CALL", locations: [45] }),
          expect.objectContaining({ name: "SELFDESTRUCT", locations: [46] }),
        ]),
      }),
    ]);
  });

  it("keeps stray PUSH4 values separate from validated callable selectors", () => {
    const analysis = analyzeRuntimeBytecode(
      "0x63deadbeef5063a9059cbb14601057005bf100",
    );

    expect(analysis.selectors.map((item) => item.selector)).toEqual([
      "0xa9059cbb",
      "0xdeadbeef",
    ]);
    expect(analysis.controlFlow.dispatcherSelectors).toEqual([
      {
        selector: "0xa9059cbb",
        comparisonLocations: [6],
        entryOffsets: [16],
      },
    ]);
    expect(analysis.controlFlow.strayPush4Constants).toEqual([
      { selector: "0xdeadbeef", locations: [0] },
    ]);
    expect(analysis.controlFlow.selectorPaths[0]?.sensitiveOpcodes).toEqual([
      expect.objectContaining({ name: "CALL", locations: [17] }),
    ]);
  });

  it("marks selector reachability partial at unresolved dynamic jumps", () => {
    const analysis = analyzeRuntimeBytecode(
      "0x63a9059cbb14600a57005b3556",
    );

    expect(analysis.status).toBe("partial");
    expect(analysis.controlFlow).toMatchObject({
      status: "partial",
      unresolvedDynamicJumpOffsets: [12],
    });
    expect(analysis.controlFlow.selectorPaths[0]).toMatchObject({
      selector: "0xa9059cbb",
      status: "partial",
      unresolvedDynamicJumpOffsets: [12],
    });
    expect(analysis.controlFlow.warnings.join(" ")).toContain(
      "absence of behavior cannot be inferred",
    );
  });

  it("detects exact EIP-1167 runtimes and treats trailing-data variants as clues", () => {
    const implementation = "0x00000000000000000000000000000000000000a1";
    const canonical =
      `0x363d3d373d3d3d363d73${implementation.slice(2)}` +
      "5af43d82803e903d91602b57fd5bf3";

    expect(analyzeRuntimeBytecode(canonical).controlFlow.clone).toEqual({
      detected: true,
      state: "confirmed",
      pattern: "canonical-runtime",
      implementationAddress: getAddress(implementation),
      trailingDataBytes: 0,
      note: expect.stringContaining("canonical EIP-1167"),
    });
    expect(analyzeRuntimeBytecode(`${canonical}1234`).controlFlow.clone).toEqual(
      expect.objectContaining({
        detected: true,
        state: "review-clue",
        pattern: "canonical-runtime-with-trailing-data",
        implementationAddress: getAddress(implementation),
        trailingDataBytes: 2,
      }),
    );
  });

  it("honors block caps and already-aborted signals", () => {
    const base = analyzeRuntimeBytecode("0x5b005b005b005b005b00");
    const capped = analyzeBytecodeControlFlow(
      {
        runtimeBytecode: "0x5b005b005b005b005b00",
        instructions: base.instructions,
        selectors: base.selectors,
      },
      { maxBlocks: 2 },
    );
    expect(capped).toMatchObject({
      status: "partial",
      limits: { blockCapReached: true },
    });
    expect(capped.blocks).toHaveLength(2);

    const controller = new AbortController();
    controller.abort("test cancellation");
    const aborted = analyzeBytecodeControlFlow(
      {
        runtimeBytecode: "0x00",
        instructions: analyzeRuntimeBytecode("0x00").instructions,
        selectors: [],
      },
      { signal: controller.signal },
    );
    expect(aborted).toMatchObject({
      status: "aborted",
      blocks: [],
    });
  });
});
