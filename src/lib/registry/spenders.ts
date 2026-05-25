import type { Address } from "viem";

import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
} from "@/lib/chains";
import { PERMIT2_ADDRESS } from "@/lib/permit2";

import { validateAddresses, validateRequiredStrings } from "./validate";

export const ETHEREUM_MAINNET_CHAIN_ID = 1;
export const OPTIMISM_CHAIN_ID = 10;
export const ARBITRUM_ONE_CHAIN_ID = 42161;
export const LIBERTYSWAP_SOURCE_LABEL = "Official LibertySwap docs";
export const LIBERTYSWAP_SOURCE_URL =
  "https://docs.libertyswap.finance/liberty-swap-2.0/cross-chain-swaps";
export const LIBERTYSWAP_LEGACY_NOTE =
  "This appears in LibertySwap's old-address list. Review whether this approval is still needed.";
export const UNISWAP_DEPLOYMENTS_SOURCE_URL =
  "https://developers.uniswap.org/docs/protocols/v4/deployments";
const PERMIT2_DOCS_URL = "https://docs.uniswap.org/contracts/permit2/overview";

/**
 * Functional classification for a spender contract. Drives optional UI
 * badges and is available to future risk rules (e.g. "unlimited approvals
 * on a bridge deserve extra caution"). Keep this union small and factual —
 * if you are not sure, use `"unknown"`.
 *
 *   router    — DEX router / swap aggregator entry contract
 *   dex       — DEX pair, LBP, or order-book contract
 *   bridge    — cross-chain bridge contract
 *   staking   — single-sided staking contract
 *   farm      — LP staking / yield farm contract
 *   permit2   — canonical Permit2 approval router
 *   unknown   — no category claim made
 */
export type SpenderCategory =
  | "router"
  | "dex"
  | "bridge"
  | "staking"
  | "farm"
  | "permit2"
  | "unknown";

export type SpenderContractStatus = "current" | "legacy";

export interface SpenderProtocolMetadata {
  protocolName: string;
  contractStatus: SpenderContractStatus;
  sourceLabel: string;
  sourceUrl: string;
  assetLabel?: string;
  note?: string;
}

/**
 * Metadata for a known spender contract.
 *
 * Entries are keyed by `(chainId, address)` so the same address can refer
 * to different spenders on different chains. Do not reuse a PulseChain entry
 * to label a look-alike spender on another chain without explicit
 * verification on each chain.
 *
 * `label` is the display name for a specific contract (e.g. "PulseX Router v2").
 * `protocol` groups related contracts (e.g. all PulseX addresses share
 * protocol "PulseX"); `protocolSlug` is a short machine-friendly identifier
 * for URLs/badges.
 *
 * `isTrusted` is an explicit, conservative flag. It is only `true` when the
 * address has been manually cross-checked against the protocol's official
 * source and the contract is considered canonical. It is **not** a general
 * safety rating — it simply means "this address is known". A trusted
 * spender with an unlimited allowance is still worth reviewing.
 *
 * Provenance fields (`verificationMethod`, `source`, `lastReviewed`) are
 * **factual only**. Leave them absent rather than guessing. See
 * `src/lib/registry/README.md` for the review workflow.
 */
export interface SpenderEntry {
  chainId: number;
  address: Address;
  label: string;
  protocol: string;
  protocolSlug?: string;
  category: SpenderCategory;
  isTrusted: boolean;
  url?: string;
  notes?: string;
  /** How the address was verified (e.g. "Manual PulseScan cross-check"). */
  verificationMethod?: string;
  /** Source the address was pulled from (docs URL, official tweet, etc). */
  source?: string;
  /** Optional protocol provenance shown in approval-card readability panels. */
  protocolMetadata?: SpenderProtocolMetadata;
  /** Free-form note about when/how the entry was last reviewed. Leave
   *  absent if unknown — do not fabricate dates. */
  lastReviewed?: string;
}

function libertySwapMetadata(
  contractStatus: SpenderContractStatus,
  assetLabel?: string,
): SpenderProtocolMetadata {
  return {
    protocolName: "LibertySwap",
    contractStatus,
    sourceLabel: LIBERTYSWAP_SOURCE_LABEL,
    sourceUrl: LIBERTYSWAP_SOURCE_URL,
    ...(assetLabel ? { assetLabel } : {}),
    ...(contractStatus === "legacy" ? { note: LIBERTYSWAP_LEGACY_NOTE } : {}),
  };
}

