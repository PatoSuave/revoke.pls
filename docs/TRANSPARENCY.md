# Transparency Notes

Pulse Revoke is public code for reviewing and clearing wallet approvals on
PulseChain, BSC / BNB Smart Chain, Base, and Ethereum Mainnet verified rows,
with Arbitrum One verified-row revoke and Optimism NFT verified-row revoke.

## What The App Does

- Connects to a user wallet through standard wallet connectors
- Reads public historical approval logs from configured explorer APIs
- Deduplicates approval candidates
- Rechecks live on-chain state before display
- Shows active approvals only
- Adds chain-scoped registry labels where known
- Prepares standard approval-clearing transactions when the user chooses to
  revoke
- Scans Arbitrum One through a server-side read-only API and enables only
  live-verified ERC-20 and NFT row revoke
- Scans Optimism / OP Mainnet through a server-side API and enables only
  live-verified NFT row revoke

## What The App Does Not Do

- Does not ask for seed phrases
- Does not ask for private keys
- Does not take custody of funds
- Does not require token transfers
- Does not support Arbitrum batch revoke yet
- Does not support Optimism ERC-20, batch, or global revoke yet
- Does not use server-side signing, relayers, or private-key handling
- Does not guarantee complete discovery when explorer APIs are capped,
  rate-limited, unavailable, or malformed
- Does not claim that known registry labels make a spender safe

## How Users Can Verify Behavior

- Review the active chain shown in the app.
- Open token and spender links on PulseScan, BscScan, BaseScan, Etherscan,
  Arbiscan, or Optimistic Etherscan.
- Check that revoke wallet prompts match the intended approval-clearing call.
- Confirm BSC transactions use BNB gas and BscScan links.
- Confirm PulseChain transactions use PLS gas and PulseScan links.
- Confirm Base transactions use ETH gas and BaseScan links.
- Use `/app?debug=1` for diagnostic information about discovery source,
  chain ID, API configuration presence, and incomplete scan reasons.

## Why Explorer APIs Are Used

Approval discovery starts from historical events. Public RPC providers can be
unreliable or impractical for large historical `eth_getLogs` scans, especially
on BSC and Base. Pulse Revoke uses explorer log APIs for historical discovery
and then uses live RPC reads to validate current state.

For BSC, historical discovery uses Etherscan API V2 with `chainid=56`. BscScan
is still used for public explorer links. For Base, historical discovery uses
Etherscan API V2 with `chainid=8453`. BaseScan is still used for public
explorer links. Ethereum and Arbitrum discovery use server-side read-only API
routes so managed RPC URLs and explorer API keys do not need to be exposed to
the browser; Arbitrum requests use `chainid=42161` and Arbiscan links.
Optimism requests also use a server-side route, Etherscan API V2 with
`chainid=10`, and Optimistic Etherscan links.

## Why Live Validation Matters

Historical approval events only show that an approval happened in the past. A
spender may have been cleared or changed later. Pulse Revoke rechecks live
state, such as `allowance(owner, spender)`, `isApprovedForAll(owner, operator)`,
or `getApproved(tokenId)`, before displaying active approvals.

If live validation fails, the app should report an incomplete or unverified
state instead of pretending the wallet is clear.

## Registry Labels

Registry labels are chain-scoped enrichment. They help users recognize known
tokens and spenders, but they are not a discovery source and they are not proof
of safety.

An "unknown spender" means the address was not found in the app's verified
registry for that chain. It does not automatically mean malicious, and it does
not automatically mean safe.

## Known Limitations

- Explorer APIs can return incomplete data, rate limits, or caps.
- Public RPC providers can fail live validation or transaction simulation.
- Some token and NFT contracts are nonstandard.
- NFT per-token discovery can be limited by contract behavior and historical
  event availability.
- Arbitrum One revoke is limited to live-verified ERC-20 and NFT rows
  with a matching connected wallet on chain `42161`; Arbitrum batch revoke is
  not enabled.
- Optimism is read-only; ERC-20, NFT, batch, and global revoke are not enabled.
- BSC revokes above `16,777,216` estimated gas are blocked because BNB Smart
  Chain rejects individual transactions above the Osaka/Mendel cap.
- BSC revokes above `1,000,000` estimated gas show a warning before the wallet
  opens because that is unusually high for a normal approval revoke.
- Desktop and IPFS distribution paths may exist in repo documentation or
  scaffolding, but public live desktop/IPFS release artifacts are not part of
  the current product.
