import { getAddress, isAddress, type Address } from "viem";

/**
 * This module intentionally performs only bounded structural analysis. It does
 * not decompile bytecode or assign function semantics. Its output is suitable
 * for review clues and for explaining which dispatcher paths were inspected.
 */
export const TOKEN_BYTECODE_CONTROL_FLOW_LIMITS = Object.freeze({
  maxInstructions: 50_000,
  maxBlocks: 4_096,
  maxEdges: 16_384,
  maxSelectorPaths: 256,
  maxWorkItems: 100_000,
  maxSensitiveLocationsPerOpcode: 32,
  maxAnalysisMs: 50,
});

export interface BytecodeInstructionInput {
  offset: number;
  opcode: number;
  name: string;
  immediate: `0x${string}` | null;
  pushBytes: number;
  truncated: boolean;
}

export interface BytecodeSelectorInput {
  selector: `0x${string}`;
  locations: readonly number[];
  dispatcherLocations: readonly number[];
  jumpDestinations: readonly number[];
  evidence: "dispatcher-comparison" | "push4-constant";
}

export type BytecodeSensitiveCategory =
  | "state-write"
  | "external-call"
  | "contract-creation"
  | "destruction"
  | "authorization-input"
  | "code-inspection";

export interface BytecodeSensitivePathEvidence {
  opcode: number;
  name: string;
  category: BytecodeSensitiveCategory;
  count: number;
  locations: readonly number[];
}

export type BytecodeBlockTerminal =
  | "fallthrough"
  | "jump"
  | "conditional-jump"
  | "stop"
  | "return"
  | "revert"
  | "invalid"
  | "selfdestruct";

export interface BytecodeBasicBlock {
  startOffset: number;
  endOffset: number;
  instructionCount: number;
  terminal: BytecodeBlockTerminal;
  successorOffsets: readonly number[];
  unresolvedDynamicJump: boolean;
}

export interface BytecodeDispatcherSelector {
  selector: `0x${string}`;
  comparisonLocations: readonly number[];
  entryOffsets: readonly number[];
}

export interface BytecodePush4Constant {
  selector: `0x${string}`;
  locations: readonly number[];
}

export interface BytecodeSelectorPath {
  selector: `0x${string}`;
  entryOffsets: readonly number[];
  status: "complete" | "partial";
  reachableBlockOffsets: readonly number[];
  reachableInstructionCount: number;
  sensitiveOpcodes: readonly BytecodeSensitivePathEvidence[];
  unresolvedDynamicJumpOffsets: readonly number[];
  note: string;
}

export interface Eip1167CloneEvidence {
  detected: boolean;
  state: "confirmed" | "review-clue" | "not-detected";
  pattern:
    | "canonical-runtime"
    | "canonical-runtime-with-trailing-data"
    | null;
  implementationAddress: Address | null;
  trailingDataBytes: number;
  note: string;
}

export interface BytecodeControlFlowLimitsApplied {
  instructionCapReached: boolean;
  blockCapReached: boolean;
  edgeCapReached: boolean;
  selectorPathCapReached: boolean;
  workCapReached: boolean;
  timeCapReached: boolean;
}

export interface BytecodeControlFlowAnalysis {
  status: "complete" | "partial" | "aborted" | "malformed";
  blocks: readonly BytecodeBasicBlock[];
  dispatcherSelectors: readonly BytecodeDispatcherSelector[];
  strayPush4Constants: readonly BytecodePush4Constant[];
  selectorPaths: readonly BytecodeSelectorPath[];
  rootReachableBlockOffsets: readonly number[];
  unresolvedDynamicJumpOffsets: readonly number[];
  clone: Eip1167CloneEvidence;
  limits: BytecodeControlFlowLimitsApplied;
  warnings: readonly string[];
}

export interface AnalyzeBytecodeControlFlowOptions {
  maxInstructions?: number;
  maxBlocks?: number;
  maxEdges?: number;
  maxSelectorPaths?: number;
  maxWorkItems?: number;
  maxAnalysisMs?: number;
  signal?: AbortSignal;
}

interface MutableBlock {
  startOffset: number;
  endOffset: number;
  instructions: readonly BytecodeInstructionInput[];
  terminal: BytecodeBlockTerminal;
  successorOffsets: number[];
  unresolvedDynamicJump: boolean;
  dynamicJumpOffset: number | null;
}