function libertySwapEntry({
  chainId,
  address,
  contractStatus,
  assetLabel,
}: {
  chainId: number;
  address: Address;
  contractStatus: SpenderContractStatus;
  assetLabel?: string;
}): SpenderEntry {
  return {
    chainId,
    address,
    label: assetLabel
      ? `LibertySwap ${assetLabel}`
      : "LibertySwap legacy contract",
    protocol: "LibertySwap",
    protocolSlug: "libertyswap",
    category: "bridge",
    isTrusted: true,
    url: LIBERTYSWAP_SOURCE_URL,
    notes:
      contractStatus === "legacy"
        ? LIBERTYSWAP_LEGACY_NOTE
        : "Current LibertySwap contract listed in the official cross-chain swaps docs.",
    verificationMethod:
      "Matched chain-scoped address against LibertySwap's official cross-chain swaps docs.",
    source: LIBERTYSWAP_SOURCE_URL,
    protocolMetadata: libertySwapMetadata(contractStatus, assetLabel),
  };
}

function permit2MetadataEntry({
  chainId,
  officialDeployment,
}: {
  chainId: number;
  officialDeployment: boolean;
}): SpenderEntry {
  return {
    chainId,
    address: PERMIT2_ADDRESS,
    label: "Permit2",
    protocol: officialDeployment ? "Uniswap" : "Permit2-compatible",
    protocolSlug: "permit2",
    category: "permit2",
    isTrusted: officialDeployment,
    url: PERMIT2_DOCS_URL,
    notes: officialDeployment
      ? "Canonical Permit2 contract listed in Uniswap deployment docs. A Permit2 token approval can delegate signed sub-approvals, so review it periodically."
      : "Permit2-compatible contract present at the forked canonical address on PulseChain. PulseChain is not listed in Uniswap official deployments, so verify before trusting it.",
    verificationMethod: officialDeployment
      ? "Matched chain-scoped address against Uniswap deployment docs and live runtime bytecode."
      : "Verified runtime bytecode exists at the canonical Permit2 address on PulseChain; Uniswap official deployments do not list PulseChain.",
    ...(officialDeployment ? { source: UNISWAP_DEPLOYMENTS_SOURCE_URL } : {}),
  };
}

/**
 * Curated PulseChain spender registry. Every entry has been manually
 * cross-checked on https://scan.pulsechain.com against the protocol's own
 * published documentation. `isTrusted: true` is used conservatively and
 * **only** means the address is confirmed canonical for the labeled
 * protocol — not that interacting with the protocol is risk-free.
 */
export const PULSECHAIN_SPENDER_REGISTRY: readonly SpenderEntry[] = [
  {
    chainId: PULSECHAIN_CHAIN_ID,
    address: "0x165C3410fC91EF562C50559f7d2289fEbed552d9",
    label: "PulseX Router v2",
    protocol: "PulseX",
    protocolSlug: "pulsex",
    category: "router",
    isTrusted: true,
    url: "https://pulsex.com",
    notes: "Canonical PulseX v2 router. Wraps swap, addLiquidity, removeLiquidity.",
    verificationMethod:
      "Manual PulseScan cross-check against pulsex.com documentation.",
    source: "https://pulsex.com",
  },
  {
    chainId: PULSECHAIN_CHAIN_ID,
    address: "0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02",
    label: "PulseX Router v1",
    protocol: "PulseX",
    protocolSlug: "pulsex",
    category: "router",
    isTrusted: true,
    url: "https://pulsex.com",
    notes: "Legacy PulseX v1 router. Still holds live approvals for older positions.",
    verificationMethod:
      "Manual PulseScan cross-check against pulsex.com documentation.",
    source: "https://pulsex.com",
  },
] as const;

/** BSC spender labels start empty by design. Add only manually verified entries. */
export const BSC_SPENDER_REGISTRY: readonly SpenderEntry[] = [] as const;

/** Base spender labels start empty by design. Add only manually verified entries. */
export const BASE_SPENDER_REGISTRY: readonly SpenderEntry[] = [] as const;

