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

Requires Node.js 18.18+ (Node 20 recommended).

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Other scripts:

```bash
npm run build      # production build
npm run start      # run the production build
npm run lint       # next lint
npm run typecheck  # tsc --noEmit
```

## Deployment

This project is Vercel-ready. Import the repo at
https://vercel.com/new and Vercel will auto-detect Next.js and use
`npm run build`. No additional environment variables are required for
the default public RPC.

## Environment

Copy `.env.example` to `.env.local` if you want to override defaults.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_PULSECHAIN_RPC_URL` | No | Override the default PulseChain RPC (`https://rpc.pulsechain.com`) for both viem reads and the wagmi transport. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No | Enables the WalletConnect option in the connect menu (QR pairing for mobile wallets). Obtain a free project ID at [cloud.reown.com](https://cloud.reown.com). When unset, only the injected wallet option is shown — the app still runs. |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical public URL used by SEO metadata, Open Graph, and Twitter cards (e.g. `https://pulse-revoke.app`). Defaults to the placeholder in `src/lib/site.ts`. Set this in production so social previews and `rel="canonical"` resolve correctly. |

## Project Structure

```
src/
  app/
    layout.tsx            # root layout, metadata, providers mount point
    page.tsx              # homepage composed of sections
    globals.css           # Tailwind layers + pulse utilities
  components/
    providers.tsx         # wagmi + react-query providers
    connect-wallet-button.tsx  # connect menu (injected + optional WalletConnect)
    pulse-mark.tsx
    sections/
      site-header.tsx
      hero.tsx
      approval-scanner.tsx  # placeholder scanner UI
      trust-safety.tsx
      site-footer.tsx
  lib/
    chains.ts             # PulseChain viem chain definition
    wagmi.ts              # wagmi config (PulseChain + injected)
    format.ts             # small formatting helpers
```

## License

MIT
