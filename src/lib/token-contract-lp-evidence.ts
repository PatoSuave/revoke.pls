import {
  getAddress,
  isAddress,
  keccak256,
  parseAbi,
  stringToHex,
  type Abi,
  type Address,
  type Hex,
} from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const TOKEN_LP_EVIDENCE_LOG_LIMIT = 200;
export const TOKEN_LP_EVIDENCE_TRANSACTION_LIMIT = 50;
export const TOKEN_LP_CUSTODY_HOLDER_LIMIT = 20;

const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

const PAIR_ABI = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function factory() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

const EVENT_TOPIC_VARIANTS = {
  Transfer: [
    {
      label: "ERC-20 LP Transfer",
      topic: keccak256(stringToHex("Transfer(address,address,uint256)")),
    },
  ],
  Mint: [
    {
      label: "Uniswap V2-style Mint",
      topic: keccak256(stringToHex("Mint(address,uint256,uint256)")),
    },
    {
      label: "PulseX V2 Mint",
      topic: keccak256(stringToHex("Mint(address,uint256,uint256,address)")),
    },
  ],
  Burn: [
    {
      label: "Uniswap V2-style Burn",
      topic: keccak256(stringToHex("Burn(address,uint256,uint256,address)")),
    },
    {
      label: "PulseX V2 Burn",
      topic: keccak256(
        stringToHex("Burn(address,uint256,uint256,address,address)"),
      ),
    },
  ],
} as const;

export type TokenLpPairReadFunction =
  | "token0"
  | "token1"
  | "factory"
  | "getReserves"
  | "totalSupply"
  | "balanceOf";

export type TokenLpEventName = keyof typeof EVENT_TOPIC_VARIANTS;

/**
 * Minimal normalized log shape expected from a bounded RPC or explorer adapter.
 * The adapter remains responsible for provider-specific pagination and timeouts.
 */
export interface TokenLpEvidenceLog {
  transactionHash: Hex | null;
  blockNumber: bigint | number | null;
  transactionIndex?: number | null;
  logIndex: number | null;
  topics: readonly Hex[];
  data: Hex;
  removed?: boolean;
}

export interface TokenLpEvidenceLogPage {
  logs: readonly TokenLpEvidenceLog[];
  truncated: boolean;
  limitation?: string | null;
}

/**
 * Read-only integration boundary. Implementations can wrap a viem public client,
 * JSON-RPC, or a bounded explorer fetch. No transaction-submission capability is
 * accepted by this helper.
 */
export interface TokenLpEvidenceDependencies {
  readContract(args: {
    address: Address;
    abi: Abi;
    functionName: TokenLpPairReadFunction;
    args?: readonly unknown[];
    blockNumber: bigint;
    signal?: AbortSignal;
  }): Promise<unknown>;
  getLogs(args: {
    address: Address;
    eventName: TokenLpEventName;
    topic0: Hex;
    fromBlock: bigint;
    toBlock: bigint;
    limit: number;
    signal?: AbortSignal;
  }): Promise<TokenLpEvidenceLogPage>;
  getHolderCandidates?(args: {
    address: Address;
    limit: number;
    signal?: AbortSignal;
  }): Promise<TokenLpHolderCandidatePage>;
  getBytecode?(args: {
    address: Address;
    blockNumber: bigint;
    signal?: AbortSignal;
  }): Promise<Hex | undefined>;
}

export interface TokenLpHolderCandidate {
  address: Address;
  source: "explorer" | "transfer-event" | "controller";
  label?: string | null;
  classification?: "known-locker" | "protocol" | null;
}

export interface TokenLpHolderCandidatePage {
  holders: readonly TokenLpHolderCandidate[];
  complete: boolean;
  limitation?: string | null;
}

export interface TokenLpCustodyPosition {
  address: Address;
  balance: string;
  shareBps: number | null;
  classification:
    | "burned"
    | "controller"
    | "known-locker"
    | "protocol"
    | "contract"
    | "wallet"
    | "unknown";
  label: string | null;
  sources: Array<"explorer" | "transfer-event" | "controller">;
  hasBytecode: boolean | null;
}

export interface TokenLpCustodySummary {
  positions: TokenLpCustodyPosition[];
  sampledBalance: string;
  sampledSupplyBps: number | null;
  burnedBps: number | null;
  controllerBps: number | null;
  knownLockedBps: number | null;
  complete: boolean;
  limitations: string[];
}

export interface TokenLpPairSnapshot {
  pairAddress: Address;
  capturedBlock: number;
  token0: Address | null;
  token1: Address | null;
  factory: Address | null;
  requestedTokenPosition: "token0" | "token1" | null;
  quoteTokenAddress: Address | null;
  reserves: {
    reserve0: string;
    reserve1: string;
    blockTimestampLast: number | null;
    requestedTokenReserve: string | null;
    quoteTokenReserve: string | null;
  } | null;
  totalSupply: string | null;
}

export interface TokenLpEventCoverage {
  available: boolean;
  retainedLogs: number;
  truncated: boolean;
}

export interface TokenLpMintTransaction {
  transactionHash: Hex;
  blockNumber: number | null;
  sender: Address | null;
  amount0: string;
  amount1: string;
  lpMintedToDeployer: string;
}