const LIBERTYSWAP_PULSECHAIN_SPENDER_METADATA_REGISTRY: readonly SpenderEntry[] = [
  libertySwapEntry({
    chainId: PULSECHAIN_CHAIN_ID,
    address: "0xe7EE706a6708b691a232452c9cb267d186942F09",
    contractStatus: "current",
    assetLabel: "USDC",
  }),
  libertySwapEntry({
    chainId: PULSECHAIN_CHAIN_ID,
    address: "0x80C2C603d72ea17A0D85B670D4489eB3012035Cd",
    contractStatus: "current",
    assetLabel: "WETH",
  }),
  libertySwapEntry({
    chainId: PULSECHAIN_CHAIN_ID,
    address: "0x8dC4aBf5Bc294dEF5c4bB1D3398528D28f714416",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: PULSECHAIN_CHAIN_ID,
    address: "0xC1fBB3a198917FF62342d2D00407Eab56Ee4c99A",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: PULSECHAIN_CHAIN_ID,
    address: "0x0E0eDDaE092176d851d5C70A49b5d83e2510e72f",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: PULSECHAIN_CHAIN_ID,
    address: "0x63F334D054236e51C241E0bf6b095E67448A4366",
    contractStatus: "legacy",
  }),
] as const;

const LIBERTYSWAP_BASE_SPENDER_METADATA_REGISTRY: readonly SpenderEntry[] = [
  libertySwapEntry({
    chainId: BASE_CHAIN_ID,
    address: "0x8871de4668D3CF1FB7F93Baf4a78FEB0d1E13869",
    contractStatus: "current",
    assetLabel: "USDC",
  }),
  libertySwapEntry({
    chainId: BASE_CHAIN_ID,
    address: "0x59deC8b4733F333937039ca2d171c87Ff4590429",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: BASE_CHAIN_ID,
    address: "0xC1fBB3a198917FF62342d2D00407Eab56Ee4c99A",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: BASE_CHAIN_ID,
    address: "0x1A19B9f2687C390a130a261d1E9f0B34f5ABf312",
    contractStatus: "legacy",
  }),
] as const;

const LIBERTYSWAP_BSC_SPENDER_METADATA_REGISTRY: readonly SpenderEntry[] = [
  libertySwapEntry({
    chainId: BSC_CHAIN_ID,
    address: "0x43f403972080406e3e6602793A5072DBc4389bAb",
    contractStatus: "current",
    assetLabel: "USDC",
  }),
  libertySwapEntry({
    chainId: BSC_CHAIN_ID,
    address: "0xc438D51F296fF3e53d061293D2bC4Bb9fb2f7f19",
    contractStatus: "current",
    assetLabel: "USDT",
  }),
  libertySwapEntry({
    chainId: BSC_CHAIN_ID,
    address: "0xA5ebb6f9329096465EE4Ba3DB7b04f0fBf5CB2d4",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: BSC_CHAIN_ID,
    address: "0xA377f83BB5F63cb03f1ED7F9C1edB4BEC8db9CBC",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: BSC_CHAIN_ID,
    address: "0x36eF9AC33A138D6b5452fd6211f23bBb51c889c6",
    contractStatus: "legacy",
  }),
] as const;

const LIBERTYSWAP_ARBITRUM_SPENDER_METADATA_REGISTRY: readonly SpenderEntry[] = [
  libertySwapEntry({
    chainId: ARBITRUM_ONE_CHAIN_ID,
    address: "0x05216280d45Bb8E8dcb863186E4762090bab7b6F",
    contractStatus: "current",
    assetLabel: "USDC",
  }),
  libertySwapEntry({
    chainId: ARBITRUM_ONE_CHAIN_ID,
    address: "0x895BaDA008609619394107AaBD81bDb611DFB4ed",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: ARBITRUM_ONE_CHAIN_ID,
    address: "0xfFf6bf6a8B42B3A4ba833FD3A0875154B885D4fc",
    contractStatus: "legacy",
  }),
] as const;

