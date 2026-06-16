# Architecture

## Frontend

- Next.js App Router
- React components for wallet connect, scanner results, revoke actions, and
  diagnostics
- Tailwind CSS for the existing Pulse-themed UI

## Active Chains

Fourteen live product chains are surfaced across the app:

- PulseChain, chain ID `369`, native gas token `PLS`, explorer `PulseScan`
- BSC / BNB Smart Chain, chain ID `56`, native gas token `BNB`, explorer
  `BscScan`
- Base, chain ID `8453`, native gas token `ETH`, explorer `BaseScan`
- Polygon, chain ID `137`, native gas token `POL`, explorer `PolygonScan`
- Sonic Mainnet, chain ID `146`, native gas token `S`, explorer `SonicScan`
- Avalanche C-Chain, chain ID `43114`, native gas token `AVAX`, explorer
  `SnowScan`
- Mantle, chain ID `5000`, native gas token `MNT`, explorer `Mantle Explorer`
- Linea, chain ID `59144`, native gas token `ETH`, explorer `LineaScan`
- Blast, chain ID `81457`, native gas token `ETH`, explorer `Blastscan`
- Berachain, chain ID `80094`, native gas token `BERA`, explorer `Berascan`
- Ethereum Mainnet, chain ID `1`, native gas token `ETH`, explorer `Etherscan`
- Arbitrum One, chain ID `42161`, native gas token `ETH`, explorer `Arbiscan`
- Optimism / OP Mainnet, chain ID `10`, native gas token `ETH`, explorer
  `Optimistic Etherscan`, verified ERC-20/NFT row revoke
- HyperEVM, chain ID `999`, native gas token `HYPE`, explorer `Hyperevmscan`,
  verified ERC-20/NFT row revoke

PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast, and Berachain use the generic
scanner registry in `src/lib/chains.ts`, including the shared scan, revoke, and
batch lane.

Ethereum Mainnet is wallet-enabled for the Ethereum read-only discovery and
wallet-side revoke lane. It is surfaced as a live product chain, but it is not
handled by the generic scanner/batch path.

Arbitrum One is wallet-enabled so the app can recognize the connected network
and run the separate Arbitrum scanner lane. It is surfaced as a live product
chain, but it is not part of the generic scanner/batch path. Only live-verified
ERC-20 and NFT rows can route through controlled wallet-side revoke hooks;
batch revoke remains disabled.

Optimism is wallet-recognized so the app can show a live network status and run
the separate scanner lane. It is surfaced as a live product chain, but it is
not part of the generic scanner/batch path. Optimism revoke is limited to
verified ERC-20 and NFT rows and does not route to generic batch or global
revoke.

HyperEVM is wallet-recognized so the app can show a live network status and run
the separate scanner lane. It is surfaced as a live product chain, but it is
not part of the generic scanner/batch path. HyperEVM revoke is limited to
verified ERC-20 and NFT rows and does not route to generic batch or global
revoke. HyperEVM gas is paid in HYPE.

## Web3 Layer

- `src/lib/wagmi.ts` registers PulseChain, BSC, Base, Polygon, Sonic,
  Avalanche C-Chain, Mantle, Linea, Blast, Berachain, Ethereum Mainnet,
  Arbitrum One, OP Mainnet, and HyperEVM with wagmi. Ethereum, Arbitrum,
  Optimism, and HyperEVM use separate scanner lanes.
- PulseChain RPC defaults to `https://rpc.pulsechain.com`.
- BSC RPC defaults to `https://bsc-dataseed.bnbchain.org`.
- Base RPC defaults to `https://mainnet.base.org`.
- Polygon RPC defaults to `https://polygon.drpc.org`.
- Sonic RPC defaults to `https://rpc.soniclabs.com`.
- Avalanche C-Chain RPC defaults to
  `https://api.avax.network/ext/bc/C/rpc`.
- Mantle RPC defaults to `https://rpc.mantle.xyz`.
- Linea RPC defaults to `https://rpc.linea.build`.
- Blast RPC defaults to `https://rpc.blast.io`.
- Berachain RPC defaults to `https://rpc.berachain.com`.
- Ethereum wallet RPC defaults to `https://ethereum-rpc.publicnode.com` unless
  overridden for the wallet client.
- Arbitrum wallet chain recognition uses `https://arb1.arbitrum.io/rpc`.
  Production Arbitrum approval discovery uses server-only RPC/API settings
  through `/api/arbitrum/approvals`.
- Optimism wallet chain recognition uses `https://mainnet.optimism.io`.
  Production Optimism approval discovery uses server-only RPC/API settings
  through `/api/optimism/approvals`.
- HyperEVM wallet chain recognition uses `https://rpc.hyperliquid.xyz/evm`.
  Production HyperEVM approval discovery uses server-only RPC/API settings
  through `/api/hyperevm/approvals`.
- PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast,
  Berachain, and Ethereum wallet RPCs can be overridden with browser-visible public env vars. Server-side
  discovery RPCs use unprefixed server-only env vars.
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
5. Permit2 `Approval` and `Permit` events are treated as delegated allowance
   candidates, then rechecked with `allowance(owner, token, spender)` on the
   Permit2 contract before they render as active rows.
