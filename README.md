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

Pulse Revoke currently covers:

- PulseChain mainnet (chainId 369)
- Ethereum mainnet (chainId 1)
- ERC-20 approval discovery, risk scoring, and single / batch revoke
- NFT approval discovery for ERC-721 and ERC-1155 (`ApprovalForAll`
  plus ERC-721 per-token approvals), with single revoke
- Discovery-first pipeline over a Blockscout-compatible explorer API,
  with live on-chain re-validation via Multicall3
- Curated registry enrichment for known spenders and operators
- Injected wallets + optional WalletConnect v2 connector

Out of scope for the current release:

- Backend, database, or analytics
- Batch revoke for NFTs
- Historical activity feeds beyond what the explorer surfaces

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

1. User connects a wallet on PulseChain or Ethereum
2. App discovers ERC-20 `Approval` and NFT `ApprovalForAll` / per-token
   `Approval` events from the wallet's on-chain history
3. App re-validates every candidate live via Multicall3 and enriches
   known spenders/operators from the curated registry
4. App displays token/collection, spender/operator, allowance or
   approval type, and a three-tier risk assessment
5. User picks a single revoke or a sequential ERC-20 batch revoke
6. Wallet prompts once per revoke; allowances are set to zero and
   NFT operators are cleared on-chain

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

For the production domain `revoke.pls`, set `NEXT_PUBLIC_SITE_URL=https://revoke.pls`
in your Vercel project environment so canonical URLs, Open Graph, and Twitter
cards resolve against the real origin. Preview/staging deploys should set it
to the preview origin to avoid advertising the production canonical.

### Favicon, app icon, and Open Graph image

The favicon, Apple touch icon, and Open Graph image are generated at runtime
via Next.js file-based metadata routes, backed by `next/og` `ImageResponse`:

- `src/app/icon.tsx` → `/icon` (32×32 favicon)
- `src/app/apple-icon.tsx` → `/apple-icon` (180×180 touch icon)
- `src/app/opengraph-image.tsx` → `/opengraph-image` (1200×630 social card)

All three read brand colors from `siteConfig.brandColors` in `src/lib/site.ts`,
so brand updates happen in one place. No static assets need to be placed in
`public/` for these to work.

If you'd rather override with a static PNG, drop files at `public/icon.png`,
`public/apple-icon.png`, and `public/opengraph-image.png` — Next.js will prefer
the static file over the route when both exist.

## Environment

