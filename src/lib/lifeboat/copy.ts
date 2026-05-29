export const LIFEBOAT_ROUTE = "/app/wallet-lifeboat";

export const LIFEBOAT_CRITICAL_WARNINGS = [
  "Never enter your seed phrase or private key anywhere.",
  "This Wallet Lifeboat scan is read-only and does not move assets or submit transactions.",
  "Do not add gas to a wallet you believe is compromised until you review the risks.",
  "Revoking approvals may reduce spender risk, but it does not secure a wallet if the seed phrase or private key is compromised.",
] as const;

export const LIFEBOAT_NOT_TO_DO = [
  "Do not fund the wallet until you understand whether sweeper-like activity may exist.",
  "Do not share wallet secrets with anyone.",
  "Do not trust recovery offers that ask for a seed phrase, private key, keystore, wallet password, remote desktop access, or screenshots of wallet backups.",
  "Do not treat a missing approval result as proof that the wallet is clean.",
] as const;

export const LIFEBOAT_NEXT_STEPS = [
  "Review active approvals and unknown spenders.",
  "Use the standard scanner only when you are ready to revoke from the matching wallet.",
  "Use a clean wallet for future activity if the original wallet secret may be compromised.",
  "Verify important token, spender, NFT, and transaction details directly on the relevant explorer.",
] as const;

export const LIFEBOAT_SWEEPER_DIAGNOSTIC_COPY = {
  title: "Possible gas-sweeper activity",
  activeStatus: "Read-only heuristic",
  body: "This diagnostic checks recent normal native-token transfers for gas deposits followed quickly by outgoing native transfers. It does not confirm an attacker and does not rule out sweepers that use private relays, token transfers, internal calls, or unindexed activity.",
} as const;

export const LIFEBOAT_PENDING_NONCE_DIAGNOSTIC_COPY = {
  title: "Pending transaction activity",
  activeStatus: "Read-only nonce check",
  body: "This diagnostic compares the latest and pending nonce reported by the selected network RPC. A pending nonce gap can mean the wallet already has one or more transactions waiting, but this check cannot see every private, dropped, replaced, or unindexed transaction.",
} as const;

export const LIFEBOAT_TIMELINE_DIAGNOSTIC_COPY = {
  title: "Approval-to-drain timeline",
  activeStatus: "Read-only visible sequence",
  body: "This diagnostic builds a bounded timeline from recent public explorer data, looking for approval-like calls followed by outbound native or token movement. It can show visible ordering, but it does not prove causation or identify an attacker.",
} as const;

export const LIFEBOAT_ADDRESS_POISONING_DIAGNOSTIC_COPY = {
  title: "Address poisoning signals",
  activeStatus: "Read-only lookalike heuristic",
  body: "This diagnostic compares recent inbound counterparties against outbound addresses from the bounded history window. Similar prefix and suffix matches can be address-poisoning context, but they are not proof of attacker control or intent.",
} as const;

export const LIFEBOAT_PLANNED_MODULES = [
  {
    id: "hex",
    title: "HEX Lifeboat",
    status: "Planned diagnostic",
    body: "Future versions may read HEX stake status for the scanned address, including active stakes, mature stakes, late stakes, and possible Good Accounting candidates. This version does not run End Stake, Emergency End Stake, or Good Accounting.",
  },
  {
    id: "permit2",
    title: "Permit2 / signature approvals",
    status: "Planned diagnostic",
    body: "Signature-based or Permit2-style permissions may not appear in standard ERC-20 allowance scans. Future versions may add dedicated Permit2 diagnostics where supported.",
  },
  {
    id: "eip7702",
    title: "EIP-7702 delegation",
    status: "Planned diagnostic",
    body: "Future versions may check whether an externally owned account has active delegation code on supported chains. This version does not confirm or clear EIP-7702 delegation risk.",
  },
  {
    id: "visible-assets",
    title: "Visible assets",
    status: "Planned diagnostic",
    body: "Future versions may summarize visible native, token, and NFT balances where reliable data is available. This version should not claim to show every asset.",
  },
] as const;

// Future Lifeboat phases stay read-only until separately reviewed: HEX stake
// reads, clean-wallet Good Accounting Assist, Permit2 diagnostics, EIP-7702
// diagnostics, and manual planning reports.
export const LIFEBOAT_FUTURE_PHASES = [
  "HEX stake reads",
  "Good Accounting Assist from a clean wallet",
  "Permit2 diagnostics",
  "EIP-7702 diagnostics",
  "Manual rescue planning reports",
] as const;
