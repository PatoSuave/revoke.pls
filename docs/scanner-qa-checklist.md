# Scanner QA Checklist

Use this checklist to verify that Pulse Revoke is reading approval state correctly
on Ethereum mainnet and PulseChain mainnet. Keep all testing low-risk and
manual.

## Safety setup

- Use a burner wallet or another low-risk wallet.
- Do not use a wallet holding meaningful funds or valuable NFTs.
- Never enter a seed phrase into Pulse Revoke or any test page.
- Keep enough native gas token for approval, revoke, and rescan testing.
- Open the scanner diagnostics with `/app?debug=1` during QA.

## Network coverage

Run the same scanner flow on both supported chains:

- Ethereum mainnet, chain ID `1`.
- PulseChain mainnet, chain ID `369`.

For each chain, confirm the diagnostics panel shows:

- Connected wallet address.
- Expected chain ID and chain name.
- Supported chain: `Yes`.
- Expected explorer/log source.
- ERC-20 and NFT scan status.
- Explorer request/window counts.
- Any truncation, explorer/API error, or RPC/live-read error.

Note: the fungible-token discovery fetch starts from the shared `Approval`
event topic. Ethereum ERC-20 approvals and PulseChain PRC-20 approvals use the
same ERC-20-compatible 3-topic `Approval` log shape. ERC-721 per-token
approvals use the same event signature but have a 4-topic shape. Diagnostics
should explain how many raw Approval-topic logs were skipped because they are
NFT-shaped rather than ERC-20/PRC-20-shaped.

## Controlled ERC-20 / PRC-20 approval test

1. Use a burner wallet as the owner wallet.
2. Choose a low-value ERC-20 or PRC-20 on the target chain.
3. Approve a small allowance to a second wallet or spender address you control.
4. Open `/app?debug=1` and connect the owner wallet.
5. Confirm the app discovers at least one raw fungible-token approval log
   candidate.
6. Confirm the diagnostics count a unique token/spender pair for the approval.
7. Confirm live allowance validation returns a nonzero ERC-20/PRC-20
   allowance.
8. Confirm the approval appears in the normal scanner results.
9. Revoke the approval from the app.
10. Rescan after the transaction confirms.
11. Confirm the approval disappears or the diagnostics show no nonzero allowance.
12. Verify directly on the block explorer or token contract if results disagree.

## ERC-721 / ERC-1155 approval test

Use only low-value NFTs or test collections.

1. From the owner wallet, create a collection-wide approval with
   `setApprovalForAll(operator, true)` to a second wallet or operator you
   control.
2. Open `/app?debug=1` and connect the owner wallet on the same chain.
3. Confirm raw NFT approval logs are discovered.
4. Confirm NFT candidates and live NFT validation counts update.
5. Confirm the NFT approval appears in the NFT approvals section.
6. Revoke with `setApprovalForAll(operator, false)` through the app.
7. Rescan after confirmation.
8. Confirm the NFT approval disappears or the diagnostics show no active live
   NFT approval.

For ERC-721 per-token approvals:

1. Approve a second wallet for a single low-value ERC-721 token.
2. Scan with `/app?debug=1`.
3. Confirm the NFT pipeline discovers and validates the per-token approval.
4. Revoke and rescan.
5. Confirm the per-token approval is gone.

## Error and edge-case checks

- Test with a wallet that has no known approvals; the scanner should show an
  empty state and diagnostics should not report write activity.
- Test an unsupported chain; diagnostics should show supported chain: `No`.
- Test a wallet with a large approval history; check whether truncation is
  reported and verify older approvals directly on the explorer when needed.
- Review NFT live-read failures when they appear. They can be caused by burned
  tokens, missing token IDs, nonstandard contracts, or RPC/multicall read
  errors, and do not automatically mean the scanner is unsafe.
- If explorer/API or RPC/live-read errors appear, capture the chain, wallet,
  timestamp, source ID, request/window counts, and error text.

## Revoke and rescan behavior

- Revoke actions must happen only after clicking a revoke button and confirming
  in the wallet.
- Each revoke should request the expected wallet transaction only.
- After a successful revoke, use rescan to confirm live state changed.
- If a revoked approval still appears, verify explorer lag versus live contract
  state before filing a scanner bug.
