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
  PulseScan or BscScan.

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

Ethereum is not an active supported product chain.

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