const LIBERTYSWAP_ETHEREUM_SPENDER_METADATA_REGISTRY: readonly SpenderEntry[] = [
  libertySwapEntry({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0x06291eeE038e94E8DEC2b3bfB6e030c0b5615506",
    contractStatus: "current",
    assetLabel: "USDC",
  }),
  libertySwapEntry({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0x12352B55e0b4305Dd83A349A5d7845bE9B5a2Eea",
    contractStatus: "current",
    assetLabel: "USDT",
  }),
  libertySwapEntry({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0xAA7a195D69327a894eeb969D3bCb89116FC78A14",
    contractStatus: "current",
    assetLabel: "DAI",
  }),
  libertySwapEntry({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0x60FDAf9198eFCD6fAF27D50E955e1A42905f2eeb",
    contractStatus: "current",
    assetLabel: "ETH",
  }),
  libertySwapEntry({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0x317DD5Ab50C6948f6486b9Ed65c4Ba1eb678a529",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0xA06Bb3F88c3F4A8D92342799dC2D27Ba12174315",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0x79e5EBA07ccBf03506c871f6114a112f3A879418",
    contractStatus: "legacy",
  }),
  libertySwapEntry({
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0xFfCA0FebFc9B9C73dB9e2b2C5FA453656668a402",
    contractStatus: "legacy",
  }),
] as const;

/**
 * Ethereum mainnet spender registry used as enrichment only. Discovery and
 * revoke safety still come from live API/RPC validation and wallet gates.
 */
export const MAINNET_SPENDER_REGISTRY: readonly SpenderEntry[] = [
  {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    label: "Uniswap V2 Router 02",
    protocol: "Uniswap",
    protocolSlug: "uniswap",
    category: "router",
    isTrusted: true,
    url: "https://uniswap.org",
    notes: "Canonical Uniswap V2 router (router02). Long-lived and widely approved.",
    verificationMethod:
      "Manual Etherscan cross-check against Uniswap deployments docs.",
    source: "https://docs.uniswap.org",
  },
  {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    label: "Uniswap V3 SwapRouter",
    protocol: "Uniswap",
    protocolSlug: "uniswap",
    category: "router",
    isTrusted: true,
    url: "https://uniswap.org",
    notes: "Canonical Uniswap V3 SwapRouter. Original v3 router address.",
    verificationMethod:
      "Manual Etherscan cross-check against Uniswap v3-periphery deployments.",
    source: "https://docs.uniswap.org",
  },
  {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
    label: "Uniswap V3 SwapRouter02",
    protocol: "Uniswap",
    protocolSlug: "uniswap",
    category: "router",
    isTrusted: true,
    url: "https://uniswap.org",
    notes:
      "Uniswap V3 SwapRouter02 (v3 with v2 compatibility). Common approval target for v3 swaps.",
    verificationMethod:
      "Manual Etherscan cross-check against Uniswap swap-router-contracts deployments.",
    source: "https://docs.uniswap.org",
  },
  {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: PERMIT2_ADDRESS,
    label: "Permit2",
    protocol: "Uniswap",
    protocolSlug: "permit2",
    category: "permit2",
    isTrusted: true,
    url: PERMIT2_DOCS_URL,
    notes:
      "Canonical Permit2 contract listed in Uniswap deployment docs. A Permit2 token approval can delegate signed sub-approvals, so review it periodically.",
    verificationMethod:
      "Matched chain-scoped address against Uniswap deployment docs and live runtime bytecode.",
    source: UNISWAP_DEPLOYMENTS_SOURCE_URL,
  },
  {
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    address: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    label: "Uniswap V3 NonfungiblePositionManager",
    protocol: "Uniswap",
    protocolSlug: "uniswap",
    category: "dex",
    isTrusted: true,
    url: "https://uniswap.org",
    notes:
      "Uniswap V3 position manager. Receives token approvals when minting/adjusting concentrated-liquidity positions.",
    verificationMethod:
      "Manual Etherscan cross-check against Uniswap v3-periphery deployments.",
    source: "https://docs.uniswap.org",
  },
] as const;

/** Combined flat view used for chain-scoped lookup. Includes dormant entries. */
export const SPENDER_REGISTRY: readonly SpenderEntry[] = [
  ...PULSECHAIN_SPENDER_REGISTRY,
  ...BSC_SPENDER_REGISTRY,
  ...BASE_SPENDER_REGISTRY,
  ...MAINNET_SPENDER_REGISTRY,
] as const;

