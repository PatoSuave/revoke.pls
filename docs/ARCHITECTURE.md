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
- Ethereum Mainnet, chain ID `1`, native gas token `ETH`, explorer `Etherscan`
- Arbitrum One, chain ID `42161`, native gas token `ETH`, explorer `Arbiscan`
- Optimism / OP Mainnet, chain ID `10`, native gas token `ETH`, explorer
  `Optimistic Etherscan`, read-only scan

Ethereum Mainnet is wallet-enabled for the Ethereum read-only discovery and
wallet-side revoke lane. It is not handled by the default supported-chain
scanner path.

Arbitrum One is wallet-enabled so the app can recognize the connected network
and run the separate Arbitrum scanner lane. It is not part of the default
supported-chain scanner path. Only live-verified ERC-20 and NFT rows can route
through controlled wallet-side revoke hooks; batch revoke remains disabled.

Optimism is wallet-recognized so the app can show a neutral network status and
run the separate scanner lane. It is not part of the default supported-chain
scanner path. Optimism revoke is limited to verified NFT rows and does not route
to generic ERC-20, batch, or global revoke.

## Web3 Layer

- `src/lib/wagmi.ts` registers PulseChain, BSC, Base, Ethereum Mainnet,
  Arbitrum One, and OP Mainnet with wagmi. Ethereum, Arbitrum, and Optimism
  use separate scanner lanes.
- PulseChain RPC defaults to `https://rpc.pulsechain.com`.
- BSC RPC defaults to `https://bsc-dataseed.bnbchain.org`.
- Base RPC defaults to `https://mainnet.base.org`.
- Ethereum wallet RPC defaults to `https://ethereum-rpc.publicnode.com` unless
  overridden for the wallet client.
- Arbitrum wallet chain recognition uses `https://arb1.arbitrum.io/rpc`.
  Production Arbitrum approval discovery uses server-only RPC/API settings
  through `/api/arbitrum/approvals`.
- Optimism wallet chain recognition uses `https://mainnet.optimism.io`.
  Production Optimism approval discovery uses server-only RPC/API settings
  through `/api/optimism/approvals`.
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

Ethereum historical discovery is exposed through `/api/ethereum/approvals` so
the Etherscan key stays server-only. The route is read-only, uses bounded
discovery and live-validation caps, and never signs, relays, or submits
transactions.

Arbitrum One historical discovery is exposed through
`/api/arbitrum/approvals` so managed RPC URLs and Arbiscan keys stay
server-only. The route is read-only, uses bounded discovery and
live-validation caps, requires `chainid=42161`, and never signs, relays, or
submits transactions. Arbitrum rows can be shown only after live reads verify
current approval state.

Optimism historical discovery is exposed through `/api/optimism/approvals` so
managed RPC URLs and Etherscan API V2 keys stay server-only. The route is
read-only, uses bounded discovery and live-validation caps, requires
`chainid=10`, and never signs, relays, or submits transactions. Optimism rows
can be shown only after live reads verify current approval state, and revoke is
not enabled in this phase.

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
- Ethereum server RPC env vars:
  `MAINNET_RPC_URL` / `ETHEREUM_RPC_URL`
- Ethereum server API key env var:
  `ETHERSCAN_API_KEY`
- Arbitrum server RPC env vars:
  `ARBITRUM_ONE_RPC_URL` / `ARBITRUM_RPC_URL`
- Arbitrum server discovery API default:
  `https://api.etherscan.io/v2/api`
- Arbitrum server discovery API chain id:
  `ARBITRUM_EXPLORER_CHAIN_ID=42161`
- Arbitrum server API key env var:
  `ARBISCAN_API_KEY`
- Optimism server RPC env vars:
  `OPTIMISM_RPC_URL` / `OPTIMISM_MAINNET_RPC_URL` / `OP_MAINNET_RPC_URL`
- Optimism server discovery API default:
  `https://api.etherscan.io/v2/api`
- Optimism server discovery API chain id:
  `OPTIMISM_EXPLORER_CHAIN_ID=10`
- Optimism server API key env vars:
  `OPTIMISM_EXPLORER_API_KEY` / `OPTIMISTIC_ETHERSCAN_API_KEY` /
  `ETHERSCAN_API_KEY`

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

User-facing Arbitrum copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `ETH` for gas
- `Verified-row revoke` for ERC-20 and NFT row state
- `NFT row revoke` for Arbitrum NFT rows
- `Batch revoke disabled` for Arbitrum batch/global actions

User-facing Optimism copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `ETH` for gas
- `Read-only scan` for current Optimism support
- `Revoke disabled` for ERC-20, NFT, batch, and global actions

## Transaction Flow

Fungible token revoke:

1. User reviews an active approval.
2. App refreshes live allowance on the same chain.
3. App prepares `approve(spender, 0)`.
4. Wallet signs and submits on the approval's `chainId`.
5. UI links the transaction to PulseScan, BscScan, BaseScan, Etherscan, or
   Arbiscan and rescans after success.

NFT revoke:

- `setApprovalForAll(operator, false)` for collection-wide operator approvals
- `approve(address(0), tokenId)` for per-token BEP-721 or ERC-721-compatible
  approvals

Batch revoke is sequential. Mixed-chain batches are blocked.
Ethereum revoke uses the same wallet-side approval-clearing calls, but only
after server-read-only discovery and row-level live verification have identified
an active approval. Global batch revoke stays disabled when global Ethereum
verification is incomplete.

Arbitrum revoke is limited to live-verified ERC-20 and NFT rows from the
server-side Arbitrum API. It uses the same controlled ERC-20 and NFT revoke
hooks, including owner, chain, preflight, and post-revoke verification gates.
Arbitrum batch revoke remains unavailable.

Optimism revoke is limited to live-verified NFT rows from the server-side
Optimism API. It uses the existing controlled NFT revoke hook, including owner,
chain, preflight, and post-revoke verification gates. Optimism ERC-20, batch,
and global revoke remain unavailable.

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
