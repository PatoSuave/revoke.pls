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
- Base, chain ID `8453`, native gas token `ETH`, explorer `BaseScan`

Ethereum Mainnet is not an active supported chain.

## Web3 Layer

- `src/lib/wagmi.ts` registers PulseChain, BSC, and Base with wagmi.
- PulseChain RPC defaults to `https://rpc.pulsechain.com`.
- BSC RPC defaults to `https://bsc-dataseed.bnbchain.org`.
- Base RPC defaults to `https://mainnet.base.org`.
- RPCs can be overridden with public env vars.
- Live reads and writes always include the approval record's `chainId`.
- When connected, the wallet account `chainId` is the active scanner source of
  truth. The app does not fall back to PulseChain after a supported wallet chain
  is detected.
- The scanner session remounts when wallet address or chain changes so previous
  results, selections, batch state, and diagnostics are cleared.

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

BSC historical discovery uses Etherscan API V2 `module=logs&action=getLogs`
with `chainid=56`, `topic0` for the event signature, and the padded owner
address in `topic1`. Public BSC RPC `eth_getLogs` is not used for historical
approval discovery. BscScan remains the explorer for address, token, and
transaction links.

Base historical discovery uses the same Etherscan API V2 logs path with
`chainid=8453`. Public Base RPC `eth_getLogs` is not used for historical
approval discovery. BaseScan remains the explorer for address, token, and
transaction links.

## Explorer APIs

- PulseChain discovery API default:
  `https://api.scan.pulsechain.com/api`
- BSC discovery API default:
  `https://api.etherscan.io/v2/api`
- BSC discovery API chain id:
  `NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID=56`
- Preferred BSC API key env var:
  `NEXT_PUBLIC_BSC_EXPLORER_API_KEY`
- Deprecated fallback BSC key env var:
  `NEXT_PUBLIC_BSCSCAN_API_KEY`
- Base discovery API default:
  `https://api.etherscan.io/v2/api`
- Base discovery API chain id:
  `NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID=8453`
- Base API key env var:
  `NEXT_PUBLIC_BASE_EXPLORER_API_KEY`

The old BscScan V1 endpoint `https://api.bscscan.com/api` is deprecated for
BSC log discovery. If it is configured or returned by a custom endpoint, debug
mode surfaces an actionable migration warning. Both explorer APIs can rate-limit
or cap responses. The discovery fetcher uses adaptive block-range windowing and
pagination. If discovery or live validation is incomplete, the UI reports the
incomplete state instead of showing a false "clear" result.

## Approval Standards

Internal ABI/event handling uses EVM-compatible ERC interfaces where
appropriate. User-facing BSC copy uses:

- `BEP-20` for fungible token approvals
- `BEP-721` for NFT approvals
- `BEP-1155` for multi-token NFT / semi-fungible approvals
- `BNB` for gas

User-facing Base copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `ETH` for gas

## Transaction Flow

Fungible token revoke:

1. User reviews an active approval.
2. App refreshes live allowance on the same chain.
3. App prepares `approve(spender, 0)`.
4. Wallet signs and submits on the approval's `chainId`.
5. UI links the transaction to PulseScan, BscScan, or BaseScan and rescans
   after success.

NFT revoke:

- `setApprovalForAll(operator, false)` for collection-wide operator approvals
- `approve(address(0), tokenId)` for per-token BEP-721 or ERC-721-compatible
  approvals

Batch revoke is sequential. Mixed-chain batches are blocked.

## BSC Gas Safety

BNB Smart Chain enforces an Osaka/Mendel transaction gas cap. Pulse Revoke keeps
two BSC-specific revoke preflight thresholds in `src/lib/chains.ts` and
`src/lib/preflight.ts`:

- Hard cap: `16_777_216n`
- High-gas warning threshold: `1_000_000n`

BSC revokes estimated above the hard cap are blocked before wallet submission.
BSC revokes estimated above the warning threshold and at or below the hard cap
require an explicit in-app confirmation before the wallet opens. Safe BSC
revokes pass viem/wagmi transaction gas as `gas`, not `gasLimit`.

## Security Principles

- Never ask for a seed phrase
- Never request unnecessary signatures
- Clearly distinguish reads from writes
- Explain gas before revoke
- Link spender/operator addresses to the active chain explorer
- Keep telemetry aggregate and privacy-safe