export const LIBERTYSWAP_SPENDER_METADATA_REGISTRY: readonly SpenderEntry[] = [
  ...LIBERTYSWAP_PULSECHAIN_SPENDER_METADATA_REGISTRY,
  ...LIBERTYSWAP_BASE_SPENDER_METADATA_REGISTRY,
  ...LIBERTYSWAP_BSC_SPENDER_METADATA_REGISTRY,
  ...LIBERTYSWAP_ARBITRUM_SPENDER_METADATA_REGISTRY,
  ...LIBERTYSWAP_ETHEREUM_SPENDER_METADATA_REGISTRY,
] as const;

export const PERMIT2_SPENDER_METADATA_REGISTRY: readonly SpenderEntry[] = [
  permit2MetadataEntry({
    chainId: PULSECHAIN_CHAIN_ID,
    officialDeployment: false,
  }),
  permit2MetadataEntry({
    chainId: BSC_CHAIN_ID,
    officialDeployment: true,
  }),
  permit2MetadataEntry({
    chainId: BASE_CHAIN_ID,
    officialDeployment: true,
  }),
  permit2MetadataEntry({
    chainId: POLYGON_CHAIN_ID,
    officialDeployment: true,
  }),
  permit2MetadataEntry({
    chainId: ARBITRUM_ONE_CHAIN_ID,
    officialDeployment: true,
  }),
  permit2MetadataEntry({
    chainId: OPTIMISM_CHAIN_ID,
    officialDeployment: true,
  }),
] as const;

/**
 * Label/enrichment registry. Metadata-only entries here do not expand the
 * registry-constrained scanner target list returned by `getSpendersForChain`.
 */
export const SPENDER_METADATA_REGISTRY: readonly SpenderEntry[] = [
  ...SPENDER_REGISTRY,
  ...LIBERTYSWAP_SPENDER_METADATA_REGISTRY,
  ...PERMIT2_SPENDER_METADATA_REGISTRY,
] as const;

// Dev-time sanity checks. Scoped per chain so that the same address appearing
// on two chains (legitimate) does not trip the duplicate-address check.
validateAddresses(PULSECHAIN_SPENDER_REGISTRY, "SPENDER_REGISTRY[pulsechain]");
validateAddresses(BSC_SPENDER_REGISTRY, "SPENDER_REGISTRY[bsc]");
validateAddresses(BASE_SPENDER_REGISTRY, "SPENDER_REGISTRY[base]");
validateAddresses(MAINNET_SPENDER_REGISTRY, "SPENDER_REGISTRY[mainnet]");
validateAddresses(
  LIBERTYSWAP_PULSECHAIN_SPENDER_METADATA_REGISTRY,
  "LIBERTYSWAP_SPENDER_METADATA_REGISTRY[pulsechain]",
);
validateAddresses(
  LIBERTYSWAP_BASE_SPENDER_METADATA_REGISTRY,
  "LIBERTYSWAP_SPENDER_METADATA_REGISTRY[base]",
);
validateAddresses(
  LIBERTYSWAP_BSC_SPENDER_METADATA_REGISTRY,
  "LIBERTYSWAP_SPENDER_METADATA_REGISTRY[bsc]",
);
validateAddresses(
  LIBERTYSWAP_ARBITRUM_SPENDER_METADATA_REGISTRY,
  "LIBERTYSWAP_SPENDER_METADATA_REGISTRY[arbitrum]",
);
validateAddresses(
  LIBERTYSWAP_ETHEREUM_SPENDER_METADATA_REGISTRY,
  "LIBERTYSWAP_SPENDER_METADATA_REGISTRY[ethereum]",
);
for (const [chainId, label] of [
  [PULSECHAIN_CHAIN_ID, "pulsechain"],
  [BSC_CHAIN_ID, "bsc"],
  [BASE_CHAIN_ID, "base"],
  [POLYGON_CHAIN_ID, "polygon"],
  [ARBITRUM_ONE_CHAIN_ID, "arbitrum"],
  [OPTIMISM_CHAIN_ID, "optimism"],
] as const) {
  validateAddresses(
    PERMIT2_SPENDER_METADATA_REGISTRY.filter((entry) => entry.chainId === chainId),
    `PERMIT2_SPENDER_METADATA_REGISTRY[${label}]`,
  );
}
for (const s of SPENDER_METADATA_REGISTRY) {
  validateRequiredStrings(
    s as unknown as Record<string, unknown>,
    ["label", "protocol", "category"],
    "SPENDER_METADATA_REGISTRY",
    `${s.chainId}:${s.address}`,
  );
}
