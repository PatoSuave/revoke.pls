# Pulse Revoke

Pulse Revoke is a non-custodial approval scanner and revoker for PulseChain and
BSC / BNB Smart Chain. The working app is at `/app`; `/` is the launcher and
trust/distribution page.

## Scope

Active supported chains:

- PulseChain mainnet, chain ID `369`, gas token `PLS`, explorer `PulseScan`
- BSC / BNB Smart Chain, chain ID `56`, gas token `BNB`, explorer `BscScan`

Supported approval flows:

- PulseChain fungible token approvals (`PRC-20` user-facing label)
- BSC fungible token approvals (`BEP-20` user-facing label)
- NFT operator approvals and per-token approvals where supported
- BSC NFT copy uses `BEP-721` and `BEP-1155`
- Single revoke for fungible token approvals and NFT approvals
- Sequential batch revoke for fungible token approvals

Out of scope for this release:

- Ethereum as an active supported chain
- Backend, database, or indexer
- Desktop binaries
- IPFS or Pinata publishing work
- Batch revoke for NFTs
- Historical activity feeds beyond explorer log discovery

## How It Works

1. User connects a wallet on PulseChain or BSC.
2. The app fetches historical approval logs from the chain's explorer API.
3. Raw candidates are deduped by chain, token/collection, spender/operator, and
   approval type.
4. Every candidate is re-validated live on the same chain via RPC and
   Multicall3 before display.
5. Known tokens and spenders are enriched from a chain-scoped registry.
6. Revokes are submitted directly from the user's wallet.

BSC discovery uses Etherscan API V2 logs with `chainid=56`. It does not rely on
public BSC RPC `eth_getLogs` for historical approval discovery. Explorer links
still open BscScan.

## BSC Discovery

BSC approval discovery uses:

- API URL: `https://api.etherscan.io/v2/api`
- Chain ID parameter: `chainid=56`
- Module/action: `module=logs&action=getLogs`
- Topics: approval event topic in `topic0`, owner address padded into `topic1`
- Pagination: `page` and `offset`
- Preferred API key env var: `NEXT_PUBLIC_BSC_EXPLORER_API_KEY`
- Deprecated fallback key env var: `NEXT_PUBLIC_BSCSCAN_API_KEY`

Use an Etherscan API V2 key with BNB Smart Chain access. The old BscScan V1
endpoint `https://api.bscscan.com/api` is deprecated for this logs flow. If the
API returns the V1 deprecation error, the scanner reports an actionable
incomplete discovery failure instead of showing a false "clear" state.

## Revoke Behavior

Fungible token revoke:

- Uses `approve(spender, 0)`
- Sends on the approval's own chain ID
- Uses PLS gas wording on PulseChain
- Uses BNB gas wording on BSC
- Links transactions to PulseScan or BscScan

NFT revoke:

- Collection-wide approvals use `setApprovalForAll(operator, false)`
- Per-token BEP-721/ERC-721-compatible approvals use `approve(address(0), tokenId)`

Batch revoke remains sequential and chain-safe. Selected approvals are expected
to come from one active chain; mixed-chain batches are blocked.

## Development

Requires Node.js 18.18+ (Node 20 recommended).

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Useful scripts:

```bash
npm run typecheck
npx vitest run
npm run lint
npm run build
```

## Environment

Copy `.env.example` to `.env.local` if you want to override defaults.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_PULSECHAIN_RPC_URL` | No | Override PulseChain RPC. Defaults to `https://rpc.pulsechain.com`. |
| `NEXT_PUBLIC_BSC_RPC_URL` | No | Override BSC RPC. Defaults to `https://bsc-dataseed.bnbchain.org`. Use a private RPC for production reliability. |
| `NEXT_PUBLIC_PULSECHAIN_EXPLORER_API` | No | Override PulseChain discovery API. Defaults to `https://api.scan.pulsechain.com/api`. |
| `NEXT_PUBLIC_BSC_EXPLORER_API_URL` | No | Override BSC historical logs API. Defaults to Etherscan API V2 at `https://api.etherscan.io/v2/api`. Do not use deprecated BscScan V1 `https://api.bscscan.com/api`. |
| `NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID` | No | Etherscan API V2 chain id for BNB Smart Chain logs. Defaults to `56`; keep it at `56`. |
| `NEXT_PUBLIC_BSC_EXPLORER_API_KEY` | Yes for BSC discovery | Preferred Etherscan API V2 key with BNB Smart Chain access. Do not commit real keys. |
| `NEXT_PUBLIC_BSCSCAN_API_KEY` | Deprecated fallback | Backward-compatible fallback key name for older deploys. Prefer `NEXT_PUBLIC_BSC_EXPLORER_API_KEY`. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No | Enables WalletConnect QR pairing. |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical public URL used by metadata and generated social images. |

## Project Structure

```text
src/
  app/
    page.tsx              # launcher / trust page
    app/page.tsx          # working scanner route
  components/
    connect-wallet-button.tsx
    approvals/
      approval-row.tsx
      batch-revoke-panel.tsx
      nft-approval-row.tsx
    sections/
      approval-scanner.tsx
      scanner-diagnostics.tsx
  hooks/
    use-approval-discovery.ts
    use-nft-approval-discovery.ts
    use-revoke-approval.ts
    use-revoke-nft-approval.ts
    use-batch-revoke.ts
  lib/
    chains.ts             # active PulseChain + BSC config
    wagmi.ts              # wagmi config and transports
    discovery.ts          # windowed explorer log discovery
    approvals.ts          # fungible approval validation/enrichment
    nft-approvals.ts      # NFT validation and revoke calls
    registry/             # chain-scoped enrichment registry
    explorer.ts           # explorer URL builders
    telemetry.ts          # privacy-safe product-health events
```

## Security Notes

- No seed phrase entry
- No custody
- No hidden write calls
- No backend/indexer in the approval path
- No third-party analytics SDKs
- Telemetry must not include wallet addresses, token addresses, spender
  addresses, transaction hashes, balances, token amounts, or fingerprints

Always verify spender addresses on PulseScan or BscScan before signing.