interface AnalysisBudget {
  readonly deadline: number;
  readonly maxWorkItems: number;
  readonly signal: AbortSignal | undefined;
  workItems: number;
  stopped: "aborted" | "time" | "work" | null;
}

const TERMINATING_OPCODES = new Set([
  0x00, // STOP
  0x56, // JUMP
  0x57, // JUMPI
  0xf3, // RETURN
  0xfd, // REVERT
  0xfe, // INVALID
  0xff, // SELFDESTRUCT
]);

const SENSITIVE_OPCODES: Readonly<
  Record<number, { name: string; category: BytecodeSensitiveCategory }>
> = Object.freeze({
  0x32: { name: "ORIGIN", category: "authorization-input" },
  0x3b: { name: "EXTCODESIZE", category: "code-inspection" },
  0x3c: { name: "EXTCODECOPY", category: "code-inspection" },
  0x3f: { name: "EXTCODEHASH", category: "code-inspection" },
  0x55: { name: "SSTORE", category: "state-write" },
  0x5d: { name: "TSTORE", category: "state-write" },
  0xf0: { name: "CREATE", category: "contract-creation" },
  0xf1: { name: "CALL", category: "external-call" },
  0xf2: { name: "CALLCODE", category: "external-call" },
  0xf4: { name: "DELEGATECALL", category: "external-call" },
  0xf5: { name: "CREATE2", category: "contract-creation" },
  0xfa: { name: "STATICCALL", category: "external-call" },
  0xff: { name: "SELFDESTRUCT", category: "destruction" },
});

const EMPTY_CLONE_EVIDENCE: Eip1167CloneEvidence = Object.freeze({
  detected: false,
  state: "not-detected",
  pattern: null,
  implementationAddress: null,
  trailingDataBytes: 0,
  note: "No exact canonical EIP-1167 runtime pattern was detected.",
});