export interface TokenLpRemovalTransaction {
  transactionHash: Hex;
  blockNumber: number | null;
  burnCaller: Address | null;
  recipient: Address | null;
  amount0: string;
  amount1: string;
  lpSentByDeployerToPair: string;
  lpBurnedByPair: string;
  matchedDeployerLp: string;
  afterObservedDeployerMint: boolean | null;
}

export interface TokenLpDeployerActivity {
  deployerAddress: Address | null;
  observedLpMintedToDeployer: string;
  observedLpSentByDeployerToPair: string;
  observedLpMatchedToBurns: string;
  observedLpRemovedAfterMint: string;
  observedMintFullyConsumedLater: boolean | null;
  observedConsumedBps: number | null;
}

export interface TokenLpEvidenceResult {
  status: "complete" | "partial" | "unavailable";
  snapshot: TokenLpPairSnapshot;
  eventCoverage: Record<TokenLpEventName, TokenLpEventCoverage>;
  mintTransactions: TokenLpMintTransaction[];
  removalTransactions: TokenLpRemovalTransaction[];
  deployerActivity: TokenLpDeployerActivity;
  custody: TokenLpCustodySummary;
  limitations: string[];
}

export async function collectTokenLpEvidence({
  tokenAddress,
  pairAddress,
  deployerAddress,
  controllerAddresses = [],
  capturedBlock,
  fromBlock = 0,
  historyLowerBoundKnown = true,
  dependencies,
  signal,
}: {
  tokenAddress: Address;
  pairAddress: Address;
  deployerAddress: Address | null;
  controllerAddresses?: readonly Address[];
  capturedBlock: bigint | number;
  fromBlock?: bigint | number;
  historyLowerBoundKnown?: boolean;
  dependencies: TokenLpEvidenceDependencies;
  signal?: AbortSignal;
}): Promise<TokenLpEvidenceResult> {
  const normalizedCapturedBlock = nonNegativeBlock(capturedBlock);
  const normalizedFromBlock = nonNegativeBlock(fromBlock);
  if (
    normalizedCapturedBlock === null ||
    normalizedFromBlock === null ||
    normalizedCapturedBlock > BigInt(Number.MAX_SAFE_INTEGER) ||
    normalizedFromBlock > BigInt(Number.MAX_SAFE_INTEGER) ||
    normalizedFromBlock > normalizedCapturedBlock
  ) {
    throw new Error("LP evidence requires a valid bounded block range.");
  }

  const limitations: string[] = [];
  if (!historyLowerBoundKnown) {
    limitations.push(
      "Pair creation height was unavailable, so LP event history is limited to a recent bounded window and cannot establish the full LP lifecycle.",
    );
  }
  const readNames: readonly TokenLpPairReadFunction[] = [
    "token0",
    "token1",
    "factory",
    "getReserves",
    "totalSupply",
  ];
  const readSettled = await Promise.allSettled(
    readNames.map((functionName) =>
      dependencies.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName,
        blockNumber: normalizedCapturedBlock,
        signal,
      }),
    ),
  );
  const readResults = new Map<TokenLpPairReadFunction, unknown>();
  readSettled.forEach((result, index) => {
    const functionName = readNames[index];
    if (result.status === "fulfilled") {
      readResults.set(functionName, result.value);
      return;
    }
    limitations.push(`${functionName}() unavailable: ${safeError(result.reason)}`);
  });

  const token0 = normalizedAddress(readResults.get("token0"));
  const token1 = normalizedAddress(readResults.get("token1"));
  const factory = normalizedAddress(readResults.get("factory"));
  if (readResults.has("token0") && !token0) {
    limitations.push("token0() returned an invalid address value.");
  }
  if (readResults.has("token1") && !token1) {
    limitations.push("token1() returned an invalid address value.");
  }
  if (readResults.has("factory") && !factory) {
    limitations.push("factory() returned an invalid address value.");
  }
  const requestedTokenPosition =
    token0?.toLowerCase() === tokenAddress.toLowerCase()
      ? "token0"
      : token1?.toLowerCase() === tokenAddress.toLowerCase()
        ? "token1"
        : null;
  const quoteTokenAddress =
    requestedTokenPosition === "token0"
      ? token1
      : requestedTokenPosition === "token1"
        ? token0
        : null;
  if (token0 && token1 && requestedTokenPosition === null) {
    limitations.push(
      "The requested token was not returned by the pair token0()/token1() reads.",
    );
  }

  const reserves = normalizedReserves(readResults.get("getReserves"));
  const totalSupply = unsignedInteger(readResults.get("totalSupply"));
  if (readResults.has("getReserves") && !reserves) {
    limitations.push("getReserves() returned an invalid reserve tuple.");
  }
  if (readResults.has("totalSupply") && totalSupply === null) {
    limitations.push("totalSupply() returned an invalid unsigned integer value.");
  }
  const snapshot: TokenLpPairSnapshot = {
    pairAddress,
    capturedBlock: Number(normalizedCapturedBlock),
    token0,
    token1,
    factory,
    requestedTokenPosition,
    quoteTokenAddress,
    reserves:
      reserves === null
        ? null
        : {
            reserve0: reserves.reserve0.toString(),
            reserve1: reserves.reserve1.toString(),
            blockTimestampLast: reserves.blockTimestampLast,
            requestedTokenReserve:
              requestedTokenPosition === "token0"
                ? reserves.reserve0.toString()
                : requestedTokenPosition === "token1"
                  ? reserves.reserve1.toString()
                  : null,
            quoteTokenReserve:
              requestedTokenPosition === "token0"
                ? reserves.reserve1.toString()
                : requestedTokenPosition === "token1"
                  ? reserves.reserve0.toString()
                  : null,
          },
    totalSupply: totalSupply?.toString() ?? null,
  };

  const eventNames = Object.keys(EVENT_TOPIC_VARIANTS) as TokenLpEventName[];
  const eventResults = await Promise.all(
    eventNames.map(async (eventName) => {
      const variants = EVENT_TOPIC_VARIANTS[eventName];
      const settled = await Promise.allSettled(
        variants.map((variant) =>
          dependencies.getLogs({
            address: pairAddress,
            eventName,
            topic0: variant.topic,
            fromBlock: normalizedFromBlock,
            toBlock: normalizedCapturedBlock,
            limit: TOKEN_LP_EVIDENCE_LOG_LIMIT,
            signal,
          }),
        ),
      );
      return { eventName, variants, settled };
    }),
  );
  const eventCoverage = emptyEventCoverage();
  const retainedLogs = new Map<TokenLpEventName, NormalizedLog[]>();
  let successfulEventVariants = 0;
  let failedEventVariants = 0;
  eventResults.forEach(({ eventName, variants, settled }) => {
    const pages: TokenLpEvidenceLogPage[] = [];
    settled.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successfulEventVariants += 1;
        pages.push(result.value);
        return;
      }
      failedEventVariants += 1;
      limitations.push(
        `${variants[index].label} logs unavailable: ${safeError(result.reason)}`,
      );
    });
    if (pages.length === 0) {
      retainedLogs.set(eventName, []);
      return;
    }
    const normalized = normalizeLogs(
      pages.flatMap((page) => page.logs),
      variants.map((variant) => variant.topic),
      normalizedFromBlock,
      normalizedCapturedBlock,
    );
    const callerExceededLimit = normalized.logs.length > TOKEN_LP_EVIDENCE_LOG_LIMIT;
    const logs = normalized.logs.slice(0, TOKEN_LP_EVIDENCE_LOG_LIMIT);
    const truncated =
      pages.some((page) => page.truncated) ||
      settled.some((result) => result.status === "rejected") ||
      callerExceededLimit;
    eventCoverage[eventName] = {
      available: true,
      retainedLogs: logs.length,
      truncated: truncated || !historyLowerBoundKnown,
    };
    retainedLogs.set(eventName, logs);
    if (normalized.ignored > 0) {
      limitations.push(
        `${eventName} evidence ignored ${normalized.ignored} malformed, removed, duplicate, or out-of-range log${normalized.ignored === 1 ? "" : "s"}.`,
      );
    }
    if (truncated) {
      limitations.push(
        `${eventName} evidence was bounded to ${TOKEN_LP_EVIDENCE_LOG_LIMIT} retained logs.`,
      );
    }
    for (const page of pages) {
      if (page.limitation) {
        limitations.push(`${eventName} logs: ${safeText(page.limitation)}`);
      }
    }
  });

  const transferEvents = (retainedLogs.get("Transfer") ?? [])
    .map(parseTransfer)
    .filter((event): event is TransferEvent => event !== null);
  const mintEvents = (retainedLogs.get("Mint") ?? [])
    .map(parseMint)
    .filter((event): event is MintEvent => event !== null);
  const burnEvents = (retainedLogs.get("Burn") ?? [])
    .map(parseBurn)
    .filter((event): event is BurnEvent => event !== null);
  const parseFailures =
    (retainedLogs.get("Transfer")?.length ?? 0) - transferEvents.length +
    ((retainedLogs.get("Mint")?.length ?? 0) - mintEvents.length) +
    ((retainedLogs.get("Burn")?.length ?? 0) - burnEvents.length);
  if (parseFailures > 0) {
    limitations.push(
      `${parseFailures} retained LP event log${parseFailures === 1 ? "" : "s"} could not be decoded.`,
    );
  }

  const normalizedDeployer = normalizedAddress(deployerAddress);
  if (!normalizedDeployer) {
    limitations.push(
      "A deployer address was unavailable, so deployer-specific LP lifecycle matching was not evaluated.",
    );
  }
  const deployerLower = normalizedDeployer?.toLowerCase() ?? null;
  const pairLower = pairAddress.toLowerCase();
  const deployerMintTransfers = transferEvents.filter(
    (event) =>
      deployerLower !== null &&
      event.from.toLowerCase() === ZERO_ADDRESS &&
      event.to.toLowerCase() === deployerLower,
  );
  const deployerToPairTransfers = transferEvents.filter(
    (event) =>
      deployerLower !== null &&
      event.from.toLowerCase() === deployerLower &&
      event.to.toLowerCase() === pairLower,
  );
  const pairBurnTransfers = transferEvents.filter(
    (event) =>
      event.from.toLowerCase() === pairLower &&
      event.to.toLowerCase() === ZERO_ADDRESS,
  );

  const earliestObservedMint = deployerMintTransfers.slice().sort(comparePosition)[0];
  const allMintTransactions = buildMintTransactions(
    mintEvents,
    deployerMintTransfers,
  );
  const mintTransactions = allMintTransactions.slice(
    0,
    TOKEN_LP_EVIDENCE_TRANSACTION_LIMIT,
  );
  const allRemovalTransactions = buildRemovalTransactions({
    burnEvents,
    deployerToPairTransfers,
    pairBurnTransfers,
    earliestObservedMint,
  });
  const removalTransactions = allRemovalTransactions.slice(
    0,
    TOKEN_LP_EVIDENCE_TRANSACTION_LIMIT,
  );
  if (allMintTransactions.length > TOKEN_LP_EVIDENCE_TRANSACTION_LIMIT) {
    limitations.push(
      `Mint transaction details were bounded to ${TOKEN_LP_EVIDENCE_TRANSACTION_LIMIT} records.`,
    );
  }
  if (allRemovalTransactions.length > TOKEN_LP_EVIDENCE_TRANSACTION_LIMIT) {
    limitations.push(
      `Removal transaction details were bounded to ${TOKEN_LP_EVIDENCE_TRANSACTION_LIMIT} records.`,
    );
  }

  const observedLpMintedToDeployer = sumAmounts(deployerMintTransfers);
  const observedLpSentByDeployerToPair = sumAmounts(deployerToPairTransfers);
  const observedLpMatchedToBurns = allRemovalTransactions.reduce(
    (sum, transaction) => sum + BigInt(transaction.matchedDeployerLp),
    0n,
  );
  const observedLpRemovedAfterMint = allRemovalTransactions.reduce(
    (sum, transaction) =>
      transaction.afterObservedDeployerMint === true
        ? sum + BigInt(transaction.matchedDeployerLp)
        : sum,
    0n,
  );
  const transferEvidenceComplete =
    eventCoverage.Transfer.available && !eventCoverage.Transfer.truncated;
  const burnEvidenceComplete =
    eventCoverage.Burn.available && !eventCoverage.Burn.truncated;
  const hasMatchedBurnWithUnknownOrder = allRemovalTransactions.some(
    (transaction) =>
      BigInt(transaction.matchedDeployerLp) > 0n &&
      transaction.afterObservedDeployerMint === null,
  );
  const canResolveConsumption =
    normalizedDeployer !== null &&
    observedLpMintedToDeployer > 0n &&
    transferEvidenceComplete &&
    burnEvidenceComplete &&
    !hasMatchedBurnWithUnknownOrder;
  const observedMintFullyConsumedLater = canResolveConsumption
    ? observedLpRemovedAfterMint >= observedLpMintedToDeployer
    : null;
  const observedConsumedBps =
    observedLpMintedToDeployer > 0n && !hasMatchedBurnWithUnknownOrder
      ? Number(
          ((observedLpRemovedAfterMint < observedLpMintedToDeployer
            ? observedLpRemovedAfterMint
            : observedLpMintedToDeployer) *
            10_000n) /
            observedLpMintedToDeployer,
        )
      : null;
  const deployerActivity: TokenLpDeployerActivity = {
    deployerAddress: normalizedDeployer,
    observedLpMintedToDeployer: observedLpMintedToDeployer.toString(),
    observedLpSentByDeployerToPair: observedLpSentByDeployerToPair.toString(),
    observedLpMatchedToBurns: observedLpMatchedToBurns.toString(),
    observedLpRemovedAfterMint: observedLpRemovedAfterMint.toString(),
    observedMintFullyConsumedLater,
    observedConsumedBps,
  };

  const custody = await collectCurrentLpCustody({
    pairAddress,
    capturedBlock: normalizedCapturedBlock,
    totalSupply,
    transferEvents,
    controllerAddresses: [
      ...(normalizedDeployer ? [normalizedDeployer] : []),
      ...controllerAddresses,
    ],
    dependencies,
    signal,
  });
  limitations.push(...custody.limitations);

  const successfulReads = readSettled.filter(
    (result) => result.status === "fulfilled",
  ).length;
  const totalEventVariants = Object.values(EVENT_TOPIC_VARIANTS).reduce(
    (count, variants) => count + variants.length,
    0,
  );
  const hasEvidence =
    successfulReads > 0 ||
    successfulEventVariants > 0 ||
    custody.positions.length > 0;
  const complete =
    historyLowerBoundKnown &&
    successfulReads === readNames.length &&
    token0 !== null &&
    token1 !== null &&
    factory !== null &&
    reserves !== null &&
    totalSupply !== null &&
    successfulEventVariants === totalEventVariants &&
    failedEventVariants === 0 &&
    eventNames.every((eventName) => !eventCoverage[eventName].truncated) &&
    requestedTokenPosition !== null &&
    custody.complete;

  return {
    status: !hasEvidence ? "unavailable" : complete ? "complete" : "partial",
    snapshot,
    eventCoverage,
    mintTransactions,
    removalTransactions,
    deployerActivity,
    custody,
    limitations: Array.from(new Set(limitations)),
  };
}

