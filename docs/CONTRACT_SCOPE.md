# Contract Scope

## MVP Contract Methods

### Fungible Token Read
- `allowance(address owner, address spender)`
- `symbol()`
- `decimals()`
- `name()`

### Fungible Token Write
- `approve(address spender, uint256 amount)`

## Approval Model
Revocation is implemented by calling:

`approve(spender, 0)`

## BSC Naming
BSC user-facing copy uses BEP-20, BEP-721, BEP-1155, and BNB. Internal ABIs
remain ERC-compatible because BSC is EVM-compatible.

## Known Limitations
- Not all tokens behave perfectly
- Some non-standard tokens may revert or behave differently
- Unlimited approvals may be represented as max uint256
- Discovery depends on explorer log APIs plus live validation, not the registry
