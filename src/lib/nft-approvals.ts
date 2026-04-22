import type { Abi, Address } from "viem";

import type { SupportedChainId } from "@/lib/chains";
import type { NftApprovalKind, NftDiscoveredApproval } from "@/lib/discovery";
import { getSpenderEntry } from "@/lib/registry";
import { type RiskAssessment, classifyNftRisk } from "@/lib/risk";

/**
 * Minimal ABI fragments used by the NFT pipeline. We avoid pulling a full
 * ERC-721 / ERC-1155 ABI because only these four functions are ever called:
 *   - `supportsInterface`   — standard detection (ERC-165)
 *   - `name`                — optional collection label (ERC-721 only)
 *   - `isApprovedForAll`    — live validation of collection-wide approvals
 *   - `getApproved`         — live validation of ERC-721 per-token approvals
 *   - `setApprovalForAll`   — revoke collection-wide approval
 *   - `approve` (ERC-721)   — revoke per-token approval
 */
export const nftReadAbi: Abi = [
  {
    name: "supportsInterface",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "isApprovedForAll",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getApproved",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
];

export const nftRevokeAbi: Abi = [
  {
    name: "setApprovalForAll",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
];

/** ERC-165 interface IDs used for standard detection. */
export const INTERFACE_ID_ERC721 = "0x80ac58cd";
export const INTERFACE_ID_ERC1155 = "0xd9b67a26";

export type NftStandard = "erc721" | "erc1155" | "unknown";

export interface NftApproval {
  key: string;
  /** Chain the approval lives on. Needed for explorer links and revoke
   *  routing. */
  chainId: number;
  kind: NftApprovalKind;
  standard: NftStandard;
  collectionAddress: Address;
  collectionName?: string;
  operatorAddress: Address;
  operatorLabel: string;
  protocol: string;
  trusted: boolean;
  operatorVerificationMethod?: string;
  operatorNotes?: string;
  operatorUrl?: string;
  /** Present only for per-token ERC-721 approvals. */
  tokenId?: bigint;
  risk: RiskAssessment;
}

/**
 * Build a single flat `useReadContracts` config that validates every NFT
 * approval candidate and fetches the minimum metadata needed to render it.
 *
 * Layout:
 *   [supportsInterface(ERC721), supportsInterface(ERC1155), name()]   × unique collections
 *   [isApprovedForAll(owner, operator) | getApproved(tokenId)]         × pairs
 *
 * Metadata reads are deduped per collection address so that multiple
 * approvals on the same collection don't each trigger their own reads.
 */
const METADATA_CALLS_PER_COLLECTION = 3;

function uniqueCollectionAddresses(
  candidates: readonly NftDiscoveredApproval[],
): Address[] {
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const c of candidates) {
    const key = c.collectionAddress.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c.collectionAddress);
  }
  return out;
}

export function buildNftValidationContracts(
  owner: Address,
  candidates: readonly NftDiscoveredApproval[],
  chainId: SupportedChainId,
) {
  const collections = uniqueCollectionAddresses(candidates);
  const metadata = collections.flatMap((address) => [
    {
      address,
      abi: nftReadAbi,
      functionName: "supportsInterface" as const,
      args: [INTERFACE_ID_ERC721] as const,
      chainId,
    },
    {
      address,
      abi: nftReadAbi,
      functionName: "supportsInterface" as const,
      args: [INTERFACE_ID_ERC1155] as const,
      chainId,
    },
    { address, abi: nftReadAbi, functionName: "name" as const, chainId },
  ]);

  const liveChecks = candidates.map((c) => {
    if (c.kind === "approvalForAll") {
      return {
        address: c.collectionAddress,
        abi: nftReadAbi,
        functionName: "isApprovedForAll" as const,
        args: [owner, c.operatorAddress] as const,
        chainId,
      };
    }
    return {
      address: c.collectionAddress,
      abi: nftReadAbi,
      functionName: "getApproved" as const,
      args: [c.tokenId!] as const,
      chainId,
    };
  });

  return {
    contracts: [...metadata, ...liveChecks],
    uniqueCollections: collections,
  };
}

type ReadResult =
  | { status: "success"; result: unknown; error?: undefined }
  | { status: "failure"; error: Error; result?: undefined };

export interface NftParseStats {
  candidates: number;
  active: number;
  registryMatched: number;
}

export interface NftParseOutput {
  approvals: NftApproval[];
  stats: NftParseStats;
}

function detectStandard(
  supportsErc721: ReadResult | undefined,
  supportsErc1155: ReadResult | undefined,
  kind: NftApprovalKind,
): NftStandard {
  const isErc721 =
    supportsErc721?.status === "success" && supportsErc721.result === true;
  const isErc1155 =
    supportsErc1155?.status === "success" && supportsErc1155.result === true;
  if (isErc721) return "erc721";
  if (isErc1155) return "erc1155";
  // Per-token approvals only exist on ERC-721, so if supportsInterface reverts
  // on an older non-ERC165 ERC-721 we can still honestly narrow the standard.
  if (kind === "tokenApproval") return "erc721";
  return "unknown";
}

