# Contract Scope

## MVP Contract Methods

### ERC-20 Read
- `allowance(address owner, address spender)`
- `symbol()`
- `decimals()`
- `name()`

### ERC-20 Write
- `approve(address spender, uint256 amount)`

## Approval Model
Revocation is implemented by calling:

`approve(spender, 0)`

## Known Limitations
- Not all tokens behave perfectly
- Some non-standard ERC-20 tokens may revert or behave differently
- Unlimited approvals may be represented as max uint256
- Discovery depends on the token and spender registry unless indexing is added
