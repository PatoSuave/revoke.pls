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

export const LIFEBOAT_SPENDER_RISK_DIAGNOSTIC_COPY = {
  title: "Spender contract risk",
  activeStatus: "Read-only contract context",
  body: "This diagnostic checks approval spenders for public contract context such as bytecode presence, verified-source availability, proxy-like metadata, and reviewed registry matches. Unknown or unverified spenders are review signals, not proof of malicious activity.",
} as const;

export const LIFEBOAT_PERMIT2_DIAGNOSTIC_COPY = {
  title: "Permit2 exposure",
  activeStatus: "Read-only delegated allowance check",
  body: "This diagnostic surfaces active Permit2 delegated allowances already live-read by the existing approval scanner. It does not request signatures, sign messages, submit transactions, or claim that missing rows prove the wallet is safe.",
} as const;

export const LIFEBOAT_EIP7702_DIAGNOSTIC_COPY = {
  title: "EIP-7702 delegation",
  activeStatus: "Read-only account-code check",
  body: "This diagnostic reads latest account code on supported networks and checks for the EIP-7702 delegation designator. It does not request signatures, clear delegation, repair accounts, or claim that no delegation means no compromise.",
} as const;

export const LIFEBOAT_DUST_TRAP_DIAGNOSTIC_COPY = {
  title: "Token/NFT dust traps",
  activeStatus: "Read-only metadata safety check",
  body: "This diagnostic reviews bounded inbound token and NFT transfer history for dust or bait signals. It strips URL-like metadata, never fetches arbitrary token-provided websites, and treats suspicious metadata as context rather than proof that an asset is malicious.",
} as const;

export const LIFEBOAT_HEX_STAKE_DIAGNOSTIC_COPY = {
  title: "HEX stake status",
  activeStatus: "Read-only stake diagnostics",
  body: "This diagnostic reads visible open HEX stake rows on PulseChain, classifies active, mature, late, and Good Accounting candidate context, and does not run or prepare End Stake, Emergency End Stake, or Good Accounting.",
} as const;

export const LIFEBOAT_GOOD_ACCOUNTING_ASSIST_COPY = {
  title: "Good Accounting Assist",
  activeStatus: "Clean-wallet assist only",
  body: "This assist layer explains when a visible late HEX stake may be relevant for manual Good Accounting review from a clean wallet. It does not prepare, sign, submit, relay, or simulate a Good Accounting transaction.",
} as const;

export const LIFEBOAT_PLANNED_MODULES = [
  {
    id: "visible-assets",
    title: "Visible assets",
    status: "Planned diagnostic",
    body: "Future versions may summarize visible native, token, and NFT balances where reliable data is available. This version should not claim to show every asset.",
  },
] as const;

// Future Lifeboat phases stay read-only until separately reviewed: manual
// planning reports and any later execution-adjacent education.
export const LIFEBOAT_FUTURE_PHASES = [
  "Manual rescue planning reports",
] as const;