6. Contracts with both fungible and NFT approval surfaces in the current scan
   are marked as hybrid for display, filtering, search, and risk explanation.
   The hybrid label does not change live verification or revoke eligibility.
7. The curated registry enriches known tokens and spenders. It is not a
   discovery source.

BSC hosted web discovery is exposed through `/api/discovery/approvals`, backed
by Etherscan API V2 `module=logs&action=getLogs` with `chainid=56`, `topic0`
for the event signature, and the padded owner address in `topic1`. Public BSC
RPC `eth_getLogs` is not used for historical approval discovery. BscScan
remains the explorer for address, token, and transaction links.

Base hosted web discovery uses the same server route and Etherscan API V2 logs
path with `chainid=8453`. Public Base RPC `eth_getLogs` is not used for
historical approval discovery. BaseScan remains the explorer for address,
token, and transaction links.

Polygon hosted web discovery uses the same server route and Etherscan API V2
logs path with `chainid=137`. Public Polygon RPC `eth_getLogs` is not used for
historical approval discovery. PolygonScan remains the explorer for address,
token, and transaction links.

Sonic hosted web discovery uses the same server route and Etherscan API V2 logs
path with `chainid=146`. Public Sonic RPC `eth_getLogs` is not used for
historical approval discovery. SonicScan remains the explorer for address,
token, and transaction links.

Avalanche hosted web discovery uses the same server route and Etherscan API V2
logs path with `chainid=43114`. Public Avalanche RPC `eth_getLogs` is not used
for historical approval discovery. SnowScan remains the explorer for address,
token, and transaction links.

Mantle hosted web discovery uses the same server route and Etherscan API V2
logs path with `chainid=5000`. Public Mantle RPC `eth_getLogs` is not used for
historical approval discovery. Mantle Explorer remains the explorer for
address, token, and transaction links.

Linea hosted web discovery uses the same server route and Etherscan API V2
logs path with `chainid=59144`. Public Linea RPC `eth_getLogs` is not used for
historical approval discovery. LineaScan remains the explorer for address,
token, and transaction links.

Blast hosted web discovery uses the same server route and Etherscan API V2
logs path with `chainid=81457`. Public Blast RPC `eth_getLogs` is not used for
historical approval discovery. Blastscan remains the explorer for address,
token, and transaction links.

Berachain hosted web discovery uses the same server route and Etherscan API V2
logs path with `chainid=80094`. Public Berachain RPC `eth_getLogs` is not used
for historical approval discovery. Berascan remains the explorer for address,
token, and transaction links.

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
can be shown only after live reads verify current approval state, and
row-level revoke stays limited to verified ERC-20 and NFT rows.

HyperEVM historical discovery is exposed through `/api/hyperevm/approvals` so
managed RPC URLs and Etherscan API V2 keys stay server-only. The route is
read-only, uses bounded discovery and live-validation caps, requires
`chainid=999`, and never signs, relays, or submits transactions. HyperEVM rows
can be shown only after live reads verify current approval state, and
row-level revoke stays limited to verified ERC-20 and NFT rows.

## Explorer APIs

- PulseChain discovery API default:
  `https://api.scan.pulsechain.com/api`
- BSC discovery API default:
  `https://api.etherscan.io/v2/api`
- BSC discovery API chain id:
  `BSC_EXPLORER_CHAIN_ID=56`
- BSC server API key env vars:
  `BSC_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY`
- Desktop/static BSC fallback key env vars:
  `NEXT_PUBLIC_BSC_EXPLORER_API_KEY` / `NEXT_PUBLIC_BSCSCAN_API_KEY`
- Base discovery API default:
  `https://api.etherscan.io/v2/api`
- Base discovery API chain id:
  `BASE_EXPLORER_CHAIN_ID=8453`
- Base server API key env vars:
  `BASE_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY`
- Desktop/static Base fallback key env var:
  `NEXT_PUBLIC_BASE_EXPLORER_API_KEY`
- Polygon discovery API default:
  `https://api.etherscan.io/v2/api`
- Polygon discovery API chain id:
  `POLYGON_EXPLORER_CHAIN_ID=137`
- Polygon server API key env vars:
  `POLYGON_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY`
- Desktop/static Polygon fallback key env var:
  `NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY`
- Sonic server discovery API default:
  `https://api.etherscan.io/v2/api`
- Sonic server discovery API chain id:
  `SONIC_EXPLORER_CHAIN_ID=146`
- Sonic server API key env vars:
  `SONIC_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY`
- Desktop/static Sonic fallback key env var:
  `NEXT_PUBLIC_SONIC_EXPLORER_API_KEY`
- Avalanche server discovery API default:
  `https://api.etherscan.io/v2/api`
- Avalanche server discovery API chain id:
  `AVALANCHE_EXPLORER_CHAIN_ID=43114`
- Avalanche server API key env vars:
  `AVALANCHE_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY`
- Desktop/static Avalanche fallback key env var:
  `NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY`
- Mantle server discovery API default:
  `https://api.etherscan.io/v2/api`
