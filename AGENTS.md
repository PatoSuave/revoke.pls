# Agent Instructions

These instructions apply to the whole repository unless a more specific
`AGENTS.md` exists in a child directory.

## Product Safety Model

Pulse Revoke is a non-custodial approval scanner and revoke interface. It may
read public/on-chain data, prepare user-approved revoke transactions, and show
risk context. It must not become a custody, rescue, signing, or recovery
service.

Non-negotiable boundaries:

- Never ask for a seed phrase.
- Never ask for a private key.
- Never ask for mnemonic words, recovery phrases, keystore JSON, wallet
  passwords, or remote desktop access.
- Do not add server-side private keys.
- Do not add server-side signing.
- Do not add backend relayers.
- Do not add custody flows.
- Do not add app-controlled rescue wallets.
- Do not add rescue smart contracts.
- Do not add automatic gas funding to compromised wallets.
- Do not add automatic token, NFT, native-token, or staking-position transfer
  flows from compromised wallets.
- Do not add automatic HEX End Stake, Emergency End Stake, or Good Accounting
  write execution.
- Do not add private bundle, Flashbots, private mempool, or MEV rescue
  execution in the MVP.
- Do not claim guaranteed recovery.
- Do not claim the app can remove a hacker.
- Do not show an "all clear" state when any scan module is incomplete.

## Existing Revoke Gates

Preserve the existing revoke safety gates unless the user explicitly approves a
dedicated change to them:

- Address-only scans remain read-only.
- Revoke actions remain disabled unless the connected wallet exactly matches
  the scanned owner.
- Chain-specific actions remain disabled unless the connected chain matches the
  row chain.
- Revoke actions remain disabled unless the row is live-verified active.
- Existing preflight and gas safety checks must remain intact.
- Existing revoke execution behavior must not be modified without explicit
  approval.

## Wallet Lifeboat Rule

Wallet Lifeboat automates intelligence, not rescue execution.

Wallet Lifeboat features may triage public/on-chain signals before the user
connects a wallet or adds gas. They must not take custody, move assets, sign
transactions, fund compromised wallets, deploy rescue contracts, or submit
rescue transactions.

Before adding or changing Wallet Lifeboat behavior, read:

- `docs/lifeboat/WALLET_LIFEBOAT_MASTER_SPEC.md`
- `docs/lifeboat/SAFETY_BOUNDARIES.md`
- `docs/lifeboat/PHASES.md`

## Implementation Discipline

- Keep changes narrowly scoped to the requested phase.
- Prefer existing scanner, chain, explorer, preflight, and reporting utilities.
- Use bounded requests, timeouts, rate limits, and no-store responses for hosted
  read APIs.
- Treat registry labels, risk scores, and heuristics as context, not proof.
- Use careful language for suspicious recipients or contracts. Avoid
  defamatory labels unless backed by a curated, reviewed source.
- Add tests for any new parser, heuristic, API route, or safety gate.
- Run the validation commands requested by the phase ticket before handoff.
