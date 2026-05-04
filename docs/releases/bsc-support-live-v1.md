# BSC Support + Public Audit Documentation

Pulse Revoke now supports approval scanning and revocation on PulseChain and
BSC / BNB Smart Chain.

Live app: <https://pulserevoke.com>

This release adds BSC support while preserving existing PulseChain behavior.
Ethereum is not active in this release.

## Supported Live Networks

- PulseChain
- BSC / BNB Smart Chain

## What Changed

- Added BSC / BNB Smart Chain as the second live supported network.
- Added BSC approval discovery for active approvals.
- Added BSC revoke support for standard EVM-compatible approval-clearing calls.
- Added BSC user-facing token standard labels:
  - `BEP-20`
  - `BEP-721`
  - `BEP-1155`
- Added BNB gas wording for BSC transaction copy.
- Added BscScan links for BSC addresses, tokens, and transactions.
- Kept PulseChain support intact.
- Kept registry enrichment chain-scoped.

## BSC Implementation Notes

- BSC chain ID is `56`.
- Historical BSC approval discovery uses Etherscan API V2.
- BSC historical log requests include `chainid=56`.
- BSC explorer links use BscScan.
- BSC gas is shown as BNB.
- Public BSC RPC is not used for historical approval discovery.
- Explorer/API caps, rate limits, malformed responses, or live validation
  failures should be surfaced as incomplete or unverified states rather than a
  false clear result.

## Revoke Safety Improvements

Revoke calls use standard approval-clearing methods:

- BEP-20 / ERC-compatible fungible approvals:
  `approve(spender, 0)`
- NFT operator approvals:
  `setApprovalForAll(operator, false)`
- NFT per-token approvals:
  `approve(address(0), tokenId)`

BSC gas safety was added for revoke preflight:

- Estimated gas above `16,777,216` is blocked before wallet submission because
  BNB Smart Chain rejects individual transactions above the Osaka/Mendel cap.
- Estimated gas above `1,000,000` and at or below `16,777,216` shows an in-app
  high-gas warning before the wallet opens.
- High-gas BSC batch items are skipped by default for individual review.

This does not mean a high-gas transaction is automatically malicious. It means
the estimate is unusual for a normal approval revoke and should be reviewed
carefully before signing.

## Public Audit And Transparency Docs

This release also improves public documentation so users, developers, and
auditors can review the codebase and behavior:

- `README.md`
- `SECURITY.md`
- `docs/AUDIT-GUIDE.md`
- `docs/ENVIRONMENT.md`
- `docs/TRANSPARENCY.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTRACT_SCOPE.md`
- `docs/scanner-qa-checklist.md`

The project does not claim an external audit. The source is public and open for
review.

## What Is Not Included

- Ethereum support
- Any new network beyond PulseChain and BSC
- A backend/indexer for approval discovery
- A guarantee that every historical approval is always found
- A guarantee that registry-labeled spenders are safe
- Desktop binaries
- IPFS or Pinata publishing
- Token transfers or custody

## Manual Verification Checklist

### PulseChain Regression

- Open <https://pulserevoke.com>.
- Launch `/app`.
- Connect on PulseChain.
- Confirm the app recognizes PulseChain as supported.
- Run a scan.
- Confirm active PulseChain approvals still display.
- Confirm PulseChain revoke copy uses PLS gas wording.
- Confirm PulseScan links open for PulseChain addresses and transactions.

### BSC Functionality

- Open `/app`.
- Connect on BSC / BNB Smart Chain.
- Confirm the app recognizes BSC as supported.
- Run a scan.
- Confirm active BEP-20 approvals display when present.
- Confirm NFT approvals use BEP-721 and BEP-1155 naming where applicable.
- Confirm BSC revoke copy uses BNB gas wording.
- Confirm BscScan links open for BSC addresses, tokens, and transactions.
- Confirm BSC revoke transactions use standard approval-clearing methods.

### BSC Discovery

- Confirm BSC historical discovery uses Etherscan API V2.
- Confirm BSC log requests include `chainid=56`.
- Confirm old BscScan V1 logs endpoint configuration produces an actionable
  warning rather than a false clear state.
- Confirm incomplete discovery or live validation failures are surfaced.

### BSC Gas Safety

- Test a normal low-gas BSC revoke and confirm the wallet opens normally.
- Test or simulate a BSC revoke estimated above `1,000,000` gas and confirm the
  in-app high-gas warning appears before the wallet opens.
- Continue through the high-gas warning only after verifying the token and
  spender.
- Test or simulate a BSC revoke estimated above `16,777,216` gas and confirm it
  is blocked before wallet submission.
- Confirm high-gas BSC items are skipped by default in batch revoke and require
  individual review.

### General Safety

- Confirm unsupported networks do not scan or revoke.
- Confirm Ethereum is not listed as an active supported network.
- Confirm registry labels remain chain-scoped.
- Confirm no seed phrase or private key is requested.
- Confirm wallet prompts show the final transaction before signing.
