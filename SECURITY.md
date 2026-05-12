# Security Policy

Pulse Revoke is public code for a non-custodial approval scanner and revoker.
It is open for review, but it is not claiming an external audit.

## User Safety Rules

- Never enter a seed phrase into Pulse Revoke.
- Never paste a private key into Pulse Revoke.
- The app does not need custody of funds.
- The app does not need token transfers to revoke approvals.
- Always verify the connected site URL before connecting a wallet.
- Always review transaction details in your wallet before signing.
- When unsure, verify token, spender, operator, and transaction links on
  PulseScan, BscScan, BaseScan, Etherscan, Arbiscan, or Optimistic Etherscan.

## What Revoke Transactions Do

The intended write scope is limited to approval-clearing calls:

- Fungible token approvals: `approve(spender, 0)`
- NFT operator approvals: `setApprovalForAll(operator, false)`
- NFT per-token approvals: `approve(address(0), tokenId)`

These transactions are meant to reduce or clear approval permissions. They are
still real on-chain transactions, they cost gas, and the wallet prompt is the
final source of truth before signing.

## Supported Networks

Current active supported networks:

- PulseChain, chain ID `369`
- BSC / BNB Smart Chain, chain ID `56`
- Base, chain ID `8453`
- Ethereum Mainnet, chain ID `1`
- Arbitrum One, chain ID `42161`, verified ERC-20 and NFT rows only
- Optimism / OP Mainnet, chain ID `10`, verified NFT rows only

Ethereum server-read-only discovery uses an API for historical logs and live RPC
validation. Ethereum revoke transactions are still wallet-side only: there is
no server-side signing, private key handling, relayer, or API route transaction
submission. Ethereum wallet-side revoke remains protected by owner, chain,
preflight, gas, and row-level verification gates.

Arbitrum One server-read-only discovery uses `/api/arbitrum/approvals` for
historical logs and live RPC validation. Arbitrum ERC-20 and NFT row revoke is
wallet-side only after owner, chain, preflight, and row-level verification gates
pass. Arbitrum batch revoke is not enabled, and there is no server-side signing,
private key handling, relayer, or API route transaction submission.

Optimism server-side discovery uses `/api/optimism/approvals` for historical
logs and live RPC validation. Optimism NFT row revoke is wallet-side only after
owner, chain, preflight, and row-level verification gates pass. Optimism ERC-20,
batch, and global revoke are not enabled, and there is no server-side signing,
private key handling, relayer, or API route transaction submission.

Address-only scanning is read-only until a connected wallet exactly matches the
scanned owner address and is on the row's chain.

## Reporting Vulnerabilities

If you find a vulnerability, please report it through GitHub issues for this
repository unless a private contact method is added by the maintainer.

When reporting, include:

- A clear description of the issue
- Steps to reproduce
- Expected impact
- Relevant file paths or transaction examples if safe to share

Do not include seed phrases, private keys, or private wallet material in any
report.

## Scope Notes

Explorer APIs and RPC providers can rate-limit, cap, or fail. Pulse Revoke
should surface incomplete discovery or validation rather than displaying a false
"clear" result. Registry labels are enrichment only and are not proof that a
spender is safe.

CSP tightening is tracked as a separate report-only hardening pass. Wallet apps
can break if `connect-src`, `frame-src`, or script policies are narrowed without
connector-specific testing.
