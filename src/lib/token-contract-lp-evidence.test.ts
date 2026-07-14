import { describe, expect, it, vi } from "vitest";
import {
  getAddress,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";

import {
  collectTokenLpEvidence,
  TOKEN_LP_EVIDENCE_LOG_LIMIT,
  type TokenLpEventName,
  type TokenLpEvidenceDependencies,
  type TokenLpEvidenceLog,
} from "@/lib/token-contract-lp-evidence";

const ZERO = getAddress("0x0000000000000000000000000000000000000000");
const TOKEN = getAddress("0x1111111111111111111111111111111111111111");
const QUOTE = getAddress("0x2222222222222222222222222222222222222222");
const PAIR = getAddress("0x3333333333333333333333333333333333333333");
const FACTORY = getAddress("0x4444444444444444444444444444444444444444");
const DEPLOYER = getAddress("0x5555555555555555555555555555555555555555");
const ROUTER = getAddress("0x6666666666666666666666666666666666666666");
const RECIPIENT = getAddress("0x7777777777777777777777777777777777777777");
const OTHER = getAddress("0x8888888888888888888888888888888888888888");
const TX_MINT = hash("11");
const TX_REMOVE_A = hash("22");
const TX_REMOVE_B = hash("33");

const EVENT_TOPICS = {
  Transfer: keccak256(stringToHex("Transfer(address,address,uint256)")),
  Mint: keccak256(stringToHex("Mint(address,uint256,uint256)")),
  MintPulseXV2: keccak256(
    stringToHex("Mint(address,uint256,uint256,address)"),
  ),
  Burn: keccak256(stringToHex("Burn(address,uint256,uint256,address)")),
  BurnPulseXV2: keccak256(
    stringToHex("Burn(address,uint256,uint256,address,address)"),
  ),
} as const;

describe("token LP evidence", () => {
  it("reads a captured pair snapshot and matches deployer LP mint consumption", async () => {
    const logs: Record<TokenLpEventName, TokenLpEvidenceLog[]> = {
      Transfer: [
        transfer(TX_MINT, 100, 0, ZERO, DEPLOYER, 1_000n),
        transfer(TX_REMOVE_A, 150, 0, DEPLOYER, PAIR, 400n),
        transfer(TX_REMOVE_A, 150, 1, PAIR, ZERO, 400n),
        transfer(TX_REMOVE_B, 160, 0, DEPLOYER, PAIR, 600n),
        transfer(TX_REMOVE_B, 160, 1, PAIR, ZERO, 600n),
      ],
      Mint: [mint(TX_MINT, 100, 2, ROUTER, 5_000n, 10_000n)],
      Burn: [
        burn(TX_REMOVE_A, 150, 2, ROUTER, RECIPIENT, 2_000n, 4_000n),
        burn(TX_REMOVE_B, 160, 2, ROUTER, RECIPIENT, 3_000n, 6_000n),
      ],
    };
    const dependencies = pairDependencies(logs);

    const result = await collectTokenLpEvidence({
      tokenAddress: TOKEN,
      pairAddress: PAIR,
      deployerAddress: DEPLOYER,
      capturedBlock: 200,
      fromBlock: 90,
      dependencies,
    });

    expect(result.status).toBe("complete");
    expect(result.snapshot).toMatchObject({
      token0: TOKEN,
      token1: QUOTE,
      factory: FACTORY,
      requestedTokenPosition: "token0",
      quoteTokenAddress: QUOTE,
      totalSupply: "1000",
      reserves: {
        reserve0: "5000",
        reserve1: "10000",
        requestedTokenReserve: "5000",
        quoteTokenReserve: "10000",
      },
    });
    expect(result.mintTransactions).toEqual([
      expect.objectContaining({
        transactionHash: TX_MINT,
        amount0: "5000",
        amount1: "10000",
        lpMintedToDeployer: "1000",
      }),
    ]);
    expect(result.removalTransactions).toEqual([
      expect.objectContaining({
        transactionHash: TX_REMOVE_A,
        lpSentByDeployerToPair: "400",
        lpBurnedByPair: "400",
        matchedDeployerLp: "400",
        afterObservedDeployerMint: true,
      }),
      expect.objectContaining({
        transactionHash: TX_REMOVE_B,
        matchedDeployerLp: "600",
        afterObservedDeployerMint: true,
      }),
    ]);
    expect(result.deployerActivity).toEqual({
      deployerAddress: DEPLOYER,
      observedLpMintedToDeployer: "1000",
      observedLpSentByDeployerToPair: "1000",
      observedLpMatchedToBurns: "1000",
      observedLpRemovedAfterMint: "1000",
      observedMintFullyConsumedLater: true,
      observedConsumedBps: 10_000,
    });
    expect(result.custody).toMatchObject({
      complete: true,
      sampledSupplyBps: 10_000,
      controllerBps: 10_000,
    });
    expect(dependencies.readContract).toHaveBeenCalledTimes(8);
    expect(dependencies.getLogs).toHaveBeenCalledTimes(5);
    expect(dependencies.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: PAIR,
        fromBlock: 90n,
        toBlock: 200n,
        limit: TOKEN_LP_EVIDENCE_LOG_LIMIT,
      }),
    );
  });

  it("matches PulseX V2 extended Mint and Burn event variants", async () => {
    const logs: Record<TokenLpEventName, TokenLpEvidenceLog[]> = {
      Transfer: [
        transfer(TX_MINT, 100, 0, ZERO, DEPLOYER, 1_000n),
        transfer(TX_REMOVE_A, 150, 0, DEPLOYER, PAIR, 1_000n),
        transfer(TX_REMOVE_A, 150, 1, PAIR, ZERO, 1_000n),
      ],
      Mint: [mintPulseXV2(TX_MINT, 100, 2, ROUTER, DEPLOYER, 5_000n, 10_000n)],
      Burn: [
        burnPulseXV2(
          TX_REMOVE_A,
          150,
          2,
          ROUTER,
          ROUTER,
          DEPLOYER,
          5_000n,
          10_000n,
        ),
      ],
    };

    const result = await collectTokenLpEvidence({
      tokenAddress: TOKEN,
      pairAddress: PAIR,
      deployerAddress: DEPLOYER,
      capturedBlock: 200,
      fromBlock: 90,
      dependencies: pairDependencies(logs),
    });

    expect(result.status).toBe("complete");
    expect(result.mintTransactions[0]).toMatchObject({
      sender: ROUTER,
      lpMintedToDeployer: "1000",
    });
    expect(result.removalTransactions[0]).toMatchObject({
      burnCaller: ROUTER,
      recipient: DEPLOYER,
      matchedDeployerLp: "1000",
      afterObservedDeployerMint: true,
    });
    expect(result.deployerActivity).toMatchObject({
      observedLpRemovedAfterMint: "1000",
      observedMintFullyConsumedLater: true,
      observedConsumedBps: 10_000,
    });
  });

  it("does not treat an unmatched deployer-to-pair transfer as LP consumed by a burn", async () => {
    const logs: Record<TokenLpEventName, TokenLpEvidenceLog[]> = {
      Transfer: [
        transfer(TX_MINT, 100, 0, ZERO, DEPLOYER, 1_000n),
        transfer(TX_REMOVE_A, 130, 0, DEPLOYER, PAIR, 900n),
        transfer(TX_REMOVE_B, 140, 0, OTHER, PAIR, 400n),
        transfer(TX_REMOVE_B, 140, 1, PAIR, ZERO, 400n),
      ],
      Mint: [mint(TX_MINT, 100, 1, ROUTER, 1_000n, 2_000n)],
      Burn: [burn(TX_REMOVE_B, 140, 2, ROUTER, RECIPIENT, 500n, 1_000n)],
    };

    const result = await collectTokenLpEvidence({
      tokenAddress: TOKEN,
      pairAddress: PAIR,
      deployerAddress: DEPLOYER,
      capturedBlock: 200,
      dependencies: pairDependencies(logs),
    });

    expect(result.deployerActivity).toMatchObject({
      observedLpMintedToDeployer: "1000",
      observedLpSentByDeployerToPair: "900",
      observedLpMatchedToBurns: "0",
      observedLpRemovedAfterMint: "0",
      observedMintFullyConsumedLater: false,
      observedConsumedBps: 0,
    });
    expect(result.removalTransactions[0]).toMatchObject({
      transactionHash: TX_REMOVE_B,
      lpBurnedByPair: "400",
      lpSentByDeployerToPair: "0",
      matchedDeployerLp: "0",
    });
  });

  it("keeps lifecycle completion unresolved when the bounded transfer page is truncated", async () => {
    const logs: Record<TokenLpEventName, TokenLpEvidenceLog[]> = {
      Transfer: [
        transfer(TX_MINT, 100, 0, ZERO, DEPLOYER, 1_000n),
        transfer(TX_REMOVE_A, 150, 0, DEPLOYER, PAIR, 1_000n),
        transfer(TX_REMOVE_A, 150, 1, PAIR, ZERO, 1_000n),
      ],
      Mint: [mint(TX_MINT, 100, 1, ROUTER, 1_000n, 2_000n)],
      Burn: [burn(TX_REMOVE_A, 150, 2, ROUTER, RECIPIENT, 1_000n, 2_000n)],
    };
    const dependencies = pairDependencies(logs, { truncatedEvent: "Transfer" });

    const result = await collectTokenLpEvidence({
      tokenAddress: TOKEN,
      pairAddress: PAIR,
      deployerAddress: DEPLOYER,
      capturedBlock: 200,
      dependencies,
    });

    expect(result.status).toBe("partial");
    expect(result.eventCoverage.Transfer.truncated).toBe(true);
    expect(result.deployerActivity).toMatchObject({
      observedLpRemovedAfterMint: "1000",
      observedMintFullyConsumedLater: null,
    });
    expect(result.limitations.join(" ")).toContain(
      `Transfer evidence was bounded to ${TOKEN_LP_EVIDENCE_LOG_LIMIT}`,
    );
  });

  it("keeps lifecycle completion unresolved when the event lower bound is unknown", async () => {
    const logs: Record<TokenLpEventName, TokenLpEvidenceLog[]> = {
      Transfer: [
        transfer(TX_MINT, 100, 0, ZERO, DEPLOYER, 1_000n),
        transfer(TX_REMOVE_A, 150, 0, DEPLOYER, PAIR, 1_000n),
        transfer(TX_REMOVE_A, 150, 1, PAIR, ZERO, 1_000n),
      ],
      Mint: [mint(TX_MINT, 100, 1, ROUTER, 1_000n, 2_000n)],
      Burn: [burn(TX_REMOVE_A, 150, 2, ROUTER, RECIPIENT, 1_000n, 2_000n)],
    };

    const result = await collectTokenLpEvidence({
      tokenAddress: TOKEN,
      pairAddress: PAIR,
      deployerAddress: DEPLOYER,
      capturedBlock: 200,
      fromBlock: 100,
      historyLowerBoundKnown: false,
      dependencies: pairDependencies(logs),
    });

    expect(result.status).toBe("partial");
    expect(result.eventCoverage.Transfer.truncated).toBe(true);
    expect(result.eventCoverage.Mint.truncated).toBe(true);
    expect(result.eventCoverage.Burn.truncated).toBe(true);
    expect(result.deployerActivity).toMatchObject({
      observedLpRemovedAfterMint: "1000",
      observedMintFullyConsumedLater: null,
    });
    expect(result.limitations.join(" ")).toContain(
      "Pair creation height was unavailable",
    );
  });

  it("maps token1 reserves and preserves partial evidence when one provider call fails", async () => {
    const readContract = vi.fn<TokenLpEvidenceDependencies["readContract"]>(
      async ({ functionName }) => {
        if (functionName === "token0") return QUOTE;
        if (functionName === "token1") return TOKEN;
        if (functionName === "factory") throw new Error("RPC unavailable");
        if (functionName === "getReserves") return [10_000n, 5_000n, 1234];
        return 777n;
      },
    );
    const getLogs = vi.fn<TokenLpEvidenceDependencies["getLogs"]>(
      async ({ eventName }) => {
        if (eventName === "Burn") throw new Error("event window unavailable");
        return { logs: [], truncated: false };
      },
    );

    const result = await collectTokenLpEvidence({
      tokenAddress: TOKEN,
      pairAddress: PAIR,
      deployerAddress: null,
      capturedBlock: 200,
      dependencies: { readContract, getLogs },
    });

    expect(result.status).toBe("partial");
    expect(result.snapshot).toMatchObject({
      requestedTokenPosition: "token1",
      quoteTokenAddress: QUOTE,
      reserves: {
        requestedTokenReserve: "5000",
        quoteTokenReserve: "10000",
      },
    });
    expect(result.deployerActivity.observedMintFullyConsumedLater).toBeNull();
    expect(result.limitations.join(" ")).toContain("factory() unavailable");
    expect(result.limitations.join(" ")).toContain("Burn logs unavailable");
    expect(result.limitations.join(" ")).toContain("deployer address was unavailable");
  });

  it("classifies current LP custody without treating an unknown contract as a lock", async () => {
    const logs: Record<TokenLpEventName, TokenLpEvidenceLog[]> = {
      Transfer: [transfer(TX_MINT, 100, 0, ZERO, DEPLOYER, 1_000n)],
      Mint: [mint(TX_MINT, 100, 1, ROUTER, 1_000n, 2_000n)],
      Burn: [],
    };
    const base = pairDependencies(logs);
    base.readContract.mockImplementation(async ({ functionName, args }) => {
      if (functionName === "token0") return TOKEN;
      if (functionName === "token1") return QUOTE;
      if (functionName === "factory") return FACTORY;
      if (functionName === "getReserves") return [5_000n, 10_000n, 1234];
      if (functionName === "totalSupply") return 1_000n;
      const holder = String(args?.[0] ?? "").toLowerCase();
      if (holder === ZERO.toLowerCase()) return 600n;
      if (holder === DEPLOYER.toLowerCase()) return 200n;
      if (holder === OTHER.toLowerCase()) return 200n;
      return 0n;
    });

    const result = await collectTokenLpEvidence({
      tokenAddress: TOKEN,
      pairAddress: PAIR,
      deployerAddress: DEPLOYER,
      capturedBlock: 200,
      dependencies: {
        ...base,
        getHolderCandidates: async () => ({
          holders: [{ address: OTHER, source: "explorer" }],
          complete: true,
        }),
        getBytecode: async ({ address }) =>
          address.toLowerCase() === OTHER.toLowerCase() ? "0x6000" : "0x",
      },
    });

    expect(result.custody).toMatchObject({
      complete: true,
      sampledSupplyBps: 10_000,
      burnedBps: 6_000,
      controllerBps: 2_000,
      knownLockedBps: 0,
    });
    expect(result.custody.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: OTHER,
          classification: "contract",
          hasBytecode: true,
        }),
      ]),
    );
    expect(result.custody.limitations.join(" ")).toContain(
      "not as locked liquidity",
    );
  });
});

