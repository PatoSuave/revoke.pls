# Product Brief

## Product Name

Pulse Revoke

## Current Product

Pulse Revoke is a non-custodial approval scanner and revoker for supported EVM
chains. It helps users review token and NFT permissions, understand spender
context, and clear approvals they no longer trust.

## Primary Problem

Wallets often keep token approvals long after a user is done with a protocol.
Unlimited approvals can create risk if a spender contract is compromised,
upgraded maliciously, or misunderstood.

## Primary Users

- PulseChain users
- BSC users
- Base users
- Polygon users
- Ethereum users
- Arbitrum users reviewing live-verified ERC-20 and NFT approvals
- Optimism users reviewing live-verified ERC-20 and NFT approvals
- HyperEVM users reviewing live-verified ERC-20 and NFT approvals
- DeFi traders
- LP providers
- Yield farmers
- NFT users where the scanner can validate approvals
- Security-conscious wallet holders

## Current Goals

- Connect a wallet through injected connectors or WalletConnect when configured
- Scan address-only where the current scanner supports it
- Detect PRC-20, BEP-20, ERC-20, Permit2, and supported NFT approvals
- Scan PulseChain, BSC, Base, Polygon, Ethereum, Arbitrum One, Optimism, and
  HyperEVM according to their current source-backed support levels
- Enable Arbitrum, Optimism, and HyperEVM revoke only for verified ERC-20/NFT
  rows
- Show token, spender, allowance, chain, explorer, and risk context
- Revoke approvals one by one
- Run sequential fungible-token batch revoke on the generic lane only
- Show transaction and post-revoke verification state clearly
- Keep security warnings plain and specific

## Non-Goals

- Wallet creation
- Portfolio tracking
- Full transaction history explorer
- Cross-chain bridging
- On-chain simulation engine
- Automatic transaction execution
- Server-side signing
- Relayers
- Custody

## UX Priorities

- Clear risk presentation
- Short paths to scan and review
- Mobile-friendly layout
- Consistent Pulse Revoke naming
- Plain copy that users can verify
