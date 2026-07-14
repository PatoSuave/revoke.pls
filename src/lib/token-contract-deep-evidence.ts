import {
  decodeErrorResult,
  decodeFunctionData,
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  toFunctionSelector,
  toFunctionSignature,
  type Abi,
  type AbiFunction,
  type Address,
  type Hex,
} from "viem";

/**
 * Deep-evidence helpers are deliberately transport-free. The only executable
 * simulation dependency accepted by this module is an eth_call-shaped reader.
 */
export const TOKEN_DEEP_EVIDENCE_LIMITS = Object.freeze({
  maxAbiItems: 1_000,
  maxAbiFunctions: 500,
  maxAbiParametersPerFunction: 256,
  maxAbiTupleDepth: 8,
  maxRuntimeBytes: 512 * 1024,
  maxInstructions: 50_000,
  maxRuntimeSelectors: 256,
  maxEmbeddedAddresses: 64,
  maxFourByteLookups: 24,
  maxFourByteCandidatesPerSelector: 8,
  maxFourByteResponseBytes: 64 * 1024,
  maxHistoryInputItems: 200,
  maxHistoryCalls: 50,
  maxSimulationCandidates: 100,
  maxSimulations: 12,
  maxSimulationTimeoutMs: 10_000,
});

export const READ_ONLY_SIMULATION_INVARIANT = Object.freeze({
  rpcMethod: "eth_call" as const,
  capturedBlockRequired: true,
  submitsTransactions: false,
  signsTransactions: false,
  fundsAccounts: false,
  relaysTransactions: false,
});

export const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;
export const EIP1967_ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103" as const;
export const EIP1967_BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50" as const;
export const EIP1967_SLOTS = Object.freeze({
  implementation: EIP1967_IMPLEMENTATION_SLOT,
  admin: EIP1967_ADMIN_SLOT,
  beacon: EIP1967_BEACON_SLOT,
});

export type AbiFunctionMutability =
  | "pure"
  | "view"
  | "nonpayable"
  | "payable";

export interface CanonicalAbiParameter {
  name: string | null;
  type: string;
  canonicalType: string;
  components: readonly CanonicalAbiParameter[];
}

export interface CanonicalAbiFunction {
  name: string;
  signature: string;
  selector: `0x${string}`;
  stateMutability: AbiFunctionMutability;
  inputs: readonly CanonicalAbiParameter[];
  outputs: readonly CanonicalAbiParameter[];
  abiItem: AbiFunction;
}

export interface CanonicalAbiResult {
  functions: readonly CanonicalAbiFunction[];
  inputItemCount: number;
  omittedItemCount: number;
  malformedFunctionCount: number;
  duplicateFunctionCount: number;
  limitExceededFunctionCount: number;
  partial: boolean;
}

export type SelectorClassification =
  | "standard"
  | "admin"
  | "supply"
  | "transfer-control"
  | "fees"
  | "liquidity"
  | "unknown";

export interface SelectorWatchlistEntry {
  signature: string;
  classification: SelectorClassification;
  label: string;
}

export type SelectorWatchlist = Readonly<
  Record<string, SelectorWatchlistEntry | readonly SelectorWatchlistEntry[]>
>;

export const TOKEN_SELECTOR_WATCHLIST = Object.freeze({
  "0x01ffc9a7": {
    signature: "supportsInterface(bytes4)",
    classification: "standard",
    label: "ERC-165 interface probe",
  },
  "0x06fdde03": {
    signature: "name()",
    classification: "standard",
    label: "Token metadata",
  },
  "0x095ea7b3": {
    signature: "approve(address,uint256)",
    classification: "standard",
    label: "Token approval",
  },
  "0x18160ddd": {
    signature: "totalSupply()",
    classification: "standard",
    label: "Token supply getter",
  },
  "0x23b872dd": {
    signature: "transferFrom(address,address,uint256)",
    classification: "standard",
    label: "Allowance transfer",
  },
  "0x313ce567": {
    signature: "decimals()",
    classification: "standard",
    label: "Token metadata",
  },
  "0x3659cfe6": {
    signature: "upgradeTo(address)",
    classification: "admin",
    label: "Proxy upgrade clue",
  },
  "0x40c10f19": {
    signature: "mint(address,uint256)",
    classification: "supply",
    label: "Mint clue",
  },
  "0x42966c68": {
    signature: "burn(uint256)",
    classification: "supply",
    label: "Burn clue",
  },
  "0x52d1902d": {
    signature: "proxiableUUID()",
    classification: "admin",
    label: "UUPS proxy clue",
  },
  "0x5c60da1b": {
    signature: "implementation()",
    classification: "admin",
    label: "Proxy implementation getter",
  },
  "0x5c975abb": {
    signature: "paused()",
    classification: "transfer-control",
    label: "Pause-state getter",
  },
  "0x65b1342c": {
    signature: "CHANGE_DELAY()",
    classification: "fees",
    label: "Fee-change delay getter clue",
  },
  "0x70a08231": {
    signature: "balanceOf(address)",
    classification: "standard",
    label: "Token balance getter",
  },
  "0x715018a6": {
    signature: "renounceOwnership()",
    classification: "admin",
    label: "Ownership control",
  },
  "0x77d2300e": {
    signature: "buyFeeBps()",
    classification: "fees",
    label: "Buy-fee getter clue",
  },
  "0x79cc6790": {
    signature: "burnFrom(address,uint256)",
    classification: "supply",
    label: "Third-party burn clue",
  },
  "0x802d85a8": {
    signature: "cancelFeeChange()",
    classification: "fees",
    label: "Fee-change cancellation clue",
  },
  "0x8da5cb5b": {
    signature: "owner()",
    classification: "admin",
    label: "Owner getter",
  },
  "0x95d89b41": {
    signature: "symbol()",
    classification: "standard",
    label: "Token metadata",
  },
  "0xa0712d68": {
    signature: "mint(uint256)",
    classification: "supply",
    label: "Mint clue",
  },
  "0xa457c2d7": {
    signature: "decreaseAllowance(address,uint256)",
    classification: "standard",
    label: "Allowance control",
  },
  "0xa9059cbb": {
    signature: "transfer(address,uint256)",
    classification: "standard",
    label: "Token transfer",
  },
  "0xaaf10f42": {
    signature: "changeAdmin(address)",
    classification: "admin",
    label: "Proxy admin change clue",
  },
  "0xbaa2abde": {
    signature:
      "removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)",
    classification: "liquidity",
    label: "Liquidity removal clue",
  },
  "0xc1016928": {
    signature: "configurePair(address)",
    classification: "liquidity",
    label: "Pair-configuration clue",
  },
  "0xdd62ed3e": {
    signature: "allowance(address,address)",
    classification: "standard",
    label: "Allowance getter",
  },
  "0xf2fde38b": {
    signature: "transferOwnership(address)",
    classification: "admin",
    label: "Ownership control",
  },
  "0xf851a440": {
    signature: "admin()",
    classification: "admin",
    label: "Proxy admin getter",
  },
} satisfies SelectorWatchlist);

const ABI_MUTABILITIES = new Set<AbiFunctionMutability>([
  "pure",
  "view",
  "nonpayable",
  "payable",
]);

export function canonicalizeAbiFunctions(abi: unknown): CanonicalAbiResult {
  if (!Array.isArray(abi)) {
    const malformed = abi !== undefined && abi !== null;
    return {
      functions: [],
      inputItemCount: 0,
      omittedItemCount: 0,
      malformedFunctionCount: malformed ? 1 : 0,
      duplicateFunctionCount: 0,
      limitExceededFunctionCount: 0,
      partial: malformed,
    };
  }

  const functions: CanonicalAbiFunction[] = [];
  const seen = new Set<string>();
  let malformedFunctionCount = 0;
  let duplicateFunctionCount = 0;
  let limitExceededFunctionCount = 0;
  const boundedAbi = abi.slice(0, TOKEN_DEEP_EVIDENCE_LIMITS.maxAbiItems);

  for (const candidate of boundedAbi) {
    if (!isRecord(candidate) || candidate.type !== "function") continue;
    if (functions.length >= TOKEN_DEEP_EVIDENCE_LIMITS.maxAbiFunctions) {
      limitExceededFunctionCount += 1;
      continue;
    }
    const budget: AbiNormalizationBudget = {
      remaining: TOKEN_DEEP_EVIDENCE_LIMITS.maxAbiParametersPerFunction,
      limitExceeded: false,
    };
    const item = normalizeAbiFunction(candidate, budget);
    if (!item) {
      if (budget.limitExceeded) limitExceededFunctionCount += 1;
      else malformedFunctionCount += 1;
      continue;
    }

    try {
      const signature = toFunctionSignature(item);
      const selector = normalizeSelector(toFunctionSelector(item));
      if (!selector) throw new Error("Invalid function selector");
      if (seen.has(signature)) {
        duplicateFunctionCount += 1;
        continue;
      }
      seen.add(signature);
      functions.push({
        name: item.name,
        signature,
        selector,
        stateMutability: item.stateMutability,
        inputs: item.inputs.map(canonicalizeAbiParameter),
        outputs: item.outputs.map(canonicalizeAbiParameter),
        abiItem: item,
      });
    } catch {
      malformedFunctionCount += 1;
    }
  }

  functions.sort((left, right) =>
    left.selector === right.selector
      ? left.signature.localeCompare(right.signature)
      : left.selector.localeCompare(right.selector),
  );
  const omittedItemCount = Math.max(0, abi.length - boundedAbi.length);
  return {
    functions,
    inputItemCount: abi.length,
    omittedItemCount,
    malformedFunctionCount,
    duplicateFunctionCount,
    limitExceededFunctionCount,
    partial:
      omittedItemCount > 0 ||
      limitExceededFunctionCount > 0 ||
      malformedFunctionCount > 0,
  };
}

interface AbiNormalizationBudget {
  remaining: number;
  limitExceeded: boolean;
}