export function analyzeBytecodeControlFlow(
  input: {
    runtimeBytecode: unknown;
    instructions: readonly BytecodeInstructionInput[];
    selectors: readonly BytecodeSelectorInput[];
    inputPartial?: boolean;
  },
  options: AnalyzeBytecodeControlFlowOptions = {},
): BytecodeControlFlowAnalysis {
  const runtimeBytecode = normalizeRuntimeHex(input.runtimeBytecode);
  if (!runtimeBytecode) {
    return emptyAnalysis(
      "malformed",
      "Control-flow analysis requires valid even-length runtime bytecode.",
    );
  }

  const resolvedOptions = {
    maxInstructions: clampInteger(
      options.maxInstructions,
      1,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxInstructions,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxInstructions,
    ),
    maxBlocks: clampInteger(
      options.maxBlocks,
      1,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxBlocks,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxBlocks,
    ),
    maxEdges: clampInteger(
      options.maxEdges,
      1,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxEdges,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxEdges,
    ),
    maxSelectorPaths: clampInteger(
      options.maxSelectorPaths,
      1,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxSelectorPaths,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxSelectorPaths,
    ),
    maxWorkItems: clampInteger(
      options.maxWorkItems,
      1,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxWorkItems,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxWorkItems,
    ),
    maxAnalysisMs: clampInteger(
      options.maxAnalysisMs,
      1,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxAnalysisMs,
      TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxAnalysisMs,
    ),
  };
  const budget: AnalysisBudget = {
    deadline: Date.now() + resolvedOptions.maxAnalysisMs,
    maxWorkItems: resolvedOptions.maxWorkItems,
    signal: options.signal,
    workItems: 0,
    stopped: null,
  };
  const limits: BytecodeControlFlowLimitsApplied = {
    instructionCapReached:
      input.instructions.length > resolvedOptions.maxInstructions,
    blockCapReached: false,
    edgeCapReached: false,
    selectorPathCapReached: false,
    workCapReached: false,
    timeCapReached: false,
  };
  const warnings = new Set<string>();

  if (options.signal?.aborted) {
    return {
      ...emptyAnalysis(
        "aborted",
        "Control-flow analysis was aborted before it started.",
      ),
      clone: detectEip1167Clone(runtimeBytecode),
    };
  }
  if (input.inputPartial) {
    warnings.add(
      "Control-flow conclusions are partial because the input disassembly was partial.",
    );
  }
  if (limits.instructionCapReached) {
    warnings.add(
      `Control-flow analysis stopped at ${resolvedOptions.maxInstructions} instructions.`,
    );
  }

  const instructions = input.instructions.slice(
    0,
    resolvedOptions.maxInstructions,
  );
  if (!instructionsAreOrdered(instructions)) {
    return {
      ...emptyAnalysis(
        "malformed",
        "Control-flow instructions were not strictly ordered by byte offset.",
      ),
      clone: detectEip1167Clone(runtimeBytecode),
    };
  }

  const built = buildBasicBlocks(
    instructions,
    resolvedOptions.maxBlocks,
    resolvedOptions.maxEdges,
    budget,
  );
  limits.blockCapReached = built.blockCapReached;
  limits.edgeCapReached = built.edgeCapReached;
  addBudgetWarnings(budget, limits, warnings);
  if (built.blockCapReached) {
    warnings.add(`Basic blocks were capped at ${resolvedOptions.maxBlocks}.`);
  }
  if (built.edgeCapReached) {
    warnings.add(`Control-flow edges were capped at ${resolvedOptions.maxEdges}.`);
  }

  const blocksByStart = new Map(
    built.blocks.map((block) => [block.startOffset, block]),
  );
  const blockByInstructionOffset = indexInstructionsByBlock(built.blocks, budget);
  const rootStart = built.blocks[0]?.startOffset;
  const rootWalk =
    rootStart === undefined
      ? emptyWalk()
      : walkBlocks([rootStart], blocksByStart, budget);
  addBudgetWarnings(budget, limits, warnings);

  const validated = collectValidatedDispatcherSelectors(
    input.selectors,
    instructions,
    blockByInstructionOffset,
    new Set(rootWalk.blockOffsets),
    budget,
  );
  const dispatcherLocations = new Map<`0x${string}`, Set<number>>();
  for (const selector of validated) {
    dispatcherLocations.set(
      selector.selector,
      new Set(selector.comparisonLocations),
    );
  }
  const strayPush4Constants = collectStrayPush4Constants(
    input.selectors,
    dispatcherLocations,
    budget,
  );

  if (strayPush4Constants.length > 0) {
    warnings.add(
      `${strayPush4Constants.length} PUSH4 value${strayPush4Constants.length === 1 ? " was" : "s were"} not validated as callable dispatcher selectors and remains constant-only evidence.`,
    );
  }

  const boundedSelectors = validated.slice(0, resolvedOptions.maxSelectorPaths);
  limits.selectorPathCapReached = validated.length > boundedSelectors.length;
  if (limits.selectorPathCapReached) {
    warnings.add(
      `Reachability paths were capped at ${resolvedOptions.maxSelectorPaths} dispatcher selectors.`,
    );
  }

  const selectorPaths: BytecodeSelectorPath[] = [];
  for (const selector of boundedSelectors) {
    if (budgetStopped(budget)) break;
    const walk = walkBlocks(selector.entryOffsets, blocksByStart, budget);
    const reachableBlocks = walk.blockOffsets
      .map((offset) => blocksByStart.get(offset))
      .filter((block): block is MutableBlock => Boolean(block));
    const sensitiveOpcodes = summarizePathSensitiveOpcodes(
      reachableBlocks,
      budget,
    );
    const unresolvedDynamicJumpOffsets = uniqueSortedNumbers(
      walk.dynamicJumpOffsets,
    );
    const pathPartial =
      unresolvedDynamicJumpOffsets.length > 0 ||
      Boolean(budget.stopped) ||
      input.inputPartial === true ||
      limits.blockCapReached ||
      limits.edgeCapReached;
    selectorPaths.push({
      selector: selector.selector,
      entryOffsets: selector.entryOffsets,
      status: pathPartial ? "partial" : "complete",
      reachableBlockOffsets: walk.blockOffsets,
      reachableInstructionCount: reachableBlocks.reduce(
        (total, block) => total + block.instructions.length,
        0,
      ),
      sensitiveOpcodes,
      unresolvedDynamicJumpOffsets,
      note:
        unresolvedDynamicJumpOffsets.length > 0
          ? "Static reachability stopped at one or more dynamic jumps; opcode associations are review clues, not complete function semantics."
          : "Sensitive opcodes are statically reachable from this dispatcher entry; reachability does not establish authorization or intent.",
    });
  }
  addBudgetWarnings(budget, limits, warnings);

  const unresolvedDynamicJumpOffsets = uniqueSortedNumbers([
    ...rootWalk.dynamicJumpOffsets,
    ...selectorPaths.flatMap((path) => path.unresolvedDynamicJumpOffsets),
  ]);
  if (unresolvedDynamicJumpOffsets.length > 0) {
    warnings.add(
      `${unresolvedDynamicJumpOffsets.length} reachable dynamic jump${unresolvedDynamicJumpOffsets.length === 1 ? " remains" : "s remain"} unresolved; absence of behavior cannot be inferred beyond those paths.`,
    );
  }

  const aborted = budget.stopped === "aborted";
  const partial =
    input.inputPartial === true ||
    Object.values(limits).some(Boolean) ||
    unresolvedDynamicJumpOffsets.length > 0;

  return {
    status: aborted ? "aborted" : partial ? "partial" : "complete",
    blocks: built.blocks.map(toPublicBlock),
    dispatcherSelectors: validated,
    strayPush4Constants,
    selectorPaths,
    rootReachableBlockOffsets: rootWalk.blockOffsets,
    unresolvedDynamicJumpOffsets,
    clone: detectEip1167Clone(runtimeBytecode),
    limits,
    warnings: Array.from(warnings),
  };
}

