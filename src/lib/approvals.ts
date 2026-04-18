import type { Address } from "viem";

import { erc20Abi, formatAllowance, isUnlimitedAllowance } from "@/lib/erc20";
import type { SpenderEntry, TokenEntry } from "@/lib/registry";

/**
 * Flat, UI-ready representation of a single positive ERC-20 approval.
 */
export interface Approval {
  key: string;
  tokenAddress: Address;
  tokenSymbol: string;
  tokenName?: string;
  tokenDecimals: number;
  spenderAddress: Address;
  spenderLabel: string;
  protocol: string;
  spenderUrl?: string;
  rawAllowance: bigint;
  formattedAllowance: string;
  unlimited: boolean;
}

const METADATA_CALLS_PER_TOKEN = 3; // symbol, decimals, name

/**
 * Number of wagmi `useReadContracts` entries produced per token in the
 * registry: 3 metadata calls plus one allowance read per registered spender.
 */
export function readsPerToken(spenderCount: number): number {
  return METADATA_CALLS_PER_TOKEN + spenderCount;
}

/**
 * Build the flat array of contract read configs passed to
 * `useReadContracts`. Layout per token (stride = readsPerToken):
 *   [symbol, decimals, name, allowance(spender_0), …, allowance(spender_N)]
 */
export function buildScanContracts(
  owner: Address,
  tokens: readonly TokenEntry[],
  spenders: readonly SpenderEntry[],
) {
  return tokens.flatMap((token) => [
    {
      address: token.address,
      abi: erc20Abi,
      functionName: "symbol" as const,
    },
    {
      address: token.address,
      abi: erc20Abi,
      functionName: "decimals" as const,
    },
    {
      address: token.address,
      abi: erc20Abi,
      functionName: "name" as const,
    },
    ...spenders.map((spender) => ({
      address: token.address,
      abi: erc20Abi,
      functionName: "allowance" as const,
      args: [owner, spender.address] as const,
    })),
  ]);
}

/**
 * One entry of a wagmi `useReadContracts` result with `allowFailure: true`.
 */
type ReadResult =
  | { status: "success"; result: unknown; error?: undefined }
  | { status: "failure"; error: Error; result?: undefined };

/**
 * Parse a wagmi `useReadContracts` result (with `allowFailure: true`) back
 * into a list of positive approvals. Tokens whose metadata fails degrade
 * gracefully to the registry fallback; tokens with no decimals info at all
 * are skipped so we never display a mis-scaled allowance.
 */
export function parseScanResults(
  results: readonly ReadResult[],
  tokens: readonly TokenEntry[],
  spenders: readonly SpenderEntry[],
): Approval[] {
  const stride = readsPerToken(spenders.length);
  const approvals: Approval[] = [];

  tokens.forEach((token, tokenIdx) => {
    const base = tokenIdx * stride;
    const symbolRes = results[base];
    const decimalsRes = results[base + 1];
    const nameRes = results[base + 2];

    const onChainSymbol =
      symbolRes?.status === "success" && typeof symbolRes.result === "string"
        ? symbolRes.result
        : undefined;
    const onChainName =
      nameRes?.status === "success" && typeof nameRes.result === "string"
        ? nameRes.result
        : undefined;
    const onChainDecimals =
      decimalsRes?.status === "success" && typeof decimalsRes.result === "number"
        ? decimalsRes.result
        : undefined;

    const decimals = onChainDecimals ?? token.decimals;
    if (typeof decimals !== "number") return; // can't safely format without decimals

    const symbol = onChainSymbol ?? token.symbol;
    const name = onChainName ?? token.name;

    spenders.forEach((spender, spenderIdx) => {
      const allowanceRes = results[base + METADATA_CALLS_PER_TOKEN + spenderIdx];
      if (!allowanceRes || allowanceRes.status !== "success") return;

      const raw = allowanceRes.result;
      if (typeof raw !== "bigint" || raw === 0n) return;

      const unlimited = isUnlimitedAllowance(raw);

      approvals.push({
        key: `${token.address}-${spender.address}`,
        tokenAddress: token.address,
        tokenSymbol: symbol,
        tokenName: name,
        tokenDecimals: decimals,
        spenderAddress: spender.address,
        spenderLabel: spender.label,
        protocol: spender.protocol,
        spenderUrl: spender.url,
        rawAllowance: raw,
        formattedAllowance: unlimited
          ? "Unlimited"
          : `${formatAllowance(raw, decimals)} ${symbol}`,
        unlimited,
      });
    });
  });

  return approvals;
}

export type ApprovalSort = "risk" | "token" | "spender";

/**
 * Filter + sort approvals for the scanner table. Pure so the hook can stay
 * small and so this is trivially testable in isolation.
 */
export function filterAndSortApprovals(
  approvals: readonly Approval[],
  {
    query,
    sort,
  }: {
    query: string;
    sort: ApprovalSort;
  },
): Approval[] {
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? approvals.filter((a) => {
        const haystack = [
          a.tokenSymbol,
          a.tokenName ?? "",
          a.spenderLabel,
          a.protocol,
          a.tokenAddress,
          a.spenderAddress,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
    : [...approvals];

  filtered.sort((a, b) => {
    if (sort === "risk") {
      if (a.unlimited !== b.unlimited) return a.unlimited ? -1 : 1;
      const labelCmp = a.spenderLabel.localeCompare(b.spenderLabel);
      if (labelCmp !== 0) return labelCmp;
      return a.tokenSymbol.localeCompare(b.tokenSymbol);
    }
    if (sort === "token") {
      const tokenCmp = a.tokenSymbol.localeCompare(b.tokenSymbol);
      if (tokenCmp !== 0) return tokenCmp;
      return a.spenderLabel.localeCompare(b.spenderLabel);
    }
    const spenderCmp = a.spenderLabel.localeCompare(b.spenderLabel);
    if (spenderCmp !== 0) return spenderCmp;
    return a.tokenSymbol.localeCompare(b.tokenSymbol);
  });

  return filtered;
}