function normalizeAbiFunction(
  value: Record<string, unknown>,
  budget: AbiNormalizationBudget,
): AbiFunction | null {
  if (typeof value.name !== "string" || !isIdentifier(value.name)) return null;
  const inputs = normalizeAbiParameters(value.inputs, budget, 0);
  const outputs = normalizeAbiParameters(value.outputs, budget, 0);
  if (!inputs || !outputs) return null;

  const requestedMutability = value.stateMutability;
  const stateMutability =
    typeof requestedMutability === "string" &&
    ABI_MUTABILITIES.has(requestedMutability as AbiFunctionMutability)
      ? (requestedMutability as AbiFunctionMutability)
      : value.constant === true
        ? "view"
        : value.payable === true
          ? "payable"
          : "nonpayable";

  return {
    type: "function",
    name: value.name,
    stateMutability,
    inputs,
    outputs,
  } as AbiFunction;
}

function normalizeAbiParameters(
  value: unknown,
  budget: AbiNormalizationBudget,
  depth: number,
): AbiFunction["inputs"] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  if (
    depth > TOKEN_DEEP_EVIDENCE_LIMITS.maxAbiTupleDepth ||
    value.length > budget.remaining
  ) {
    budget.limitExceeded = true;
    return null;
  }
  const parameters: Record<string, unknown>[] = [];
  for (const parameter of value) {
    budget.remaining -= 1;
    if (budget.remaining < 0) {
      budget.limitExceeded = true;
      return null;
    }
    if (
      !isRecord(parameter) ||
      typeof parameter.type !== "string" ||
      !isPlausibleAbiType(parameter.type)
    ) {
      return null;
    }
    const normalized: Record<string, unknown> = {
      name: typeof parameter.name === "string" ? parameter.name : "",
      type: parameter.type,
    };
    if (parameter.internalType && typeof parameter.internalType === "string") {
      normalized.internalType = parameter.internalType;
    }
    if (parameter.type.startsWith("tuple")) {
      if (!Array.isArray(parameter.components)) return null;
      const components = normalizeAbiParameters(
        parameter.components,
        budget,
        depth + 1,
      );
      if (!components) return null;
      normalized.components = components;
    }
    parameters.push(normalized);
  }
  return parameters as unknown as AbiFunction["inputs"];
}

function canonicalizeAbiParameter(
  parameter: AbiFunction["inputs"][number],
): CanonicalAbiParameter {
  const components = "components" in parameter && parameter.components
    ? parameter.components.map(canonicalizeAbiParameter)
    : [];
  return {
    name: parameter.name || null,
    type: parameter.type,
    canonicalType: canonicalParameterType(parameter),
    components,
  };
}

function canonicalParameterType(parameter: AbiFunction["inputs"][number]): string {
  if (!parameter.type.startsWith("tuple")) return parameter.type;
  const suffix = parameter.type.slice("tuple".length);
  const components =
    "components" in parameter && parameter.components
      ? parameter.components.map(canonicalParameterType).join(",")
      : "";
  return `(${components})${suffix}`;
}

export interface EvmInstruction {
  offset: number;
  opcode: number;
  name: string;
  immediate: `0x${string}` | null;
  pushBytes: number;
  truncated: boolean;
}

export type SensitiveOpcodeCategory =
  | "state-write"
  | "external-call"
  | "contract-creation"
  | "destruction"
  | "authorization-input"
  | "code-inspection";

export interface SensitiveOpcodeSummary {
  opcode: number;
  name: string;
  category: SensitiveOpcodeCategory;
  count: number;
  locations: readonly number[];
}

export interface RuntimeSelectorEvidence {
  selector: `0x${string}`;
  locations: readonly number[];
  dispatcherLocations: readonly number[];
  jumpDestinations: readonly number[];
  evidence: "dispatcher-comparison" | "push4-constant";
}

export interface EmbeddedRuntimeAddress {
  address: Address;
  locations: readonly number[];
}

export interface FunctionBytecodeSlice {
  selector: `0x${string}`;
  startOffset: number;
  endOffset: number;
  instructionCount: number;
  sensitiveOpcodes: readonly string[];
}

export interface RuntimeBytecodeAnalysis {
  status: "complete" | "partial" | "malformed";
  byteLength: number;
  analyzedByteLength: number;
  runtimeHash: Hex | null;
  instructions: readonly EvmInstruction[];
  selectors: readonly RuntimeSelectorEvidence[];
  embeddedAddresses: readonly EmbeddedRuntimeAddress[];
  sensitiveOpcodes: readonly SensitiveOpcodeSummary[];
  functionSlices: readonly FunctionBytecodeSlice[];
  warnings: readonly string[];
}

const OPCODE_NAMES: Readonly<Record<number, string>> = Object.freeze({
  0x00: "STOP",
  0x01: "ADD",
  0x02: "MUL",
  0x03: "SUB",
  0x04: "DIV",
  0x05: "SDIV",
  0x06: "MOD",
  0x07: "SMOD",
  0x08: "ADDMOD",
  0x09: "MULMOD",
  0x0a: "EXP",
  0x0b: "SIGNEXTEND",
  0x10: "LT",
  0x11: "GT",
  0x12: "SLT",
  0x13: "SGT",
  0x14: "EQ",
  0x15: "ISZERO",
  0x16: "AND",
  0x17: "OR",
  0x18: "XOR",
  0x19: "NOT",
  0x1a: "BYTE",
  0x1b: "SHL",
  0x1c: "SHR",
  0x1d: "SAR",
  0x20: "SHA3",
  0x30: "ADDRESS",
  0x31: "BALANCE",
  0x32: "ORIGIN",
  0x33: "CALLER",
  0x34: "CALLVALUE",
  0x35: "CALLDATALOAD",
  0x36: "CALLDATASIZE",
  0x37: "CALLDATACOPY",
  0x38: "CODESIZE",
  0x39: "CODECOPY",
  0x3a: "GASPRICE",
  0x3b: "EXTCODESIZE",
  0x3c: "EXTCODECOPY",
  0x3d: "RETURNDATASIZE",
  0x3e: "RETURNDATACOPY",
  0x3f: "EXTCODEHASH",
  0x40: "BLOCKHASH",
  0x41: "COINBASE",
  0x42: "TIMESTAMP",
  0x43: "NUMBER",
  0x44: "PREVRANDAO",
  0x45: "GASLIMIT",
  0x46: "CHAINID",
  0x47: "SELFBALANCE",
  0x48: "BASEFEE",
  0x49: "BLOBHASH",
  0x4a: "BLOBBASEFEE",
  0x50: "POP",
  0x51: "MLOAD",
  0x52: "MSTORE",
  0x53: "MSTORE8",
  0x54: "SLOAD",
  0x55: "SSTORE",
  0x56: "JUMP",
  0x57: "JUMPI",
  0x58: "PC",
  0x59: "MSIZE",
  0x5a: "GAS",
  0x5b: "JUMPDEST",
  0x5c: "TLOAD",
  0x5d: "TSTORE",
  0x5e: "MCOPY",
  0x5f: "PUSH0",
  0xf0: "CREATE",
  0xf1: "CALL",
  0xf2: "CALLCODE",
  0xf3: "RETURN",
  0xf4: "DELEGATECALL",
  0xf5: "CREATE2",
  0xfa: "STATICCALL",
  0xfd: "REVERT",
  0xfe: "INVALID",
  0xff: "SELFDESTRUCT",
});

const SENSITIVE_OPCODES: Readonly<
  Record<number, { name: string; category: SensitiveOpcodeCategory }>
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

export function analyzeRuntimeBytecode(
  runtimeBytecode: unknown,
  options: {
    maxRuntimeBytes?: number;
    maxInstructions?: number;
    maxSelectors?: number;
  } = {},
): RuntimeBytecodeAnalysis {
  const maxRuntimeBytes = clampInteger(
    options.maxRuntimeBytes,
    1,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxRuntimeBytes,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxRuntimeBytes,
  );
  const maxInstructions = clampInteger(
    options.maxInstructions,
    1,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxInstructions,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxInstructions,
  );
  const maxSelectors = clampInteger(
    options.maxSelectors,
    1,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxRuntimeSelectors,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxRuntimeSelectors,
  );
  const boundedHex = normalizeBoundedRuntimeHex(runtimeBytecode, maxRuntimeBytes);
  if (!boundedHex) {
    return {
      status: "malformed",
      byteLength: 0,
      analyzedByteLength: 0,
      runtimeHash: null,
      instructions: [],
      selectors: [],
      embeddedAddresses: [],
      sensitiveOpcodes: [],
      functionSlices: [],
      warnings: ["Runtime bytecode was not valid even-length hexadecimal data."],
    };
  }

  const { normalized, fullByteLength } = boundedHex;
  const analyzedByteLength = Math.min(fullByteLength, maxRuntimeBytes);
  const bytes = hexToBytes(normalized, analyzedByteLength);
  const instructions: EvmInstruction[] = [];
  const warnings: string[] = [];
  let status: RuntimeBytecodeAnalysis["status"] = "complete";

  if (fullByteLength > analyzedByteLength) {
    status = "partial";
    warnings.push(
      `Runtime bytecode exceeded the ${maxRuntimeBytes}-byte analysis cap.`,
    );
  }

  for (let offset = 0; offset < bytes.length; ) {
    if (instructions.length >= maxInstructions) {
      status = "partial";
      warnings.push(
        `Disassembly stopped at the ${maxInstructions}-instruction cap.`,
      );
      break;
    }
    const opcode = bytes[offset];
    const pushBytes = opcode >= 0x60 && opcode <= 0x7f ? opcode - 0x5f : 0;
    const available = Math.min(pushBytes, bytes.length - offset - 1);
    const immediate =
      pushBytes > 0
        ? bytesToHex(bytes.slice(offset + 1, offset + 1 + available))
        : null;
    const truncated = available !== pushBytes;
    instructions.push({
      offset,
      opcode,
      name: opcodeName(opcode),
      immediate,
      pushBytes,
      truncated,
    });
    if (truncated) {
      status = "partial";
      warnings.push(`Truncated PUSH${pushBytes} immediate at byte ${offset}.`);
      break;
    }
    offset += 1 + pushBytes;
  }

  const sensitive = summarizeSensitiveOpcodes(instructions);
  const selectorEvidence = collectRuntimeSelectors(instructions, maxSelectors);
  if (selectorEvidence.truncated) {
    status = "partial";
    warnings.push(`Runtime selector evidence was capped at ${maxSelectors} entries.`);
  }
  const embeddedAddressEvidence = collectEmbeddedAddresses(instructions);
  if (embeddedAddressEvidence.truncated) {
    status = "partial";
    warnings.push(
      `Embedded-address evidence was capped at ${TOKEN_DEEP_EVIDENCE_LIMITS.maxEmbeddedAddresses} addresses.`,
    );
  }
  const functionSlices = buildFunctionSlices(
    selectorEvidence.selectors,
    instructions,
    analyzedByteLength,
  );

  return {
    status,
    byteLength: fullByteLength,
    analyzedByteLength,
    runtimeHash:
      fullByteLength <= maxRuntimeBytes ? keccak256(normalized) : null,
    instructions,
    selectors: selectorEvidence.selectors,
    embeddedAddresses: embeddedAddressEvidence.addresses,
    sensitiveOpcodes: sensitive,
    functionSlices,
    warnings,
  };
}