function buildBasicBlocks(
  instructions: readonly BytecodeInstructionInput[],
  maxBlocks: number,
  maxEdges: number,
  budget: AnalysisBudget,
): {
  blocks: MutableBlock[];
  blockCapReached: boolean;
  edgeCapReached: boolean;
} {
  if (instructions.length === 0) {
    return { blocks: [], blockCapReached: false, edgeCapReached: false };
  }
  const instructionOffsets = new Map(
    instructions.map((instruction, index) => [instruction.offset, index]),
  );
  const validJumpDestinations = new Set(
    instructions
      .filter((instruction) => instruction.opcode === 0x5b)
      .map((instruction) => instruction.offset),
  );
  const leaders = new Set<number>([instructions[0].offset]);

  for (let index = 0; index < instructions.length; index += 1) {
    if (!consumeBudget(budget)) break;
    const instruction = instructions[index];
    if (instruction.opcode === 0x5b) leaders.add(instruction.offset);
    if (TERMINATING_OPCODES.has(instruction.opcode)) {
      const next = instructions[index + 1];
      if (next) leaders.add(next.offset);
    }
    if (instruction.opcode === 0x56 || instruction.opcode === 0x57) {
      const target = readImmediateJumpTarget(instructions, index);
      if (target !== null && validJumpDestinations.has(target)) {
        leaders.add(target);
      }
    }
  }

  const allLeaders = Array.from(leaders)
    .filter((offset) => instructionOffsets.has(offset))
    .sort((left, right) => left - right);
  const boundedLeaders = allLeaders.slice(0, maxBlocks);
  const blocks: MutableBlock[] = [];
  for (let index = 0; index < boundedLeaders.length; index += 1) {
    if (!consumeBudget(budget)) break;
    const startOffset = boundedLeaders[index];
    const nextLeader = allLeaders[index + 1];
    const startIndex = instructionOffsets.get(startOffset);
    const endIndex =
      nextLeader === undefined
        ? instructions.length
        : instructionOffsets.get(nextLeader);
    if (startIndex === undefined || endIndex === undefined) continue;
    const blockInstructions = instructions.slice(startIndex, endIndex);
    if (blockInstructions.length === 0) continue;
    const finalInstruction = blockInstructions[blockInstructions.length - 1];
    blocks.push({
      startOffset,
      endOffset: instructionEndOffset(finalInstruction),
      instructions: blockInstructions,
      terminal: classifyTerminal(finalInstruction.opcode),
      successorOffsets: [],
      unresolvedDynamicJump: false,
      dynamicJumpOffset: null,
    });
  }

  const blocksByStart = new Map(blocks.map((block) => [block.startOffset, block]));
  let edgeCount = 0;
  let edgeCapReached = false;
  const addEdge = (block: MutableBlock, destination: number | undefined) => {
    if (
      destination === undefined ||
      !blocksByStart.has(destination) ||
      block.successorOffsets.includes(destination)
    ) {
      return;
    }
    if (edgeCount >= maxEdges) {
      edgeCapReached = true;
      return;
    }
    block.successorOffsets.push(destination);
    edgeCount += 1;
  };

  for (let index = 0; index < blocks.length; index += 1) {
    if (!consumeBudget(budget)) break;
    const block = blocks[index];
    const finalIndex = block.instructions.length - 1;
    const finalInstruction = block.instructions[finalIndex];
    const nextBlock = blocks[index + 1];
    if (finalInstruction.opcode === 0x56 || finalInstruction.opcode === 0x57) {
      const target = readImmediateJumpTarget(block.instructions, finalIndex);
      if (target !== null) {
        addEdge(block, target);
      } else {
        block.unresolvedDynamicJump = true;
        block.dynamicJumpOffset = finalInstruction.offset;
      }
      if (finalInstruction.opcode === 0x57) {
        addEdge(block, nextBlock?.startOffset);
      }
      continue;
    }
    if (!TERMINATING_OPCODES.has(finalInstruction.opcode)) {
      addEdge(block, nextBlock?.startOffset);
    }
  }

  return {
    blocks,
    blockCapReached: allLeaders.length > maxBlocks,
    edgeCapReached,
  };
}

