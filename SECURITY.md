# Security Policy

Pulse Revoke is public code for a non-custodial approval scanner and revoker.
It is open for review. It does not claim an external audit.

## User Safety Rules

- Use the official site: `pulserevoke.com`.
- Never enter a seed phrase, private key, or mnemonic into Pulse Revoke.
- Review every wallet prompt before signing.
- Cancel if a prompt shows a transfer, swap, bridge, unexpected approval, or
  unexpected contract.
- Verify token, spender, operator, and transaction links on the relevant block
  explorer.

## Write Scope

The intended write scope is limited to approval-clearing calls:

| Approval type | Revoke call |
| --- | --- |
| Fungible token | `approve(spender, 0)` |
| NFT operator | `setApprovalForAll(operator, false)` |
| NFT per-token | `approve(address(0), tokenId)` |

These are real on-chain transactions. They cost gas, and the user's wallet is
the final checkpoint before submission.

## Supported Networks

| Chain | Chain ID | Revoke scope |
| --- | ---: | --- |
| PulseChain | 369 | Wallet-side revoke |
| BNB Smart Chain | 56 | Wallet-side revoke |
| Base | 8453 | Wallet-side revoke |
| Polygon | 137 | Wallet-side revoke |
| Sonic Mainnet | 146 | Wallet-side revoke |
| Avalanche C-Chain | 43114 | Wallet-side revoke |
| Mantle | 5000 | Wallet-side revoke |
| Ethereum Mainnet | 1 | Live-verified rows |
| Arbitrum One | 42161 | ERC-20/NFT verified rows only |
| Optimism / OP Mainnet | 10 | ERC-20/NFT verified rows only |
| HyperEVM | 999 | ERC-20/NFT verified rows only |

Ethereum, Arbitrum, Optimism, and HyperEVM use server-side read-only discovery
routes for approval data and live validation. Revoke remains wallet-side. Those
routes do not sign, relay, or submit transactions.

Source-backed current scope:

- Ethereum Mainnet, chain ID `1`, uses server-read-only discovery and
  wallet-side revoke after live verification.
- Arbitrum One, chain ID `42161`, supports verified ERC-20 and NFT rows only.
- Optimism / OP Mainnet, chain ID `10`, supports verified ERC-20 and NFT rows
  only.
- HyperEVM, chain ID `999`, supports verified ERC-20 and NFT rows only. Gas is
  paid in HYPE.

Address-only scanning is read-only until a connected wallet exactly matches the
scanned owner address and is on the row's chain.

## Reporting Vulnerabilities

If you find a vulnerability, report it through GitHub issues unless a private
contact method is added by the maintainer.

Include:

- a clear description
- steps to reproduce
- expected impact
- relevant file paths or transaction examples, if safe to share

Do not include seed phrases, private keys, mnemonics, or private wallet
material in any report.

## Limits

Explorer APIs and RPC providers can rate-limit, cap, or fail. Pulse Revoke
should surface incomplete discovery or validation instead of showing a false
clear result. Registry labels and token logos are context only; they are not
proof that a spender is safe.
