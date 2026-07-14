import { parse } from "@solidity-parser/parser";
import type {
  BaseASTNode,
  ContractDefinition,
  FunctionDefinition,
  ModifierDefinition,
  SourceUnit,
  StateVariableDeclarationVariable,
} from "@solidity-parser/parser/dist/src/ast-types";

export const SOLIDITY_SOURCE_ANALYSIS_VERSION =
  "solidity-source-analysis-v1" as const;

export const SOLIDITY_SOURCE_ANALYSIS_LIMITS = {
  maxBytes: 512 * 1024,
  maxFiles: 40,
  maxLines: 20_000,
} as const;

export interface SoliditySourceFile {
  name: string;
  content: string;
}

export type SoliditySourceInput =
  | string
  | Readonly<Record<string, string>>
  | readonly SoliditySourceFile[];

export type SoliditySourceFindingCategory =
  | "ownership"
  | "transfer-controls"
  | "supply"
  | "fees"
  | "pause-trading"
  | "proxy-upgrade"
  | "external-call"
  | "liquidity";

export type SoliditySourceFindingSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type SoliditySourceFindingState = "confirmed" | "review";

export type SoliditySourceEvidenceKind =
  | "declaration"
  | "guard"
  | "assignment"
  | "mapping-read"
  | "mapping-write"
  | "branch"
  | "external-call"
  | "name-clue";

export interface SoliditySourceEvidence {
  kind: SoliditySourceEvidenceKind;
  file: string;
  line: number;
  endLine: number;
  column: number;
  endColumn: number;
  contract: string | null;
  function: string | null;
  symbol: string | null;
  snippet: string;
}

export interface SoliditySourceFinding {
  /** Stable rule identifier. One finding is emitted per rule. */
  id: string;
  category: SoliditySourceFindingCategory;
  severity: SoliditySourceFindingSeverity;
  state: SoliditySourceFindingState;
  title: string;
  description: string;
  practicalEffect: string;
  evidence: SoliditySourceEvidence[];
}

export type SoliditySourceAnalysisIssueCode =
  | "invalid-input"
  | "file-limit"
  | "byte-limit"
  | "line-limit"
  | "parse-error";

export interface SoliditySourceAnalysisIssue {
  code: SoliditySourceAnalysisIssueCode;
  message: string;
  file: string | null;
  line: number | null;
  column: number | null;
}

export interface SoliditySourceFileResult {
  name: string;
  bytes: number;
  lines: number;
  parseStatus: "parsed" | "partial" | "failed";
}

export interface SoliditySourceAnalysisResult {
  version: typeof SOLIDITY_SOURCE_ANALYSIS_VERSION;
  status: "complete" | "partial" | "rejected";
  limits: typeof SOLIDITY_SOURCE_ANALYSIS_LIMITS;
  stats: {
    files: number;
    bytes: number;
    lines: number;
    contracts: number;
    functions: number;
  };
  files: SoliditySourceFileResult[];
  findings: SoliditySourceFinding[];
  issues: SoliditySourceAnalysisIssue[];
}

type LooseNode = BaseASTNode & Record<string, unknown>;

interface ParsedFile {
  file: SoliditySourceFile;
  ast: SourceUnit;
  result: SoliditySourceFileResult;
}

interface StateSymbol {
  name: string;
  node: StateVariableDeclarationVariable;
  kind: "address" | "bool" | "uint" | "mapping" | "other";
  mappingValueKind: "address" | "bool" | "uint" | "other" | null;
  initialValue: BaseASTNode | null;
}

interface CallableModel {
  name: string;
  node: FunctionDefinition | ModifierDefinition;
  body: BaseASTNode | null;
  isConstructor: boolean;
  visibility: string | null;
  modifiers: string[];
  parameters: string[];
  calls: Set<string>;
  directControllerSymbols: Set<string>;
  controllerConditionSymbols: Set<string>;
  usesTxOrigin: boolean;
  isGated: boolean;
}

interface ContractModel {
  file: SoliditySourceFile;
  node: ContractDefinition;
  name: string;
  baseNames: string[];
  states: Map<string, StateSymbol>;
  functions: CallableModel[];
  modifiers: Map<string, CallableModel>;
  ownerSymbols: Set<string>;
  callerInitializedSymbols: Set<string>;
  controllerSymbols: Set<string>;
  independentControllerSymbols: Set<string>;
  supplySymbols: Set<string>;
  balanceMappings: Set<string>;
}

interface FindingDraft extends Omit<SoliditySourceFinding, "evidence"> {
  evidence: SoliditySourceEvidence[];
}

