import {
  encodeFunctionData,
  getAddress,
  parseAbi,
  type Abi,
  type Address,
  type Hex,
} from "viem";

import {
  tokenContractDexDeploymentsForChain,
  type TokenContractDexDeployment,
} from "@/lib/token-contract-dex-registry";
import type {
  TokenContractLiquidityPair,
  TokenContractSimulationAttempt,
} from "@/lib/token-contract-report";

const ROUTER_SIMULATION_LIMIT = 4;
const MAX_BUY_VALUE = 1_000_000_000_000_000_000n;
const MAX_UINT256 = (1n << 256n) - 1n;

const ROUTER_FACTORY_ABI = parseAbi([
  "function factory() view returns (address)",
]);
const ROUTER_WETH_ABI = parseAbi(["function WETH() view returns (address)"]);
const ROUTER_WPLS_ABI = parseAbi(["function WPLS() view returns (address)"]);
const ROUTER_SWAP_ABI = parseAbi([
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin,address[] path,address to,uint256 deadline) payable",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint256 amountIn,uint256 amountOutMin,address[] path,address to,uint256 deadline)",
]);
const TOKEN_ALLOWANCE_ABI = parseAbi([
  "function allowance(address owner,address spender) view returns (uint256)",
]);

export interface TokenContractRouterSimulationDependencies {
  getBytecode(args: {
    address: Address;
    blockNumber: bigint;
  }): Promise<Hex | undefined>;
  readContract(args: {
    address: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
    blockNumber: bigint;
  }): Promise<unknown>;
  getBalance(args: { address: Address; blockNumber: bigint }): Promise<bigint>;
  call(args: {
    account: Address;
    to: Address;
    data: Hex;
    value?: bigint;
    blockNumber: bigint;
  }): Promise<unknown>;
}

export interface TokenContractRouterPairCandidate {
  pair: TokenContractLiquidityPair;
  factory: Address | null;
}

export async function runTokenContractRouterSimulations({
  chainId,
  tokenAddress,
  holder,
  holderBalance,
  capturedBlock,
  pairs,
  dependencies,
}: {
  chainId: number;
  tokenAddress: Address;
  holder: Address | null;
  holderBalance: string | null;
  capturedBlock: bigint;
  pairs: readonly TokenContractRouterPairCandidate[];
  dependencies: TokenContractRouterSimulationDependencies;
}): Promise<{
  attempts: TokenContractSimulationAttempt[];
  limitations: string[];
}> {
  const limitations: string[] = [];
  const attempts: TokenContractSimulationAttempt[] = [];
  const deployments = tokenContractDexDeploymentsForChain(chainId);
  if (deployments.length === 0) {
    return {
      attempts,
      limitations: [
        "No reviewed router deployment is configured for this chain, so router-level swap probes were not run.",
      ],
    };
  }

  const parsedHolderBalance = parseUnsigned(holderBalance);
  for (const deployment of deployments) {
    if (attempts.length >= ROUTER_SIMULATION_LIMIT) break;
    const pairCandidate = pairs.find(
      ({ pair, factory }) =>
        factory?.toLowerCase() === deployment.factory.toLowerCase() ||
        (pair.dexId?.toLowerCase() === deployment.dexId &&
          pair.labels.some(
            (label) => label.toLowerCase() === deployment.version,
          )),
    );
    if (!pairCandidate) {
      limitations.push(
        `${deployment.label} router probes were skipped because no matching validated pair was discovered.`,
      );
      continue;
    }

    const validation = await validateRouter({
      deployment,
      capturedBlock,
      dependencies,
    });
    if (!validation.valid) {
      const detail = `${deployment.label} router identity validation failed: ${validation.reason}`;
      attempts.push(
        skippedAttempt({
          id: `router-buy-${deployment.version}`,
          label: `${deployment.label} ordinary-account buy probe`,
          kind: "router-buy",
          deployment,
          pairAddress: pairCandidate.pair.pairAddress,
          holder,
          capturedBlock,
          stage: "router-validation",
          detail,
        }),
        skippedAttempt({
          id: `router-sell-${deployment.version}`,
          label: `${deployment.label} sampled-holder sell probe`,
          kind: "router-sell",
          deployment,
          pairAddress: pairCandidate.pair.pairAddress,
          holder,
          capturedBlock,
          stage: "router-validation",
          detail,
        }),
      );
      limitations.push(detail);
      continue;
    }

    attempts.push(
      await runBuyProbe({
        deployment,
        pairAddress: pairCandidate.pair.pairAddress,
        tokenAddress,
        holder,
        capturedBlock,
        dependencies,
      }),
    );
    if (attempts.length >= ROUTER_SIMULATION_LIMIT) break;
    attempts.push(
      await runSellProbe({
        deployment,
        pairAddress: pairCandidate.pair.pairAddress,
        tokenAddress,
        holder,
        holderBalance: parsedHolderBalance,
        capturedBlock,
        dependencies,
      }),
    );
  }

  limitations.push(
    "Router probes are independent eth_call requests. A successful buy does not fund the sell probe, and success proves only the tested route, caller, amount, and captured block.",
  );
  return {
    attempts: attempts.slice(0, ROUTER_SIMULATION_LIMIT),
    limitations: Array.from(new Set(limitations)),
  };
}

