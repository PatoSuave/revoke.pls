# Pulse Revoke

A PulseChain-themed token approval management app inspired by the revoke approval workflow used across EVM chains.

## Purpose

Pulse Revoke helps users:

- Connect their wallet
- Detect ERC-20 token approvals
- View spender contracts
- Review allowance amounts
- Revoke or reduce token approvals safely
- Understand approval risk before signing transactions

## Scope

Initial scope focuses on:

- PulseChain mainnet
- ERC-20 approvals
- Wallet connect
- Token allowance discovery
- Approval revoke flows
- Basic spender labeling
- Risk-oriented UI

Future scope may include:

- NFT approvals
- Batch revoke analysis
- Address labels and trust scoring
- Historical approval activity
- Token and spender verification
- Multi-chain support

## Tech Stack

- Next.js
- TypeScript
- React
- viem
- wagmi
- WalletConnect / injected wallets
- Tailwind CSS
- Vercel deployment

## Core User Flow

1. User connects wallet
2. App scans known token approvals
3. App displays token, spender, and allowance
4. User chooses revoke
5. Wallet prompts for on-chain transaction
6. Approval is set to zero

## Safety Notes

- This app does not custody funds
- Revoking approvals requires on-chain transactions
- Gas fees apply
- Users should verify spender addresses before signing
- This tool is informational and transactional, not financial advice

## Development

```bash
pnpm install
pnpm dev
```

## Environment

Copy `.env.example` to `.env.local` and fill in required values.

## License

MIT