async function collectCurrentLpCustody({
  pairAddress,
  capturedBlock,
  totalSupply,
  transferEvents,
  controllerAddresses,
  dependencies,
  signal,
}: {
  pairAddress: Address;
  capturedBlock: bigint;
  totalSupply: bigint | null;
  transferEvents: readonly TransferEvent[];
  controllerAddresses: readonly Address[];
  dependencies: TokenLpEvidenceDependencies;
  signal?: AbortSignal;
}): Promise<TokenLpCustodySummary> {
  const limitations: string[] = [];
  const candidates = new Map<
    string,
    {
      address: Address;
      sources: Set<TokenLpHolderCandidate["source"]>;
      label: string | null;
      classification: TokenLpHolderCandidate["classification"];
      observedBalance: bigint;
    }
  >();
  const addCandidate = (
    candidate: TokenLpHolderCandidate,
    observedDelta = 0n,
  ) => {
    const normalized = normalizedAddress(candidate.address);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    const current = candidates.get(key) ?? {
      address: normalized,
      sources: new Set<TokenLpHolderCandidate["source"]>(),
      label: null,
      classification: null,
      observedBalance: 0n,
    };
    current.sources.add(candidate.source);
    current.label ??= candidate.label ?? null;
    current.classification ??= candidate.classification ?? null;
    current.observedBalance += observedDelta;
    candidates.set(key, current);
  };

  const normalizedControllers = Array.from(
    new Map(
      controllerAddresses
        .map(normalizedAddress)
        .filter((address): address is Address => address !== null)
        .map((address) => [address.toLowerCase(), address]),
    ).values(),
  );
  for (const address of normalizedControllers) {
    addCandidate({ address, source: "controller" });
  }

  for (const event of transferEvents) {
    addCandidate(
      { address: event.from, source: "transfer-event" },
      -event.amount,
    );
    addCandidate(
      { address: event.to, source: "transfer-event" },
      event.amount,
    );
  }

  let explorerComplete = false;
  if (dependencies.getHolderCandidates) {
    try {
      const page = await dependencies.getHolderCandidates({
        address: pairAddress,
        limit: TOKEN_LP_CUSTODY_HOLDER_LIMIT,
        signal,
      });
      explorerComplete = page.complete;
      for (const holder of page.holders.slice(0, TOKEN_LP_CUSTODY_HOLDER_LIMIT)) {
        addCandidate(holder);
      }
      if (page.limitation) limitations.push(safeText(page.limitation));
      if (page.holders.length > TOKEN_LP_CUSTODY_HOLDER_LIMIT) {
        limitations.push(
          `LP holder candidates were bounded to ${TOKEN_LP_CUSTODY_HOLDER_LIMIT} addresses.`,
        );
      }
    } catch (error) {
      limitations.push(`LP holder lookup unavailable: ${safeError(error)}`);
    }
  }

  const rankedCandidates = Array.from(candidates.values()).sort(
    (left, right) => {
      const leftPriority = left.sources.has("controller")
        ? 0
        : isBurnLikeLpAddress(left.address)
          ? 1
          : left.sources.has("explorer")
            ? 2
            : 3;
      const rightPriority = right.sources.has("controller")
        ? 0
        : isBurnLikeLpAddress(right.address)
          ? 1
          : right.sources.has("explorer")
            ? 2
            : 3;
      return (
        leftPriority - rightPriority ||
        Number(
          (right.observedBalance > left.observedBalance
            ? 1n
            : right.observedBalance < left.observedBalance
              ? -1n
              : 0n),
        )
      );
    },
  );
  if (rankedCandidates.length > TOKEN_LP_CUSTODY_HOLDER_LIMIT) {
    limitations.push(
      `Current LP custody reads were bounded to ${TOKEN_LP_CUSTODY_HOLDER_LIMIT} holder candidates.`,
    );
  }
  const retainedCandidates = rankedCandidates.slice(
    0,
    TOKEN_LP_CUSTODY_HOLDER_LIMIT,
  );
  let balanceReadFailures = 0;
  const balances = (
    await Promise.all(
      retainedCandidates.map(async (candidate) => {
        try {
          const value = await dependencies.readContract({
            address: pairAddress,
            abi: PAIR_ABI,
            functionName: "balanceOf",
            args: [candidate.address],
            blockNumber: capturedBlock,
            signal,
          });
          const balance = unsignedInteger(value);
          if (balance === null) throw new Error("non-integer balance");
          return { candidate, balance };
        } catch (error) {
          balanceReadFailures += 1;
          limitations.push(
            `LP balanceOf(${candidate.address}) unavailable: ${safeError(error)}`,
          );
          return null;
        }
      }),
    )
  ).filter(
    (
      value,
    ): value is {
      candidate: (typeof retainedCandidates)[number];
      balance: bigint;
    } => value !== null && value.balance > 0n,
  );

  const bytecode = new Map<string, boolean | null>();
  if (dependencies.getBytecode) {
    await Promise.all(
      balances.slice(0, TOKEN_LP_CUSTODY_HOLDER_LIMIT).map(async ({ candidate }) => {
        if (
          isBurnLikeLpAddress(candidate.address) ||
          candidate.sources.has("controller") ||
          candidate.classification
        ) {
          return;
        }
        try {
          const code = await dependencies.getBytecode!({
            address: candidate.address,
            blockNumber: capturedBlock,
            signal,
          });
          bytecode.set(
            candidate.address.toLowerCase(),
            Boolean(code && code !== "0x"),
          );
        } catch {
          bytecode.set(candidate.address.toLowerCase(), null);
        }
      }),
    );
  }

  const controllerSet = new Set(
    normalizedControllers.map((address) => address.toLowerCase()),
  );
  const positions: TokenLpCustodyPosition[] = balances
    .map(({ candidate, balance }) => {
      const hasBytecode = bytecode.get(candidate.address.toLowerCase()) ?? null;
      const classification: TokenLpCustodyPosition["classification"] =
        isBurnLikeLpAddress(candidate.address)
          ? "burned"
          : controllerSet.has(candidate.address.toLowerCase())
            ? "controller"
            : candidate.classification === "known-locker"
              ? "known-locker"
              : candidate.classification === "protocol"
                ? "protocol"
                : hasBytecode === true
                  ? "contract"
                  : hasBytecode === false
                    ? "wallet"
                    : "unknown";
      return {
        address: candidate.address,
        balance: balance.toString(),
        shareBps: supplyShareBps(balance, totalSupply),
        classification,
        label: candidate.label,
        sources: Array.from(candidate.sources),
        hasBytecode,
      };
    })
    .sort((left, right) => {
      const leftBalance = BigInt(left.balance);
      const rightBalance = BigInt(right.balance);
      return leftBalance === rightBalance ? 0 : leftBalance > rightBalance ? -1 : 1;
    });
  const sampledBalance = positions.reduce(
    (sum, position) => sum + BigInt(position.balance),
    0n,
  );
  const sumClass = (classification: TokenLpCustodyPosition["classification"]) =>
    positions
      .filter((position) => position.classification === classification)
      .reduce((sum, position) => sum + BigInt(position.balance), 0n);
  const sampledSupplyBps = supplyShareBps(sampledBalance, totalSupply);
  const burnedBps = supplyShareBps(sumClass("burned"), totalSupply);
  const controllerBps = supplyShareBps(sumClass("controller"), totalSupply);
  const knownLockedBps = supplyShareBps(sumClass("known-locker"), totalSupply);
  const transferCandidatesComplete =
    transferEvents.length > 0 &&
    rankedCandidates.length <= TOKEN_LP_CUSTODY_HOLDER_LIMIT;
  const complete =
    totalSupply !== null &&
    totalSupply > 0n &&
    balanceReadFailures === 0 &&
    sampledSupplyBps !== null &&
    sampledSupplyBps >= 9_500 &&
    (explorerComplete || transferCandidatesComplete);

  if (positions.length === 0) {
    limitations.push("No positive current LP holder balance was confirmed.");
  }
  if (sampledSupplyBps !== null && sampledSupplyBps < 9_500) {
    limitations.push(
      `Current LP custody sampling accounts for ${(sampledSupplyBps / 100).toFixed(2)}% of LP totalSupply; unsampled custody remains unresolved.`,
    );
  }
  if (!explorerComplete && !transferCandidatesComplete) {
    limitations.push(
      "LP holder discovery was incomplete, so current custody cannot be treated as exhaustive.",
    );
  }
  if (positions.some((position) => position.classification === "contract")) {
    limitations.push(
      "An unidentified contract holding LP is classified as contract custody, not as locked liquidity.",
    );
  }

  return {
    positions,
    sampledBalance: sampledBalance.toString(),
    sampledSupplyBps,
    burnedBps,
    controllerBps,
    knownLockedBps,
    complete,
    limitations: Array.from(new Set(limitations)),
  };
}

