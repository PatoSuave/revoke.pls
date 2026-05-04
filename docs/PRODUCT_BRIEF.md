# Product Brief

## Product Name
Pulse Revoke

## Vision
Create a clean, fast approval management interface for PulseChain and BSC, similar in spirit to revoke.cash, while preserving the Pulse Revoke identity and a narrow security-first scope.

## Primary Problem
Users often approve tokens to contracts and forget about those approvals. Unlimited approvals can create significant risk if a spender contract is compromised or malicious.

## Primary Users
- PulseChain users
- BSC users
- DeFi traders
- LP providers
- Yield farmers
- NFT users where the supported approval pipeline can validate approvals
- Security-conscious wallet holders

## MVP Goals
- Connect wallet
- Detect PRC-20 and BEP-20 approvals
- Detect NFT approvals where supported by the app pipeline
- Show spender and allowance
- Revoke approvals one by one
- Run sequential fungible-token batch revokes on one chain at a time
- Display transaction state clearly
- Present strong warnings and safe UX

## Non-Goals for MVP
- Wallet creation
- Portfolio tracking
- Full transaction history explorer
- Cross-chain bridging
- On-chain simulation engine
- Advanced analytics

## UX Priorities
- Very clear risk presentation
- Minimal clicks
- Mobile-friendly
- Fast load
- Pulse Revoke visual identity
- Trustworthy and clean design
