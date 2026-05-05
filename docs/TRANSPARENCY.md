# Transparency Notes

Pulse Revoke is public code for reviewing and clearing wallet approvals on
PulseChain, BSC / BNB Smart Chain, and Base.

## What The App Does

- Connects to a user wallet through standard wallet connectors
- Reads public historical approval logs from configured explorer APIs
- Deduplicates approval candidates
- Rechecks live on-chain state before display
- Shows active approvals only
- Adds chain-scoped registry labels where known
- Prepares standard approval-clearing transactions when the user chooses to
  revoke

## What The App Does Not Do

- Does not ask for seed phrases
- Does not ask for private keys
- Does not take custody of funds
- Does not require token transfers
- Does not support Ethereum Mainnet right now
- Does not guarantee complete discovery when explorer APIs are capped,
  rate-limited, unavailable, or malformed
- Does not claim that known registry labels make a spender safe

## How Users Can Verify Behavior

- Review the active chain shown in the app.
- Open token and spender links on PulseScan, BscScan, or BaseScan.
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
explorer links.

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
- BSC revokes above `16,777,216` estimated gas are blocked because BNB Smart
  Chain rejects individual transactions above the Osaka/Mendel cap.
- BSC revokes above `1,000,000` estimated gas show a warning before the wallet
  opens because that is unusually high for a normal approval revoke.
- Desktop and IPFS distribution paths may exist in repo documentation or
  scaffolding, but public live desktop/IPFS release artifacts are not part of
  the current product.
