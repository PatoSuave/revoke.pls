# Roadmap

This roadmap is descriptive, not a promise of future support. New networks,
write paths, or distribution modes should be explicitly reviewed before they
ship.

## Live Product

- PulseChain support
- BSC / BNB Smart Chain support
- Base support
- Polygon support
- Sonic Mainnet support
- Avalanche C-Chain support
- Mantle support
- Linea support
- Blast support
- Berachain support
- Celo support
- Gnosis support
- Unichain support
- World Chain support
- Robinhood Chain support
- Ethereum Mainnet read-only discovery and wallet-side revoke
- Arbitrum One ERC-20/NFT verified-row revoke
- Optimism / OP Mainnet ERC-20/NFT verified-row revoke
- HyperEVM ERC-20/NFT verified-row revoke
- First-class product copy and wallet switching for all nineteen live chains
- Browser wallet connection
- WalletConnect when configured
- Historical approval log discovery
- Live on-chain validation
- PRC-20 / BEP-20 / ERC-20 approval display and revoke on supported chains
- NFT approval display and revoke where supported by the app pipeline
- Sequential fungible token batch revoke
- Chain-scoped token and spender registry enrichment
- BSC Etherscan API V2 discovery with `chainid=56`
- Base Etherscan API V2 discovery with `chainid=8453`
- Polygon Etherscan API V2 discovery with `chainid=137`
- Sonic Etherscan API V2 discovery with `chainid=146`
- Avalanche Etherscan API V2 discovery with `chainid=43114`
- Mantle Etherscan API V2 discovery with `chainid=5000`
- Linea Etherscan API V2 discovery with `chainid=59144`
- Blast Etherscan API V2 discovery with `chainid=81457`
- Berachain Etherscan API V2 discovery with `chainid=80094`
- Celo Etherscan API V2 discovery with `chainid=42220`
- Gnosis Etherscan API V2 discovery with `chainid=100`
- Unichain Etherscan API V2 discovery with `chainid=130`
- World Chain Etherscan API V2 discovery with `chainid=480`
- Robinhood Chain Blockscout discovery without an Etherscan API V2 key
- Ethereum server-read-only Etherscan API V2 discovery with `chainid=1`
- Arbitrum server-read-only Etherscan API V2 discovery with `chainid=42161`
- Optimism server-read-only Etherscan API V2 discovery with `chainid=10`
- HyperEVM server-read-only Etherscan API V2 discovery with `chainid=999`
- BSC hard gas-cap block and high-gas warning UX

## Active Guardrails

- Ethereum Mainnet must remain server-read-only for discovery and wallet-side
  only for revoke. Do not add server-side signing, relayers, private keys, or
  API route transaction submission.
- Arbitrum One must remain limited to verified-row ERC-20/NFT revoke until
  batch revoke is explicitly planned, implemented, and reviewed. Do not add
  Arbitrum batch revoke, server-side signing, relayers, private keys, or API
  route transaction submission.
- Optimism must remain limited to verified-row ERC-20/NFT revoke until batch
  revoke is explicitly planned, implemented, and reviewed. Do not add Optimism
  batch revoke, server-side signing, relayers, private keys, or API route
  transaction submission.
- HyperEVM must remain limited to verified-row ERC-20/NFT revoke until batch
  revoke is explicitly planned, implemented, funded-wallet tested, and
  reviewed. Do not add HyperEVM batch revoke, server-side signing, relayers,
  private keys, or API route transaction submission.
- Do not broaden into unsupported networks without explicit review.
- Do not treat registry labels as proof of safety.
- Do not show a clear state when discovery or validation is incomplete.
- Do not auto-run every address-only network scan from a pasted address; require
  a selected network or an explicit sequenced scan-all action.
- Do not publish desktop or IPFS artifacts until real signed artifacts,
  checksums, and release metadata exist.

## Future Ideas Requiring Review

- More manually verified PulseChain, BSC, Base, Polygon, Sonic, Avalanche,
  Mantle, Linea, Blast, Berachain, Celo, Gnosis, Unichain, World Chain, and
  Robinhood Chain registry labels
- Future Arbitrum batch revoke only after separate planning and QA
- Future Optimism batch revoke only after separate planning and QA
- Future HyperEVM batch revoke only after separate planning and QA
- Additional suspicious-spender heuristics
- Better unsupported-network guidance
- More focused manual QA fixtures for BSC high-gas cases
- Desktop packaging after signing, checksums, icons, and release policy are
  ready
- IPFS distribution only after real artifacts are produced and pinned