export function parseNftValidationResults(
  results: readonly ReadResult[],
  owner: Address,
  chainId: number,
  candidates: readonly NftDiscoveredApproval[],
): NftParseOutput {
  void owner;
  const collections = uniqueCollectionAddresses(candidates);
  const collectionIndex = new Map<string, number>();
  collections.forEach((address, i) => {
    collectionIndex.set(address.toLowerCase(), i);
  });

  const metaOffset = 0;
  const checksOffset = collections.length * METADATA_CALLS_PER_COLLECTION;

  interface CollectionMeta {
    name?: string;
    supportsErc721: ReadResult | undefined;
    supportsErc1155: ReadResult | undefined;
  }

  const collectionMeta = new Map<string, CollectionMeta>();
  collections.forEach((address, i) => {
    const base = metaOffset + i * METADATA_CALLS_PER_COLLECTION;
    const supports721 = results[base];
    const supports1155 = results[base + 1];
    const nameRes = results[base + 2];
    const name =
      nameRes?.status === "success" && typeof nameRes.result === "string"
        ? nameRes.result
        : undefined;
    collectionMeta.set(address.toLowerCase(), {
      name,
      supportsErc721: supports721,
      supportsErc1155: supports1155,
    });
  });

  const approvals: NftApproval[] = [];
  let registryMatched = 0;

  candidates.forEach((candidate, idx) => {
    const liveRes = results[checksOffset + idx];
    if (!liveRes || liveRes.status !== "success") return;

    // Live validation gate. For approvalForAll we expect a boolean true; for
    // per-token ERC-721 we expect the `getApproved` result to equal our
    // candidate operator. Anything else means the approval is no longer live.
    if (candidate.kind === "approvalForAll") {
      if (liveRes.result !== true) return;
    } else {
      if (typeof liveRes.result !== "string") return;
      if (
        liveRes.result.toLowerCase() !==
        candidate.operatorAddress.toLowerCase()
      ) {
        return;
      }
    }

    const meta = collectionMeta.get(candidate.collectionAddress.toLowerCase());
    const standard = detectStandard(
      meta?.supportsErc721,
      meta?.supportsErc1155,
      candidate.kind,
    );

    const registry = getSpenderEntry(chainId, candidate.operatorAddress);
    if (registry) registryMatched += 1;

    const keyParts = [
      chainId.toString(),
      candidate.kind,
      candidate.collectionAddress,
      candidate.operatorAddress,
      candidate.kind === "tokenApproval" ? candidate.tokenId?.toString() : "all",
    ];

    approvals.push({
      key: keyParts.join("-"),
      chainId,
      kind: candidate.kind,
      standard,
      collectionAddress: candidate.collectionAddress,
      collectionName: meta?.name,
      operatorAddress: candidate.operatorAddress,
      operatorLabel: registry?.label ?? "Unknown operator",
      protocol: registry?.protocol ?? "Unknown",
      trusted: registry?.isTrusted ?? false,
      operatorVerificationMethod: registry?.verificationMethod,
      operatorNotes: registry?.notes,
      operatorUrl: registry?.url,
      tokenId: candidate.tokenId,
      risk: classifyNftRisk({
        kind: candidate.kind,
        trusted: registry?.isTrusted ?? false,
      }),
    });
  });

  return {
    approvals,
    stats: {
      candidates: candidates.length,
      active: approvals.length,
      registryMatched,
    },
  };
}

/**
 * Build a contract call that revokes a collection-wide `ApprovalForAll`.
 * Works identically for ERC-721 and ERC-1155.
 */
export function buildSetApprovalForAllRevoke(args: {
  collectionAddress: Address;
  operatorAddress: Address;
}) {
  return {
    address: args.collectionAddress,
    abi: nftRevokeAbi,
    functionName: "setApprovalForAll" as const,
    args: [args.operatorAddress, false] as const,
  };
}

/**
 * Build a contract call that clears an ERC-721 per-token approval by
 * re-approving the zero address. This is the canonical way to revoke a
 * single-token approval on ERC-721 — the caller must still own the NFT
 * or be approved-for-all on the collection, or the transaction will revert.
 */
export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

export function buildErc721TokenRevoke(args: {
  collectionAddress: Address;
  tokenId: bigint;
}) {
  return {
    address: args.collectionAddress,
    abi: nftRevokeAbi,
    functionName: "approve" as const,
    args: [ZERO_ADDRESS, args.tokenId] as const,
  };
}