function collectValidatedDispatcherSelectors(
  selectors: readonly BytecodeSelectorInput[],
  instructions: readonly BytecodeInstructionInput[],
  blockByInstructionOffset: ReadonlyMap<number, number>,
  rootReachableBlocks: ReadonlySet<number>,
  budget: AnalysisBudget,
): BytecodeDispatcherSelector[] {
  const instructionIndex = new Map(
    instructions.map((instruction, index) => [instruction.offset, index]),
  );
  const validDestinations = new Set(
    instructions
      .filter((instruction) => instruction.opcode === 0x5b)
      .map((instruction) => instruction.offset),
  );

  return selectors
    .map((selector) => {
      const comparisons: number[] = [];
      const destinations: number[] = [];
      for (const location of selector.dispatcherLocations) {
        if (!consumeBudget(budget)) break;
        const index = instructionIndex.get(location);
        const blockStart = blockByInstructionOffset.get(location);
        if (
          index === undefined ||
          blockStart === undefined ||
          !rootReachableBlocks.has(blockStart)
        ) {
          continue;
        }
        const destination = detectDispatcherDestination(instructions, index);
        if (destination === null || !validDestinations.has(destination)) continue;
        comparisons.push(location);
        destinations.push(destination);
      }
      return {
        selector: selector.selector,
        comparisonLocations: uniqueSortedNumbers(comparisons),
        entryOffsets: uniqueSortedNumbers(destinations),
      };
    })
    .filter(
      (selector) =>
        selector.comparisonLocations.length > 0 && selector.entryOffsets.length > 0,
    )
    .sort((left, right) => left.selector.localeCompare(right.selector));
}

function detectDispatcherDestination(
  instructions: readonly BytecodeInstructionInput[],
  push4Index: number,
): number | null {
  const push4 = instructions[push4Index];
  if (!push4 || push4.pushBytes !== 4 || push4.truncated) return null;
  const maximumIndex = Math.min(instructions.length - 1, push4Index + 5);
  let equalIndex = -1;
  for (
    let index = push4Index + 1;
    index <= Math.min(maximumIndex, push4Index + 2);
    index += 1
  ) {
    const instruction = instructions[index];
    if (instruction.opcode === 0x14) {
      equalIndex = index;
      break;
    }
    // A compiler may duplicate the selector operand before EQ. Any other
    // intervening operation makes the structural association ambiguous.
    if (instruction.opcode < 0x80 || instruction.opcode > 0x8f) return null;
  }
  if (equalIndex < 0) return null;
  const jumpIndex = equalIndex + 2;
  if (jumpIndex > maximumIndex || instructions[jumpIndex]?.opcode !== 0x57) {
    return null;
  }
  return readImmediateJumpTarget(instructions, jumpIndex);
}

