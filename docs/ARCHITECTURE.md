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
There are two possible strategies:

### Strategy A: Live Wallet-Centric Reads
- User connects wallet
- App checks known token contracts
- Reads allowance(owner, spender) directly
- Fastest to build
- Limited by known token/spender universe

### Strategy B: Indexed Approval Events
- Use an indexer or backend job
- Track Approval events and spender relationships
- Better visibility
- More complex infrastructure

## Recommended MVP Approach
Start with Strategy A plus a curated registry of:
- common PulseChain tokens
- common PulseChain spender contracts
- known DEX / staking / protocol contracts

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