interface NormalizedLog {
  transactionHash: Hex;
  blockNumber: number | null;
  transactionIndex: number | null;
  logIndex: number | null;
  topics: readonly Hex[];
  data: Hex;
}

type PositionedEvent = NormalizedLog;

interface TransferEvent extends PositionedEvent {
  from: Address;
  to: Address;
  amount: bigint;
}

interface MintEvent extends PositionedEvent {
  sender: Address;
  amount0: bigint;
  amount1: bigint;
}

interface BurnEvent extends PositionedEvent {
  sender: Address;
  recipient: Address;
  amount0: bigint;
  amount1: bigint;
}

function emptyEventCoverage(): Record<TokenLpEventName, TokenLpEventCoverage> {
  return {
    Transfer: { available: false, retainedLogs: 0, truncated: false },
    Mint: { available: false, retainedLogs: 0, truncated: false },
    Burn: { available: false, retainedLogs: 0, truncated: false },
  };
}

function normalizeLogs(
  values: readonly TokenLpEvidenceLog[],
  expectedTopics: readonly Hex[],
  fromBlock: bigint,
  toBlock: bigint,
) {
  const deduped = new Map<string, NormalizedLog>();
  let ignored = 0;
  for (const value of values) {
    const normalizedBlock =
      value.blockNumber === null ? null : nonNegativeBlock(value.blockNumber);
    const block =
      normalizedBlock !== null && normalizedBlock <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(normalizedBlock)
        : null;
    const transactionHash = normalizedTransactionHash(value.transactionHash);
    if (
      value.removed === true ||
      (value.blockNumber !== null && normalizedBlock === null) ||
      (normalizedBlock !== null &&
        normalizedBlock > BigInt(Number.MAX_SAFE_INTEGER)) ||
      !transactionHash ||
      !isHex(value.data) ||
      !expectedTopics.some(
        (topic) => value.topics[0]?.toLowerCase() === topic.toLowerCase(),
      ) ||
      (block !== null &&
        (BigInt(block) < fromBlock || BigInt(block) > toBlock))
    ) {
      ignored += 1;
      continue;
    }
    const logIndex = nullableIndex(value.logIndex);
    const transactionIndex = nullableIndex(value.transactionIndex ?? null);
    const key = `${transactionHash}:${logIndex ?? `${value.topics.join(":")}:${value.data}`}`;
    if (deduped.has(key)) {
      ignored += 1;
      continue;
    }
    deduped.set(key, {
      transactionHash,
      blockNumber: block,
      transactionIndex,
      logIndex,
      topics: value.topics,
      data: value.data,
    });
  }
  const logs = Array.from(deduped.values()).sort(comparePosition);
  return { logs, ignored };
}

