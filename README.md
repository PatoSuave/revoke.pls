# Pulse Revoke

Pulse Revoke helps users review and revoke token approvals on supported EVM
chains.

Live app: <https://pulserevoke.com>

- Scanner: <https://pulserevoke.com/app>
- Security guide: <https://pulserevoke.com/security>
- Manual QA checklist: [docs/MANUAL-QA-CHECKLIST.md](docs/MANUAL-QA-CHECKLIST.md)

## What It Does

Pulse Revoke scans public approval history, checks current approval state
on-chain, and shows active allowances or NFT approvals that may still let a
spender move assets.

Users can:

- scan connected wallets
- scan a pasted EVM address without connecting a wallet where the current
  scanner supports it
- review token, spender, operator, chain, risk, and explorer context
- revoke approvals they no longer trust
- run sequential batch revoke for fungible approvals on the generic chain lane
- review security and trust information before signing

Revoke transactions are sent from the user's wallet. The app does not custody
funds and does not sign transactions on a server.

## Supported Chains

This table is based on the current source code, especially
[src/lib/security-content.ts](src/lib/security-content.ts),
[src/lib/chains.ts](src/lib/chains.ts), [src/lib/wagmi.ts](src/lib/wagmi.ts),
and the chain-specific scanner clients.

| Chain | Chain ID | Scan support | Revoke support | Notes |
| --- | ---: | --- | --- | --- |
| PulseChain | 369 | Yes | Yes | Generic scanner and wallet-side revoke flow. Gas is paid in PLS. |
| BNB Smart Chain | 56 | Yes | Yes | Generic scanner and wallet-side revoke flow. BSC gas cap and high-gas warnings are preserved. |
| Base | 8453 | Yes | Yes | Generic scanner and wallet-side revoke flow. |
| Polygon | 137 | Yes | Yes | Generic scanner and wallet-side revoke flow. Gas is paid in POL. |
| Ethereum Mainnet | 1 | Yes | Live-verified rows | Server-side read-only discovery. Revoke stays wallet-side and depends on live verification, matching wallet, and correct chain checks. |
| Arbitrum One | 42161 | Yes | ERC-20/NFT verified rows only | Server-side read-only discovery. Batch and global revoke are not enabled. |
| Optimism / OP Mainnet | 10 | Yes | ERC-20/NFT verified rows only | Server-side read-only discovery. Batch and global revoke are not enabled. |
| HyperEVM | 999 | Yes | ERC-20/NFT verified rows only | Server-side read-only discovery. Batch and global revoke are not enabled. Gas is paid in HYPE. |

Solana is not supported by the current EVM approval scanner design.

## Core Features

- PRC-20, BEP-20, ERC-20-compatible allowance scanning
- NFT operator and per-token approval scanning where the app pipeline supports
  it
- Permit2 delegated allowance rows where live verification confirms active
  state
- Address-only scan mode for review before connecting a wallet
- Chain-scoped token and spender labels for context
- Token-logo lookup for PulseChain, BSC, and Polygon display only
- Multi-chain gas tracker with live block-based updates and native-token plus
  approximate USD cost estimates
- Revoke receipt status with post-revoke live verification
- `/app?debug=1` diagnostics for scanner status, chain, source, and incomplete
  scan reasons

## Gas Tracker

The `/app` workspace includes an informational gas tracker for the supported EVM
chains in this app: PulseChain, BNB Smart Chain, Base, Polygon, Ethereum
Mainnet, Arbitrum One, Optimism, and HyperEVM. It fetches current gas data
through the server-side `/api/gas?chainId=...` route, updates when new blocks
are detected on the selected chain, and keeps only a small in-memory chart
history in the browser.

The chart line is status-colored for recent samples: green for the lower gas
range, yellow for the medium range, and red for unusually high gas. Thresholds
are chain-specific and intentionally conservative. When available for
PulseChain, server-side Owlracle data is shown only as supplemental advisory
tiers from recent blocks; RPC block samples remain the live source of truth. If
an `OWLRACLE_API_KEY` is configured, it must stay server-side and must not use a
`NEXT_PUBLIC_` prefix.

Typical transaction costs are estimates in the selected chain's native token
based on current gas data. When CoinGecko public price data is available, the
same rows also show approximate USD estimates. Native gas data updates on new
blocks; native-token USD prices are cached briefly server-side so the tracker
does not hammer the public price feed. For L2 networks, wallet estimates may
include L1 data fees beyond this gas-price estimate. The tracker does not affect
revoke transaction execution, wallet gas estimation, preflight checks, or
transaction submission. Actual wallet estimates may vary by contract.