function collectRuntimeSelectors(
  instructions: readonly EvmInstruction[],
  maxSelectors: number,
): { selectors: RuntimeSelectorEvidence[]; truncated: boolean } {
  const evidence = new Map<
    `0x${string}`,
    { locations: number[]; dispatcherLocations: number[]; destinations: number[] }
  >();

  for (let index = 0; index < instructions.length; index += 1) {
    const instruction = instructions[index];
    if (
      instruction.pushBytes !== 4 ||
      instruction.truncated ||
      !instruction.immediate
    ) {
      continue;
    }
    const selector = normalizeSelector(instruction.immediate);
    if (!selector) continue;
    let current = evidence.get(selector);
    if (!current) {
      if (evidence.size >= maxSelectors) continue;
      current = { locations: [], dispatcherLocations: [], destinations: [] };
      evidence.set(selector, current);
    }
    current.locations.push(instruction.offset);
    const destination = detectDispatcherDestination(instructions, index);
    if (destination !== null) {
      current.dispatcherLocations.push(instruction.offset);
      current.destinations.push(destination);
    }
  }

  const observedUniqueSelectors = new Set(
    instructions
      .filter(
        (instruction) =>
          instruction.pushBytes === 4 &&
          !instruction.truncated &&
          Boolean(instruction.immediate),
      )
      .map((instruction) => instruction.immediate?.toLowerCase()),
  ).size;

  return {
    selectors: Array.from(evidence.entries())
      .map(([selector, item]) => ({
        selector,
        locations: uniqueSortedNumbers(item.locations),
        dispatcherLocations: uniqueSortedNumbers(item.dispatcherLocations),
        jumpDestinations: uniqueSortedNumbers(item.destinations),
        evidence:
          item.dispatcherLocations.length > 0
            ? ("dispatcher-comparison" as const)
            : ("push4-constant" as const),
      }))
      .sort((left, right) => left.selector.localeCompare(right.selector)),
    truncated: observedUniqueSelectors > evidence.size,
  };
}

function detectDispatcherDestination(
  instructions: readonly EvmInstruction[],
  push4Index: number,
): number | null {
  const window = instructions.slice(push4Index + 1, push4Index + 8);
  const equalIndex = window.findIndex((instruction) => instruction.opcode === 0x14);
  if (equalIndex < 0) return null;
  const afterEqual = window.slice(equalIndex + 1);
  const jumpIndex = afterEqual.findIndex((instruction) => instruction.opcode === 0x57);
  if (jumpIndex < 0) return null;
  for (let index = jumpIndex - 1; index >= 0; index -= 1) {
    const instruction = afterEqual[index];
    if (instruction.pushBytes > 0 && instruction.immediate) {
      return Number.parseInt(instruction.immediate.slice(2), 16);
    }
  }
  return null;
}

function collectEmbeddedAddresses(
  instructions: readonly EvmInstruction[],
): { addresses: EmbeddedRuntimeAddress[]; truncated: boolean } {
  const addresses = new Map<Address, number[]>();
  let truncated = false;
  for (const instruction of instructions) {
    if (
      instruction.pushBytes !== 20 ||
      instruction.truncated ||
      !instruction.immediate ||
      /^0x(?:00|ff){20}$/i.test(instruction.immediate)
    ) {
      continue;
    }
    if (!isAddress(instruction.immediate)) continue;
    const address = getAddress(instruction.immediate);
    if (
      !addresses.has(address) &&
      addresses.size >= TOKEN_DEEP_EVIDENCE_LIMITS.maxEmbeddedAddresses
    ) {
      truncated = true;
      continue;
    }
    const locations = addresses.get(address) ?? [];
    locations.push(instruction.offset);
    addresses.set(address, locations);
  }
  return {
    addresses: Array.from(addresses.entries())
      .map(([address, locations]) => ({
        address,
        locations: uniqueSortedNumbers(locations),
      }))
      .sort((left, right) => left.address.localeCompare(right.address)),
    truncated,
  };
}

function summarizeSensitiveOpcodes(
  instructions: readonly EvmInstruction[],
): SensitiveOpcodeSummary[] {
  const summaries = new Map<
    number,
    { count: number; locations: number[]; name: string; category: SensitiveOpcodeCategory }
  >();
  for (const instruction of instructions) {
    const definition = SENSITIVE_OPCODES[instruction.opcode];
    if (!definition) continue;
    const current = summaries.get(instruction.opcode) ?? {
      ...definition,
      count: 0,
      locations: [],
    };
    current.count += 1;
    if (current.locations.length < 32) current.locations.push(instruction.offset);
    summaries.set(instruction.opcode, current);
  }
  return Array.from(summaries.entries())
    .map(([opcode, summary]) => ({ opcode, ...summary }))
    .sort((left, right) => left.opcode - right.opcode);
}

function buildFunctionSlices(
  selectors: readonly RuntimeSelectorEvidence[],
  instructions: readonly EvmInstruction[],
  analyzedByteLength: number,
): FunctionBytecodeSlice[] {
  const entries = selectors
    .flatMap((selector) =>
      selector.jumpDestinations.map((destination) => ({
        selector: selector.selector,
        destination,
      })),
    )
    .filter(
      (entry) =>
        entry.destination >= 0 &&
        entry.destination < analyzedByteLength &&
        instructions.some(
          (instruction) =>
            instruction.offset === entry.destination && instruction.opcode === 0x5b,
        ),
    )
    .sort((left, right) => left.destination - right.destination);

  return entries.slice(0, TOKEN_DEEP_EVIDENCE_LIMITS.maxRuntimeSelectors).map(
    (entry, index) => {
      const nextDestination = entries
        .slice(index + 1)
        .find((next) => next.destination > entry.destination)?.destination;
      const endOffset = nextDestination ?? analyzedByteLength;
      const sliceInstructions = instructions.filter(
        (instruction) =>
          instruction.offset >= entry.destination && instruction.offset < endOffset,
      );
      const sensitiveNames = uniqueStrings(
        sliceInstructions.flatMap((instruction) => {
          const definition = SENSITIVE_OPCODES[instruction.opcode];
          return definition ? [definition.name] : [];
        }),
      );
      return {
        selector: entry.selector,
        startOffset: entry.destination,
        endOffset,
        instructionCount: sliceInstructions.length,
        sensitiveOpcodes: sensitiveNames,
      };
    },
  );
}

function opcodeName(opcode: number): string {
  if (opcode >= 0x60 && opcode <= 0x7f) return `PUSH${opcode - 0x5f}`;
  if (opcode >= 0x80 && opcode <= 0x8f) return `DUP${opcode - 0x7f}`;
  if (opcode >= 0x90 && opcode <= 0x9f) return `SWAP${opcode - 0x8f}`;
  if (opcode >= 0xa0 && opcode <= 0xa4) return `LOG${opcode - 0xa0}`;
  return OPCODE_NAMES[opcode] ?? `OP_0x${opcode.toString(16).padStart(2, "0")}`;
}

export interface FourByteLookupResult {
  status: "resolved" | "no-result" | "partial" | "error";
  selector: `0x${string}`;
  candidates: readonly string[];
  discardedCandidateCount: number;
  unreturnedCandidateCount: number;
  error: string | null;
}

export type FourByteLookup = (
  selector: `0x${string}`,
) => Promise<FourByteLookupResult | readonly string[]>;

