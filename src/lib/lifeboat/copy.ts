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

export const LIFEBOAT_PLANNED_MODULES = [
  {
    id: "gas-sweeper",
    title: "Possible gas-sweeper activity",
    status: "Planned diagnostic",
    body: "Future versions may check for native gas deposits followed quickly by outgoing transfers, repeated drain recipients, and other sweeper-like patterns. This first version does not confirm or rule out gas sweepers.",
  },
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

// Future Lifeboat phases stay read-only until separately reviewed: sweeper-like
// activity heuristics, HEX stake reads, clean-wallet Good Accounting Assist,
// Permit2 diagnostics, EIP-7702 diagnostics, and manual planning reports.
export const LIFEBOAT_FUTURE_PHASES = [
  "Sweeper-like activity heuristic",
  "HEX stake reads",
  "Good Accounting Assist from a clean wallet",
  "Permit2 diagnostics",
  "EIP-7702 diagnostics",
  "Manual rescue planning reports",
] as const;