function parseTransfer(log: NormalizedLog): TransferEvent | null {
  const from = addressFromTopic(log.topics[1]);
  const to = addressFromTopic(log.topics[2]);
  const amount = word(log.data, 0);
  return from && to && amount !== null ? { ...log, from, to, amount } : null;
}

function parseMint(log: NormalizedLog): MintEvent | null {
  const sender = addressFromTopic(log.topics[1]);
  const amount0 = word(log.data, 0);
  const amount1 = word(log.data, 1);
  return sender && amount0 !== null && amount1 !== null
    ? { ...log, sender, amount0, amount1 }
    : null;
}

function parseBurn(log: NormalizedLog): BurnEvent | null {
  const sender = addressFromTopic(log.topics[1]);
  const pulseXV2 =
    log.topics[0]?.toLowerCase() ===
    EVENT_TOPIC_VARIANTS.Burn[1].topic.toLowerCase();
  const recipient = addressFromTopic(log.topics[pulseXV2 ? 3 : 2]);
  const amount0 = word(log.data, 0);
  const amount1 = word(log.data, 1);
  return sender && recipient && amount0 !== null && amount1 !== null
    ? { ...log, sender, recipient, amount0, amount1 }
    : null;
}

function buildMintTransactions(
  events: MintEvent[],
  deployerMints: TransferEvent[],
): TokenLpMintTransaction[] {
  return groupByTransaction(events).map(([transactionHash, transactionEvents]) => {
    const transfers = deployerMints.filter(
      (event) => event.transactionHash === transactionHash,
    );
    return {
      transactionHash,
      blockNumber: firstKnownBlock(transactionEvents),
      sender: uniqueAddress(transactionEvents.map((event) => event.sender)),
      amount0: transactionEvents
        .reduce((sum, event) => sum + event.amount0, 0n)
        .toString(),
      amount1: transactionEvents
        .reduce((sum, event) => sum + event.amount1, 0n)
        .toString(),
      lpMintedToDeployer: sumAmounts(transfers).toString(),
    };
  });
}

