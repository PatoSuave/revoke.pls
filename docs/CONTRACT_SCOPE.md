# Contract Scope

## Contract Methods

### Fungible Token Read
- `allowance(address owner, address spender)`
- `symbol()`
- `decimals()`
- `name()`

### Fungible Token Write
- `approve(address spender, uint256 amount)`

### NFT Reads
- `isApprovedForAll(address owner, address operator)`
- `getApproved(uint256 tokenId)`
- `supportsInterface(bytes4 interfaceId)` where needed for standard checks
- `name()` where available

### NFT Writes
- `setApprovalForAll(address operator, bool approved)`
- `approve(address to, uint256 tokenId)`

## Approval Model
Fungible token revocation is implemented by calling:

`approve(spender, 0)`

NFT revocation is implemented by calling:

- `setApprovalForAll(operator, false)`
- `approve(address(0), tokenId)`

## BSC Naming
BSC user-facing copy uses BEP-20, BEP-721, BEP-1155, and BNB. Internal ABIs
remain ERC-compatible because BSC is EVM-compatible.

## Base Naming
Base user-facing copy uses ERC-20, ERC-721, ERC-1155, and ETH. Base is
EVM-compatible, but it is not Ethereum Mainnet support.

## Arbitrum Naming
Arbitrum user-facing copy uses ERC-20, ERC-721, ERC-1155, and ETH. Arbitrum One
uses a separate verified-row lane in the current product; the app reads
`allowance`, `isApprovedForAll`, and `getApproved`, then only enables matching
wallet row-level revoke after live verification.

## Optimism Naming
Optimism user-facing copy uses ERC-20, ERC-721, ERC-1155, ETH, and OP Mainnet
where chain-specific naming is helpful. Optimism uses a separate verified-row
lane in the current product; the app reads `allowance`, `isApprovedForAll`, and
`getApproved`, then only enables matching-wallet row-level NFT revoke after
live verification. Optimism ERC-20, batch, and global revoke are not enabled.

## Known Limitations
- Not all tokens behave perfectly
- Some non-standard tokens may revert or behave differently
- Unlimited approvals may be represented as max uint256
- Discovery depends on explorer log APIs plus live validation, not the registry
- BSC revokes above 16,777,216 estimated gas are blocked before wallet
  submission
- BSC revokes above 1,000,000 estimated gas and at or below 16,777,216 gas
  require an explicit high-gas confirmation before the wallet opens
