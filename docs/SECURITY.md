# Security Notes

The canonical public policy is [../SECURITY.md](../SECURITY.md).

Pulse Revoke is non-custodial. It reviews public approval data, prepares
standard approval-clearing transactions, and leaves signing to the user's
wallet.

## Principles

- Never request seed phrases, private keys, or mnemonics.
- Keep reads visibly separate from writes.
- Keep address-only scans read-only.
- Prepare revoke calls only after user action.
- Show token, spender, operator, chain, gas, and explorer context before
  signing.
- Preserve chain-correct transaction submission.
- Treat labels, logos, and risk scores as context, not guarantees.
- Keep telemetry aggregate and free of wallet, token, spender, transaction, or
  balance data.

## Write Scope

| Approval type | Revoke call |
| --- | --- |
| Fungible token | `approve(spender, 0)` |
| NFT operator | `setApprovalForAll(operator, false)` |
| NFT per-token | `approve(address(0), tokenId)` |

Any new write path should be documented, reviewed, and tested before release.