function pairDependencies(
  logs: Record<TokenLpEventName, TokenLpEvidenceLog[]>,
  options: { truncatedEvent?: TokenLpEventName } = {},
): TokenLpEvidenceDependencies & {
  readContract: ReturnType<typeof vi.fn<TokenLpEvidenceDependencies["readContract"]>>;
  getLogs: ReturnType<typeof vi.fn<TokenLpEvidenceDependencies["getLogs"]>>;
} {
  const readContract = vi.fn<TokenLpEvidenceDependencies["readContract"]>(
    async ({ functionName }) => {
      if (functionName === "token0") return TOKEN;
      if (functionName === "token1") return QUOTE;
      if (functionName === "factory") return FACTORY;
      if (functionName === "getReserves") return [5_000n, 10_000n, 1234];
      return 1_000n;
    },
  );
  const getLogs = vi.fn<TokenLpEvidenceDependencies["getLogs"]>(
    async ({ eventName }) => ({
      logs: logs[eventName],
      truncated: eventName === options.truncatedEvent,
    }),
  );
  return { readContract, getLogs };
}

function transfer(
  transactionHash: Hex,
  blockNumber: number,
  logIndex: number,
  from: Address,
  to: Address,
  amount: bigint,
): TokenLpEvidenceLog {
  return log(
    transactionHash,
    blockNumber,
    logIndex,
    [EVENT_TOPICS.Transfer, addressTopic(from), addressTopic(to)],
    words(amount),
  );
}