function walkBlocks(
  starts: readonly number[],
  blocksByStart: ReadonlyMap<number, MutableBlock>,
  budget: AnalysisBudget,
): { blockOffsets: number[]; dynamicJumpOffsets: number[] } {
  const queue = uniqueSortedNumbers(starts).filter((start) => blocksByStart.has(start));
  const visited = new Set<number>();
  const dynamicJumpOffsets: number[] = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    if (!consumeBudget(budget)) break;
    const offset = queue[cursor];
    if (visited.has(offset)) continue;
    const block = blocksByStart.get(offset);
    if (!block) continue;
    visited.add(offset);
    if (block.dynamicJumpOffset !== null) {
      dynamicJumpOffsets.push(block.dynamicJumpOffset);
    }
    for (const successor of block.successorOffsets) {
      if (!visited.has(successor)) queue.push(successor);
    }
  }
  return {
    blockOffsets: Array.from(visited).sort((left, right) => left - right),
    dynamicJumpOffsets: uniqueSortedNumbers(dynamicJumpOffsets),
  };
}

function summarizePathSensitiveOpcodes(
  blocks: readonly MutableBlock[],
  budget: AnalysisBudget,
): BytecodeSensitivePathEvidence[] {
  const summaries = new Map<
    number,
    {
      name: string;
      category: BytecodeSensitiveCategory;
      count: number;
      locations: number[];
    }
  >();
  for (const block of blocks) {
    for (const instruction of block.instructions) {
      if (!consumeBudget(budget)) break;
      const definition = SENSITIVE_OPCODES[instruction.opcode];
      if (!definition) continue;
      const current = summaries.get(instruction.opcode) ?? {
        ...definition,
        count: 0,
        locations: [],
      };
      current.count += 1;
      if (
        current.locations.length <
        TOKEN_BYTECODE_CONTROL_FLOW_LIMITS.maxSensitiveLocationsPerOpcode
      ) {
        current.locations.push(instruction.offset);
      }
      summaries.set(instruction.opcode, current);
    }
  }
  return Array.from(summaries.entries())
    .map(([opcode, summary]) => ({ opcode, ...summary }))
    .sort((left, right) => left.opcode - right.opcode);
}

function detectEip1167Clone(runtimeBytecode: `0x${string}`): Eip1167CloneEvidence {
  const match = runtimeBytecode.match(
    /^0x363d3d373d3d3d363d73([0-9a-f]{40})5af43d82803e903d91602b57fd5bf3([0-9a-f]*)$/,
  );
  if (!match) return { ...EMPTY_CLONE_EVIDENCE };
  const candidate = `0x${match[1]}`;
  const implementationAddress = isAddress(candidate)
    ? getAddress(candidate)
    : null;
  const trailingDataBytes = match[2].length / 2;
  if (trailingDataBytes === 0) {
    return {
      detected: true,
      state: "confirmed",
      pattern: "canonical-runtime",
      implementationAddress,
      trailingDataBytes,
      note: "Runtime bytecode exactly matches the canonical EIP-1167 minimal-proxy runtime. Analyze the implementation contract for behavior.",
    };
  }
  return {
    detected: true,
    state: "review-clue",
    pattern: "canonical-runtime-with-trailing-data",
    implementationAddress,
    trailingDataBytes,
    note: "The canonical EIP-1167 runtime prefix is followed by data. Treat this as a clone clue until the variant and implementation are validated.",
  };
}

function readImmediateJumpTarget(
  instructions: readonly BytecodeInstructionInput[],
  jumpIndex: number,
): number | null {
  const previous = instructions[jumpIndex - 1];
  if (
    !previous ||
    previous.pushBytes <= 0 ||
    previous.truncated ||
    !previous.immediate
  ) {
    return null;
  }
  try {
    const value = BigInt(previous.immediate);
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
  } catch {
    return null;
  }
}

function indexInstructionsByBlock(
  blocks: readonly MutableBlock[],
  budget: AnalysisBudget,
): Map<number, number> {
  const result = new Map<number, number>();
  for (const block of blocks) {
    for (const instruction of block.instructions) {
      if (!consumeBudget(budget)) return result;
      result.set(instruction.offset, block.startOffset);
    }
  }
  return result;
}