function buildRemovalTransactions({
  burnEvents,
  deployerToPairTransfers,
  pairBurnTransfers,
  earliestObservedMint,
}: {
  burnEvents: BurnEvent[];
  deployerToPairTransfers: TransferEvent[];
  pairBurnTransfers: TransferEvent[];
  earliestObservedMint: TransferEvent | undefined;
}): TokenLpRemovalTransaction[] {
  return groupByTransaction(burnEvents).map(
    ([transactionHash, transactionEvents]) => {
      const deployerTransfers = deployerToPairTransfers.filter(
        (event) => event.transactionHash === transactionHash,
      );
      const burnedTransfers = pairBurnTransfers.filter(
        (event) => event.transactionHash === transactionHash,
      );
      const sentByDeployer = sumAmounts(deployerTransfers);
      const burnedByPair = sumAmounts(burnedTransfers);
      const matched = sentByDeployer < burnedByPair ? sentByDeployer : burnedByPair;
      const firstBurn = transactionEvents.slice().sort(comparePosition)[0];
      return {
        transactionHash,
        blockNumber: firstKnownBlock(transactionEvents),
        burnCaller: uniqueAddress(transactionEvents.map((event) => event.sender)),
        recipient: uniqueAddress(
          transactionEvents.map((event) => event.recipient),
        ),
        amount0: transactionEvents
          .reduce((sum, event) => sum + event.amount0, 0n)
          .toString(),
        amount1: transactionEvents
          .reduce((sum, event) => sum + event.amount1, 0n)
          .toString(),
        lpSentByDeployerToPair: sentByDeployer.toString(),
        lpBurnedByPair: burnedByPair.toString(),
        matchedDeployerLp: matched.toString(),
        afterObservedDeployerMint:
          earliestObservedMint && firstBurn
            ? isStrictlyAfter(firstBurn, earliestObservedMint)
            : null,
      };
    },
  );
}

