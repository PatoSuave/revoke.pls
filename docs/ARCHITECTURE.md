# Architecture

## Frontend
- Next.js App Router
- React components for wallet connect, token approval tables, revoke actions
- Tailwind for styling

## Web3 Layer
- viem for reads and writes
- wagmi for wallet connection and chain state
- PulseChain chain config added manually

## Data Strategy
The scanner uses a discovery-first pipeline:

1. User connects on a supported chain.
2. The app fetches historical `Approval` / `ApprovalForAll` logs for the owner
   from the chain's configured explorer API.
3. Raw log candidates are deduped into token/spender or collection/operator
   pairs.
4. Every candidate is re-checked live on-chain via `allowance`,
   `isApprovedForAll`, or `getApproved` before it is displayed as active.
5. The curated registry enriches known tokens and spenders; it is not the
   discovery source of truth.

## Chain API Strategy

- PulseChain live reads/writes use `https://rpc.pulsechain.com` by default.
- PulseChain historical discovery uses PulseScan's BlockScout-compatible
  `https://api.scan.pulsechain.com/api` logs endpoint.
- The PulseScan ETH-RPC endpoint documented at
  `https://api.scan.pulsechain.com/eth-rpc-api-docs` only supports a small
  method subset (`eth_blockNumber`, `eth_getBalance`, `eth_getLogs`) and caps
  `eth_getLogs` responses at 1000 logs, so it should not be used as the wagmi
  transport for normal EVM reads/writes.
- Ethereum live reads/writes use the configured mainnet RPC transport.
- Ethereum historical discovery uses Etherscan v2 and requires
  `NEXT_PUBLIC_ETHERSCAN_API_KEY`.

The discovery fetcher uses adaptive block-range windowing when an explorer
returns the 1000-log cap. PulseScan may pad topic arrays with trailing `null`
values, so log parsing normalizes those before distinguishing ERC-20/PRC-20
approvals from ERC-721 per-token approvals.

## Transaction Flow
1. User selects approval to revoke
2. App prepares `approve(spender, 0)`
3. Wallet signs transaction
4. Chain confirms
5. UI refreshes allowance state

## Security Principles
- Never ask for seed phrase
- Never request unnecessary signatures
- Clearly distinguish reads from writes
- Explain gas before revoke
- Link spender address to explorer