function collectStrayPush4Constants(
  selectors: readonly BytecodeSelectorInput[],
  dispatcherLocations: ReadonlyMap<`0x${string}`, ReadonlySet<number>>,
  budget: AnalysisBudget,
): BytecodePush4Constant[] {
  const result: BytecodePush4Constant[] = [];
  for (const selector of selectors) {
    const locations: number[] = [];
    for (const location of selector.locations) {
      if (!consumeBudget(budget)) break;
      if (!dispatcherLocations.get(selector.selector)?.has(location)) {
        locations.push(location);
      }
    }
    if (locations.length > 0) {
      result.push({
        selector: selector.selector,
        locations: uniqueSortedNumbers(locations),
      });
    }
    if (budget.stopped) break;
  }
  return result.sort((left, right) => left.selector.localeCompare(right.selector));
}

function instructionsAreOrdered(
  instructions: readonly BytecodeInstructionInput[],
): boolean {
  let previousOffset = -1;
  for (const instruction of instructions) {
    if (
      !Number.isSafeInteger(instruction.offset) ||
      instruction.offset < 0 ||
      instruction.offset <= previousOffset ||
      !Number.isInteger(instruction.opcode) ||
      instruction.opcode < 0 ||
      instruction.opcode > 0xff
    ) {
      return false;
    }
    previousOffset = instruction.offset;
  }
  return true;
}

function classifyTerminal(opcode: number): BytecodeBlockTerminal {
  if (opcode === 0x56) return "jump";
  if (opcode === 0x57) return "conditional-jump";
  if (opcode === 0x00) return "stop";
  if (opcode === 0xf3) return "return";
  if (opcode === 0xfd) return "revert";
  if (opcode === 0xfe) return "invalid";
  if (opcode === 0xff) return "selfdestruct";
  return "fallthrough";
}

function toPublicBlock(block: MutableBlock): BytecodeBasicBlock {
  return {
    startOffset: block.startOffset,
    endOffset: block.endOffset,
    instructionCount: block.instructions.length,
    terminal: block.terminal,
    successorOffsets: uniqueSortedNumbers(block.successorOffsets),
    unresolvedDynamicJump: block.unresolvedDynamicJump,
  };
}

function instructionEndOffset(instruction: BytecodeInstructionInput): number {
  return instruction.offset + 1 + instruction.pushBytes;
}

function consumeBudget(budget: AnalysisBudget): boolean {
  if (budget.stopped) return false;
  if (budget.signal?.aborted) {
    budget.stopped = "aborted";
    return false;
  }
  if (Date.now() > budget.deadline) {
    budget.stopped = "time";
    return false;
  }
  if (budget.workItems >= budget.maxWorkItems) {
    budget.stopped = "work";
    return false;
  }
  budget.workItems += 1;
  return true;
}

function budgetStopped(budget: AnalysisBudget): boolean {
  return !consumeBudget(budget);
}

function addBudgetWarnings(
  budget: AnalysisBudget,
  limits: BytecodeControlFlowLimitsApplied,
  warnings: Set<string>,
) {
  if (budget.stopped === "time") {
    limits.timeCapReached = true;
    warnings.add("Control-flow analysis reached its wall-clock deadline.");
  } else if (budget.stopped === "work") {
    limits.workCapReached = true;
    warnings.add("Control-flow analysis reached its bounded work-item cap.");
  } else if (budget.stopped === "aborted") {
    warnings.add("Control-flow analysis was aborted.");
  }
}

function normalizeRuntimeHex(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x(?:[0-9a-fA-F]{2})*$/.test(value)
    ? (value.toLowerCase() as `0x${string}`)
    : null;
}

function clampInteger(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  return Number.isInteger(value)
    ? Math.max(minimum, Math.min(maximum, value as number))
    : fallback;
}

function uniqueSortedNumbers(values: readonly number[]): number[] {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function emptyWalk(): { blockOffsets: number[]; dynamicJumpOffsets: number[] } {
  return { blockOffsets: [], dynamicJumpOffsets: [] };
}

function emptyAnalysis(
  status: BytecodeControlFlowAnalysis["status"],
  warning: string,
): BytecodeControlFlowAnalysis {
  return {
    status,
    blocks: [],
    dispatcherSelectors: [],
    strayPush4Constants: [],
    selectorPaths: [],
    rootReachableBlockOffsets: [],
    unresolvedDynamicJumpOffsets: [],
    clone: { ...EMPTY_CLONE_EVIDENCE },
    limits: {
      instructionCapReached: false,
      blockCapReached: false,
      edgeCapReached: false,
      selectorPathCapReached: false,
      workCapReached: false,
      timeCapReached: false,
    },
    warnings: [warning],
  };
}