export async function fetchFourByteDirectoryCandidates(
  selectorInput: string,
  options: {
    fetcher?: typeof fetch;
    timeoutMs?: number;
    maxCandidates?: number;
    signal?: AbortSignal;
  } = {},
): Promise<FourByteLookupResult> {
  const selector = normalizeSelector(selectorInput);
  if (!selector) {
    return {
      status: "error",
      selector: "0x00000000",
      candidates: [],
      discardedCandidateCount: 0,
      unreturnedCandidateCount: 0,
      error: "Invalid four-byte selector.",
    };
  }
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = clampInteger(options.timeoutMs, 100, 5_000, 2_500);
  const maxCandidates = clampInteger(
    options.maxCandidates,
    1,
    16,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxFourByteCandidatesPerSelector,
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("4byte lookup timed out"), timeoutMs);
  const relayAbort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) relayAbort();
  else options.signal?.addEventListener("abort", relayAbort, { once: true });

  try {
    const url = new URL("https://www.4byte.directory/api/v1/signatures/");
    url.searchParams.set("hex_signature", selector);
    url.searchParams.set("page_size", String(maxCandidates));
    const response = await fetcher(url, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        status: "error",
        selector,
        candidates: [],
        discardedCandidateCount: 0,
        unreturnedCandidateCount: 0,
        error: `4byte.directory returned HTTP ${response.status}.`,
      };
    }
    const text = await readBoundedResponseText(
      response,
      TOKEN_DEEP_EVIDENCE_LIMITS.maxFourByteResponseBytes,
    );
    if (text.truncated) {
      return {
        status: "partial",
        selector,
        candidates: [],
        discardedCandidateCount: 0,
        unreturnedCandidateCount: 0,
        error: "4byte.directory response exceeded the bounded response size.",
      };
    }
    const parsed: unknown = JSON.parse(text.value);
    if (!isRecord(parsed) || !Array.isArray(parsed.results)) {
      return {
        status: "error",
        selector,
        candidates: [],
        discardedCandidateCount: 0,
        unreturnedCandidateCount: 0,
        error: "4byte.directory returned a malformed response.",
      };
    }
    const rawSignatures = parsed.results.flatMap((entry) =>
      isRecord(entry) && typeof entry.text_signature === "string"
        ? [entry.text_signature]
        : [],
    );
    const normalized = validateSelectorCandidates(
      selector,
      rawSignatures,
      maxCandidates,
    );
    const declaredCount =
      typeof parsed.count === "number" &&
      Number.isSafeInteger(parsed.count) &&
      parsed.count >= 0
        ? parsed.count
        : rawSignatures.length;
    const hasNextPage = parsed.next !== null && parsed.next !== undefined;
    const unreturnedCandidateCount = Math.max(
      0,
      declaredCount - rawSignatures.length,
    );
    const providerPartial =
      hasNextPage ||
      unreturnedCandidateCount > 0 ||
      rawSignatures.length > maxCandidates;
    return {
      status:
        normalized.candidates.length === 0
          ? providerPartial
            ? "partial"
            : "no-result"
          : providerPartial
            ? "partial"
            : "resolved",
      selector,
      candidates: normalized.candidates,
      discardedCandidateCount: normalized.discarded,
      unreturnedCandidateCount,
      error: null,
    };
  } catch (error) {
    return {
      status: "error",
      selector,
      candidates: [],
      discardedCandidateCount: 0,
      unreturnedCandidateCount: 0,
      error: safeErrorMessage(error, "4byte.directory lookup failed."),
    };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", relayAbort);
  }
}

export interface ResolvedRuntimeSelector {
  selector: `0x${string}`;
  state: "resolved" | "ambiguous" | "unresolved";
  source:
    | "verified-abi"
    | "local-watchlist"
    | "4byte-directory"
    | "unresolved";
  resolvedSignature: string | null;
  possibleSignatures: readonly string[];
  classification: SelectorClassification;
  label: string;
  abiFunctions: readonly CanonicalAbiFunction[];
  runtimeEvidence: RuntimeSelectorEvidence;
  note: string;
}

export interface ResolveRuntimeSelectorsResult {
  abi: CanonicalAbiResult;
  bytecode: RuntimeBytecodeAnalysis;
  selectors: readonly ResolvedRuntimeSelector[];
  counts: {
    observed: number;
    resolved: number;
    ambiguous: number;
    unresolved: number;
    fourByteLookups: number;
  };
  partial: boolean;
  warnings: readonly string[];
}

export async function resolveRuntimeSelectors(options: {
  runtimeBytecode: unknown;
  abi?: unknown;
  localWatchlist?: SelectorWatchlist;
  fourByteLookup?: FourByteLookup;
  maxFourByteLookups?: number;
}): Promise<ResolveRuntimeSelectorsResult> {
  const abi = canonicalizeAbiFunctions(options.abi ?? []);
  const bytecode = analyzeRuntimeBytecode(options.runtimeBytecode);
  const watchlist: SelectorWatchlist =
    options.localWatchlist ?? TOKEN_SELECTOR_WATCHLIST;
  const abiBySelector = groupBy(abi.functions, (item) => item.selector);
  const preliminary = bytecode.selectors.map((runtimeEvidence) => {
    const abiMatches = abiBySelector.get(runtimeEvidence.selector) ?? [];
    if (abiMatches.length > 0) {
      const signatures = uniqueStrings(abiMatches.map((item) => item.signature));
      const watchlistEntries = normalizeWatchlistEntries(
        watchlist[runtimeEvidence.selector],
        runtimeEvidence.selector,
      );
      return resolvedSelectorFromCandidates({
        runtimeEvidence,
        signatures,
        source: "verified-abi",
        classification: watchlistEntries[0]?.classification ?? "unknown",
        label: watchlistEntries[0]?.label ?? "Verified ABI function",
        abiFunctions: abiMatches,
      });
    }

    const watchlistEntries = normalizeWatchlistEntries(
      watchlist[runtimeEvidence.selector],
      runtimeEvidence.selector,
    );
    if (watchlistEntries.length > 0) {
      return resolvedSelectorFromCandidates({
        runtimeEvidence,
        signatures: watchlistEntries.map((entry) => entry.signature),
        source: "local-watchlist",
        classification: watchlistEntries[0].classification,
        label: watchlistEntries[0].label,
        abiFunctions: [],
      });
    }

    return resolvedSelectorFromCandidates({
      runtimeEvidence,
      signatures: [],
      source: "unresolved",
      classification: "unknown",
      label: "Unresolved runtime selector",
      abiFunctions: [],
    });
  });

  const maxLookups = clampInteger(
    options.maxFourByteLookups,
    0,
    64,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxFourByteLookups,
  );
  const unresolved = preliminary
    .filter((item) => item.state === "unresolved")
    .slice(0, maxLookups);
  const lookupResults = new Map<`0x${string}`, FourByteLookupResult>();
  if (options.fourByteLookup && unresolved.length > 0) {
    await mapWithConcurrency(unresolved, 4, async (item) => {
      try {
        const result = await options.fourByteLookup?.(item.selector);
        if (!result) return;
        const normalized = normalizeFourByteLookupResult(item.selector, result);
        lookupResults.set(item.selector, normalized);
      } catch (error) {
        lookupResults.set(item.selector, {
          status: "error",
          selector: item.selector,
          candidates: [],
          discardedCandidateCount: 0,
          unreturnedCandidateCount: 0,
          error: safeErrorMessage(error, "4byte lookup failed."),
        });
      }
    });
  }

  const selectors = preliminary.map((item) => {
    const lookup = lookupResults.get(item.selector);
    if (
      !lookup ||
      lookup.candidates.length === 0 ||
      lookup.status === "error" ||
      lookup.status === "no-result"
    ) {
      return item;
    }
    return resolvedSelectorFromCandidates({
      runtimeEvidence: item.runtimeEvidence,
      signatures: lookup.candidates,
      source: "4byte-directory",
      classification:
        lookup.candidates.length === 1 && lookup.status !== "partial"
          ? classifyFourByteSignatureClue(lookup.candidates[0])
          : "unknown",
      label:
        lookup.candidates.length === 1 && lookup.status !== "partial"
          ? "Unique unverified 4byte candidate"
          : "Ambiguous 4byte.directory candidates",
      abiFunctions: [],
      forceAmbiguous: lookup.status === "partial",
    });
  });
  const warnings = [...bytecode.warnings];
  if (abi.partial) {
    warnings.push("ABI normalization was partial; discarded functions remain unresolved.");
  }
  const providerErrors = Array.from(lookupResults.values()).filter(
    (result) => result.status === "error" || result.status === "partial",
  );
  if (providerErrors.length > 0) {
    warnings.push(
      `${providerErrors.length} bounded 4byte selector lookup(s) were incomplete.`,
    );
  }
  if (
    options.fourByteLookup &&
    preliminary.filter((item) => item.state === "unresolved").length > maxLookups
  ) {
    warnings.push(`4byte lookups were capped at ${maxLookups} selectors.`);
  }

  return {
    abi,
    bytecode,
    selectors,
    counts: {
      observed: selectors.length,
      resolved: selectors.filter((item) => item.state === "resolved").length,
      ambiguous: selectors.filter((item) => item.state === "ambiguous").length,
      unresolved: selectors.filter((item) => item.state === "unresolved").length,
      fourByteLookups: lookupResults.size,
    },
    partial:
      abi.partial ||
      bytecode.status !== "complete" ||
      warnings.length > bytecode.warnings.length,
    warnings,
  };
}

function classifyFourByteSignatureClue(
  signature: string,
): SelectorClassification {
  const name = signature.slice(0, signature.indexOf("(")).toLowerCase();
  if (/^(?:name|symbol|decimals|totalsupply|balanceof|allowance|approve|transfer|transferfrom|supportsinterface)$/.test(name)) {
    return "standard";
  }
  if (/mint|issu|supply|rebase|burn/.test(name)) return "supply";
  if (/black|block|white|freeze|pause|trading|bot|maxwallet|maxtx|cooldown|limit|exclude/.test(name)) {
    return "transfer-control";
  }
  if (/fee|tax/.test(name)) return "fees";
  if (/liquidity|pair|router|swap|marketmaker/.test(name)) return "liquidity";
  if (/owner|admin|role|auth|operator|upgrade|implementation|proxy|govern/.test(name)) {
    return "admin";
  }
  return "unknown";
}

function resolvedSelectorFromCandidates(args: {
  runtimeEvidence: RuntimeSelectorEvidence;
  signatures: readonly string[];
  source: ResolvedRuntimeSelector["source"];
  classification: SelectorClassification;
  label: string;
  abiFunctions: readonly CanonicalAbiFunction[];
  forceAmbiguous?: boolean;
}): ResolvedRuntimeSelector {
  const signatures = uniqueStrings(args.signatures).slice(
    0,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxFourByteCandidatesPerSelector,
  );
  const state =
    signatures.length === 0
      ? ("unresolved" as const)
      : signatures.length === 1 && !args.forceAmbiguous
        ? ("resolved" as const)
        : ("ambiguous" as const);
  return {
    selector: args.runtimeEvidence.selector,
    state,
    source: state === "unresolved" ? "unresolved" : args.source,
    resolvedSignature: state === "resolved" ? signatures[0] : null,
    possibleSignatures: signatures,
    classification: args.classification,
    label: args.label,
    abiFunctions: args.abiFunctions,
    runtimeEvidence: args.runtimeEvidence,
    note:
      args.source === "verified-abi"
        ? state === "ambiguous"
          ? "Multiple verified ABI functions share this selector; calldata is required to distinguish them."
          : "Resolved from the verified ABI before lower-authority sources; the signature alone does not confirm behavior."
        : state === "ambiguous"
          ? args.forceAmbiguous
            ? "The bounded signature response was partial, so unreturned collisions may exist. No function name is asserted."
            : "Multiple signatures share this selector. No function name is asserted."
          : state === "resolved"
            ? `${args.source} supplies one selector candidate; behavior remains unconfirmed.`
            : "No bounded signature source resolved this runtime selector.",
  };
}