## Security Model

- Pulse Revoke is non-custodial.
- Users keep their keys in their own wallet.
- The app never asks for a seed phrase, private key, or mnemonic.
- Address-only scans are read-only.
- Read APIs fetch public chain, explorer, and RPC data.
- Revoke transactions are standard approval-clearing calls that the user signs
  in their wallet.
- Results are risk signals, not guarantees.
- Registry labels and token logos are context, not safety endorsements.
- Users should verify the site, chain, token, spender, function, and gas before
  signing.
- Malicious or nonstandard contracts can hide behavior or fail normal reads.
- RPCs, explorers, APIs, wallets, browsers, and hosting providers can fail,
  rate-limit, cap responses, or return incomplete data.

## What Pulse Revoke Does Not Do

- Does not take custody of funds
- Does not ask for seed phrases, private keys, or mnemonics
- Does not create wallets
- Does not move, swap, bridge, stake, or transfer tokens
- Does not run server-side signing
- Does not use a relayer or server wallet
- Does not auto-submit transactions
- Does not guarantee complete discovery when upstream providers fail
- Does not guarantee that a spender is safe
- Does not support Solana revoke flows

## Local Development

Node.js 18.18+ is required. Node 20 is recommended.

PowerShell:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Generic npm:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Environment Variables

Copy [.env.example](.env.example) to `.env.local` and fill only the values you
need.

Rules:

- `NEXT_PUBLIC_*` variables are bundled into the browser. Do not put secrets or
  private RPC URLs there.
- Server-only RPC URLs and explorer API keys belong in unprefixed variables.
- Keep public explorer keys blank for hosted web deployments unless you are
  building a desktop/static target without API routes.
- Never commit real keys.

Common groups:

| Group | Variables |
| --- | --- |
| Site and wallet UI | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_TELEMETRY_ENABLED` |
| Public wallet/gas watcher RPC overrides | `NEXT_PUBLIC_PULSECHAIN_RPC_URL`, `NEXT_PUBLIC_BSC_RPC_URL`, `NEXT_PUBLIC_BASE_RPC_URL`, `NEXT_PUBLIC_POLYGON_RPC_URL`, `NEXT_PUBLIC_MAINNET_RPC_URL`, `NEXT_PUBLIC_ETHEREUM_RPC_URL`, `NEXT_PUBLIC_ARBITRUM_RPC_URL`, `NEXT_PUBLIC_OPTIMISM_RPC_URL`, `NEXT_PUBLIC_HYPEREVM_RPC_URL` |
| Server gas tracker RPC overrides | `PULSECHAIN_RPC_URL`, `BSC_RPC_URL`, `BASE_RPC_URL`, `POLYGON_RPC_URL`, `MAINNET_RPC_URL`, `ETHEREUM_RPC_URL`, `ARBITRUM_ONE_RPC_URL`, `ARBITRUM_RPC_URL`, `OPTIMISM_RPC_URL`, `OPTIMISM_MAINNET_RPC_URL`, `HYPEREVM_RPC_URL`, `HYPEREVM_MAINNET_RPC_URL`, `HYPERLIQUID_EVM_RPC_URL` |
| Hosted BSC/Base/Polygon discovery | `BSC_EXPLORER_API_KEY`, `BASE_EXPLORER_API_KEY`, `POLYGON_EXPLORER_API_KEY`, `ETHERSCAN_API_KEY` |
| Ethereum discovery | `MAINNET_RPC_URL`, `ETHEREUM_RPC_URL`, `ETHEREUM_EXPLORER_API_URL`, `ETHERSCAN_API_KEY` |
| Arbitrum discovery | `ARBITRUM_ONE_RPC_URL`, `ARBITRUM_RPC_URL`, `ARBITRUM_EXPLORER_API_URL`, `ARBITRUM_EXPLORER_CHAIN_ID`, `ARBISCAN_API_KEY` |
| Optimism discovery | `OPTIMISM_RPC_URL`, `OPTIMISM_MAINNET_RPC_URL`, `OP_MAINNET_RPC_URL`, `OPTIMISM_EXPLORER_API_KEY`, `OPTIMISTIC_ETHERSCAN_API_KEY`, `ETHERSCAN_API_KEY` |
| HyperEVM discovery | `HYPEREVM_RPC_URL`, `HYPEREVM_MAINNET_RPC_URL`, `HYPERLIQUID_EVM_RPC_URL`, `HYPEREVM_EXPLORER_API_KEY`, `HYPEREVM_ETHERSCAN_API_KEY`, `ETHERSCAN_API_KEY`, `BSC_EXPLORER_API_KEY` |

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for details.

## Test And Validation Commands

Run these before treating a branch as ready:

```powershell
npm.cmd run build
npx.cmd tsc --noEmit
npx.cmd vitest run
npm.cmd run lint
npm.cmd audit --omit=dev
npm.cmd run security:env
npm.cmd run security:live
git diff --check
```

Generic npm equivalents:

```bash
npm run build
npx tsc --noEmit
npx vitest run
npm run lint
npm audit --omit=dev
npm run security:env
npm run security:live
git diff --check
```

`security:live` defaults to `https://pulserevoke.com`. To check a preview,
pass the preview origin:

```powershell
npm.cmd run security:live -- https://your-preview.vercel.app
```

For Vercel deployment-protected previews, pass the temporary share URL or its
`_vercel_share` token:

```powershell
npm.cmd run security:live -- "https://your-preview.vercel.app/?_vercel_share=..."
npm.cmd run security:live -- https://your-preview.vercel.app --vercel-share=...
```

For hosted web deployments, `security:env` fails if public
`NEXT_PUBLIC_*` explorer/API-key variables are set. Desktop/static builds that
intentionally need public fallback keys can opt out explicitly with
`--allow-desktop-public-keys`.

For documentation-only work, also check that sensitive runtime paths were not
changed unexpectedly:

```powershell
git diff -- src/hooks src/app/api src/lib/wagmi.ts src/lib/preflight.ts src/lib/permit2.ts src/lib/risk.ts
```

## Project Structure

| Path | Purpose |
| --- | --- |
| `src/app/` | Next.js App Router routes, metadata, API routes, and pages |
| `src/components/sections/approval-scanner.tsx` | Main scanner surface and chain-lane routing |
| `src/components/sections/*readonly-scanner.tsx` | Ethereum, Arbitrum, Optimism, and HyperEVM verified-row scanner surfaces |
| `src/hooks/use-revoke-approval.ts` | Wallet-side fungible revoke hook |
| `src/hooks/use-revoke-nft-approval.ts` | Wallet-side NFT revoke hook |
| `src/hooks/use-batch-revoke.ts` | Sequential batch revoke for the generic lane |
| `src/lib/chains.ts` | Generic supported-chain registry for PulseChain, BSC, Base, and Polygon |
| `src/lib/wagmi.ts` | Wallet connectors, registered wallet chains, and transports |
| `src/lib/security-content.ts` | Public security copy and supported-chain status matrix |
| `src/lib/*approval-api.ts` | Server-side read-only discovery and live validation helpers |
| `src/lib/*approval-client.ts` | Chain-specific client mapping and revoke eligibility copy |
| `src/lib/preflight.ts` | Live preflight checks and gas policy |
| `src/lib/registry/` | Chain-scoped token and spender labels |
| `docs/` | Architecture, security, QA, environment, and release notes |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Security policy](SECURITY.md)
- [Security notes](docs/SECURITY.md)
- [Hosted hardening](docs/HOSTED-HARDENING.md)
- [Transparency notes](docs/TRANSPARENCY.md)
- [Audit guide](docs/AUDIT-GUIDE.md)
- [Manual QA checklist](docs/MANUAL-QA-CHECKLIST.md)
- [Scanner QA checklist](docs/scanner-qa-checklist.md)
- [Roadmap](docs/ROADMAP.md)
- [Changelog](CHANGELOG.md)

## Contributing And Review Expectations

- Keep scanner behavior, revoke hooks, API behavior, wallet writes, and
  preflight behavior unchanged unless the change is explicitly scoped and
  reviewed.
- Document chain support from source files, not assumptions.
- Keep server-only secrets out of `NEXT_PUBLIC_*`.
- Treat registry labels, logos, and risk scores as context, not guarantees.
- Add or update tests when behavior changes.
- Run the validation commands above before asking for release review.

## Disclaimer

Pulse Revoke is not an external audit, insurance product, or guarantee of
wallet safety. It helps surface approval data and prepare standard revoke
transactions. Users are responsible for checking the site, chain, spender,
function, and wallet prompt before signing.