function groupByTransaction<T extends PositionedEvent>(events: T[]) {
  const groups = new Map<Hex, T[]>();
  for (const event of events.slice().sort(comparePosition)) {
    const group = groups.get(event.transactionHash) ?? [];
    group.push(event);
    groups.set(event.transactionHash, group);
  }
  return Array.from(groups.entries());
}

function sumAmounts(events: TransferEvent[]) {
  return events.reduce((sum, event) => sum + event.amount, 0n);
}

function firstKnownBlock(events: PositionedEvent[]) {
  return events.find((event) => event.blockNumber !== null)?.blockNumber ?? null;
}

function uniqueAddress(addresses: Address[]): Address | null {
  const unique = Array.from(
    new Map(addresses.map((address) => [address.toLowerCase(), address])).values(),
  );
  return unique.length === 1 ? unique[0] : null;
}

function comparePosition(left: PositionedEvent, right: PositionedEvent) {
  return (
    (left.blockNumber ?? Number.MAX_SAFE_INTEGER) -
      (right.blockNumber ?? Number.MAX_SAFE_INTEGER) ||
    (left.transactionIndex ?? Number.MAX_SAFE_INTEGER) -
      (right.transactionIndex ?? Number.MAX_SAFE_INTEGER) ||
    (left.logIndex ?? Number.MAX_SAFE_INTEGER) -
      (right.logIndex ?? Number.MAX_SAFE_INTEGER)
  );
}