function normalizeWatchlistEntries(
  value: SelectorWatchlistEntry | readonly SelectorWatchlistEntry[] | undefined,
  selector: `0x${string}`,
): SelectorWatchlistEntry[] {
  const entries = value ? (Array.isArray(value) ? value : [value]) : [];
  return entries.filter(
    (entry) =>
      Boolean(entry) &&
      typeof entry.signature === "string" &&
      safelyComputeSelector(entry.signature) === selector,
  );
}

function normalizeFourByteLookupResult(
  selector: `0x${string}`,
  result: FourByteLookupResult | readonly string[],
): FourByteLookupResult {
  const structured = isFourByteLookupResult(result) ? result : null;
  const rawCandidates: readonly string[] = structured
    ? structured.candidates
    : (result as readonly string[]);
  const validated = validateSelectorCandidates(
    selector,
    rawCandidates,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxFourByteCandidatesPerSelector,
  );
  if (!structured) {
    return {
      status: validated.candidates.length > 0 ? "resolved" : "no-result",
      selector,
      candidates: validated.candidates,
      discardedCandidateCount: validated.discarded,
      unreturnedCandidateCount: 0,
      error: null,
    };
  }
  return {
    status: structured.status,
    selector,
    candidates: validated.candidates,
    discardedCandidateCount:
      structured.discardedCandidateCount + validated.discarded,
    unreturnedCandidateCount: structured.unreturnedCandidateCount,
    error: structured.error,
  };
}

function isFourByteLookupResult(
  value: FourByteLookupResult | readonly string[],
): value is FourByteLookupResult {
  return !Array.isArray(value) && "status" in value && "candidates" in value;
}

function validateSelectorCandidates(
  selector: `0x${string}`,
  candidates: readonly string[],
  maximum: number,
): { candidates: string[]; discarded: number } {
  const accepted: string[] = [];
  let discarded = 0;
  for (const raw of candidates.slice(0, 100)) {
    const signature = normalizeSignatureCandidate(raw);
    if (
      !signature ||
      safelyComputeSelector(signature) !== selector ||
      accepted.includes(signature)
    ) {
      discarded += 1;
      continue;
    }
    if (accepted.length >= maximum) {
      discarded += 1;
      continue;
    }
    accepted.push(signature);
  }
  discarded += Math.max(0, candidates.length - 100);
  return { candidates: accepted, discarded };
}

export type Eip1967SlotKind = "implementation" | "admin" | "beacon";

export interface Eip1967SlotReading {
  kind: Eip1967SlotKind;
  slot: Hex;
  rawValue: Hex | null;
  state: "set" | "empty" | "malformed" | "unavailable";
  address: Address | null;
  note: string;
}

export interface Eip1967StorageEvidence {
  readings: readonly Eip1967SlotReading[];
  implementationAddress: Address | null;
  adminAddress: Address | null;
  beaconAddress: Address | null;
  proxyEvidence: "present" | "absent" | "unresolved";
}

export function decodeEip1967StorageValues(values: {
  implementation?: unknown;
  admin?: unknown;
  beacon?: unknown;
}): Eip1967StorageEvidence {
  const readings = [
    decodeEip1967Slot("implementation", EIP1967_IMPLEMENTATION_SLOT, values.implementation),
    decodeEip1967Slot("admin", EIP1967_ADMIN_SLOT, values.admin),
    decodeEip1967Slot("beacon", EIP1967_BEACON_SLOT, values.beacon),
  ];
  const byKind = new Map(readings.map((reading) => [reading.kind, reading]));
  const implementationAddress = byKind.get("implementation")?.address ?? null;
  const adminAddress = byKind.get("admin")?.address ?? null;
  const beaconAddress = byKind.get("beacon")?.address ?? null;
  const hasUnavailable = readings.some(
    (reading) => reading.state === "unavailable" || reading.state === "malformed",
  );
  return {
    readings,
    implementationAddress,
    adminAddress,
    beaconAddress,
    proxyEvidence:
      implementationAddress || adminAddress || beaconAddress
        ? "present"
        : hasUnavailable
          ? "unresolved"
          : "absent",
  };
}

export function decodeEip1967Slot(
  kind: Eip1967SlotKind,
  slot: Hex,
  value: unknown,
): Eip1967SlotReading {
  if (value === undefined || value === null) {
    return {
      kind,
      slot,
      rawValue: null,
      state: "unavailable",
      address: null,
      note: "The storage slot was not read.",
    };
  }
  const normalized = normalizeStorageHex(value);
  if (!normalized) {
    return {
      kind,
      slot,
      rawValue: null,
      state: "malformed",
      address: null,
      note: "The storage provider returned malformed hexadecimal data.",
    };
  }
  if (/^0x0{64}$/.test(normalized)) {
    return {
      kind,
      slot,
      rawValue: normalized,
      state: "empty",
      address: null,
      note: "The EIP-1967 slot is zero at the captured block.",
    };
  }
  if (!/^0x0{24}[0-9a-f]{40}$/.test(normalized)) {
    return {
      kind,
      slot,
      rawValue: normalized,
      state: "malformed",
      address: null,
      note: "The EIP-1967 slot was non-zero but not a canonical address value.",
    };
  }
  const addressHex = `0x${normalized.slice(-40)}`;
  if (!isAddress(addressHex)) {
    return {
      kind,
      slot,
      rawValue: normalized,
      state: "malformed",
      address: null,
      note: "The EIP-1967 slot did not decode to an address.",
    };
  }
  return {
    kind,
    slot,
    rawValue: normalized,
    state: "set",
    address: getAddress(addressHex),
    note: "The EIP-1967 slot contains a non-zero address at the captured block.",
  };
}

export type SimulationKind =
  | "holder-to-pair"
  | "controller-to-pair"
  | "holder-to-wallet"
  | "pair-to-holder"
  | "control-controller"
  | "control-ordinary"
  | "custom";

export interface ReadOnlySimulationCandidate {
  id: string;
  kind: SimulationKind;
  from: Address;
  to: Address;
  data: Hex;
  value?: bigint;
  functionSignature: string | null;
  interpretReturnAsBoolean?: boolean;
  evidenceIds: readonly string[];
  priority?: number;
}

export interface ReadOnlySimulationPlan {
  rpcMethod: "eth_call";
  calls: readonly ReadOnlySimulationCandidate[];
  omittedCount: number;
  invalidCount: number;
  capped: boolean;
  note: string;
}

export function buildReadOnlySimulationPlan(
  candidates: readonly ReadOnlySimulationCandidate[],
): ReadOnlySimulationPlan {
  const boundedInput = candidates.slice(
    0,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxSimulationCandidates,
  );
  const valid: Array<{ candidate: ReadOnlySimulationCandidate; index: number }> = [];
  let invalidCount = 0;
  const dedupe = new Set<string>();
  for (const [index, candidate] of boundedInput.entries()) {
    const normalized = normalizeSimulationCandidate(candidate);
    if (!normalized) {
      invalidCount += 1;
      continue;
    }
    const key = `${normalized.from}:${normalized.to}:${normalized.data}:${normalized.value ?? 0n}`.toLowerCase();
    if (dedupe.has(key)) continue;
    dedupe.add(key);
    valid.push({ candidate: normalized, index });
  }
  valid.sort(
    (left, right) =>
      (right.candidate.priority ?? 0) - (left.candidate.priority ?? 0) ||
      left.index - right.index,
  );
  const calls = valid
    .slice(0, TOKEN_DEEP_EVIDENCE_LIMITS.maxSimulations)
    .map((entry) => entry.candidate);
  const omittedCount =
    Math.max(0, candidates.length - boundedInput.length) +
    Math.max(0, valid.length - calls.length);
  return {
    rpcMethod: "eth_call",
    calls,
    omittedCount,
    invalidCount,
    capped: omittedCount > 0,
    note:
      "Calls are read-only simulations at one captured block. Success proves only that the tested call path succeeded at that block.",
  };
}

const ERC20_TRANSFER_FUNCTION = {
  type: "function",
  name: "transfer",
  stateMutability: "nonpayable",
  inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  outputs: [{ name: "", type: "bool" }],
} as const satisfies AbiFunction;

export function buildTransferSimulationCandidates(args: {
  token: Address;
  holder: Address;
  pair: Address;
  ordinaryWallet: Address;
  controller?: Address | null;
  pairHasBalance?: boolean;
  amount?: bigint;
  evidenceIds?: readonly string[];
}): ReadOnlySimulationCandidate[] {
  const amount = args.amount && args.amount > 0n ? args.amount : 1n;
  const evidenceIds = args.evidenceIds ?? [];
  const candidate = (
    id: string,
    kind: SimulationKind,
    from: Address,
    recipient: Address,
    priority: number,
  ): ReadOnlySimulationCandidate => ({
    id,
    kind,
    from: getAddress(from),
    to: getAddress(args.token),
    data: encodeFunctionDataLoose(ERC20_TRANSFER_FUNCTION, [
      getAddress(recipient),
      amount,
    ]),
    functionSignature: "transfer(address,uint256)",
    interpretReturnAsBoolean: true,
    evidenceIds,
    priority,
  });
  const candidates = [
    candidate("holder-to-pair", "holder-to-pair", args.holder, args.pair, 100),
    candidate(
      "holder-to-wallet",
      "holder-to-wallet",
      args.holder,
      args.ordinaryWallet,
      90,
    ),
  ];
  if (args.controller) {
    candidates.push(
      candidate(
        "controller-to-pair",
        "controller-to-pair",
        args.controller,
        args.pair,
        95,
      ),
    );
  }
  if (args.pairHasBalance) {
    candidates.push(
      candidate("pair-to-holder", "pair-to-holder", args.pair, args.holder, 85),
    );
  }
  return candidates;
}

