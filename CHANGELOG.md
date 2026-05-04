# Changelog

## 2026-05-04 - BSC Support + Public Audit Documentation

Pulse Revoke now supports approval scanning and revocation on PulseChain and
BSC / BNB Smart Chain.

### Supported Live Networks

- PulseChain
- BSC / BNB Smart Chain

Ethereum is not active in this release.

### What Changed

- Added BSC approval scanning and revoke support alongside existing PulseChain
  support.
- Added BSC user-facing labels for `BEP-20`, `BEP-721`, and `BEP-1155`.
- Added BNB gas wording for BSC revoke flows.
- Kept BSC explorer links on BscScan.
- Kept registry enrichment chain-scoped so PulseChain labels do not leak onto
  BSC.

### BSC Implementation Notes

- BSC historical approval discovery uses Etherscan API V2.
- BSC log requests include `chainid=56`.
- BSC explorer links continue to use BscScan.
- Public BSC RPC is not used as the historical approval discovery source.

### Revoke Safety Improvements

- BSC revokes over `16,777,216` estimated gas are blocked before wallet
  submission.
- BSC revokes over `1,000,000` estimated gas and at or below the hard cap show
  an in-app high-gas warning before the wallet opens.
- Revoke calls use standard approval-clearing methods:
  - `approve(spender, 0)`
  - `setApprovalForAll(operator, false)`
  - `approve(address(0), tokenId)`

### Public Audit And Transparency Docs

- Added public audit guidance.
- Added environment documentation.
- Added transparency notes.
- Added a root security policy.

Full release note:
[docs/releases/bsc-support-live-v1.md](docs/releases/bsc-support-live-v1.md)
