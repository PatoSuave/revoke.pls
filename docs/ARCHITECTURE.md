# Architecture

## Frontend

- Next.js App Router
- React components for wallet connect, scanner results, revoke actions, and
  diagnostics
- Tailwind CSS for the existing Pulse-themed UI

## Active Chains

Active supported chains are configured in `src/lib/chains.ts`:

- PulseChain, chain ID `369`, native gas token `PLS`, explorer `PulseScan`
- BSC / BNB Smart Chain, chain ID `56`, native gas token `BNB`, explorer
  `BscScan`

Ethereum is not an active supported chain.

## Web3 Layer

- `src/lib/wagmi.ts` registers PulseChain and BSC with wagmi.
- PulseChain RPC defaults to `https://rpc.pulsechain.com`.
- BSC RPC defaults to `https://bsc-dataseed.bnbchain.org`.
- Both RPCs can be overridden with public env vars.
- Live reads and writes always include the approval record's `chainId`.

## Discovery Strategy

The scanner uses a discovery-first pipeline:

1. User connects on a supported chain.
2. The app fetches historical approval logs for the owner from that chain's
   configured explorer API.
3. Raw log candidates are deduped into token/spender or collection/operator
   approval candidates.
4. Every candidate is re-checked live on-chain via `allowance`,
   `isApprovedForAll`, or `getApproved`.
5. The curated registry enriches known tokens and spenders. It is not a
   discovery source.

BSC historical discovery uses BscScan `module=logs&action=getLogs` with
`topic0` for the event signature and the padded owner address in `topic1`.
Public BSC RPC `eth_getLogs` is not used for historical approval discovery.

## Explorer APIs

- PulseChain discovery API default:
  `https://api.scan.pulsechain.com/api`
- BSC discovery API default:
  `https://api.bscscan.com/api`
- BSC API key env var:
  `NEXT_PUBLIC_BSCSCAN_API_KEY`

Both explorer APIs can rate-limit or cap responses. The discovery fetcher uses
adaptive block-range windowing and pagination. If discovery or live validation
is incomplete, the UI reports the incomplete state instead of showing a false
"clear" result.

## Approval Standards

Internal ABI/event handling uses EVM-compatible ERC interfaces where
appropriate. User-facing BSC copy uses:

- `BEP-20` for fungible token approvals
- `BEP-721` for NFT approvals
- `BEP-1155` for multi-token NFT / semi-fungible approvals
- `BNB` for gas

## Transaction Flow

Fungible token revoke:

1. User reviews an active approval.
2. App refreshes live allowance on the same chain.
3. App prepares `approve(spender, 0)`.
4. Wallet signs and submits on the approval's `chainId`.
5. UI links the transaction to PulseScan or BscScan and rescans after success.

NFT revoke:

- `setApprovalForAll(operator, false)` for collection-wide operator approvals
- `approve(address(0), tokenId)` for per-token BEP-721/ERC-721-compatible
  approvals

Batch revoke is sequential. Mixed-chain batches are blocked.

## Security Principles

- Never ask for a seed phrase
- Never request unnecessary signatures
- Clearly distinguish reads from writes
- Explain gas before revoke
- Link spender/operator addresses to the active chain explorer
- Keep telemetry aggregate and privacy-safe