export function buildAbiControlSimulationCandidate(args: {
  id: string;
  kind: "control-controller" | "control-ordinary" | "custom";
  contract: Address;
  caller: Address;
  abiFunction: AbiFunction;
  functionArgs?: readonly unknown[];
  evidenceIds?: readonly string[];
  priority?: number;
}): ReadOnlySimulationCandidate {
  const signature = toFunctionSignature(args.abiFunction);
  return {
    id: args.id,
    kind: args.kind,
    from: getAddress(args.caller),
    to: getAddress(args.contract),
    data: encodeFunctionDataLoose(args.abiFunction, args.functionArgs ?? []),
    functionSignature: signature,
    interpretReturnAsBoolean:
      args.abiFunction.outputs.length === 1 &&
      args.abiFunction.outputs[0].type === "bool",
    evidenceIds: args.evidenceIds ?? [],
    priority: args.priority,
  };
}

export interface ReadOnlyEthCallRequest {
  account: Address;
  to: Address;
  data: Hex;
  value?: bigint;
  blockNumber: bigint;
  signal: AbortSignal;
}

export type ReadOnlyEthCall = (request: ReadOnlyEthCallRequest) => Promise<Hex>;

export interface SimulationRevert {
  kind: "error-string" | "panic" | "custom-error" | "unknown-revert";
  name: string | null;
  reason: string | null;
  args: readonly unknown[];
  data: Hex | null;
}

export type ReadOnlySimulationResult =
  | {
      id: string;
      kind: SimulationKind;
      status: "success";
      blockNumber: string;
      returnData: Hex;
      semanticResult: "true" | "not-interpreted" | "undecodable";
      note: string;
    }
  | {
      id: string;
      kind: SimulationKind;
      status: "returned-false";
      blockNumber: string;
      returnData: Hex;
      note: string;
    }
  | {
      id: string;
      kind: SimulationKind;
      status: "revert";
      blockNumber: string;
      revert: SimulationRevert;
      note: string;
    }
  | {
      id: string;
      kind: SimulationKind;
      status: "rpc-error";
      blockNumber: string;
      error: string;
      note: string;
    };