- Mantle server discovery API chain id:
  `MANTLE_EXPLORER_CHAIN_ID=5000`
- Mantle server API key env vars:
  `MANTLE_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY`
- Desktop/static Mantle fallback key env var:
  `NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY`
- Linea server discovery API default:
  `https://api.etherscan.io/v2/api`
- Linea server discovery API chain id:
  `LINEA_EXPLORER_CHAIN_ID=59144`
- Linea server API key env vars:
  `LINEA_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY`
- Blast server discovery API default:
  `https://api.etherscan.io/v2/api`
- Blast server discovery API chain id:
  `BLAST_EXPLORER_CHAIN_ID=81457`
- Blast server API key env vars:
  `BLAST_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY`
- Berachain server discovery API default:
  `https://api.etherscan.io/v2/api`
- Berachain server discovery API chain id:
  `BERACHAIN_EXPLORER_CHAIN_ID=80094`
- Berachain server API key env vars:
  `BERACHAIN_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY`
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
- HyperEVM server RPC env vars:
  `HYPEREVM_RPC_URL` / `HYPEREVM_MAINNET_RPC_URL` /
  `HYPERLIQUID_EVM_RPC_URL`
- HyperEVM server discovery API default:
  `https://api.etherscan.io/v2/api`
- HyperEVM server discovery API chain id:
  `HYPEREVM_EXPLORER_CHAIN_ID=999`
- HyperEVM server API key env vars:
  `HYPEREVM_EXPLORER_API_KEY` / `HYPEREVM_ETHERSCAN_API_KEY` /
  `ETHERSCAN_API_KEY` / `BSC_EXPLORER_API_KEY`

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

User-facing Polygon copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `POL` for gas

User-facing Sonic copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `S` for gas

User-facing Avalanche copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `AVAX` for gas

User-facing Mantle copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `MNT` for gas

User-facing Linea copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `ETH` for gas

User-facing Blast copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `ETH` for gas

User-facing Berachain copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `BERA` for gas

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
- `Verified-row revoke` for ERC-20 and NFT row state
- `Batch revoke disabled` for Optimism batch/global actions

User-facing HyperEVM copy uses:

- `ERC-20` for fungible token approvals
- `ERC-721` for NFT approvals
- `ERC-1155` for multi-token NFT / semi-fungible approvals
- `HYPE` for gas
- `Verified-row revoke` for ERC-20 and NFT row state
- `Batch revoke disabled` for HyperEVM batch/global actions

Permit2 rows are shown as delegated token allowances. The row still carries the
underlying token address and spender address, but live reads and revoke calls go
through the Permit2 contract. Hybrid rows are display/risk annotations for token
contracts with both fungible and NFT approval signals; the normal ERC-20 or NFT
verification path remains the source of truth.

## Transaction Flow

Fungible token revoke:

1. User reviews an active approval.
2. App refreshes live allowance on the same chain.
3. App prepares `approve(spender, 0)`.
4. Wallet signs and submits on the approval's `chainId`.
5. UI links the transaction to PulseScan, BscScan, BaseScan, PolygonScan,
   SonicScan, SnowScan, Mantle Explorer, LineaScan, Blastscan, Berascan,
   Etherscan, Arbiscan, Optimistic Etherscan, or Hyperevmscan and rescans
   after success.

Permit2 delegated allowance revoke:

1. User reviews a live-verified Permit2 delegated allowance.
2. App refreshes `allowance(owner, token, spender)` on the Permit2 contract.
3. App prepares `Permit2.approve(token, spender, 0, 0)`.
4. Wallet signs and submits on the approval's `chainId`.
5. Post-revoke verification reads the Permit2 nested allowance again before
   reporting cleared.

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

Optimism revoke is limited to live-verified ERC-20 and NFT rows from the
server-side Optimism API. It uses the existing controlled ERC-20 and NFT revoke
hooks, including owner, chain, preflight, and post-revoke verification gates.
Optimism batch and global revoke remain unavailable.

HyperEVM revoke is limited to live-verified ERC-20 and NFT rows from the
server-side HyperEVM API. It uses the existing controlled ERC-20 and NFT revoke
hooks, including owner, chain, preflight, and post-revoke verification gates.
HyperEVM batch and global revoke remain unavailable. Gas is paid in HYPE.

## BSC Gas Safety

BNB Smart Chain enforces an Osaka/Mendel transaction gas cap. Pulse Revoke keeps
two BSC-specific revoke preflight thresholds in `src/lib/chains.ts` and
`src/lib/preflight.ts`:

- Hard cap: `16_777_216n`
- High-gas warning threshold: `1_000_000n`

BSC revokes estimated above the hard cap are blocked before wallet submission.
BSC revokes estimated above the warning threshold and at or below the hard cap
require an explicit in-app confirmation before the wallet opens. BSC revokes
that pass policy use viem/wagmi transaction gas as `gas`, not `gasLimit`.

## Security Principles

- Never ask for a seed phrase
- Never request unnecessary signatures
- Clearly distinguish reads from writes
- Explain gas before revoke
- Link spender/operator addresses to the active chain explorer
- Keep telemetry aggregate and privacy-safe
