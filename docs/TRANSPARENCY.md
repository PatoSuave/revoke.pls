# Transparency Notes

Pulse Revoke is public code for reviewing and clearing wallet approvals on
PulseChain, BSC / BNB Smart Chain, Base, Polygon, Sonic Mainnet, Avalanche
C-Chain, Mantle, Linea, Blast, Berachain, Celo, Gnosis, Unichain, World Chain,
Robinhood Chain, Monad, Katana, Sei, Plasma, Abstract, Fraxtal, Taiko, opBNB,
Moonbeam, ApeChain, XDC Network, Ethereum Mainnet, Arbitrum One, Optimism / OP
Mainnet, and HyperEVM.

## What The App Does

- Connects to a user wallet through standard wallet connectors
- Reads public historical approval logs from configured explorer APIs
- Deduplicates approval candidates
- Rechecks live on-chain state before display
- Shows active approvals only
- Adds chain-scoped registry labels where known
- Looks up PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea,
  Blast, Berachain, Celo, Gnosis, Unichain, World Chain, Robinhood Chain,
  Monad, Katana, Sei, Plasma, Abstract, Fraxtal, Taiko, opBNB, Moonbeam,
  ApeChain, and XDC token logos by token contract address for display only
- Prepares standard approval-clearing transactions when the user chooses to
  revoke
- Scans BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast, Berachain,
  Celo, Gnosis, Unichain, World Chain, Robinhood Chain, Monad, Katana, Sei,
  Plasma, Abstract, Fraxtal, Taiko, opBNB, Moonbeam, ApeChain, and XDC through
  a server-side read-only API in hosted web builds
- Scans Arbitrum One through a server-side read-only API and enables only
  live-verified ERC-20 and NFT row revoke
- Scans Optimism / OP Mainnet through a server-side API and enables only
  live-verified ERC-20 and NFT row revoke
- Scans HyperEVM through a server-side API and enables only live-verified
  ERC-20 and NFT row revoke

## What The App Does Not Do

- Does not ask for seed phrases
- Does not ask for private keys
- Does not take custody of funds
- Does not require token transfers
- Does not support Arbitrum batch revoke yet
- Does not support Optimism batch or global revoke yet
- Does not support HyperEVM batch or global revoke yet
- Does not use server-side signing, relayers, or private-key handling
- Does not guarantee complete discovery when explorer APIs are capped,
  rate-limited, unavailable, or malformed
- Does not claim that known registry labels make a spender safe
- Does not treat third-party token logos as verification, safety evidence, or
  a trusted registry label

## How Users Can Verify Behavior

- Review the active chain shown in the app.
- Open token and spender links on PulseScan, BscScan, BaseScan, PolygonScan,
  SonicScan, SnowScan, Mantle Explorer, LineaScan, Blastscan, Berascan,
  CeloScan, Gnosisscan, Uniscan, Worldscan, Robinhood Blockscout, Etherscan,
  Monadscan, Katanascan, Seiscan, Plasmascan, Abscan, Fraxscan, TaikoScan,
  opBNB BscScan, Moonscan, ApeScan, XDCScan, Arbiscan, Optimistic Etherscan, or
  Hyperevmscan.
- Check that revoke wallet prompts match the intended approval-clearing call.
- Confirm BSC transactions use BNB gas and BscScan links.
- Confirm PulseChain transactions use PLS gas and PulseScan links.
- Confirm Base transactions use ETH gas and BaseScan links.
- Confirm Polygon transactions use POL gas and PolygonScan links.
- Confirm Sonic transactions use S gas and SonicScan links.
- Confirm Avalanche transactions use AVAX gas and SnowScan links.
- Confirm Mantle transactions use MNT gas and Mantle explorer links.
- Confirm Linea transactions use ETH gas and LineaScan links.
- Confirm Blast transactions use ETH gas and Blastscan links.
- Confirm Berachain transactions use BERA gas and Berascan links.
- Confirm Celo transactions use CELO gas and CeloScan links.
- Confirm Gnosis transactions use XDAI gas and Gnosisscan links.
- Confirm Unichain transactions use ETH gas and Uniscan links.
- Confirm World Chain transactions use ETH gas and Worldscan links.
- Confirm Robinhood Chain transactions use ETH gas and Robinhood Blockscout
  links.
- Confirm Monad transactions use MON gas and Monadscan links.
- Confirm Katana transactions use ETH gas and Katanascan links.
- Confirm Sei transactions use SEI gas and Seiscan links.
- Confirm Plasma transactions use XPL gas and Plasmascan links.
- Confirm Abstract transactions use ETH gas and Abscan links.
- Confirm Fraxtal transactions use FRAX gas and Fraxscan links.
- Confirm Taiko transactions use ETH gas and TaikoScan links.
- Confirm opBNB transactions use BNB gas and opBNB BscScan links.
- Confirm Moonbeam transactions use GLMR gas and Moonscan links.
- Confirm ApeChain transactions use APE gas and ApeScan links.
- Confirm XDC transactions use XDC gas and XDCScan links.
- Use `/app?debug=1` for diagnostic information about discovery source,
  chain ID, API configuration presence, and incomplete scan reasons.