export async function runReadOnlySimulationPlan(args: {
  plan: ReadOnlySimulationPlan;
  blockNumber: bigint;
  ethCall: ReadOnlyEthCall;
  errorAbi?: Abi;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<readonly ReadOnlySimulationResult[]> {
  if (args.blockNumber < 0n) throw new Error("A captured block number is required.");
  const calls = args.plan.calls.slice(0, TOKEN_DEEP_EVIDENCE_LIMITS.maxSimulations);
  const timeoutMs = clampInteger(
    args.timeoutMs,
    100,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxSimulationTimeoutMs,
    5_000,
  );
  return Promise.all(
    calls.map(async (candidate): Promise<ReadOnlySimulationResult> => {
      try {
        const returnData = await executeBoundedEthCall({
          ethCall: args.ethCall,
          request: {
            account: candidate.from,
            to: candidate.to,
            data: candidate.data,
            value: candidate.value,
            blockNumber: args.blockNumber,
          },
          timeoutMs,
          signal: args.signal,
        });
        const normalized = normalizeEvenHex(returnData);
        if (!normalized) throw new Error("eth_call returned malformed data.");
        const booleanResult = candidate.interpretReturnAsBoolean
          ? decodeBooleanReturn(normalized)
          : null;
        if (booleanResult === false) {
          return {
            id: candidate.id,
            kind: candidate.kind,
            status: "returned-false",
            blockNumber: args.blockNumber.toString(),
            returnData: normalized,
            note:
              "The read-only call did not revert but returned false, so the requested operation did not report success.",
          };
        }
        return {
          id: candidate.id,
          kind: candidate.kind,
          status: "success",
          blockNumber: args.blockNumber.toString(),
          returnData: normalized,
          semanticResult:
            booleanResult === true
              ? "true"
              : candidate.interpretReturnAsBoolean
                ? "undecodable"
                : "not-interpreted",
          note:
            "This call did not revert at the captured block; it does not prove other paths or blocks will succeed.",
        };
      } catch (error) {
        const failure = representSimulationFailure(error, args.errorAbi);
        if (failure.status === "revert") {
          return {
            id: candidate.id,
            kind: candidate.kind,
            status: "revert",
            blockNumber: args.blockNumber.toString(),
            revert: failure.revert,
            note: "The read-only call reverted at the captured block.",
          };
        }
        return {
          id: candidate.id,
          kind: candidate.kind,
          status: "rpc-error",
          blockNumber: args.blockNumber.toString(),
          error: failure.error,
          note: "The provider failed; contract behavior is unresolved.",
        };
      }
    }),
  );
}

async function executeBoundedEthCall(args: {
  ethCall: ReadOnlyEthCall;
  request: Omit<ReadOnlyEthCallRequest, "signal">;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<Hex> {
  const controller = new AbortController();
  const abortWithReason = (reason: unknown, fallback: string) => {
    controller.abort(reason instanceof Error ? reason : new Error(fallback));
  };
  const relayAbort = () =>
    abortWithReason(args.signal?.reason, "Read-only simulation was cancelled.");
  if (args.signal?.aborted) relayAbort();
  else args.signal?.addEventListener("abort", relayAbort, { once: true });
  const timeout = setTimeout(
    () =>
      abortWithReason(
        new Error(`Read-only eth_call timed out after ${args.timeoutMs}ms.`),
        "Read-only eth_call timed out.",
      ),
    args.timeoutMs,
  );
  const abortPromise = new Promise<never>((_resolve, reject) => {
    const rejectAbort = () =>
      reject(
        controller.signal.reason instanceof Error
          ? controller.signal.reason
          : new Error("Read-only simulation was cancelled."),
      );
    if (controller.signal.aborted) rejectAbort();
    else controller.signal.addEventListener("abort", rejectAbort, { once: true });
  });
  try {
    if (controller.signal.aborted) {
      throw controller.signal.reason;
    }
    return await Promise.race([
      args.ethCall({ ...args.request, signal: controller.signal }),
      abortPromise,
    ]);
  } finally {
    clearTimeout(timeout);
    args.signal?.removeEventListener("abort", relayAbort);
  }
}

function decodeBooleanReturn(data: Hex): boolean | null {
  if (/^0x0{64}$/.test(data)) return false;
  if (/^0x0{63}1$/.test(data)) return true;
  return null;
}

export function representSimulationFailure(
  error: unknown,
  errorAbi: Abi = [],
):
  | { status: "revert"; revert: SimulationRevert }
  | { status: "rpc-error"; error: string } {
  const data = findNestedHexData(error);
  const message = safeErrorMessage(error, "Read-only call failed.");
  if (data) {
    const decoded = decodeRevertData(data, errorAbi);
    return { status: "revert", revert: decoded };
  }
  if (/revert|panic|invalid opcode/i.test(message)) {
    return {
      status: "revert",
      revert: {
        kind: "unknown-revert",
        name: null,
        reason: message,
        args: [],
        data: null,
      },
    };
  }
  return { status: "rpc-error", error: message };
}

const STANDARD_REVERT_ABI = [
  {
    type: "error",
    name: "Error",
    inputs: [{ name: "message", type: "string" }],
  },
  {
    type: "error",
    name: "Panic",
    inputs: [{ name: "code", type: "uint256" }],
  },
] as const satisfies Abi;

function decodeRevertData(data: Hex, errorAbi: Abi): SimulationRevert {
  try {
    const decoded = decodeErrorResult({
      abi: [...STANDARD_REVERT_ABI, ...errorAbi] as Abi,
      data,
    });
    const args = normalizeDecodedArgs(decoded.args);
    const name = decoded.errorName;
    return {
      kind:
        name === "Error"
          ? "error-string"
          : name === "Panic"
            ? "panic"
            : "custom-error",
      name,
      reason:
        name === "Error" && typeof args[0] === "string"
          ? args[0]
          : name === "Panic"
            ? `Panic code ${String(args[0] ?? "unknown")}`
            : null,
      args,
      data,
    };
  } catch {
    return {
      kind: "unknown-revert",
      name: null,
      reason: null,
      args: [],
      data,
    };
  }
}

export interface HistoricalContractCallInput {
  transactionHash?: unknown;
  from?: unknown;
  to?: unknown;
  input?: unknown;
  blockNumber?: unknown;
  transactionIndex?: unknown;
  timestamp?: unknown;
  success?: unknown;
}

export interface DecodedHistoricalContractCall {
  transactionHash: Hex | null;
  from: Address | null;
  to: Address | null;
  selector: `0x${string}` | null;
  state: "decoded" | "ambiguous" | "unknown-selector" | "malformed";
  functionSignature: string | null;
  possibleSignatures: readonly string[];
  args: readonly unknown[];
  blockNumber: string | null;
  transactionIndex: string | null;
  timestamp: string | null;
  success: boolean | null;
  configuredPrivilegedCall: boolean;
  fromConfiguredController: boolean;
  afterOwnerReachedZero: boolean | null;
}

export interface OwnershipTransferLogInput {
  transactionHash?: unknown;
  blockNumber?: unknown;
  transactionIndex?: unknown;
  logIndex?: unknown;
  topics?: unknown;
}

export interface DecodedOwnershipTransfer {
  transactionHash: Hex | null;
  blockNumber: string | null;
  transactionIndex: string | null;
  logIndex: string | null;
  previousOwner: Address;
  newOwner: Address;
  renounced: boolean;
}

export interface DecodedHistoryEvidence {
  calls: readonly DecodedHistoricalContractCall[];
  ownershipTransfers: readonly DecodedOwnershipTransfer[];
  inputCallCount: number;
  inputOwnershipLogCount: number;
  omittedCallCount: number;
  omittedOwnershipTransferCount: number;
  malformedOwnershipLogCount: number;
  orderingAmbiguous: boolean;
  partial: boolean;
}

export const OWNERSHIP_TRANSFERRED_TOPIC =
  "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0" as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function decodeBoundedContractHistory(args: {
  calls: readonly HistoricalContractCallInput[];
  abi?: unknown;
  ownershipLogs?: readonly OwnershipTransferLogInput[];
  privilegedSignatures?: readonly string[];
  controllerAddresses?: readonly Address[];
}): DecodedHistoryEvidence {
  const canonicalAbi = canonicalizeAbiFunctions(args.abi ?? []);
  const bySelector = groupBy(canonicalAbi.functions, (item) => item.selector);
  const ownershipBatch = decodeOwnershipTransferLogBatch(args.ownershipLogs ?? []);
  const ownershipTransfers = ownershipBatch.transfers;
  const privilegedSignatures = new Set(args.privilegedSignatures ?? []);
  const controllers = new Set(
    (args.controllerAddresses ?? []).map((address) => address.toLowerCase()),
  );
  const callPool = takeBoundedEdgeSample(
    args.calls,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxHistoryInputItems,
  );
  const boundedCalls = callPool
    .map((call, index) => ({ call, index }))
    .sort((left, right) => compareRecentCallInputs(left, right))
    .slice(0, TOKEN_DEEP_EVIDENCE_LIMITS.maxHistoryCalls)
    .map((entry) => entry.call);
  const calls = boundedCalls.map((call) => {
    const data = normalizeEvenHex(call.input);
    const selector = data && data.length >= 10 ? normalizeSelector(data.slice(0, 10)) : null;
    const matches = selector ? bySelector.get(selector) ?? [] : [];
    const blockNumber = normalizeBlockNumber(call.blockNumber);
    const transactionIndex = normalizeBlockNumber(call.transactionIndex);
    const from = normalizeAddress(call.from);
    let state: DecodedHistoricalContractCall["state"];
    let functionSignature: string | null = null;
    let possibleSignatures: string[] = [];
    let decodedArgs: readonly unknown[] = [];

    if (!data || !selector) {
      state = "malformed";
    } else if (matches.length === 0) {
      state = "unknown-selector";
    } else if (matches.length > 1) {
      state = "ambiguous";
      possibleSignatures = matches.map((item) => item.signature);
    } else {
      const match = matches[0];
      try {
        const decoded = decodeFunctionDataLoose(match.abiItem, data);
        state = "decoded";
        functionSignature = match.signature;
        possibleSignatures = [match.signature];
        decodedArgs = normalizeDecodedArgs(decoded.args);
      } catch {
        state = "malformed";
        possibleSignatures = [match.signature];
      }
    }

    return {
      transactionHash: normalizeTransactionHash(call.transactionHash),
      from,
      to: normalizeAddress(call.to),
      selector,
      state,
      functionSignature,
      possibleSignatures,
      args: decodedArgs,
      blockNumber,
      transactionIndex,
      timestamp: normalizeTimestamp(call.timestamp),
      success: typeof call.success === "boolean" ? call.success : null,
      configuredPrivilegedCall:
        functionSignature !== null && privilegedSignatures.has(functionSignature),
      fromConfiguredController:
        from !== null && controllers.has(from.toLowerCase()),
      afterOwnerReachedZero: ownerWasZeroAtActivity(
        ownershipTransfers,
        blockNumber,
        transactionIndex,
      ),
    };
  });
  const orderingAmbiguous =
    callOrderingIsAmbiguous(boundedCalls) ||
    ownershipOrderingIsAmbiguous(ownershipTransfers);
  return {
    calls,
    ownershipTransfers,
    inputCallCount: args.calls.length,
    inputOwnershipLogCount: (args.ownershipLogs ?? []).length,
    omittedCallCount: Math.max(0, args.calls.length - boundedCalls.length),
    omittedOwnershipTransferCount: ownershipBatch.omittedCount,
    malformedOwnershipLogCount: ownershipBatch.malformedCount,
    orderingAmbiguous,
    partial:
      args.calls.length > boundedCalls.length ||
      ownershipBatch.omittedCount > 0 ||
      ownershipBatch.malformedCount > 0 ||
      orderingAmbiguous ||
      canonicalAbi.partial,
  };
}

export function decodeOwnershipTransferLogs(
  logs: readonly OwnershipTransferLogInput[],
): DecodedOwnershipTransfer[] {
  return decodeOwnershipTransferLogBatch(logs).transfers;
}

function decodeOwnershipTransferLogBatch(
  logs: readonly OwnershipTransferLogInput[],
): {
  transfers: DecodedOwnershipTransfer[];
  omittedCount: number;
  malformedCount: number;
} {
  const decoded: DecodedOwnershipTransfer[] = [];
  let malformedCount = 0;
  const logPool = takeBoundedEdgeSample(
    logs,
    TOKEN_DEEP_EVIDENCE_LIMITS.maxHistoryInputItems,
  );
  for (const log of logPool) {
    if (!Array.isArray(log.topics) || log.topics.length < 3) {
      malformedCount += 1;
      continue;
    }
    const [topic0, previousTopic, nextTopic] = log.topics;
    if (
      typeof topic0 !== "string" ||
      topic0.toLowerCase() !== OWNERSHIP_TRANSFERRED_TOPIC ||
      typeof previousTopic !== "string" ||
      typeof nextTopic !== "string"
    ) {
      malformedCount += 1;
      continue;
    }
    const previousOwner = addressFromTopic(previousTopic);
    const newOwner = addressFromTopic(nextTopic);
    const blockNumber = normalizeBlockNumber(log.blockNumber);
    if (!previousOwner || !newOwner || blockNumber === null) {
      malformedCount += 1;
      continue;
    }
    decoded.push({
      transactionHash: normalizeTransactionHash(log.transactionHash),
      blockNumber,
      transactionIndex: normalizeBlockNumber(log.transactionIndex),
      logIndex: normalizeBlockNumber(log.logIndex),
      previousOwner,
      newOwner,
      renounced: newOwner.toLowerCase() === ZERO_ADDRESS,
    });
  }
  const selected = decoded
    .sort(compareOwnershipTransfers)
    .slice(-TOKEN_DEEP_EVIDENCE_LIMITS.maxHistoryCalls);
  const omittedCount =
    Math.max(0, logs.length - logPool.length) +
    Math.max(0, decoded.length - selected.length);
  return { transfers: selected, omittedCount, malformedCount };
}

function ownerWasZeroAtActivity(
  transfers: readonly DecodedOwnershipTransfer[],
  blockNumber: string | null,
  transactionIndex: string | null,
): boolean | null {
  if (blockNumber === null) return null;
  const block = BigInt(blockNumber);
  const relevant: DecodedOwnershipTransfer[] = [];
  let sameBlockOrderUnknown = false;
  for (const transfer of transfers) {
    if (transfer.blockNumber === null) continue;
    const transferBlock = BigInt(transfer.blockNumber);
    if (transferBlock < block) {
      relevant.push(transfer);
      continue;
    }
    if (transferBlock !== block) continue;
    if (
      transactionIndex === null ||
      transfer.transactionIndex === null ||
      transfer.transactionIndex === transactionIndex
    ) {
      sameBlockOrderUnknown = true;
      continue;
    }
    if (BigInt(transfer.transactionIndex) < BigInt(transactionIndex)) {
      relevant.push(transfer);
    }
  }
  if (sameBlockOrderUnknown) return null;
  if (relevant.length === 0) return null;
  relevant.sort(compareOwnershipTransfers);
  if (latestOwnershipOrderIsAmbiguous(relevant)) return null;
  return relevant[relevant.length - 1].newOwner.toLowerCase() === ZERO_ADDRESS;
}

function normalizeSimulationCandidate(
  candidate: ReadOnlySimulationCandidate,
): ReadOnlySimulationCandidate | null {
  if (
    typeof candidate.id !== "string" ||
    candidate.id.length < 1 ||
    candidate.id.length > 100 ||
    !isAddress(candidate.from) ||
    !isAddress(candidate.to) ||
    !normalizeEvenHex(candidate.data) ||
    !Array.isArray(candidate.evidenceIds) ||
    candidate.evidenceIds.some((evidenceId) => typeof evidenceId !== "string") ||
    (candidate.value !== undefined &&
      (typeof candidate.value !== "bigint" || candidate.value < 0n))
  ) {
    return null;
  }
  return {
    ...candidate,
    from: getAddress(candidate.from),
    to: getAddress(candidate.to),
    data: normalizeEvenHex(candidate.data) as Hex,
    interpretReturnAsBoolean: candidate.interpretReturnAsBoolean === true,
    evidenceIds: uniqueStrings(candidate.evidenceIds).slice(0, 20),
  };
}

function encodeFunctionDataLoose(
  abiFunction: AbiFunction,
  args: readonly unknown[],
): Hex {
  const encode = encodeFunctionData as unknown as (parameters: {
    abi: Abi;
    functionName: string;
    args: readonly unknown[];
  }) => Hex;
  return encode({
    abi: [abiFunction],
    functionName: abiFunction.name,
    args,
  });
}

function decodeFunctionDataLoose(
  abiFunction: AbiFunction,
  data: Hex,
): { functionName: string; args?: readonly unknown[] } {
  const decode = decodeFunctionData as unknown as (parameters: {
    abi: Abi;
    data: Hex;
  }) => { functionName: string; args?: readonly unknown[] };
  return decode({ abi: [abiFunction], data });
}

function normalizeDecodedArgs(args: unknown): readonly unknown[] {
  if (args === undefined) return [];
  const values = Array.isArray(args) ? args : [args];
  return values.slice(0, 32).map((value) => normalizeDecodedValue(value, 0));
}

function normalizeDecodedValue(value: unknown, depth: number): unknown {
  if (depth >= 5) return "[depth capped]";
  if (typeof value === "bigint") return value.toString();
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 32)
      .map((item) => normalizeDecodedValue(item, depth + 1));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 32)
        .map(([key, item]) => [key, normalizeDecodedValue(item, depth + 1)]),
    );
  }
  return String(value);
}

