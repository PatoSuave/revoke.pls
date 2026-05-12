# Roadmap

This roadmap is descriptive, not a promise of future support. New networks,
write paths, or distribution modes should be explicitly reviewed before they
ship.

## Live Product

- PulseChain support
- BSC / BNB Smart Chain support
- Base support
- Ethereum Mainnet read-only discovery and wallet-side revoke
- Arbitrum One ERC-20/NFT verified-row revoke
- Optimism / OP Mainnet NFT verified-row revoke
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
- Ethereum server-read-only Etherscan API V2 discovery with `chainid=1`
- Arbitrum server-read-only Etherscan API V2 discovery with `chainid=42161`
- Optimism server-read-only Etherscan API V2 discovery with `chainid=10`
- BSC hard gas-cap block and high-gas warning UX

## Active Guardrails

- Ethereum Mainnet must remain server-read-only for discovery and wallet-side
  only for revoke. Do not add server-side signing, relayers, private keys, or
  API route transaction submission.
- Arbitrum One must remain limited to verified-row ERC-20/NFT revoke until
  batch revoke is explicitly planned, implemented, and reviewed. Do not add
  Arbitrum batch revoke, server-side signing, relayers, private keys, or API
  route transaction submission.
- Optimism must remain limited to verified-row NFT revoke until ERC-20 or batch
  revoke is explicitly planned, implemented, and reviewed. Do not add Optimism
  ERC-20 revoke, batch revoke, server-side signing, relayers, private keys, or
  API route transaction submission.
- Do not broaden into unsupported networks without explicit review.
- Do not treat registry labels as proof of safety.
- Do not show a clear state when discovery or validation is incomplete.
- Do not auto-run every address-only network scan from a pasted address; require
  a selected network or an explicit sequenced scan-all action.
- Do not publish desktop or IPFS artifacts until real signed artifacts,
  checksums, and release metadata exist.

## Future Ideas Requiring Review

- More manually verified PulseChain, BSC, and Base registry labels
- Future Arbitrum batch revoke only after separate planning and QA
- Future Optimism ERC-20 verified-row revoke only after separate planning and QA
- Additional suspicious-spender heuristics
- Better unsupported-network guidance
- More focused manual QA fixtures for BSC high-gas cases
- Desktop packaging after signing, checksums, icons, and release policy are
  ready
- IPFS distribution only after real artifacts are produced and pinned
