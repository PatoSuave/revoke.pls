# Release Parity Checklist (PulseChain + Ethereum)

Use this as a strict go/no-go gate before every production deploy.

---

## 1) Chain + discovery wiring

- [ ] Wallet connects successfully on:
  - [ ] PulseChain mainnet (chainId 369)
  - [ ] Ethereum mainnet (chainId 1)
- [ ] Wrong-network prompt appears on unsupported chains.
- [ ] Network switch buttons recover correctly to a supported chain.
- [ ] Ethereum discovery source behavior is verified:
  - [ ] With `NEXT_PUBLIC_ETHERSCAN_API_KEY` set: uses Etherscan v2.
  - [ ] Without key: falls back to Blockscout.
- [ ] PulseChain discovery uses PulseScan (or configured override).

## 2) ERC-20 revoke parity

For **both chains**:

- [ ] Scanner finds expected active approvals.
- [ ] Single revoke flow works:
  - [ ] Wallet prompt appears.
  - [ ] Pending state appears.
  - [ ] Confirmed state appears.
  - [ ] Revoked row disappears after confirmation + rescan.
- [ ] Batch revoke flow works:
  - [ ] Select approvals.
  - [ ] Review summary is accurate.
  - [ ] Start runs one tx at a time.
  - [ ] Stop-after-current works.
  - [ ] Completion summary counts are accurate.

## 3) NFT revoke parity

For **both chains** where approvals exist:

- [ ] `ApprovalForAll` revoke works and disappears after rescan.
- [ ] ERC-721 per-token revoke works and disappears after rescan.
- [ ] Per-token approvals only appear when BOTH are true:
  - [ ] `getApproved(tokenId) == operator`
  - [ ] `ownerOf(tokenId) == connected wallet`
- [ ] Explicit revoke events (`approve(address(0), tokenId)`) do **not**
      reappear as active approvals.

## 4) Failure-path behavior

- [ ] Wallet rejection is handled gracefully with retry UX.
- [ ] On-chain revert reason is surfaced to the user.
- [ ] RPC/explorer failures show actionable error + retry path.
- [ ] No stale “active” rows remain after successful revoke + rescan.

## 5) Scale / heavy-wallet checks

- [ ] Large-history wallet scan completes within acceptable UX time.
- [ ] Truncation warning behavior is understandable and non-blocking.
- [ ] Manual rescan still functions after a truncated scan.

## 6) Security and policy checks

- [ ] CSP and hardening headers are present on web deployment.
- [ ] External links open with `rel="noopener noreferrer"`.
- [ ] Build does not expose private secrets (only intended `NEXT_PUBLIC_*` values).

## 7) Regression gates (required)

Run and pass all:

- [ ] `npm run -s typecheck`
- [ ] `npm run -s lint`
- [ ] `npm run -s build`

---

## Recommended wallet test matrix (minimum)

- Wallet A: no approvals
- Wallet B: high ERC-20 approval count (old wallet)
- Wallet C: NFT `ApprovalForAll` approvals
- Wallet D: ERC-721 per-token approvals
- Wallet E: starts on unsupported network

