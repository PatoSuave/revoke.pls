# Scanner QA Checklist

Use this checklist to verify that Pulse Revoke reads approval state correctly on
PulseChain and BSC. Keep all testing low-risk and manual.

## Safety Setup

- Use a burner wallet or another low-risk wallet.
- Do not use a wallet holding meaningful funds or valuable NFTs.
- Never enter a seed phrase into Pulse Revoke or any test page.
- Keep enough native gas token for approval, revoke, and rescan testing.
- Open scanner diagnostics with `/app?debug=1` during QA.

## Network Coverage

Run the scanner flow on both supported chains:

- PulseChain mainnet, chain ID `369`, gas token `PLS`.
- BSC / BNB Smart Chain, chain ID `56`, gas token `BNB`.

For each chain, confirm diagnostics show:

- Expected chain ID and chain name.
- Supported chain: `Yes`.
- Expected explorer/log source.
- RPC env status without printing URL secrets.
- Explorer API env status.
- BscScan API key presence as configured/missing, never the key value.
- Fungible token and NFT scan status.
- Explorer request/window counts.
- Any truncation, explorer/API error, or RPC/live-read error.

## BSC Discovery Checks

- `NEXT_PUBLIC_BSC_EXPLORER_API_URL` is either unset or points to a
  BscScan-compatible logs endpoint.
- `NEXT_PUBLIC_BSCSCAN_API_KEY` is set for BSC discovery.
- BSC scans use BscScan logs API for historical approval discovery.
- The app does not rely on public BSC RPC `eth_getLogs` for historical
  approval discovery.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Controlled Fungible Approval Test

1. Use a burner wallet as the owner wallet.
2. Choose a low-value token on the target chain.
3. Approve a small allowance to a second wallet or spender address you control.
4. Open `/app?debug=1` and connect the owner wallet.
5. Confirm the app discovers at least one raw fungible approval log candidate.
6. Confirm diagnostics count a unique token/spender pair for the approval.
7. Confirm live allowance validation returns a nonzero allowance on the same
   chain.
8. Confirm the approval appears in normal scanner results.
9. Revoke the approval from the app.
10. Rescan after the transaction confirms.
11. Confirm the approval disappears or diagnostics show no nonzero allowance.
12. Verify directly on PulseScan or BscScan if results disagree.

## NFT Approval Test

Use only low-value NFTs or test collections.

For collection-wide approvals:

1. From the owner wallet, create a collection-wide approval with
   `setApprovalForAll(operator, true)` to a second wallet or operator you
   control.
2. Open `/app?debug=1` and connect the owner wallet on the same chain.
3. Confirm raw NFT approval logs are discovered.
4. Confirm NFT candidates and live NFT validation counts update.
5. Confirm the NFT approval appears in the NFT approvals section.
6. On BSC, confirm UI copy says `BEP-721` or `BEP-1155`.
7. Revoke with `setApprovalForAll(operator, false)` through the app.
8. Rescan after confirmation.
9. Confirm the NFT approval disappears or diagnostics show no active live NFT
   approval.

For per-token approvals:

1. Approve a second wallet for a single low-value BEP-721/ERC-721-compatible
   token.
2. Scan with `/app?debug=1`.
3. Confirm the NFT pipeline discovers and validates the per-token approval.
4. Revoke and rescan.
5. Confirm the per-token approval is gone.

## Revoke and Batch Checks

- Single PulseChain revoke confirm panel says PulseChain and PLS.
- Single BSC revoke confirm panel says BSC or BNB Smart Chain and BNB.
- PulseChain transaction links open PulseScan.
- BSC transaction links open BscScan.
- Batch revoke submits one transaction at a time.
- Batch revoke uses the selected approvals' chain ID.
- Mixed-chain batch selection is blocked.
- User rejection is handled without submitting remaining batch items.

## Unsupported Network Checks

- Connect to an unsupported chain.
- Confirm the app lists PulseChain and BSC as supported.
- Confirm no scan starts.
- Confirm no revoke action is available.
- Confirm stale approvals from a previous chain are not shown as current.
- Confirm switch-network actions appear when the wallet supports switching.

## Empty and Incomplete States

- Wallet with no approval history shows a no-history state for the active
  chain.
- Wallet with historical approvals that validate to zero shows a clear state.
- Failed live reads show verification incomplete, not clear.
- BscScan rate limits or missing API key show an actionable error.