function mint(
  transactionHash: Hex,
  blockNumber: number,
  logIndex: number,
  sender: Address,
  amount0: bigint,
  amount1: bigint,
): TokenLpEvidenceLog {
  return log(
    transactionHash,
    blockNumber,
    logIndex,
    [EVENT_TOPICS.Mint, addressTopic(sender)],
    words(amount0, amount1),
  );
}

function burn(
  transactionHash: Hex,
  blockNumber: number,
  logIndex: number,
  sender: Address,
  recipient: Address,
  amount0: bigint,
  amount1: bigint,
): TokenLpEvidenceLog {
  return log(
    transactionHash,
    blockNumber,
    logIndex,
    [EVENT_TOPICS.Burn, addressTopic(sender), addressTopic(recipient)],
    words(amount0, amount1),
  );
}

function mintPulseXV2(
  transactionHash: Hex,
  blockNumber: number,
  logIndex: number,
  sender: Address,
  recipient: Address,
  amount0: bigint,
  amount1: bigint,
): TokenLpEvidenceLog {
  return log(
    transactionHash,
    blockNumber,
    logIndex,
    [
      EVENT_TOPICS.MintPulseXV2,
      addressTopic(sender),
      addressTopic(recipient),
    ],
    words(amount0, amount1),
  );
}

function burnPulseXV2(
  transactionHash: Hex,
  blockNumber: number,
  logIndex: number,
  sender: Address,
  pairRecipient: Address,
  finalRecipient: Address,
  amount0: bigint,
  amount1: bigint,
): TokenLpEvidenceLog {
  return log(
    transactionHash,
    blockNumber,
    logIndex,
    [
      EVENT_TOPICS.BurnPulseXV2,
      addressTopic(sender),
      addressTopic(pairRecipient),
      addressTopic(finalRecipient),
    ],
    words(amount0, amount1),
  );
}

function log(
  transactionHash: Hex,
  blockNumber: number,
  logIndex: number,
  topics: readonly Hex[],
  data: Hex,
): TokenLpEvidenceLog {
  return {
    transactionHash,
    blockNumber,
    transactionIndex: blockNumber,
    logIndex,
    topics,
    data,
  };
}

function addressTopic(address: Address): Hex {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function words(...values: bigint[]): Hex {
  return `0x${values.map((value) => value.toString(16).padStart(64, "0")).join("")}`;
}

function hash(byte: string): Hex {
  return `0x${byte.repeat(32)}`;
}