function findNestedHexData(value: unknown): Hex | null {
  const seen = new Set<unknown>();
  const visit = (current: unknown, depth: number): Hex | null => {
    if (depth > 5 || current === null || current === undefined) return null;
    if (typeof current === "string") {
      const normalized = normalizeEvenHex(current);
      return normalized && normalized.length >= 10 ? normalized : null;
    }
    if (!isRecord(current) || seen.has(current)) return null;
    seen.add(current);
    for (const key of ["data", "cause", "error", "details"]) {
      const found = visit(current[key], depth + 1);
      if (found) return found;
    }
    return null;
  };
  return visit(value, 0);
}

function normalizeAddress(value: unknown): Address | null {
  return typeof value === "string" && isAddress(value) ? getAddress(value) : null;
}

function normalizeTransactionHash(value: unknown): Hex | null {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value)
    ? (value.toLowerCase() as Hex)
    : null;
}

function normalizeBlockNumber(value: unknown): string | null {
  try {
    if (typeof value === "bigint" && value >= 0n) return value.toString();
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
      return String(value);
    }
    if (typeof value === "string") {
      const parsed = value.startsWith("0x") ? BigInt(value) : BigInt(value.trim());
      return parsed >= 0n ? parsed.toString() : null;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1_000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value !== "string" || value.length > 80) return null;
  const numeric = Number(value);
  if (/^\d+$/.test(value) && Number.isFinite(numeric)) {
    return normalizeTimestamp(numeric);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function addressFromTopic(value: string): Address | null {
  if (!/^0x0{24}[0-9a-fA-F]{40}$/.test(value)) return null;
  const address = `0x${value.slice(-40)}`;
  return isAddress(address) ? getAddress(address) : null;
}

function compareNullableBlockNumbers(
  left: string | null,
  right: string | null,
): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  const leftBlock = BigInt(left);
  const rightBlock = BigInt(right);
  return leftBlock < rightBlock ? -1 : leftBlock > rightBlock ? 1 : 0;
}

function compareOwnershipTransfers(
  left: DecodedOwnershipTransfer,
  right: DecodedOwnershipTransfer,
): number {
  return (
    compareNullableBlockNumbers(left.blockNumber, right.blockNumber) ||
    compareNullableBlockNumbers(left.transactionIndex, right.transactionIndex) ||
    compareNullableBlockNumbers(left.logIndex, right.logIndex)
  );
}

function compareRecentCallInputs(
  left: { call: HistoricalContractCallInput; index: number },
  right: { call: HistoricalContractCallInput; index: number },
): number {
  const blockOrder = compareNullableNumbersDescending(
    normalizeBlockNumber(left.call.blockNumber),
    normalizeBlockNumber(right.call.blockNumber),
  );
  if (blockOrder !== 0) return blockOrder;
  const transactionOrder = compareNullableNumbersDescending(
    normalizeBlockNumber(left.call.transactionIndex),
    normalizeBlockNumber(right.call.transactionIndex),
  );
  if (transactionOrder !== 0) return transactionOrder;
  const leftTimestamp = normalizeTimestamp(left.call.timestamp);
  const rightTimestamp = normalizeTimestamp(right.call.timestamp);
  if (leftTimestamp && rightTimestamp && leftTimestamp !== rightTimestamp) {
    return rightTimestamp.localeCompare(leftTimestamp);
  }
  if (leftTimestamp) return -1;
  if (rightTimestamp) return 1;
  return left.index - right.index;
}

function callOrderingIsAmbiguous(
  calls: readonly HistoricalContractCallInput[],
): boolean {
  const byBlock = new Map<string, Array<string | null>>();
  for (const call of calls) {
    const block = normalizeBlockNumber(call.blockNumber);
    if (block === null) return true;
    const entries = byBlock.get(block) ?? [];
    entries.push(normalizeBlockNumber(call.transactionIndex));
    byBlock.set(block, entries);
  }
  return Array.from(byBlock.values()).some(
    (transactionIndexes) =>
      transactionIndexes.length > 1 &&
      (transactionIndexes.some((index) => index === null) ||
        new Set(transactionIndexes).size !== transactionIndexes.length),
  );
}

function ownershipOrderingIsAmbiguous(
  transfers: readonly DecodedOwnershipTransfer[],
): boolean {
  const byBlock = groupBy(
    transfers.filter((transfer) => transfer.blockNumber !== null),
    (transfer) => transfer.blockNumber as string,
  );
  return Array.from(byBlock.values()).some(ownershipBlockOrderIsAmbiguous);
}

function latestOwnershipOrderIsAmbiguous(
  transfers: readonly DecodedOwnershipTransfer[],
): boolean {
  const latestBlock = transfers.at(-1)?.blockNumber;
  if (latestBlock === null || latestBlock === undefined) return true;
  return ownershipBlockOrderIsAmbiguous(
    transfers.filter((transfer) => transfer.blockNumber === latestBlock),
  );
}

function ownershipBlockOrderIsAmbiguous(
  transfers: readonly DecodedOwnershipTransfer[],
): boolean {
  if (transfers.length < 2) return false;
  if (transfers.some((transfer) => transfer.transactionIndex === null)) {
    return true;
  }
  const byTransaction = groupBy(
    transfers,
    (transfer) => transfer.transactionIndex as string,
  );
  return Array.from(byTransaction.values()).some(
    (sameTransaction) =>
      sameTransaction.length > 1 &&
      (sameTransaction.some((transfer) => transfer.logIndex === null) ||
        new Set(sameTransaction.map((transfer) => transfer.logIndex)).size !==
          sameTransaction.length),
  );
}

function compareNullableNumbersDescending(
  left: string | null,
  right: string | null,
): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return -compareNullableBlockNumbers(left, right);
}

function normalizeStorageHex(value: unknown): Hex | null {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{1,64}$/.test(value)) {
    return null;
  }
  let body = value.slice(2).toLowerCase();
  if (body.length % 2 === 1) body = `0${body}`;
  return `0x${body.padStart(64, "0")}`;
}

function normalizeEvenHex(value: unknown): Hex | null {
  return typeof value === "string" && /^0x(?:[0-9a-fA-F]{2})*$/.test(value)
    ? (value.toLowerCase() as Hex)
    : null;
}

function normalizeBoundedRuntimeHex(
  value: unknown,
  maximumBytes: number,
): { normalized: Hex; fullByteLength: number } | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("0x") ||
    (value.length - 2) % 2 !== 0
  ) {
    return null;
  }
  const fullByteLength = (value.length - 2) / 2;
  const bounded = value.slice(0, 2 + Math.min(fullByteLength, maximumBytes) * 2);
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(bounded)) return null;
  return {
    normalized: bounded.toLowerCase() as Hex,
    fullByteLength,
  };
}

function normalizeSelector(value: unknown): `0x${string}` | null {
  return typeof value === "string" && /^0x[0-9a-fA-F]{8}$/.test(value)
    ? (value.toLowerCase() as `0x${string}`)
    : null;
}

function normalizeSignatureCandidate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (
    trimmed.length < 3 ||
    trimmed.length > 256 ||
    /[\u0000-\u001f\u007f]/.test(trimmed) ||
    /\s/.test(trimmed) ||
    !trimmed.includes("(") ||
    !trimmed.endsWith(")")
  ) {
    return null;
  }
  return trimmed;
}

function safelyComputeSelector(signature: string): `0x${string}` | null {
  try {
    return normalizeSelector(toFunctionSelector(signature));
  } catch {
    return null;
  }
}

function isIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]{0,255}$/.test(value);
}

function isPlausibleAbiType(value: string): boolean {
  return value.length > 0 && value.length <= 256 && !/[\s\u0000-\u001f]/.test(value);
}

function hexToBytes(value: Hex, maximumBytes: number): Uint8Array {
  const length = Math.min((value.length - 2) / 2, maximumBytes);
  const result = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    result[index] = Number.parseInt(value.slice(2 + index * 2, 4 + index * 2), 16);
  }
  return result;
}

function bytesToHex(value: Uint8Array): Hex {
  return `0x${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function uniqueSortedNumbers(values: readonly number[]): number[] {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function takeBoundedEdgeSample<T>(values: readonly T[], maximum: number): T[] {
  if (values.length <= maximum) return values.slice();
  const firstCount = Math.ceil(maximum / 2);
  const lastCount = maximum - firstCount;
  return [
    ...values.slice(0, firstCount),
    ...values.slice(values.length - lastCount),
  ];
}

function groupBy<T, K>(
  values: readonly T[],
  key: (value: T) => K,
): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const value of values) {
    const bucket = grouped.get(key(value)) ?? [];
    bucket.push(value);
    grouped.set(key(value), bucket);
  }
  return grouped;
}

async function mapWithConcurrency<T>(
  values: readonly T[],
  concurrency: number,
  work: (value: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        await work(values[index]);
      }
    },
  );
  await Promise.all(workers);
}

async function readBoundedResponseText(
  response: Response,
  maximumBytes: number,
): Promise<{ value: string; truncated: boolean }> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return { value: "", truncated: true };
  }
  if (!response.body) {
    const value = await response.text();
    return {
      value,
      truncated: new TextEncoder().encode(value).length > maximumBytes,
    };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      return { value: "", truncated: true };
    }
    chunks.push(chunk.value);
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { value: new TextDecoder().decode(combined), truncated: false };
}

function safeErrorMessage(error: unknown, fallback: string): string {
  const message =
    error instanceof Error
      ? error.message
      : isRecord(error) && typeof error.message === "string"
        ? error.message
        : fallback;
  return (
    message
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/(bearer\s+)[a-z0-9._~+/=-]+/gi, "$1[redacted]")
      .replace(
        /([?&](?:api[_-]?key|apikey|token|auth|authorization)=)[^&\s]+/gi,
        "$1[redacted]",
      )
      .slice(0, 300) || fallback
  );
}

function clampInteger(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, Math.floor(value)))
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
