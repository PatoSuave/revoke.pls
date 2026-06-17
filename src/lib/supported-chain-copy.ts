import {
  SECURITY_CHAIN_STATUS_ROWS,
  type ChainStatusRow,
} from "@/lib/security-content";

const LIVE_CHAIN_DISPLAY_ORDER = [
  "PulseChain",
  "BNB Smart Chain",
  "Base",
  "Polygon",
  "Sonic Mainnet",
  "Avalanche C-Chain",
  "Mantle",
  "Linea",
  "Blast",
  "Berachain",
  "Ethereum Mainnet",
  "Arbitrum One",
  "Optimism",
  "HyperEVM",
] as const;

const COMPACT_CHAIN_NAMES: Record<string, string> = {
  "BNB Smart Chain": "BSC",
  "Sonic Mainnet": "Sonic",
  "Avalanche C-Chain": "Avalanche",
  "Ethereum Mainnet": "Ethereum",
  "Arbitrum One": "Arbitrum",
};

function formatList(items: readonly string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function sortByDisplayOrder(rows: readonly ChainStatusRow[]) {
  return [...rows].sort((left, right) => {
    const leftIndex = LIVE_CHAIN_DISPLAY_ORDER.indexOf(
      left.chain as (typeof LIVE_CHAIN_DISPLAY_ORDER)[number],
    );
    const rightIndex = LIVE_CHAIN_DISPLAY_ORDER.indexOf(
      right.chain as (typeof LIVE_CHAIN_DISPLAY_ORDER)[number],
    );

    const normalizedLeftIndex =
      leftIndex === -1 ? LIVE_CHAIN_DISPLAY_ORDER.length : leftIndex;
    const normalizedRightIndex =
      rightIndex === -1 ? LIVE_CHAIN_DISPLAY_ORDER.length : rightIndex;

    return normalizedLeftIndex - normalizedRightIndex;
  });
}

export const LIVE_SUPPORTED_CHAIN_ROWS = sortByDisplayOrder(
  SECURITY_CHAIN_STATUS_ROWS.filter((row) => row.status === "Live"),
);

export const LIVE_SUPPORTED_CHAIN_NAMES = LIVE_SUPPORTED_CHAIN_ROWS.map(
  (row) => row.chain,
);

export const LIVE_SUPPORTED_CHAIN_LIST = formatList(
  LIVE_SUPPORTED_CHAIN_NAMES,
);

export const LIVE_SUPPORTED_CHAIN_COMPACT_LIST = formatList(
  LIVE_SUPPORTED_CHAIN_NAMES.map(
    (chain) => COMPACT_CHAIN_NAMES[chain] ?? chain,
  ),
);

export const LIVE_SUPPORTED_CHAIN_COUNT = LIVE_SUPPORTED_CHAIN_ROWS.length;

export const VERIFIED_ROW_CHAIN_ROWS = LIVE_SUPPORTED_CHAIN_ROWS.filter(
  (row) => row.revoke === "ERC-20/NFT verified rows only",
);

export const VERIFIED_ROW_CHAIN_LIST = formatList(
  VERIFIED_ROW_CHAIN_ROWS.map((row) => row.chain),
);

export const VERIFIED_ROW_SUPPORT_NOTE = `${VERIFIED_ROW_CHAIN_LIST} support ERC-20 and NFT revoke actions for verified rows only after live verification. Batch revoke is not enabled there.`;

export const HYPEREVM_LIVE_NETWORK_NOTE =
  "HyperEVM is live in Pulse Revoke for approval review without wallet connection and revokes for verified ERC-20 and NFT rows on chain ID 999.";

export function formatRevokeSupport(row: ChainStatusRow) {
  if (row.revoke === "Yes") return "Scan + revoke";
  if (row.revoke === "Yes, for live-verified rows") {
    return "Verified row revoke";
  }

  return row.revoke;
}