const severityRank: Record<SoliditySourceFindingSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const callerPattern =
  /\bmsg\s*\.\s*sender\b|\btx\s*\.\s*origin\b|\b_msgSender\s*\(/;
const senderNamePattern = /^(?:_?from|sender|account|holder|wallet|owner)$/i;
const recipientNamePattern = /^(?:_?to|recipient|receiver|destination|pair)$/i;
const feeNamePattern = /fee|tax|reflection|redistribut|reward/i;
const pauseNamePattern = /pause|trading|enabled|open|freeze/i;
const proxyNamePattern = /upgrade|implementation|proxy|beacon/i;
const liquidityNamePattern =
  /liquidity|router|factory|pair|swap|marketMaker|automatedMarket/i;

export function normalizeSoliditySourceFiles(
  input: SoliditySourceInput,
): SoliditySourceFile[] {
  let files: SoliditySourceFile[];
  if (typeof input === "string") {
    files = [{ name: "Contract.sol", content: input }];
  } else if (Array.isArray(input)) {
    files = input.map((file, index) => ({
      name: normalizeSourceName(file.name, index),
      content: typeof file.content === "string" ? file.content : "",
    }));
  } else if (input && typeof input === "object") {
    files = Object.entries(input).map(([name, content], index) => ({
      name: normalizeSourceName(name, index),
      content: typeof content === "string" ? content : "",
    }));
  } else {
    return [];
  }

  const seen = new Map<string, number>();
  return files
    .map((file, index) => {
      const base = normalizeSourceName(file.name, index);
      const key = base.toLowerCase();
      const occurrence = (seen.get(key) ?? 0) + 1;
      seen.set(key, occurrence);
      return {
        name: occurrence === 1 ? base : `${base}#${occurrence}`,
        content: file.content.replace(/^\uFEFF/, ""),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function analyzeSoliditySources(
  input: SoliditySourceInput,
): SoliditySourceAnalysisResult {
  const files = normalizeSoliditySourceFiles(input);
  const fileResults = files.map(sourceFileResult);
  const stats = {
    files: files.length,
    bytes: fileResults.reduce((sum, file) => sum + file.bytes, 0),
    lines: fileResults.reduce((sum, file) => sum + file.lines, 0),
    contracts: 0,
    functions: 0,
  };
  const issues = validateSourceLimits(files, stats.bytes, stats.lines);
  if (issues.length > 0) {
    return {
      version: SOLIDITY_SOURCE_ANALYSIS_VERSION,
      status: "rejected",
      limits: SOLIDITY_SOURCE_ANALYSIS_LIMITS,
      stats,
      files: fileResults,
      findings: [],
      issues,
    };
  }

  const parsedFiles: ParsedFile[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const result = fileResults[index];
    try {
      const ast = parse(file.content, {
        tolerant: true,
        loc: true,
        range: true,
      });
      const parseIssues = parserIssues(ast, file.name);
      issues.push(...parseIssues);
      result.parseStatus = parseIssues.length > 0 ? "partial" : "parsed";
      parsedFiles.push({ file, ast, result });
    } catch (error) {
      result.parseStatus = "failed";
      issues.push(...caughtParserIssues(error, file.name));
    }
  }

  const models = parsedFiles.flatMap(buildContractModels);
  resolveInheritedControls(models);
  stats.contracts = models.length;
  stats.functions = models.reduce(
    (sum, model) => sum + model.functions.length,
    0,
  );
  const findings = analyzeModels(models);

  return {
    version: SOLIDITY_SOURCE_ANALYSIS_VERSION,
    status:
      issues.length > 0 || parsedFiles.length !== files.length
        ? "partial"
        : "complete",
    limits: SOLIDITY_SOURCE_ANALYSIS_LIMITS,
    stats,
    files: fileResults,
    findings,
    issues,
  };
}

function normalizeSourceName(name: string, index: number): string {
  const normalized = String(name ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/");
  return normalized || `Contract-${index + 1}.sol`;
}

function sourceFileResult(file: SoliditySourceFile): SoliditySourceFileResult {
  return {
    name: file.name,
    bytes: new TextEncoder().encode(file.content).byteLength,
    lines: file.content.length === 0 ? 0 : file.content.split(/\r\n|\n|\r/).length,
    parseStatus: "failed",
  };
}

function validateSourceLimits(
  files: SoliditySourceFile[],
  bytes: number,
  lines: number,
): SoliditySourceAnalysisIssue[] {
  const issues: SoliditySourceAnalysisIssue[] = [];
  if (files.length === 0) {
    issues.push({
      code: "invalid-input",
      message: "At least one Solidity source file is required.",
      file: null,
      line: null,
      column: null,
    });
  }
  if (files.length > SOLIDITY_SOURCE_ANALYSIS_LIMITS.maxFiles) {
    issues.push({
      code: "file-limit",
      message: `Source analysis accepts at most ${SOLIDITY_SOURCE_ANALYSIS_LIMITS.maxFiles} files.`,
      file: null,
      line: null,
      column: null,
    });
  }
  if (bytes > SOLIDITY_SOURCE_ANALYSIS_LIMITS.maxBytes) {
    issues.push({
      code: "byte-limit",
      message: `Source analysis accepts at most ${SOLIDITY_SOURCE_ANALYSIS_LIMITS.maxBytes} UTF-8 bytes.`,
      file: null,
      line: null,
      column: null,
    });
  }
  if (lines > SOLIDITY_SOURCE_ANALYSIS_LIMITS.maxLines) {
    issues.push({
      code: "line-limit",
      message: `Source analysis accepts at most ${SOLIDITY_SOURCE_ANALYSIS_LIMITS.maxLines} lines.`,
      file: null,
      line: null,
      column: null,
    });
  }
  return issues;
}

function parserIssues(
  ast: SourceUnit & { errors?: unknown[] },
  file: string,
): SoliditySourceAnalysisIssue[] {
  if (!Array.isArray(ast.errors)) return [];
  return ast.errors.map((item) => {
    const row = asRecord(item);
    return {
      code: "parse-error" as const,
      message:
        typeof row?.message === "string"
          ? boundedText(row.message, 300)
          : "The tolerant Solidity parser reported an error.",
      file,
      line: finiteInteger(row?.line),
      column: finiteInteger(row?.column),
    };
  });
}

function caughtParserIssues(
  error: unknown,
  file: string,
): SoliditySourceAnalysisIssue[] {
  const row = asRecord(error);
  const nested = Array.isArray(row?.errors) ? row.errors : [];
  if (nested.length > 0) {
    return nested.map((item) => {
      const detail = asRecord(item);
      return {
        code: "parse-error" as const,
        message:
          typeof detail?.message === "string"
            ? boundedText(detail.message, 300)
            : "Solidity source could not be parsed.",
        file,
        line: finiteInteger(detail?.line),
        column: finiteInteger(detail?.column),
      };
    });
  }
  return [
    {
      code: "parse-error",
      message:
        error instanceof Error
          ? boundedText(error.message, 300)
          : "Solidity source could not be parsed.",
      file,
      line: null,
      column: null,
    },
  ];
}

function buildContractModels(parsed: ParsedFile): ContractModel[] {
  return parsed.ast.children
    .filter(
      (node): node is ContractDefinition => node.type === "ContractDefinition",
    )
    .map((node) => buildContractModel(parsed.file, node));
}

function buildContractModel(
  file: SoliditySourceFile,
  node: ContractDefinition,
): ContractModel {
  const states = new Map<string, StateSymbol>();
  const functions: CallableModel[] = [];
  const modifiers = new Map<string, CallableModel>();

  for (const subNode of node.subNodes) {
    if (subNode.type === "StateVariableDeclaration") {
      const declaration = subNode as LooseNode;
      const initialValue = isNode(declaration.initialValue)
        ? declaration.initialValue
        : null;
      for (const variable of declaration.variables as StateVariableDeclarationVariable[]) {
        if (!variable.name) continue;
        const classified = classifyStateVariable(variable);
        states.set(variable.name, {
          name: variable.name,
          node: variable,
          kind: classified.kind,
          mappingValueKind: classified.mappingValueKind,
          initialValue,
        });
      }
      continue;
    }
    if (subNode.type === "FunctionDefinition") {
      functions.push(buildCallable(subNode as FunctionDefinition));
      continue;
    }
    if (subNode.type === "ModifierDefinition") {
      const modifier = buildCallable(subNode as ModifierDefinition);
      modifiers.set(modifier.name, modifier);
    }
  }

  const model: ContractModel = {
    file,
    node,
    name: node.name,
    baseNames: node.baseContracts.map((base) =>
      base.baseName.namePath.split(".").at(-1) ?? base.baseName.namePath,
    ),
    states,
    functions,
    modifiers,
    ownerSymbols: new Set(),
    callerInitializedSymbols: new Set(),
    controllerSymbols: new Set(),
    independentControllerSymbols: new Set(),
    supplySymbols: new Set(),
    balanceMappings: new Set(),
  };
  inferSemanticSymbols(model);
  inferControllerGates(model);
  return model;
}

function classifyStateVariable(variable: StateVariableDeclarationVariable): {
  kind: StateSymbol["kind"];
  mappingValueKind: StateSymbol["mappingValueKind"];
} {
  const type = variable.typeName;
  if (!type) return { kind: "other", mappingValueKind: null };
  if (type.type === "Mapping") {
    return {
      kind: "mapping",
      mappingValueKind: elementaryKind(type.valueType),
    };
  }
  return { kind: elementaryKind(type), mappingValueKind: null };
}

function elementaryKind(
  node: BaseASTNode,
): "address" | "bool" | "uint" | "other" {
  if (node.type !== "ElementaryTypeName") return "other";
  const name = String((node as LooseNode).name ?? "");
  if (name === "address") return "address";
  if (name === "bool") return "bool";
  if (/^u?int\d*$/.test(name)) return "uint";
  return "other";
}

function buildCallable(
  node: FunctionDefinition | ModifierDefinition,
): CallableModel {
  const isFunction = node.type === "FunctionDefinition";
  const name = isFunction
    ? node.isConstructor
      ? "<constructor>"
      : node.isFallback
        ? "<fallback>"
        : node.isReceiveEther
          ? "<receive>"
          : (node.name ?? "<anonymous>")
    : node.name;
  const body = node.body;
  const calls = new Set<string>();
  walk(body, (child) => {
    if (child.type !== "FunctionCall") return;
    const expression = (child as LooseNode).expression;
    if (isNode(expression) && expression.type === "Identifier") {
      const called = String((expression as LooseNode).name ?? "");
      if (called) calls.add(called);
    }
  });
  return {
    name,
    node,
    body,
    isConstructor: isFunction && node.isConstructor,
    visibility: isFunction ? node.visibility ?? null : null,
    modifiers: isFunction ? node.modifiers.map((modifier) => modifier.name) : [],
    parameters: (node.parameters ?? [])
      .map((parameter) => parameter.name)
      .filter((parameter): parameter is string => Boolean(parameter)),
    calls,
    directControllerSymbols: new Set(),
    controllerConditionSymbols: new Set(),
    usesTxOrigin: false,
    isGated: false,
  };
}

function inferSemanticSymbols(model: ContractModel): void {
  for (const state of model.states.values()) {
    if (
      state.kind === "address" &&
      state.initialValue &&
      callerPattern.test(nodeText(model.file.content, state.initialValue))
    ) {
      model.callerInitializedSymbols.add(state.name);
    }
    if (
      state.node.visibility === "public" &&
      state.kind === "uint" &&
      /^_?totalSupply$/i.test(state.name)
    ) {
      model.supplySymbols.add(state.name);
    }
    if (
      state.node.visibility === "public" &&
      state.kind === "mapping" &&
      state.mappingValueKind === "uint" &&
      /^(?:_?balances?|balanceOf)$/i.test(state.name)
    ) {
      model.balanceMappings.add(state.name);
    }
  }

  for (const callable of model.functions) {
    if (callable.isConstructor) {
      for (const assignment of assignmentNodes(callable.body)) {
        const left = rootIdentifier(assignment.left);
        if (
          left &&
          model.states.get(left)?.kind === "address" &&
          callerPattern.test(nodeText(model.file.content, assignment.right))
        ) {
          model.callerInitializedSymbols.add(left);
        }
      }
    }
    if (/^(?:owner|getOwner)$/i.test(callable.name)) {
      for (const returned of returnedIdentifiers(callable.body)) {
        if (model.states.has(returned)) model.ownerSymbols.add(returned);
      }
    }
    if (/^totalSupply$/i.test(callable.name)) {
      for (const returned of returnedIdentifiers(callable.body)) {
        if (model.states.has(returned)) model.supplySymbols.add(returned);
      }
    }
    if (/^balanceOf$/i.test(callable.name)) {
      walk(callable.body, (child) => {
        if (child.type !== "ReturnStatement") return;
        const expression = (child as LooseNode).expression;
        if (!isNode(expression) || expression.type !== "IndexAccess") return;
        const base = rootIdentifier((expression as LooseNode).base);
        if (base && model.states.get(base)?.kind === "mapping") {
          model.balanceMappings.add(base);
        }
      });
    }
  }
}

function resolveInheritedControls(models: ContractModel[]): void {
  const byName = new Map(models.map((model) => [model.name, model]));
  const ancestorsFor = (model: ContractModel): ContractModel[] => {
    const result: ContractModel[] = [];
    const queue = [...model.baseNames];
    const seen = new Set<string>();
    while (queue.length > 0 && result.length < 100) {
      const name = queue.shift();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const base = byName.get(name);
      if (!base) continue;
      result.push(base);
      queue.push(...base.baseNames);
    }
    return result;
  };

  for (let pass = 0; pass < Math.max(1, models.length); pass += 1) {
    let changed = false;
    for (const model of models) {
      const ancestors = ancestorsFor(model);
      for (const base of ancestors) {
        for (const symbol of base.ownerSymbols) model.ownerSymbols.add(symbol);
        for (const symbol of base.controllerSymbols) {
          model.controllerSymbols.add(symbol);
        }
        for (const symbol of base.independentControllerSymbols) {
          model.independentControllerSymbols.add(symbol);
        }
        for (const symbol of base.callerInitializedSymbols) {
          model.callerInitializedSymbols.add(symbol);
        }
      }

      for (const callable of model.functions) {
        if (callable.isGated) continue;
        for (const modifierName of callable.modifiers) {
          const inherited = ancestors
            .map((base) => base.modifiers.get(modifierName))
            .find((modifier): modifier is CallableModel => Boolean(modifier));
          if (!inherited?.isGated) continue;
          callable.isGated = true;
          callable.usesTxOrigin ||= inherited.usesTxOrigin;
          for (const symbol of inherited.directControllerSymbols) {
            callable.directControllerSymbols.add(symbol);
          }
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
}

function inferControllerGates(model: ContractModel): void {
  const all = [...model.modifiers.values(), ...model.functions];
  for (const callable of all) {
    const conditions = controlConditions(callable.body);
    for (const condition of conditions) {
      const text = nodeText(model.file.content, condition.node);
      if (/\btx\s*\.\s*origin\b/.test(text)) callable.usesTxOrigin = true;
      if (!callerPattern.test(text)) continue;
      const symbols = identifiers(condition.node).filter((name) =>
        ["address", "mapping"].includes(model.states.get(name)?.kind ?? ""),
      );
      if (/\b(?:owner|getOwner)\s*\(/.test(text)) {
        symbols.push(...model.ownerSymbols);
      }
      for (const symbol of symbols) {
        callable.controllerConditionSymbols.add(symbol);
        model.controllerSymbols.add(symbol);
        if (condition.enforces) {
          callable.directControllerSymbols.add(symbol);
          callable.isGated = true;
        }
      }
      if (condition.enforces && /\btx\s*\.\s*origin\b/.test(text)) {
        callable.isGated = true;
      }
    }
  }

  for (const callable of model.functions) {
    for (const modifierName of callable.modifiers) {
      const modifier = model.modifiers.get(modifierName);
      if (!modifier?.isGated) continue;
      callable.isGated = true;
      for (const symbol of modifier.directControllerSymbols) {
        callable.directControllerSymbols.add(symbol);
        model.controllerSymbols.add(symbol);
      }
      if (modifier.usesTxOrigin) callable.usesTxOrigin = true;
    }
  }

  for (const symbol of model.controllerSymbols) {
    if (!model.ownerSymbols.has(symbol) && !/^_?owner$/i.test(symbol)) {
      model.independentControllerSymbols.add(symbol);
    }
  }
}

function analyzeModels(models: ContractModel[]): SoliditySourceFinding[] {
  const findings = new Map<string, FindingDraft>();
  for (const model of models) {
    analyzeControllers(model, findings);
    analyzeTransferControls(model, findings);
    analyzeSupply(model, findings);
    analyzeFeesAndTrading(model, findings);
    analyzeCallsAndLiquidity(model, findings);
    analyzeNameClues(model, findings);
  }
  return Array.from(findings.values())
    .map((finding) => ({
      ...finding,
      evidence: finding.evidence
        .sort(compareEvidence)
        .filter(uniqueEvidence)
        .slice(0, 40),
    }))
    .sort((left, right) => {
      const severity = severityRank[right.severity] - severityRank[left.severity];
      return severity || left.id.localeCompare(right.id);
    });
}

function analyzeControllers(
  model: ContractModel,
  findings: Map<string, FindingDraft>,
): void {
  for (const callable of [...model.modifiers.values(), ...model.functions]) {
    if (callable.usesTxOrigin) {
      addFinding(findings, {
        id: "solidity.controller.tx-origin",
        category: "ownership",
        severity: "high",
        state: "confirmed",
        title: "Authorization depends on tx.origin",
        description:
          "A control condition uses tx.origin instead of relying only on the immediate caller.",
        practicalEffect:
          "A malicious intermediary contract may be able to exercise authority while an authorized wallet originates the transaction.",
        evidence: [
          evidenceForCallable(model, callable, "guard", "tx.origin"),
        ],
      });
    }

    const independent = Array.from(
      new Set([
        ...callable.directControllerSymbols,
        ...callable.controllerConditionSymbols,
      ]),
    ).filter((symbol) => model.independentControllerSymbols.has(symbol));
    if (independent.length === 0) continue;
    addFinding(findings, {
      id: "solidity.controller.independent",
      category: "ownership",
      severity: "high",
      state: "confirmed",
      title: "Independent caller controller",
      description:
        "Contract behavior compares the caller with a state-held controller that is separate from the standard owner getter.",
      practicalEffect:
        "Renouncing or transferring the advertised owner may leave this separate controller operational.",
      evidence: independent.map((symbol) =>
        evidenceForCallable(model, callable, "guard", symbol),
      ),
    });
  }

  for (const symbol of model.callerInitializedSymbols) {
    if (!model.independentControllerSymbols.has(symbol)) continue;
    const state = model.states.get(symbol);
    if (!state) continue;
    addFinding(findings, {
      id: "solidity.controller.constructor-caller",
      category: "ownership",
      severity: "medium",
      state: "confirmed",
      title: "Constructor caller retained as a controller",
      description:
        "A separate address state variable is initialized from the deployment caller and later participates in authorization logic.",
      practicalEffect:
        "The deployer can retain privileges even when an owner getter later reports the zero address.",
      evidence: [
        evidenceForNode(
          model,
          state.node,
          "declaration",
          null,
          symbol,
        ),
      ],
    });
  }

  const gated = model.functions.filter(
    (callable) =>
      callable.isGated &&
      Array.from(callable.directControllerSymbols).some((symbol) =>
        model.independentControllerSymbols.has(symbol),
      ),
  );
  if (gated.length > 0) {
    addFinding(findings, {
      id: "solidity.controller.gated-functions",
      category: "ownership",
      severity: "medium",
      state: "confirmed",
      title: "Functions gated by an independent controller",
      description:
        "One or more callable functions enforce authority through a controller outside the standard ownership surface.",
      practicalEffect:
        "These functions remain sensitive until the independent controller and every privilege are reviewed.",
      evidence: gated.map((callable) =>
        evidenceForCallable(
          model,
          callable,
          "guard",
          Array.from(callable.directControllerSymbols).join(", "),
        ),
      ),
    });
  }
}

function analyzeTransferControls(
  model: ContractModel,
  findings: Map<string, FindingDraft>,
): void {
  const reachable = transferReachableFunctions(model);
  const transferReads = new Map<
    string,
    Array<{ callable: CallableModel; node: BaseASTNode; index: BaseASTNode | null }>
  >();
  for (const callable of reachable) {
    walk(callable.body, (child, parent) => {
      if (child.type !== "IndexAccess") return;
      if (isWriteTarget(child, parent)) return;
      const base = rootIdentifier((child as LooseNode).base);
      if (!base || model.states.get(base)?.mappingValueKind !== "bool") return;
      const rows = transferReads.get(base) ?? [];
      const index = (child as LooseNode).index;
      rows.push({ callable, node: child, index: isNode(index) ? index : null });
      transferReads.set(base, rows);
    });
  }

  const privilegedWrites = new Map<
    string,
    Array<{ callable: CallableModel; node: BaseASTNode }>
  >();
  for (const callable of model.functions) {
    const privileged =
      callable.isGated ||
      Array.from(callable.controllerConditionSymbols).some((symbol) =>
        model.independentControllerSymbols.has(symbol),
      );
    if (!privileged) continue;
    for (const assignment of assignmentNodes(callable.body)) {
      if (!isNode(assignment.left) || assignment.left.type !== "IndexAccess") {
        continue;
      }
      const base = rootIdentifier((assignment.left as LooseNode).base);
      if (!base || model.states.get(base)?.mappingValueKind !== "bool") continue;
      const rows = privilegedWrites.get(base) ?? [];
      rows.push({ callable, node: assignment.node });
      privilegedWrites.set(base, rows);
    }
  }

  for (const [mapping, reads] of transferReads) {
    const writes = privilegedWrites.get(mapping);
    if (!writes?.length) continue;
    addFinding(findings, {
      id: "solidity.transfer.privileged-mapping",
      category: "transfer-controls",
      severity: "high",
      state: "confirmed",
      title: "Privileged transfer-control mapping",
      description:
        "A privileged function writes a boolean address mapping that the token transfer path reads.",
      practicalEffect:
        "The controller can change whether selected addresses can participate in transfers.",
      evidence: [
        ...writes.map(({ callable, node }) =>
          evidenceForNode(model, node, "mapping-write", callable, mapping),
        ),
        ...reads.map(({ callable, node }) =>
          evidenceForNode(model, node, "mapping-read", callable, mapping),
        ),
      ],
    });

    const senderReads = reads.filter(({ index }) =>
      index ? expressionMatchesName(index, senderNamePattern) : false,
    );
    if (senderReads.length > 0) {
      addFinding(findings, {
        id: "solidity.transfer.sender-block",
        category: "transfer-controls",
        severity: "critical",
        state: "confirmed",
        title: "Controller can block transfers from selected wallets",
        description:
          "A controller-writable mapping is indexed by the transfer sender in a live transfer path.",
        practicalEffect:
          "Selected holders can be prevented from transferring or selling tokens while their displayed balance remains positive.",
        evidence: senderReads.map(({ callable, node }) =>
          evidenceForNode(model, node, "mapping-read", callable, mapping),
        ),
      });
    }

    const recipientReads = reads.filter(({ index }) =>
      index ? expressionMatchesName(index, recipientNamePattern) : false,
    );
    if (recipientReads.length > 0) {
      addFinding(findings, {
        id: "solidity.transfer.recipient-block",
        category: "transfer-controls",
        severity: "critical",
        state: "confirmed",
        title: "Controller can block transfers to selected recipients",
        description:
          "A controller-writable mapping is indexed by the transfer recipient in a live transfer path.",
        practicalEffect:
          "If a liquidity pair is selected, ordinary holders may be unable to sell into that pair.",
        evidence: recipientReads.map(({ callable, node }) =>
          evidenceForNode(model, node, "mapping-read", callable, mapping),
        ),
      });
    }

    for (const { callable } of reads) {
      for (const condition of controlConditions(callable.body)) {
        const text = nodeText(model.file.content, condition.node);
        if (!containsIdentifier(text, mapping)) continue;
        const controller = Array.from(model.independentControllerSymbols).find(
          (symbol) => containsIdentifier(text, symbol),
        );
        if (!controller) continue;
        addFinding(findings, {
          id: "solidity.transfer.privileged-exemption",
          category: "transfer-controls",
          severity: "critical",
          state: "confirmed",
          title: "Privileged controller bypasses a transfer restriction",
          description:
            "A transfer restriction condition treats an independent controller differently from ordinary addresses.",
          practicalEffect:
            "The controller may retain transfer or sell access while restrictions block other holders.",
          evidence: [
            evidenceForNode(
              model,
              condition.node,
              "branch",
              callable,
              controller,
            ),
          ],
        });
      }
    }
  }
}

function analyzeSupply(
  model: ContractModel,
  findings: Map<string, FindingDraft>,
): void {
  for (const callable of model.functions) {
    if (callable.isConstructor || !callable.body) continue;
    const behavior = supplyBehavior(model, callable);
    if (behavior.supplyWrites.length > 0) {
      addFinding(findings, {
        id: "solidity.supply.mutable",
        category: "supply",
        severity: behavior.increasesSupply ? "high" : "medium",
        state: "confirmed",
        title: "Total supply changes outside construction",
        description:
          "A callable function writes the state returned by totalSupply().",
        practicalEffect: behavior.increasesSupply
          ? "Token supply can increase after deployment. Access rules and maximum growth must be verified."
          : "Token supply can change after deployment and is not fixed by construction alone.",
        evidence: behavior.supplyWrites.map((node) =>
          evidenceForNode(
            model,
            node,
            "assignment",
            callable,
            Array.from(model.supplySymbols).join(", "),
          ),
        ),
      });
    }

    const hasIndependentController =
      callable.isGated ||
      Array.from(callable.controllerConditionSymbols).some((symbol) =>
        model.independentControllerSymbols.has(symbol),
      );
    if (
      behavior.increasesSupply &&
      !callable.isGated &&
      [null, "default", "public", "external"].includes(callable.visibility)
    ) {
      addFinding(findings, {
        id: "solidity.supply.public-increase",
        category: "supply",
        severity: "critical",
        state: "confirmed",
        title: "Public caller can increase supply",
        description:
          "A public or external supply-increasing path has no detected authorization gate.",
        practicalEffect:
          "Any caller may be able to create additional supply unless an unresolved inherited or external condition prevents it.",
        evidence: behavior.increaseNodes.map((node) =>
          evidenceForNode(model, node, "assignment", callable, null),
        ),
      });
    }
    if (behavior.increasesSupply && hasIndependentController) {
      addFinding(findings, {
        id: "solidity.supply.privileged-increase",
        category: "supply",
        severity: "critical",
        state: "confirmed",
        title: "Independent controller can increase supply",
        description:
          "Supply-increasing behavior shares a function or branch with an independent caller controller.",
        practicalEffect:
          "The controller may dilute holders by creating additional supply even if standard ownership is renounced.",
        evidence: behavior.increaseNodes.map((node) =>
          evidenceForNode(model, node, "assignment", callable, null),
        ),
      });
    }

    if (behavior.balanceIncreaseNodes.length > 0 && hasIndependentController) {
      addFinding(findings, {
        id: "solidity.balance.privileged-increase",
        category: "supply",
        severity: behavior.increasesSupply ? "critical" : "high",
        state: "confirmed",
        title: "Privileged balance increase outside transfer logic",
        description:
          "An independently controlled non-constructor function increases an address balance outside the recognized token transfer path.",
        practicalEffect:
          "The controller may be able to credit itself or another wallet without receiving tokens through a normal transfer.",
        evidence: behavior.balanceIncreaseNodes.map((node) =>
          evidenceForNode(model, node, "assignment", callable, null),
        ),
      });
    }

    if (
      /burn/i.test(callable.name) &&
      (behavior.increasesSupply || behavior.balanceIncreaseNodes.length > 0)
    ) {
      addFinding(findings, {
        id: "solidity.supply.misleading-burn",
        category: "supply",
        severity: "critical",
        state: "confirmed",
        title: "Burn-named function can increase supply",
        description:
          "A function presented as a burn path contains a confirmed total-supply increase.",
        practicalEffect:
          "A caller may expect supply destruction while a privileged branch instead mints new tokens.",
        evidence: behavior.increaseNodes.map((node) =>
          evidenceForNode(model, node, "assignment", callable, null),
        ),
      });
    }

    const confiscation = balanceConfiscationNodes(model, callable);
    if (confiscation.length > 0 && hasIndependentController) {
      addFinding(findings, {
        id: "solidity.balance.privileged-confiscation",
        category: "supply",
        severity: "critical",
        state: "confirmed",
        title: "Privileged balance confiscation path",
        description:
          "An independently controlled function can reduce or clear a balance selected through an address parameter.",
        practicalEffect:
          "The controller may be able to destroy or seize a holder's recorded token balance.",
        evidence: confiscation.map((node) =>
          evidenceForNode(model, node, "assignment", callable, null),
        ),
      });
    }
  }
}

function analyzeFeesAndTrading(
  model: ContractModel,
  findings: Map<string, FindingDraft>,
): void {
  const reachable = transferReachableFunctions(model);
  const transferText = reachable
    .map((callable) => nodeText(model.file.content, callable.body))
    .join("\n");
  const transferConditionText = reachable
    .flatMap((callable) => controlConditions(callable.body))
    .map((condition) => nodeText(model.file.content, condition.node))
    .join("\n");
  for (const state of model.states.values()) {
    const writers = model.functions.filter(
      (callable) =>
        !callable.isConstructor &&
        callable.isGated &&
        assignmentNodes(callable.body).some(
          (assignment) => rootIdentifier(assignment.left) === state.name,
        ),
    );
    if (writers.length === 0 || !containsIdentifier(transferText, state.name)) {
      continue;
    }

    if (
      feeNamePattern.test(state.name) &&
      reachable.some((callable) =>
        usedInArithmetic(callable.body, state.name),
      )
    ) {
      addFinding(findings, {
        id: "solidity.fee.mutable-transfer-value",
        category: "fees",
        severity: "high",
        state: "confirmed",
        title: "Privileged mutable fee affects transfers",
        description:
          "A privileged function writes a fee-like state value that the transfer path reads.",
        practicalEffect:
          "The controller may be able to change transfer costs after users acquire the token.",
        evidence: writers.map((callable) =>
          evidenceForCallable(model, callable, "assignment", state.name),
        ),
      });
    }

    if (
      state.kind === "bool" &&
      pauseNamePattern.test(state.name) &&
      containsIdentifier(transferConditionText, state.name)
    ) {
      addFinding(findings, {
        id: "solidity.trading.mutable-gate",
        category: "pause-trading",
        severity: "high",
        state: "confirmed",
        title: "Privileged trading or pause gate",
        description:
          "A privileged function changes a boolean state value read by the transfer path.",
        practicalEffect:
          "The controller may pause transfers or change when trading is allowed.",
        evidence: writers.map((callable) =>
          evidenceForCallable(model, callable, "assignment", state.name),
        ),
      });
    }
  }
}

function analyzeCallsAndLiquidity(
  model: ContractModel,
  findings: Map<string, FindingDraft>,
): void {
  const delegateCalls: Array<{ callable: CallableModel; node: BaseASTNode }> = [];
  const externalCalls: Array<{ callable: CallableModel; node: BaseASTNode }> = [];
  const liquidityCalls: Array<{ callable: CallableModel; node: BaseASTNode }> = [];

  for (const callable of model.functions) {
    walk(callable.body, (child) => {
      if (child.type !== "FunctionCall") return;
      const expression = (child as LooseNode).expression;
      if (!isNode(expression) || expression.type !== "MemberAccess") return;
      const member = String((expression as LooseNode).memberName ?? "");
      if (/^(?:call|delegatecall|staticcall|callcode|send|transfer)$/.test(member)) {
        externalCalls.push({ callable, node: child });
      }
      if (/^(?:delegatecall|callcode)$/.test(member)) {
        delegateCalls.push({ callable, node: child });
      }
      if (
        /^(?:addLiquidity(?:ETH)?|removeLiquidity(?:ETH)?|createPair|swap\w*)$/i.test(
          member,
        )
      ) {
        liquidityCalls.push({ callable, node: child });
      }
    });
  }

  if (externalCalls.length > 0) {
    addFinding(findings, {
      id: "solidity.call.low-level-external",
      category: "external-call",
      severity: delegateCalls.length > 0 ? "high" : "medium",
      state: "confirmed",
      title: "Low-level external call surface",
      description:
        "The contract makes one or more low-level calls to another address.",
      practicalEffect:
        "Call targets, return-value handling, reentrancy exposure, and caller control require review.",
      evidence: externalCalls.map(({ callable, node }) =>
        evidenceForNode(model, node, "external-call", callable, null),
      ),
    });
  }

  if (delegateCalls.length > 0) {
    addFinding(findings, {
      id: "solidity.proxy.delegatecall",
      category: "proxy-upgrade",
      severity: "high",
      state: "confirmed",
      title: "Delegatecall proxy behavior",
      description:
        "Execution delegates into another address while retaining this contract's storage context.",
      practicalEffect:
        "Implementation selection can materially change behavior and must be included in the audit.",
      evidence: delegateCalls.map(({ callable, node }) =>
        evidenceForNode(model, node, "external-call", callable, null),
      ),
    });

    const privilegedUpgradeWriters = model.functions.filter(
      (callable) =>
        callable.isGated &&
        assignmentNodes(callable.body).some((assignment) => {
          const symbol = rootIdentifier(assignment.left);
          return Boolean(symbol && proxyNamePattern.test(symbol));
        }),
    );
    if (privilegedUpgradeWriters.length > 0) {
      addFinding(findings, {
        id: "solidity.proxy.privileged-upgrade",
        category: "proxy-upgrade",
        severity: "critical",
        state: "confirmed",
        title: "Privileged implementation change",
        description:
          "A privileged function writes an implementation-like value in a contract that delegates execution.",
        practicalEffect:
          "The controller may replace contract logic after deployment.",
        evidence: privilegedUpgradeWriters.map((callable) =>
          evidenceForCallable(model, callable, "assignment", null),
        ),
      });
    }
  }

  if (liquidityCalls.length > 0) {
    addFinding(findings, {
      id: "solidity.liquidity.embedded-control",
      category: "liquidity",
      severity: "high",
      state: "confirmed",
      title: "Embedded liquidity or swap control",
      description:
        "Contract code directly invokes pair, router, factory, liquidity, or swap behavior.",
      practicalEffect:
        "The token contract can participate directly in market or liquidity operations; access and recipient paths require review.",
      evidence: liquidityCalls.map(({ callable, node }) =>
        evidenceForNode(model, node, "external-call", callable, null),
      ),
    });
  }
}

function analyzeNameClues(
  model: ContractModel,
  findings: Map<string, FindingDraft>,
): void {
  const groups: Array<{
    id: string;
    category: SoliditySourceFindingCategory;
    pattern: RegExp;
    title: string;
    effect: string;
  }> = [
    {
      id: "solidity.supply.name-clue",
      category: "supply",
      pattern: /mint|burn|issu|rebase/i,
      title: "Supply-related name requires review",
      effect:
        "The name is only a review clue; actual supply behavior must be established from assignments and call paths.",
    },
    {
      id: "solidity.fee.name-clue",
      category: "fees",
      pattern: feeNamePattern,
      title: "Fee-related name requires review",
      effect:
        "A fee-like name does not prove that transfers are taxed or that the value is mutable.",
    },
    {
      id: "solidity.pause.name-clue",
      category: "pause-trading",
      pattern: pauseNamePattern,
      title: "Trading-control name requires review",
      effect:
        "A pause or trading-like name is not proof that the transfer path can be stopped.",
    },
    {
      id: "solidity.proxy.name-clue",
      category: "proxy-upgrade",
      pattern: proxyNamePattern,
      title: "Proxy-related name requires review",
      effect:
        "A proxy-like name does not establish delegatecall or an upgradeable implementation.",
    },
    {
      id: "solidity.liquidity.name-clue",
      category: "liquidity",
      pattern: liquidityNamePattern,
      title: "Liquidity-related name requires review",
      effect:
        "A liquidity-like name does not prove that the contract can add, remove, or move liquidity.",
    },
  ];

  for (const group of groups) {
    const matches = model.functions.filter(
      (callable) => !callable.isConstructor && group.pattern.test(callable.name),
    );
    if (matches.length === 0) continue;
    addFinding(findings, {
      id: group.id,
      category: group.category,
      severity: "low",
      state: "review",
      title: group.title,
      description:
        "A public function name matches a risk-oriented vocabulary pattern, but the name alone is not behavioral evidence.",
      practicalEffect: group.effect,
      evidence: matches.map((callable) =>
        evidenceForCallable(model, callable, "name-clue", callable.name),
      ),
    });
  }
}

function supplyBehavior(model: ContractModel, callable: CallableModel): {
  supplyWrites: BaseASTNode[];
  increaseNodes: BaseASTNode[];
  balanceIncreaseNodes: BaseASTNode[];
  increasesSupply: boolean;
} {
  const supplyWrites: BaseASTNode[] = [];
  const increaseNodes: BaseASTNode[] = [];
  const balanceIncreaseNodes: BaseASTNode[] = [];
  const supplyAliases = new Set<string>();
  const increasedAliases = new Set<string>();

  walk(callable.body, (child) => {
    if (child.type !== "VariableDeclarationStatement") return;
    const row = child as LooseNode;
    const initialValue = isNode(row.initialValue) ? row.initialValue : null;
    if (!initialValue) return;
    const text = nodeText(model.file.content, initialValue);
    if (!Array.from(model.supplySymbols).some((name) => containsIdentifier(text, name))) {
      return;
    }
    const variables = Array.isArray(row.variables) ? row.variables : [];
    for (const variable of variables) {
      if (!isNode(variable)) continue;
      const name = String((variable as LooseNode).name ?? "");
      if (name) supplyAliases.add(name);
    }
  });

  for (const assignment of assignmentNodes(callable.body)) {
    const left = rootIdentifier(assignment.left);
    if (!left) continue;
    const rightText = nodeText(model.file.content, assignment.right);
    const directIncrease =
      assignment.operator === "+=" ||
      assignment.operator === "*=" ||
      (assignment.operator === "=" && /\+/.test(rightText));
    if (supplyAliases.has(left) && directIncrease) {
      increasedAliases.add(left);
      increaseNodes.push(assignment.node);
    }
    if (isNode(assignment.left) && assignment.left.type === "IndexAccess") {
      const balanceBase = rootIdentifier((assignment.left as LooseNode).base);
      const leftText = nodeText(model.file.content, assignment.left);
      if (
        balanceBase &&
        model.balanceMappings.has(balanceBase) &&
        (directIncrease ||
          (assignment.operator === "=" &&
            containsIdentifier(rightText, balanceBase) &&
            /\+/.test(rightText) &&
            leftText.length > 0))
      ) {
        balanceIncreaseNodes.push(assignment.node);
      }
    }
    if (!model.supplySymbols.has(left)) continue;
    supplyWrites.push(assignment.node);
    if (
      directIncrease ||
      Array.from(increasedAliases).some((alias) =>
        containsIdentifier(rightText, alias),
      )
    ) {
      increaseNodes.push(assignment.node);
    }
  }

  walk(callable.body, (child) => {
    if (child.type !== "UnaryOperation") return;
    const row = child as LooseNode;
    if (row.operator !== "++" || !isNode(row.subExpression)) return;
    const target = row.subExpression;
    const symbol = rootIdentifier(target);
    if (symbol && model.supplySymbols.has(symbol)) {
      supplyWrites.push(child);
      increaseNodes.push(child);
    }
    if (
      target.type === "IndexAccess" &&
      symbol &&
      model.balanceMappings.has(symbol)
    ) {
      balanceIncreaseNodes.push(child);
    }
  });

  return {
    supplyWrites,
    increaseNodes,
    balanceIncreaseNodes,
    increasesSupply: increaseNodes.length > 0,
  };
}

function balanceConfiscationNodes(
  model: ContractModel,
  callable: CallableModel,
): BaseASTNode[] {
  const parameterNames = new Set(callable.parameters);
  const assignments = assignmentNodes(callable.body)
    .filter((assignment) => {
      if (!isNode(assignment.left) || assignment.left.type !== "IndexAccess") {
        return false;
      }
      const base = rootIdentifier((assignment.left as LooseNode).base);
      if (!base || !model.balanceMappings.has(base)) return false;
      const index = (assignment.left as LooseNode).index;
      const indexedName = isNode(index) ? rootIdentifier(index) : null;
      if (!indexedName || !parameterNames.has(indexedName)) return false;
      const rightText = nodeText(model.file.content, assignment.right).trim();
      return (
        assignment.operator === "-=" ||
        (assignment.operator === "=" && /^(?:0|0x0+|delete\b)/i.test(rightText))
      );
    })
    .map((assignment) => assignment.node);
  const deletions: BaseASTNode[] = [];
  walk(callable.body, (child) => {
    if (child.type !== "UnaryOperation") return;
    const row = child as LooseNode;
    if (row.operator !== "delete" || !isNode(row.subExpression)) return;
    const target = row.subExpression;
    if (target.type !== "IndexAccess") return;
    const base = rootIdentifier((target as LooseNode).base);
    const index = (target as LooseNode).index;
    const indexedName = isNode(index) ? rootIdentifier(index) : null;
    if (
      base &&
      model.balanceMappings.has(base) &&
      indexedName &&
      parameterNames.has(indexedName)
    ) {
      deletions.push(child);
    }
  });
  return [...assignments, ...deletions];
}

function transferReachableFunctions(model: ContractModel): CallableModel[] {
  const byName = new Map(model.functions.map((callable) => [callable.name, callable]));
  const queue = model.functions.filter((callable) =>
    /^(?:_?transfer|transferFrom|_?update|_beforeTokenTransfer|_afterTokenTransfer)$/i.test(
      callable.name,
    ),
  );
  const seen = new Set<CallableModel>();
  while (queue.length > 0 && seen.size < 100) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const called of current.calls) {
      const next = byName.get(called);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return Array.from(seen);
}

function controlConditions(
  body: BaseASTNode | null,
): Array<{ node: BaseASTNode; enforces: boolean }> {
  const conditions: Array<{ node: BaseASTNode; enforces: boolean }> = [];
  walk(body, (child) => {
    if (child.type === "IfStatement") {
      const condition = (child as LooseNode).condition;
      const trueBody = (child as LooseNode).trueBody;
      const enforces =
        isNode(trueBody) &&
        /\brevert\b|\bthrow\b/i.test(nodeTextFromUnknown(trueBody));
      if (isNode(condition)) conditions.push({ node: condition, enforces });
      return;
    }
    if (child.type !== "FunctionCall") return;
    const expression = (child as LooseNode).expression;
    if (
      !isNode(expression) ||
      expression.type !== "Identifier" ||
      !/^(?:require|assert)$/.test(String((expression as LooseNode).name ?? ""))
    ) {
      return;
    }
    const args = Array.isArray((child as LooseNode).arguments)
      ? ((child as LooseNode).arguments as unknown[])
      : [];
    if (isNode(args[0])) conditions.push({ node: args[0], enforces: true });
  });
  return conditions;
}

interface AssignmentNode {
  node: BaseASTNode;
  operator: string;
  left: BaseASTNode;
  right: BaseASTNode;
}

function assignmentNodes(body: BaseASTNode | null): AssignmentNode[] {
  const assignments: AssignmentNode[] = [];
  walk(body, (child) => {
    if (child.type !== "BinaryOperation") return;
    const row = child as LooseNode;
    const operator = String(row.operator ?? "");
    if (!/^(?:=|\+=|-=|\*=|\/=|%=|\|=|&=|\^=|<<=|>>=)$/.test(operator)) {
      return;
    }
    if (!isNode(row.left) || !isNode(row.right)) return;
    assignments.push({
      node: child,
      operator,
      left: row.left,
      right: row.right,
    });
  });
  return assignments;
}

function returnedIdentifiers(body: BaseASTNode | null): string[] {
  const result: string[] = [];
  walk(body, (child) => {
    if (child.type !== "ReturnStatement") return;
    const expression = (child as LooseNode).expression;
    const name = isNode(expression) ? rootIdentifier(expression) : null;
    if (name) result.push(name);
  });
  return result;
}

function identifiers(node: BaseASTNode | null): string[] {
  const values = new Set<string>();
  walk(node, (child) => {
    if (child.type !== "Identifier") return;
    const name = String((child as LooseNode).name ?? "");
    if (name) values.add(name);
  });
  return Array.from(values);
}

function expressionMatchesName(node: BaseASTNode, pattern: RegExp): boolean {
  const name = rootIdentifier(node);
  return Boolean(name && pattern.test(name));
}

function rootIdentifier(value: unknown): string | null {
  if (!isNode(value)) return null;
  if (value.type === "Identifier") {
    const name = String((value as LooseNode).name ?? "");
    return name || null;
  }
  if (value.type === "IndexAccess" || value.type === "MemberAccess") {
    const row = value as LooseNode;
    return rootIdentifier(row.base ?? row.expression);
  }
  return null;
}

function isWriteTarget(node: BaseASTNode, parent: BaseASTNode | null): boolean {
  if (!parent || parent.type !== "BinaryOperation") return false;
  const row = parent as LooseNode;
  return isNode(row.left) && row.left === node && /=$/.test(String(row.operator));
}

function usedInArithmetic(
  body: BaseASTNode | null,
  symbol: string,
): boolean {
  let found = false;
  walk(body, (child) => {
    if (found || child.type !== "BinaryOperation") return;
    const operator = String((child as LooseNode).operator ?? "");
    if (!/^(?:\+|-|\*|\/|%|\+=|-=|\*=|\/=|%=)$/.test(operator)) return;
    if (identifiers(child).includes(symbol)) found = true;
  });
  return found;
}

function addFinding(
  findings: Map<string, FindingDraft>,
  finding: FindingDraft,
): void {
  const current = findings.get(finding.id);
  if (!current) {
    findings.set(finding.id, finding);
    return;
  }
  current.evidence.push(...finding.evidence);
  if (severityRank[finding.severity] > severityRank[current.severity]) {
    current.severity = finding.severity;
  }
  if (finding.state === "confirmed") current.state = "confirmed";
}

function evidenceForCallable(
  model: ContractModel,
  callable: CallableModel,
  kind: SoliditySourceEvidenceKind,
  symbol: string | null,
): SoliditySourceEvidence {
  return evidenceForNode(model, callable.node, kind, callable, symbol);
}

function evidenceForNode(
  model: ContractModel,
  node: BaseASTNode,
  kind: SoliditySourceEvidenceKind,
  callable: CallableModel | null,
  symbol: string | null,
): SoliditySourceEvidence {
  const loc = node.loc;
  return {
    kind,
    file: model.file.name,
    line: loc?.start.line ?? 1,
    endLine: loc?.end.line ?? loc?.start.line ?? 1,
    column: loc?.start.column ?? 0,
    endColumn: loc?.end.column ?? loc?.start.column ?? 0,
    contract: model.name,
    function: callable?.name ?? null,
    symbol,
    snippet: boundedText(nodeText(model.file.content, node), 260),
  };
}

function nodeText(source: string, node: BaseASTNode | null): string {
  if (!node) return "";
  const range = node.range;
  if (range && Number.isInteger(range[0]) && Number.isInteger(range[1])) {
    return source.slice(range[0], range[1] + 1);
  }
  return "";
}

function nodeTextFromUnknown(node: BaseASTNode): string {
  return JSON.stringify(node);
}

function boundedText(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= limit
    ? normalized
    : `${normalized.slice(0, Math.max(0, limit - 3))}...`;
}

function containsIdentifier(text: string, identifier: string): boolean {
  return new RegExp(`(?:^|[^A-Za-z0-9_$])${escapeRegExp(identifier)}(?:$|[^A-Za-z0-9_$])`).test(
    text,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function walk(
  node: unknown,
  visitor: (node: BaseASTNode, parent: BaseASTNode | null) => void,
  parent: BaseASTNode | null = null,
): void {
  if (!isNode(node)) return;
  visitor(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "range" || key === "tokens") continue;
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visitor, node);
    } else if (isNode(value)) {
      walk(value, visitor, node);
    }
  }
}

function isNode(value: unknown): value is LooseNode {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as { type?: unknown }).type === "string",
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finiteInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : null;
}

function compareEvidence(
  left: SoliditySourceEvidence,
  right: SoliditySourceEvidence,
): number {
  return (
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.column - right.column ||
    left.kind.localeCompare(right.kind)
  );
}

function uniqueEvidence(
  value: SoliditySourceEvidence,
  index: number,
  rows: SoliditySourceEvidence[],
): boolean {
  const key = `${value.kind}:${value.file}:${value.line}:${value.column}:${value.function}:${value.symbol}`;
  return (
    rows.findIndex(
      (candidate) =>
        `${candidate.kind}:${candidate.file}:${candidate.line}:${candidate.column}:${candidate.function}:${candidate.symbol}` ===
        key,
    ) === index
  );
}