async function validateRouter({
  deployment,
  capturedBlock,
  dependencies,
}: {
  deployment: TokenContractDexDeployment;
  capturedBlock: bigint;
  dependencies: TokenContractRouterSimulationDependencies;
}): Promise<{ valid: boolean; reason: string }> {
  try {
    const bytecode = await dependencies.getBytecode({
      address: deployment.router,
      blockNumber: capturedBlock,
    });
    if (!bytecode || bytecode === "0x") {
      return { valid: false, reason: "the reviewed router address has no bytecode" };
    }
    const factory = normalizedAddress(
      await dependencies.readContract({
        address: deployment.router,
        abi: ROUTER_FACTORY_ABI,
        functionName: "factory",
        blockNumber: capturedBlock,
      }),
    );
    if (factory?.toLowerCase() !== deployment.factory.toLowerCase()) {
      return { valid: false, reason: "factory() did not match the reviewed deployment" };
    }
    let wrapped: Address | null = null;
    for (const [abi, functionName] of [
      [ROUTER_WPLS_ABI, "WPLS"],
      [ROUTER_WETH_ABI, "WETH"],
    ] as const) {
      try {
        wrapped = normalizedAddress(
          await dependencies.readContract({
            address: deployment.router,
            abi,
            functionName,
            blockNumber: capturedBlock,
          }),
        );
        if (wrapped) break;
      } catch {
        // PulseX deployments have used both wrapped-native getter names.
      }
    }
    if (wrapped?.toLowerCase() !== deployment.wrappedNative.toLowerCase()) {
      return {
        valid: false,
        reason: "the wrapped-native getter did not match the reviewed deployment",
      };
    }
    return { valid: true, reason: "router bytecode and identity reads matched" };
  } catch (error) {
    return { valid: false, reason: safeError(error) };
  }
}

async function runBuyProbe({
  deployment,
  pairAddress,
  tokenAddress,
  holder,
  capturedBlock,
  dependencies,
}: {
  deployment: TokenContractDexDeployment;
  pairAddress: Address;
  tokenAddress: Address;
  holder: Address | null;
  capturedBlock: bigint;
  dependencies: TokenContractRouterSimulationDependencies;
}): Promise<TokenContractSimulationAttempt> {
  const base = attemptBase({
    id: `router-buy-${deployment.version}`,
    label: `${deployment.label} ordinary-account buy probe`,
    kind: "router-buy",
    deployment,
    pairAddress,
    holder,
    capturedBlock,
  });
  if (!holder) {
    return {
      ...base,
      status: "skipped",
      stage: "prerequisite",
      detail: "No distinct sampled ordinary holder was available as the router caller.",
      prerequisites: ["A sampled ordinary account is required."],
    };
  }
  let nativeBalance: bigint;
  try {
    nativeBalance = await dependencies.getBalance({
      address: holder,
      blockNumber: capturedBlock,
    });
  } catch (error) {
    return {
      ...base,
      status: "unavailable",
      stage: "prerequisite",
      detail: `Native balance prerequisite could not be read: ${safeError(error)}`,
      prerequisites: ["The caller's captured-block native balance must be readable."],
    };
  }
  if (nativeBalance <= 0n) {
    return {
      ...base,
      status: "skipped",
      stage: "prerequisite",
      detail: "The sampled caller had no native balance at the captured block.",
      prerequisites: ["A positive native balance is required for the payable buy path."],
    };
  }
  const value = boundedBuyValue(nativeBalance);
  const data = encodeFunctionData({
    abi: ROUTER_SWAP_ABI,
    functionName: "swapExactETHForTokensSupportingFeeOnTransferTokens",
    args: [0n, [deployment.wrappedNative, tokenAddress], holder, MAX_UINT256],
  });
  try {
    await dependencies.call({
      account: holder,
      to: deployment.router,
      data,
      value,
      blockNumber: capturedBlock,
    });
    return {
      ...base,
      status: "succeeded",
      stage: "swap-call",
      amount: value.toString(),
      detail: `Read-only ${deployment.label} buy eth_call completed with ${value} raw native units and amountOutMin 0. No transaction or persistent balance change occurred.`,
      assumptions: ["amountOutMin was zero to test path execution rather than price protection."],
    };
  } catch (error) {
    return {
      ...base,
      status: "reverted",
      stage: "swap-call",
      amount: value.toString(),
      detail: `Read-only ${deployment.label} buy eth_call reverted: ${safeError(error)}`,
      assumptions: ["A revert alone does not identify whether the router, pool, amount, or token caused failure."],
    };
  }
}