## Why Explorer APIs Are Used

Approval discovery starts from historical events. Public RPC providers can be
unreliable or impractical for large historical `eth_getLogs` scans, especially
on BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast, Berachain, Celo,
Gnosis, Unichain, World Chain, Robinhood Chain, Monad, Katana, Sei, Plasma, and
Abstract, Fraxtal, Taiko, opBNB, Moonbeam, ApeChain, and XDC. Pulse Revoke
uses explorer log APIs for historical discovery and then uses live RPC reads to
validate current state.

For BSC, hosted web historical discovery uses a server-side route backed by
Etherscan API V2 with `chainid=56`. BscScan is still used for public explorer
links. For Base, hosted web historical discovery uses the same server-side
route backed by Etherscan API V2 with `chainid=8453`. BaseScan is still used
for public explorer links. Polygon hosted web historical discovery uses the same
server-side route backed by Etherscan API V2 with `chainid=137`. PolygonScan is
still used for public explorer links. Sonic hosted web historical discovery
uses the same server-side route backed by Etherscan API V2 with `chainid=146`.
SonicScan is still used for public explorer links. Avalanche hosted web
historical discovery uses the same server-side route backed by Etherscan API V2
with `chainid=43114`. SnowScan is still used for public explorer links. Mantle
hosted web historical discovery uses the same server-side route backed by
Etherscan API V2 with `chainid=5000`. Mantle Explorer is still used for public
explorer links. Linea, Blast, Berachain, Celo, Gnosis, Unichain, and World
Chain hosted web historical discovery use the same server-side route backed by
Etherscan API V2 with `chainid=59144`, `chainid=81457`, `chainid=80094`,
`chainid=42220`, `chainid=100`, `chainid=130`, and `chainid=480`; LineaScan,
Blastscan, Berascan, CeloScan, Gnosisscan, Uniscan, and Worldscan remain the
public explorer links. Robinhood Chain hosted web historical discovery uses the
same server-side route backed by Robinhood Blockscout logs, without an
Etherscan API V2 key or `chainid` parameter; Robinhood Blockscout remains the
public explorer link. Monad, Katana, Sei, Plasma, Abstract, Fraxtal, Taiko,
opBNB, Moonbeam, ApeChain, and XDC hosted web historical discovery use the same
server-side route backed by Etherscan API V2 with `chainid=143`,
`chainid=747474`, `chainid=1329`, `chainid=9745`, `chainid=2741`,
`chainid=252`, `chainid=167000`, `chainid=204`, `chainid=1284`,
`chainid=33139`, and `chainid=50`; one shared server-side `ETHERSCAN_API_KEY`
can cover these chains when the account has access, and per-chain keys are
only optional overrides. Monadscan, Katanascan, Seiscan, Plasmascan, Abscan,
Fraxscan, TaikoScan, opBNB BscScan, Moonscan, ApeScan, and XDCScan remain
public explorer links. Ethereum, Arbitrum, Optimism, and HyperEVM discovery use server-side
read-only API routes so managed RPC URLs and explorer API keys do not need to
be exposed to the browser. Arbitrum requests use `chainid=42161` and Arbiscan
links. Optimism requests use `chainid=10` and Optimistic Etherscan links.
HyperEVM requests use `chainid=999` and Hyperevmscan links.

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

## Token Logos

PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast,
Berachain, Celo, Gnosis, Unichain, World Chain, Robinhood Chain, Monad, Katana,
Sei, Plasma, Abstract, Fraxtal, Taiko, opBNB, Moonbeam, ApeChain, and XDC token
logos are optional display metadata resolved through the server-side
`/api/token-logos` route. The resolver sends token contract addresses only, not
wallet owner addresses, spender addresses, allowance amounts, or revoke state.

Missing or failed logos fall back to token initials. Logos are not registry
evidence and must not change discovery, risk scoring, verification, or revoke
eligibility.

## Known Limitations

- Explorer APIs can return incomplete data, rate limits, or caps.
- Public RPC providers can fail live validation or transaction simulation.
- Some token and NFT contracts are nonstandard.
- NFT per-token discovery can be limited by contract behavior and historical
  event availability.
- Arbitrum One revoke is limited to live-verified ERC-20 and NFT rows
  with a matching connected wallet on chain `42161`; Arbitrum batch revoke is
  not enabled.
- Optimism row revoke is limited to live-verified ERC-20 and NFT rows with a
  matching connected wallet on chain `10`; batch and global revoke are not
  enabled.
- HyperEVM row revoke is limited to live-verified ERC-20 and NFT rows with a
  matching connected wallet on chain `999`; batch and global revoke are not
  enabled, and gas is paid in HYPE.
- BSC revokes above `16,777,216` estimated gas are blocked because BNB Smart
  Chain rejects individual transactions above the Osaka/Mendel cap.
- BSC revokes above `1,000,000` estimated gas show a warning before the wallet
  opens because that is unusually high for a normal approval revoke.
- Desktop and IPFS distribution paths may exist in repo documentation or
  scaffolding, but public live desktop/IPFS release artifacts are not part of
  the current product.
