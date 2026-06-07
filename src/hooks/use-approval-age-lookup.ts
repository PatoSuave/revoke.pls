"use client";

import { getPublicClient } from "@wagmi/core";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useConfig } from "wagmi";

import { buildApprovalAgeInfo } from "@/lib/approval-age/format";
import type { ApprovalAgeInfo } from "@/lib/approval-age/types";
import { walletChains } from "@/lib/wagmi";

type WalletChainId = (typeof walletChains)[number]["id"];

export interface ApprovalAgeLookupRow {
  key: string;
  chainId: number;
  approvalBlockNumber?: bigint;
  approvalTxHash?: `0x${string}`;
}

export function useApprovalAgeLookup(
  rows: readonly ApprovalAgeLookupRow[],
): ReadonlyMap<string, ApprovalAgeInfo> {
  const config = useConfig();
  const blockLookups = useMemo(() => uniqueBlockLookups(rows), [rows]);
  const queries = useQueries({
    queries: blockLookups.map((lookup) => ({
      queryKey: ["approval-age-block", lookup.chainId, lookup.blockNumber],
      staleTime: Infinity,
      gcTime: 30 * 60_000,
      retry: 1,
      queryFn: async () => {
        if (!isWalletChainId(lookup.chainId)) {
          throw new Error("Unsupported chain for approval age lookup.");
        }
        const client = getPublicClient(config, { chainId: lookup.chainId });
        if (!client) throw new Error("No public client for approval age lookup.");
        const block = await client.getBlock({
          blockNumber: BigInt(lookup.blockNumber),
        });
        return Number(block.timestamp);
      },
    })),
  });

  return useMemo(() => {
    const timestampByBlock = new Map<string, number>();
    blockLookups.forEach((lookup, index) => {
      const timestamp = queries[index]?.data;
      if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
        timestampByBlock.set(blockLookupKey(lookup), timestamp);
      }
    });

    const ageByKey = new Map<string, ApprovalAgeInfo>();
    for (const row of rows) {
      const blockNumber = row.approvalBlockNumber;
      const timestamp =
        blockNumber === undefined
          ? undefined
          : timestampByBlock.get(
              blockLookupKey({
                chainId: row.chainId,
                blockNumber: blockNumber.toString(),
              }),
            );
      ageByKey.set(
        row.key,
        buildApprovalAgeInfo({
          chainId: row.chainId,
          approvalBlockNumber: row.approvalBlockNumber,
          approvalTxHash: row.approvalTxHash,
          approvalTimestamp: timestamp,
        }),
      );
    }
    return ageByKey;
  }, [blockLookups, queries, rows]);
}

function uniqueBlockLookups(rows: readonly ApprovalAgeLookupRow[]) {
  const seen = new Set<string>();
  const lookups: { chainId: number; blockNumber: string }[] = [];
  for (const row of rows) {
    if (row.approvalBlockNumber === undefined) continue;
    const lookup = {
      chainId: row.chainId,
      blockNumber: row.approvalBlockNumber.toString(),
    };
    const key = blockLookupKey(lookup);
    if (seen.has(key)) continue;
    seen.add(key);
    lookups.push(lookup);
  }
  return lookups;
}

function blockLookupKey(lookup: { chainId: number; blockNumber: string }) {
  return `${lookup.chainId}:${lookup.blockNumber}`;
}

function isWalletChainId(chainId: number): chainId is WalletChainId {
  return walletChains.some((chain) => chain.id === chainId);
}
