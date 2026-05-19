# Pulse Revoke / revoke.pls

Pulse Revoke is a non-custodial approval scanner and revoker for PulseChain,
BSC / BNB Smart Chain, Base, Ethereum Mainnet, Arbitrum One verified-row
revoke, and Optimism verified ERC-20/NFT row revoke.

Live app: <https://pulserevoke.com>

Production routes:

- Scanner workspace: [`/app`](https://pulserevoke.com/app)
- Security and trust guide: [`/security`](https://pulserevoke.com/security)
- Manual QA checklist: [docs/MANUAL-QA-CHECKLIST.md](docs/MANUAL-QA-CHECKLIST.md)

The `/app` route is the focused scanner workspace. The `/` route is the
launcher, trust, and distribution page.

## Current Production Status

Revoke.PLS is live as a non-custodial approval review and revoke tool for
PulseChain, BSC / BNB Smart Chain, Base, Ethereum Mainnet, Arbitrum One
verified-row revoke, and Optimism verified ERC-20/NFT row revoke. The current
production checkpoint includes:

- A focused `/app` scanner workspace with address-only scan and connected-wallet
  scan modes.
- Live-read verification for scanner and revoke decisions where available.
- Ethereum Mainnet read-only discovery with wallet-side row-level revoke only
  for live-verified rows.
- Arbitrum One server-side approval discovery with ERC-20/NFT verified-row
  revoke; Arbitrum batch revoke is not enabled.
- Optimism server-side approval discovery with ERC-20/NFT verified-row revoke;
  Optimism batch revoke is not enabled.
- Verification-incomplete copy for approvals that cannot be fully confirmed.
- Collapsed approval explanation panels inside result rows.
- LibertySwap current and legacy contract metadata labels.
- Revoke receipts with post-revoke live verification status.
- A public `/security` page with anti-phishing, supported-chain, and wallet
  safety guidance.

Revoke.PLS never asks for seed phrases or private keys. Revoke actions require
the connected wallet to show and confirm the transaction before anything is
submitted on-chain.

## Live Supported Networks

Active scan networks are intentionally limited to:

- PulseChain mainnet, chain ID `369`, gas token `PLS`, explorer `PulseScan`
- BSC / BNB Smart Chain, chain ID `56`, gas token `BNB`, explorer `BscScan`
- Base Mainnet, chain ID `8453`, gas token `ETH`, explorer `BaseScan`
- Ethereum Mainnet, chain ID `1`, gas token `ETH`, explorer `Etherscan`
- Arbitrum One, chain ID `42161`, gas token `ETH`, explorer `Arbiscan`
  (ERC-20/NFT verified-row revoke; batch revoke not enabled)
- Optimism / OP Mainnet, chain ID `10`, gas token `ETH`, explorer
  `Optimistic Etherscan` (ERC-20/NFT verified-row revoke; batch revoke not enabled)

Ethereum discovery uses a server-read-only API, while Ethereum revoke remains
wallet-side only with owner, chain, preflight, gas, and row-level verification
gates.
Arbitrum discovery also uses a server-read-only API, and Arbitrum revoke stays
limited to live-verified ERC-20 and NFT rows.
Optimism discovery uses a server-side API. Optimism revoke is limited to
live-verified ERC-20 and NFT rows; batch revoke remains unavailable.

## What It Can Scan And Revoke

- PulseChain PRC-20 / ERC-20-compatible fungible token approvals
- BSC BEP-20 fungible token approvals
- Base ERC-20 fungible token approvals
- Ethereum ERC-20 fungible token approvals
- Arbitrum ERC-20 and NFT approvals with verified-row revoke
- Optimism ERC-20 and NFT approvals with verified-row revoke
- NFT operator approvals where supported by the app pipeline
- NFT per-token approvals where supported by the app pipeline
- Sequential batch revoke for fungible token approvals on one chain at a time

User-facing BSC labels are `BEP-20`, `BEP-721`, and `BEP-1155`. User-facing
Base labels are `ERC-20`, `ERC-721`, and `ERC-1155`. Internal ABI and event
handling uses ERC-compatible EVM interfaces where appropriate.
User-facing Arbitrum labels are `ERC-20`, `ERC-721`, and `ERC-1155`.
User-facing Optimism labels are `ERC-20`, `ERC-721`, and `ERC-1155`.

## What It Does Not Do

- Does not take custody of funds
- Does not ask for seed phrases or private keys
- Does not require token transfers
- Does not use server-side signing, private-key handling, or a relayer
- Does not guarantee complete discovery if explorer/API providers are
  rate-limited, capped, unavailable, or return malformed data
- Does not treat registry labels as proof that a spender is safe
- Does not publish desktop binaries or IPFS/Pinata artifacts in the current
  live product

## How Approval Discovery Works

1. Fetch historical approval logs for the connected owner on the active chain.
2. Deduplicate token/spender and collection/operator candidates by chain and
   approval type.
3. Validate live allowance or approval state on-chain using the same chain's RPC.
4. Enrich known token and spender labels from the chain-scoped registry.
5. Show currently active approvals only.
6. Prepare revoke transactions only after the user chooses to revoke.

Scanner and revoke behavior is verified through live reads where available:
fungible approvals use `allowance(owner, spender)`, NFT operator approvals use
`isApprovedForAll(owner, operator)`, and NFT per-token approvals use
`getApproved(tokenId)` where supported. Discovery failure, API caps, rate
limits, or live validation failures are reported as incomplete/unverified
states. The app should not show a false "clear" state when discovery or
validation did not complete.

## How Revoking Works

Revokes are standard approval-clearing transactions submitted by the user's
wallet:

- PRC-20 / BEP-20 / ERC-compatible fungible approvals: `approve(spender, 0)`
- NFT operator approvals: `setApprovalForAll(operator, false)`
- NFT per-token approvals: `approve(address(0), tokenId)`

The app sets the transaction `chainId` from the approval record. PulseChain
revokes use PLS gas wording and PulseScan links. BSC revokes use BNB gas wording
and BscScan links. Base revokes use ETH gas wording and BaseScan links.
Every revoke requires wallet confirmation before the transaction is submitted.
Arbitrum revoke is limited to live-verified ERC-20 and NFT rows in the current
product. Arbitrum batch revoke does not expose revoke actions.
Optimism revoke is limited to live-verified ERC-20 and NFT rows in the current
product. Optimism batch revoke does not expose revoke actions.

## BSC Implementation Notes

- Historical BSC approval discovery uses Etherscan API V2:
  `https://api.etherscan.io/v2/api`
- Every BSC historical log request includes `chainid=56`.
- Public BSC RPC `eth_getLogs` is not used for historical approval discovery.
- BscScan remains the public explorer for BSC address, token, and transaction
  links.
- BSC gas wording is `BNB`.
- BSC revokes above the Osaka/Mendel hard transaction gas cap of `16,777,216`
  gas are blocked before wallet submission.
- BSC revokes estimated above `1,000,000` gas and at or below `16,777,216` gas
  show an in-app high-gas warning before the wallet opens.

## Base Implementation Notes

- Historical Base approval discovery uses Etherscan API V2:
  `https://api.etherscan.io/v2/api`
- Every Base historical log request includes `chainid=8453`.
- Public Base RPC `eth_getLogs` is not used for historical approval discovery.
- BaseScan remains the public explorer for Base address, token, and transaction
  links.
- Base gas wording is `ETH`.
- Base does not inherit BSC's Osaka/Mendel gas cap or high-gas warning
  thresholds.

## Arbitrum Implementation Notes

- Arbitrum One is chain ID `42161`.
- Historical Arbitrum approval discovery uses the server-side
  `/api/arbitrum/approvals` route.
- The route uses Etherscan-compatible logs with `chainid=42161` and Arbiscan
  links for user-facing address, token, and transaction URLs.
- Arbitrum RPC and API keys are server-only values. Do not put managed
  Arbitrum RPC URLs or API keys in `NEXT_PUBLIC_*` variables.
- Arbitrum ERC-20 revoke uses the same wallet-side `approve(spender, 0)` path
  as other EVM ERC-20 revokes, with owner, chain, preflight, and post-revoke
  live verification gates.
- Arbitrum NFT row revoke uses the existing wallet-side
  `setApprovalForAll(operator, false)` and `approve(address(0), tokenId)` paths
  after the same owner, chain, preflight, and post-revoke live verification
  gates.
- Arbitrum batch revoke is not enabled.

## Optimism Implementation Notes

- Optimism / OP Mainnet is chain ID `10`.
- Historical Optimism approval discovery uses the server-side
  `/api/optimism/approvals` route.
- The route uses Etherscan API V2 logs with `chainid=10` and Optimistic
  Etherscan links.
- Optimism RPC and API keys are server-only values. Do not put managed
  Optimism RPC URLs or API keys in `NEXT_PUBLIC_*` variables.
- Optimism ERC-20 and NFT rows can be revoked only when live verification,
  matching wallet, and OP Mainnet checks pass. Batch and global revoke actions
  are not enabled for Optimism.

## Security Model

- Wallet interactions are client-side through wagmi/viem connectors.
- Users sign transactions in their own wallet.
- The app never needs a private key or seed phrase.
- The app does not custody funds.
- Read flows fetch public chain/explorer data for the connected address.
- Write flows are limited to approval-clearing calls listed above.
- Registry data is enrichment only; it is not the discovery source of truth and
  is not a safety guarantee.

Always verify token, spender, operator, and transaction details in your wallet
and on PulseScan, BscScan, BaseScan, Etherscan, or Arbiscan before signing.

## Privacy Posture

The repo does not include a third-party analytics SDK. The telemetry module is a
small product-health sink for fixed lifecycle events and aggregate fields. It is
silent in production unless `NEXT_PUBLIC_TELEMETRY_ENABLED=true` is set.

Telemetry rules documented in `src/lib/telemetry.ts` forbid wallet addresses,
token addresses, spender addresses, transaction hashes, balances, token amounts,
and fingerprinting data.

## Local Development

Requires Node.js 18.18+; Node 20 is recommended.

```powershell
npm install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Then open `http://localhost:3000`.

Useful verification commands:

```powershell
npm.cmd run typecheck
npx.cmd vitest run
npm.cmd run lint
npm.cmd run build
```

## Before Production Push

Run the full production checklist before pushing a release branch or `main`:

```powershell
npm.cmd run build
npx.cmd tsc --noEmit
npx.cmd vitest run
npm.cmd run lint
npm.cmd audit --omit=dev
git diff --check
git diff -- src/hooks src/app/api src/lib/wagmi.ts src/lib/preflight.ts
```

The sensitive-path diff should be empty unless the release explicitly changes
scanner, wallet, API, preflight, or execution behavior.

## Environment Variables

All `NEXT_PUBLIC_` variables are bundled into the frontend and visible in the
browser. Do not put private secrets in these variables. Public API keys can
still be rate-limited or abused; restrict and monitor them where the provider
supports it.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_PULSECHAIN_RPC_URL` | Optional | Override PulseChain RPC. Defaults to `https://rpc.pulsechain.com`. |
| `NEXT_PUBLIC_BSC_RPC_URL` | Recommended for production | Override BSC RPC. Defaults to `https://bsc-dataseed.bnbchain.org`. |
| `NEXT_PUBLIC_BASE_RPC_URL` | Recommended for production | Override Base RPC. Defaults to `https://mainnet.base.org`. |
| `NEXT_PUBLIC_PULSECHAIN_EXPLORER_API` | Optional | Override PulseChain discovery API. Defaults to `https://api.scan.pulsechain.com/api`. |
| `NEXT_PUBLIC_BSC_EXPLORER_API_URL` | Optional | BSC historical logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID` | Optional | Etherscan API V2 chain ID for BNB Smart Chain logs. Defaults to `56`; keep it at `56`. |
| `NEXT_PUBLIC_BSC_EXPLORER_API_KEY` | Required for reliable BSC discovery | Preferred Etherscan API V2 key with BNB Smart Chain access. |
| `NEXT_PUBLIC_BSCSCAN_API_KEY` | Deprecated fallback | Backward-compatible fallback key name for older deploys. Prefer `NEXT_PUBLIC_BSC_EXPLORER_API_KEY`. |
| `NEXT_PUBLIC_BASE_EXPLORER_API_URL` | Optional | Base historical logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID` | Optional | Etherscan API V2 chain ID for Base logs. Defaults to `8453`; keep it at `8453`. |
| `NEXT_PUBLIC_BASE_EXPLORER_API_KEY` | Required for reliable Base discovery | Etherscan API V2 key with Base Mainnet access. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional | Enables WalletConnect QR pairing. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Canonical public URL used by metadata and social images. Production should use `https://pulserevoke.com`. |
| `NEXT_PUBLIC_TELEMETRY_ENABLED` | Optional | Enables the current telemetry sink in production when set to `true`. |
| `MAINNET_RPC_URL` / `ETHEREUM_RPC_URL` | Required for Ethereum scan | Server-only Ethereum RPC URL used by `/api/ethereum/approvals`. |
| `ETHEREUM_EXPLORER_API_URL` | Optional | Server-only Etherscan API V2 endpoint override. Defaults to `https://api.etherscan.io/v2/api`. |
| `ETHERSCAN_API_KEY` | Required for Ethereum scan | Server-only Etherscan API key for Ethereum Mainnet approval discovery. Do not use a `NEXT_PUBLIC_` key for this route. |
| `ARBITRUM_ONE_RPC_URL` / `ARBITRUM_RPC_URL` | Required for Arbitrum scan | Server-only Arbitrum RPC URL used by `/api/arbitrum/approvals`. |
| `ARBITRUM_EXPLORER_API_URL` | Optional | Server-only Etherscan-compatible API V2 endpoint override. Defaults to `https://api.etherscan.io/v2/api`. |
| `ARBITRUM_EXPLORER_CHAIN_ID` | Optional | Etherscan API V2 chain ID for Arbitrum One logs. Defaults to `42161`; keep it at `42161`. |
| `ARBISCAN_API_KEY` | Required for Arbitrum scan | Server-only Arbiscan/Etherscan-compatible API key for Arbitrum One approval discovery. Do not use a `NEXT_PUBLIC_` key for this route. |
| `OPTIMISM_RPC_URL` / `OPTIMISM_MAINNET_RPC_URL` / `OP_MAINNET_RPC_URL` | Required for Optimism scan | Server-only Optimism RPC URL used by `/api/optimism/approvals`. |
| `OPTIMISM_EXPLORER_API_URL` | Optional | Server-only Etherscan API V2 endpoint override. Defaults to `https://api.etherscan.io/v2/api`. |
| `OPTIMISM_EXPLORER_CHAIN_ID` | Optional | Etherscan API V2 chain ID for OP Mainnet logs. Defaults to `10`; keep it at `10`. |
| `OPTIMISM_EXPLORER_API_KEY` / `OPTIMISTIC_ETHERSCAN_API_KEY` / `ETHERSCAN_API_KEY` | Required for Optimism scan | Server-only Etherscan API V2 key for Optimism approval discovery. Do not use a `NEXT_PUBLIC_` key for this route. |
| `DEXTOOLS_API_KEY` | Optional | Server-only DEXTools key for retired-feature market/score enrichment. This paid/plan-gated integration stays hidden unless configured. Do not use a `NEXT_PUBLIC_` key. |
| `DEXTOOLS_API_BASE_URL` | Optional | DEXTools API base URL override. Defaults to `https://public-api.dextools.io/free/v2`. |
| `DEXTOOLS_API_KEY_HEADER` | Optional | DEXTools API key header. Defaults to `X-API-Key`; override only if the DEXTools portal specifies another header. |

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for details.

## Audit Starting Points

- `src/lib/chains.ts` - active supported chains, RPC defaults, explorer config,
  gas symbols, BSC gas safety thresholds, and Base Etherscan V2 settings
- `src/lib/wagmi.ts` - registered wallet chains and transports
- `src/lib/discovery.ts` - historical log discovery, pagination/windowing,
  Etherscan API V2 `chainid=56` / `chainid=8453` request construction
- `src/app/api/ethereum/approvals/route.ts` - read-only Ethereum Mainnet
  approval API route
- `src/app/api/arbitrum/approvals/route.ts` - read-only Arbitrum One approval
  discovery API route
- `src/app/api/optimism/approvals/route.ts` - server-side Optimism approval
  discovery API route
- `src/lib/ethereum-approval-api.ts` - server-only Ethereum discovery and live
  validation
- `src/lib/arbitrum-approval-api.ts` - server-only Arbitrum discovery and live
  validation
- `src/lib/optimism-approval-api.ts` - server-only Optimism discovery and live
  validation
- `src/lib/explorer.ts` - explorer URL generation
- `src/lib/preflight.ts` - live validation helpers, BSC hard cap, high-gas
  warning classification
- `src/hooks/use-revoke-approval.ts` - single fungible approval revoke flow
- `src/hooks/use-revoke-nft-approval.ts` - NFT revoke flow
- `src/hooks/use-batch-revoke.ts` - sequential batch revoke flow
- `src/lib/registry/` - chain-scoped registry enrichment
- `src/lib/telemetry.ts` - privacy posture and product-health event rules

See [docs/AUDIT-GUIDE.md](docs/AUDIT-GUIDE.md) for a practical audit checklist.

## Documentation

- [Changelog](CHANGELOG.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Audit guide](docs/AUDIT-GUIDE.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Security policy](SECURITY.md)
- [Transparency notes](docs/TRANSPARENCY.md)
- [Scanner QA checklist](docs/scanner-qa-checklist.md)
- [Manual production QA checklist](docs/MANUAL-QA-CHECKLIST.md)