Copy `.env.example` to `.env.local` if you want to override defaults.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_PULSECHAIN_RPC_URL` | No | Override the default PulseChain RPC (`https://rpc.pulsechain.com`) for both viem reads and the wagmi transport. |
| `NEXT_PUBLIC_MAINNET_RPC_URL` | No | Override Ethereum mainnet RPC for wagmi/viem reads. Defaults to viem's mainnet transport; set a private RPC for higher reliability. |
| `NEXT_PUBLIC_PULSECHAIN_EXPLORER_API` | No | Override the PulseChain discovery API (`https://api.scan.pulsechain.com/api`). Must support Etherscan-compatible `logs/getLogs` topic filters. |
| `NEXT_PUBLIC_MAINNET_EXPLORER_API` | No | Override Ethereum discovery API. Default is `https://api.etherscan.io/v2/api` when an Etherscan key is set, otherwise `https://eth.blockscout.com/api`. Custom overrides are treated as generic Etherscan-compatible APIs (no forced `chainid=1` query param). |
| `NEXT_PUBLIC_ETHERSCAN_API_KEY` | No (strongly recommended) | Optional API key for Ethereum discovery. When set, Ethereum discovery uses Etherscan v2; when omitted, it falls back to Blockscout. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No | Enables the WalletConnect option in the connect menu (QR pairing for mobile wallets). Obtain a free project ID at [cloud.reown.com](https://cloud.reown.com). When unset, only the injected wallet option is shown — the app still runs. |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical public URL used by SEO metadata, Open Graph, and Twitter cards. Defaults to `https://revoke.pls`. Set to your own origin for preview/staging deploys so previews do not advertise the production canonical. |

## Project Structure

```
src/
  app/
    layout.tsx            # root layout + metadata (title, OG, Twitter, canonical)
    page.tsx              # homepage: Hero → Scanner → How it works → Safety → FAQ
    globals.css           # Tailwind layers + pulse utilities
    icon.tsx              # 32×32 favicon (ImageResponse)
    apple-icon.tsx        # 180×180 Apple touch icon (ImageResponse)
    opengraph-image.tsx   # 1200×630 social card (ImageResponse)
    robots.ts             # /robots.txt generated from siteConfig
    sitemap.ts            # /sitemap.xml generated from siteConfig
  components/
    providers.tsx            # wagmi + react-query providers
    connect-wallet-button.tsx # connect menu (injected + optional WalletConnect)
    pulse-mark.tsx
    approvals/
      approval-row.tsx       # ERC-20 row: risk, revoke, confirm, status
      approval-filters.tsx   # search, sort, and filter controls
      batch-revoke-panel.tsx # confirm / running / complete UI for batch
      nft-approval-row.tsx   # NFT row: operator or per-token revoke
    sections/
      site-header.tsx
      hero.tsx
      approval-scanner.tsx   # ERC-20 + NFT scanner surface
      how-it-works.tsx
      trust-safety.tsx
      faq.tsx
      site-footer.tsx
  hooks/
    use-approval-discovery.ts      # ERC-20 discover → validate → enrich pipeline
    use-approval-scan.ts           # registry-only fallback scanner (secondary)
    use-nft-approval-discovery.ts  # NFT version of the pipeline
    use-revoke-approval.ts         # per-row ERC-20 revoke state machine
    use-revoke-nft-approval.ts     # per-row NFT revoke state machine
    use-batch-revoke.ts            # sequential ERC-20 batch coordinator
  lib/
    chains.ts          # PulseChain + Ethereum chain definitions/config
    wagmi.ts           # wagmi config (PulseChain + Ethereum + connectors)
    discovery.ts       # windowed Blockscout log fetcher; ERC-20 + NFT sources
    approvals.ts       # ERC-20 validation build/parse + types
    nft-approvals.ts   # NFT ABIs, validation, risk, revoke call builders
    registry/          # curated tokens + spenders/operators (read-only)
    risk.ts            # scoring, filters, sort
    revoke.ts          # ERC-20 revoke call builder
    errors.ts          # wagmi/viem error normalization
    explorer.ts        # PulseScan URL builders
    format.ts          # small formatting helpers
    site.ts            # single source of truth for brand, URLs, metadata
```

## Launch Checklist

Production deploy readiness. Work top-to-bottom before pointing the
production domain at a deploy.

### Environment

- [ ] Set `NEXT_PUBLIC_SITE_URL=https://revoke.pls` in the production
      Vercel project (and a matching origin in preview/staging).
- [ ] Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` if the WalletConnect
      option should appear in the connect menu.
- [ ] Confirm `NEXT_PUBLIC_PULSECHAIN_RPC_URL` is either unset
      (default public RPC) or points at a trusted endpoint.
- [ ] Confirm `NEXT_PUBLIC_PULSECHAIN_EXPLORER_API` is unset (uses
      `api.scan.pulsechain.com`) or points at a Blockscout-compatible
      mirror.
- [ ] Confirm `NEXT_PUBLIC_MAINNET_RPC_URL` is unset (viem default) or
      points at a trusted Ethereum mainnet RPC endpoint.
- [ ] Confirm `NEXT_PUBLIC_MAINNET_EXPLORER_API` is unset (automatic
      Etherscan/Blockscout selection) or points at a compatible explorer API.
- [ ] Set `NEXT_PUBLIC_ETHERSCAN_API_KEY` for higher Ethereum discovery
      reliability (optional but strongly recommended for production).

### Branding and metadata

- [ ] `/icon`, `/apple-icon`, `/opengraph-image` render correctly in a
      fresh production build (`npm run build` then visit the three
      routes via `npm run start`).
- [ ] `/robots.txt` and `/sitemap.xml` reference the production origin.
- [ ] View-source on the homepage shows the expected `<title>`,
      `og:title`, `og:image`, `twitter:card` tags.
- [ ] Optional: drop static overrides at `public/icon.png`,
      `public/apple-icon.png`, `public/opengraph-image.png` if you
      prefer hand-authored PNGs. Next.js uses them in preference to
      the `ImageResponse` routes.

### Functional smoke test

- [ ] Home loads on desktop and mobile without layout shift.
- [ ] Header nav anchors scroll to Scanner / How it works / Safety / FAQ.
- [ ] Connect wallet menu shows exactly one Browser wallet row, plus
      WalletConnect when enabled.
- [ ] Wrong-chain prompt appears when a non-supported wallet network is
      connected, and switches back with one click.
- [ ] ERC-20 scan shows approvals, filters/sort/search work, single
      revoke lands and the row disappears after confirmation.
- [ ] Batch revoke: select → review → start → stop-after-current →
      summary → rescan flow all work as described in the UI.
- [ ] NFT scan shows operator and per-token approvals (if any),
      single revoke works for both kinds.
- [ ] Rescan is disabled while a scan or batch is in flight and becomes
      clickable again once idle.

### Accessibility and polish

- [ ] Keyboard-only: Tab reaches the Connect button, menu items, and
      each row's action; Esc closes the connect menu.
- [ ] Lighthouse mobile audit passes Performance + Best Practices + SEO
      above 90 on a fresh build.
- [ ] No placeholder / `lorem`-style copy remains anywhere on the page.

### Final gates

- [ ] `npm run typecheck` ✓
- [ ] `npm run lint` ✓
- [ ] `npm run build` ✓
- [ ] Production DNS for `revoke.pls` points at the Vercel deploy only
      after the checklist above is green.

## License

MIT