function isStrictlyAfter(left: PositionedEvent, right: PositionedEvent) {
  if (left.blockNumber === null || right.blockNumber === null) return null;
  if (left.blockNumber !== right.blockNumber) {
    return left.blockNumber > right.blockNumber;
  }
  if (left.transactionIndex === null || right.transactionIndex === null) {
    return null;
  }
  if (left.transactionIndex !== right.transactionIndex) {
    return left.transactionIndex > right.transactionIndex;
  }
  if (left.logIndex === null || right.logIndex === null) return null;
  return left.logIndex > right.logIndex;
}

function normalizedReserves(value: unknown): {
  reserve0: bigint;
  reserve1: bigint;
  blockTimestampLast: number | null;
} | null {
  const values = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [
          (value as Record<string, unknown>).reserve0,
          (value as Record<string, unknown>).reserve1,
          (value as Record<string, unknown>).blockTimestampLast,
        ]
      : [];
  const reserve0 = unsignedInteger(values[0]);
  const reserve1 = unsignedInteger(values[1]);
  const timestamp = unsignedInteger(values[2]);
  if (reserve0 === null || reserve1 === null) return null;
  return {
    reserve0,
    reserve1,
    blockTimestampLast:
      timestamp !== null && timestamp <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(timestamp)
        : null,
  };
}

function unsignedInteger(value: unknown): bigint | null {
  try {
    const parsed =
      typeof value === "bigint"
        ? value
        : typeof value === "number" && Number.isSafeInteger(value)
          ? BigInt(value)
          : typeof value === "string" && /^(?:0x[0-9a-f]+|\d+)$/i.test(value)
            ? BigInt(value)
            : null;
    return parsed !== null && parsed >= 0n ? parsed : null;
  } catch {
    return null;
  }
}

function supplyShareBps(
  balance: bigint,
  totalSupply: bigint | null,
): number | null {
  if (totalSupply === null || totalSupply <= 0n || balance < 0n) return null;
  const bounded = balance > totalSupply ? totalSupply : balance;
  return Number((bounded * 10_000n) / totalSupply);
}

function isBurnLikeLpAddress(address: Address): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === ZERO_ADDRESS.toLowerCase() ||
    normalized === DEAD_ADDRESS.toLowerCase()
  );
}

function word(data: Hex, index: number): bigint | null {
  const start = 2 + index * 64;
  const chunk = data.slice(start, start + 64);
  if (!/^[0-9a-f]{64}$/i.test(chunk)) return null;
  try {
    return BigInt(`0x${chunk}`);
  } catch {
    return null;
  }
}

function addressFromTopic(value: Hex | undefined): Address | null {
  if (!value || !/^0x[0-9a-f]{64}$/i.test(value)) return null;
  return normalizedAddress(`0x${value.slice(-40)}`);
}

function normalizedAddress(value: unknown): Address | null {
  return typeof value === "string" && isAddress(value) ? getAddress(value) : null;
}

function normalizedTransactionHash(value: unknown): Hex | null {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value)
    ? (value.toLowerCase() as Hex)
    : null;
}

function isHex(value: unknown): value is Hex {
  return typeof value === "string" && /^0x(?:[0-9a-f]{2})*$/i.test(value);
}

function nonNegativeBlock(value: bigint | number): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
}

function nullableIndex(value: number | null): number | null {
  return value !== null && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function safeError(error: unknown) {
  return safeText(error instanceof Error ? error.message : String(error));
}

function safeText(value: string) {
  return value
    .replace(/([?&](?:api_?key|apikey|key)=)[^&\s)]+/gi, "$1[redacted]")
    .slice(0, 240);
}
