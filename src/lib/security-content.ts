export const OFFICIAL_DOMAIN = "pulserevoke.com";

export const ANTI_PHISHING_COPY =
  "Official site: pulserevoke.com. Pulse Revoke will never ask for your seed phrase or private key. Avoid wallet links from DMs, Telegram, Discord, ads, or misspelled domains.";

export const DATA_MINIMIZATION_COPY =
  "Pulse Revoke does not maintain an application database of scanned wallets or approval history. Scans use public chain data. Configured RPC, explorer, API, wallet, browser, hosting, and network providers may still process normal request metadata.";

export const SECURITY_CAN_DO = [
  "Scan public approval history for the supported EVM networks available in the app.",
  "Check discovered allowances and NFT operator permissions live before showing them as active.",
  "Prepare standard revoke transactions for approvals you choose to clear.",
  "Link tokens, spenders, and transaction hashes to the relevant block explorer for independent review.",
  "Scan a pasted EVM address without connecting a wallet, then keep revoke unavailable until a matching wallet is connected.",
] as const;

export const SECURITY_CANNOT_DO = [
  "Move, bridge, swap, stake, or custody tokens.",
  "Recover stolen assets or reverse transactions that are already on-chain.",
  "Guarantee that every explorer, RPC, wallet, browser, CDN, or hosting provider keeps no logs.",
  "Guarantee a spender or protocol is safe just because a label is shown.",
  "Reduce or bypass network gas fees required for on-chain revoke transactions.",
  "Support Solana revoke flows in the current EVM approval scanner design.",
] as const;

export const WALLET_VERIFICATION_ITEMS = [
  "Official domain is pulserevoke.com with no misspellings or extra words.",
  "Connected chain matches the approval you are reviewing.",
  "Token or NFT collection address matches the asset you expect.",
  "Spender or operator address is the exact contract you intend to clear.",
  "Function name is approve(spender, 0), setApprovalForAll(operator, false), or approve(0x0, tokenId).",
  "Wallet prompt does not show a token transfer, swap, bridge, or unknown approval.",
  "Gas fee is reasonable for the selected chain before you confirm.",
] as const;

export const WALLET_SAFETY_RECOMMENDATIONS = [
  "Bookmark pulserevoke.com and open it from your bookmark instead of from chat links or ads.",
  "Use hardware wallets for long-term holdings when possible.",
  "Consider a separate hot wallet for frequent DeFi interactions.",
  "Disconnect from sites you no longer use and periodically review active approvals.",
  "Treat unknown spenders and unlimited approvals as reasons to slow down and verify on-chain.",
] as const;

export interface ChainStatusRow {
  chain: string;
  chainId: string;
  scan: "Yes" | "No";
  revoke: string;
  status: "Live" | "Read-only" | "Not enabled" | "Not supported";
  note: string;
}

export const SECURITY_CHAIN_STATUS_ROWS: readonly ChainStatusRow[] = [
  {
    chain: "PulseChain",
    chainId: "369",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with revokes through your wallet for PRC-20, ERC-721, and ERC-1155 approvals.",
  },
  {
    chain: "BNB Smart Chain",
    chainId: "56",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with revokes through your wallet and BSC gas guardrails.",
  },
  {
    chain: "Base",
    chainId: "8453",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with Base explorer discovery, live verification, and revokes through your wallet.",
  },
  {
    chain: "Polygon",
    chainId: "137",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with PolygonScan discovery, live verification, and revokes through your wallet.",
  },
  {
    chain: "Sonic Mainnet",
    chainId: "146",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with SonicScan discovery, live verification, and revokes through your wallet. Gas is paid in S.",
  },
  {
    chain: "Avalanche C-Chain",
    chainId: "43114",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with SnowScan discovery, live verification, and revokes through your wallet. Gas is paid in AVAX.",
  },
  {
    chain: "Mantle",
    chainId: "5000",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with Mantle explorer links, live verification, and revokes through your wallet. Gas is paid in MNT.",
  },
  {
    chain: "Linea",
    chainId: "59144",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with LineaScan discovery, live verification, and revokes through your wallet. Gas is paid in ETH.",
  },
  {
    chain: "Blast",
    chainId: "81457",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with Blastscan discovery, live verification, and revokes through your wallet. Gas is paid in ETH.",
  },
  {
    chain: "Berachain",
    chainId: "80094",
    scan: "Yes",
    revoke: "Yes",
    status: "Live",
    note: "Shared scanner with Berascan discovery, live verification, and revokes through your wallet. Gas is paid in BERA.",
  },
  {
    chain: "Ethereum Mainnet",
    chainId: "1",
    scan: "Yes",
    revoke: "Yes, for live-verified rows",
    status: "Live",
    note: "Uses hosted approval discovery plus live RPC validation. Revoke is available through your wallet only after row verification, matching wallet, and correct chain checks pass.",
  },
  {
    chain: "Arbitrum One",
    chainId: "42161",
    scan: "Yes",
    revoke: "ERC-20/NFT verified rows only",
    status: "Live",
    note: "Hosted approval discovery and live verification. Revoke is available per row for verified ERC-20 and NFT approvals. Batch revoke is not enabled on Arbitrum.",
  },
  {
    chain: "Optimism",
    chainId: "10",
    scan: "Yes",
    revoke: "ERC-20/NFT verified rows only",
    status: "Live",
    note: "Hosted approval discovery and live verification for OP Mainnet. Revoke is available per row for verified ERC-20 and NFT approvals. Batch revoke is not enabled on Optimism.",
  },
  {
    chain: "HyperEVM",
    chainId: "999",
    scan: "Yes",
    revoke: "ERC-20/NFT verified rows only",
    status: "Live",
    note: "Hosted approval discovery and live verification for HyperEVM. Revoke is available per row for verified ERC-20 and NFT approvals. Batch revoke is not enabled on HyperEVM. Gas is paid in HYPE.",
  },
  {
    chain: "Solana",
    chainId: "N/A",
    scan: "No",
    revoke: "No",
    status: "Not supported",
    note: "Solana approval mechanics need a separate design and are not supported by the current EVM revoke flow.",
  },
] as const;
