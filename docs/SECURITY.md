# Security Notes

The canonical public security policy is [../SECURITY.md](../SECURITY.md).

This project does not claim an external audit. Treat the source as open for
review and verify wallet prompts before signing.

## Principles

- Never request seed phrases or private keys.
- Keep reads visibly separate from writes.
- Only prepare explicit approval-clearing transactions after user action.
- Show token, spender, operator, chain, and explorer context before signing.
- Preserve chain-correct transaction submission.
- Keep telemetry aggregate and privacy-safe.

## Write Scope

- Fungible token `approve(spender, 0)`
- NFT `setApprovalForAll(operator, false)`
- NFT `approve(address(0), tokenId)`

Any new write path should be documented, reviewed, and tested before release.