async function runSellProbe({
  deployment,
  pairAddress,
  tokenAddress,
  holder,
  holderBalance,
  capturedBlock,
  dependencies,
}: {
  deployment: TokenContractDexDeployment;
  pairAddress: Address;
  tokenAddress: Address;
  holder: Address | null;
  holderBalance: bigint | null;
  capturedBlock: bigint;
  dependencies: TokenContractRouterSimulationDependencies;
}): Promise<TokenContractSimulationAttempt> {
  const base = attemptBase({
    id: `router-sell-${deployment.version}`,
    label: `${deployment.label} sampled-holder sell probe`,
    kind: "router-sell",
    deployment,
    pairAddress,
    holder,
    capturedBlock,
  });
  if (!holder || holderBalance === null || holderBalance <= 0n) {
    return {
      ...base,
      status: "skipped",
      stage: "prerequisite",
      detail: "No positive-balance sampled ordinary holder was available for the sell path.",
      prerequisites: ["A distinct holder with a positive token balance is required."],
    };
  }
  let allowance: bigint;
  try {
    const value = await dependencies.readContract({
      address: tokenAddress,
      abi: TOKEN_ALLOWANCE_ABI,
      functionName: "allowance",
      args: [holder, deployment.router],
      blockNumber: capturedBlock,
    });
    allowance = parseUnsigned(value) ?? 0n;
  } catch (error) {
    return {
      ...base,
      status: "unavailable",
      stage: "allowance",
      detail: `Router allowance prerequisite could not be read: ${safeError(error)}`,
      prerequisites: ["The holder's allowance for this exact router must be readable."],
    };
  }
  if (allowance <= 0n) {
    return {
      ...base,
      status: "skipped",
      stage: "allowance",
      detail: "The sampled holder had no allowance for this exact router at the captured block; no sell call was attempted.",
      prerequisites: ["A positive existing allowance is required; the scanner never submits an approval."],
    };
  }
  const amount = boundedTokenAmount(holderBalance < allowance ? holderBalance : allowance);
  const data = encodeFunctionData({
    abi: ROUTER_SWAP_ABI,
    functionName: "swapExactTokensForETHSupportingFeeOnTransferTokens",
    args: [amount, 0n, [tokenAddress, deployment.wrappedNative], holder, MAX_UINT256],
  });
  try {
    await dependencies.call({
      account: holder,
      to: deployment.router,
      data,
      blockNumber: capturedBlock,
    });
    return {
      ...base,
      status: "succeeded",
      stage: "swap-call",
      amount: amount.toString(),
      detail: `Read-only ${deployment.label} sell eth_call completed for ${amount} raw token units using the holder's existing allowance. No transaction was submitted.`,
      assumptions: ["amountOutMin was zero to test path execution rather than price protection."],
    };
  } catch (error) {
    return {
      ...base,
      status: "reverted",
      stage: "swap-call",
      amount: amount.toString(),
      detail: `Read-only ${deployment.label} sell eth_call reverted: ${safeError(error)}`,
      assumptions: ["A revert alone does not prove a honeypot or identify the failing contract."],
    };
  }
}

function attemptBase({
  id,
  label,
  kind,
  deployment,
  pairAddress,
  holder,
  capturedBlock,
}: {
  id: string;
  label: string;
  kind: "router-buy" | "router-sell";
  deployment: TokenContractDexDeployment;
  pairAddress: Address;
  holder: Address | null;
  capturedBlock: bigint;
}): Omit<TokenContractSimulationAttempt, "status" | "detail"> {
  return {
    id,
    label,
    from: holder,
    to: deployment.router,
    recipient: holder,
    amount: null,
    functionSignature:
      kind === "router-buy"
        ? "swapExactETHForTokensSupportingFeeOnTransferTokens(uint256,address[],address,uint256)"
        : "swapExactTokensForETHSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint256)",
    blockNumber:
      capturedBlock <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(capturedBlock)
        : null,
    evidenceState: "confirmed-signature",
    kind,
    routerVersion: deployment.version,
    routerAddress: deployment.router,
    pairAddress,
    stage: null,
    prerequisites: [],
    assumptions: [],
  };
}

function skippedAttempt(
  args: Parameters<typeof attemptBase>[0] & {
    stage: NonNullable<TokenContractSimulationAttempt["stage"]>;
    detail: string;
  },
): TokenContractSimulationAttempt {
  return {
    ...attemptBase(args),
    status: "skipped",
    stage: args.stage,
    detail: args.detail,
  };
}

function boundedBuyValue(balance: bigint): bigint {
  const fraction = balance / 1_000n;
  const positive = fraction > 0n ? fraction : 1n;
  return positive > MAX_BUY_VALUE ? MAX_BUY_VALUE : positive;
}

function boundedTokenAmount(balance: bigint): bigint {
  const fraction = balance / 1_000n;
  return fraction > 0n ? fraction : 1n;
}

function parseUnsigned(value: unknown): bigint | null {
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

function normalizedAddress(value: unknown): Address | null {
  if (typeof value !== "string" || !/^0x[0-9a-f]{40}$/i.test(value)) return null;
  try {
    return getAddress(value);
  } catch {
    return null;
  }
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n\t]+/g, " ").slice(0, 240);
}
