# Scanner QA Checklist

Use this checklist to verify that Pulse Revoke reads approval state correctly on
PulseChain, BSC, Base, Polygon, Sonic Mainnet, Avalanche, Mantle, Linea, Blast,
Berachain, Ethereum, Arbitrum One
verified-row revoke, Optimism verified-row revoke, and HyperEVM verified-row
revoke.
Keep all testing low-risk and manual.

## Safety Setup

- Use a burner wallet or another low-risk wallet.
- Do not use a wallet holding meaningful funds or valuable NFTs.
- Never enter a seed phrase into Pulse Revoke or any test page.
- Keep enough native gas token for approval, revoke, and rescan testing.
- Open scanner diagnostics with `/app?debug=1` during QA.

## Automated Preview Smoke

Before manual wallet QA, run the preview smoke command against the exact Vercel
Preview URL being tested:

```powershell
npm run smoke:preview -- https://your-preview.vercel.app
```

The smoke checks the `/app?debug=1` page markers and the server-backed
Ethereum, Arbitrum, Optimism, and HyperEVM approval APIs with a harmless address. It
should pass with RPC/explorer diagnostics configured and no missing config.
This does not replace wallet QA; it only confirms the preview deployment and
environment wiring are usable.

## Network Coverage

Run the scanner flow on all supported chains:

- PulseChain mainnet, chain ID `369`, gas token `PLS`.
- BSC / BNB Smart Chain, chain ID `56`, gas token `BNB`.
- Base, chain ID `8453`, gas token `ETH`.
- Polygon, chain ID `137`, gas token `POL`.
- Sonic Mainnet, chain ID `146`, gas token `S`.
- Avalanche C-Chain, chain ID `43114`, gas token `AVAX`.
- Mantle, chain ID `5000`, gas token `MNT`.
- Linea, chain ID `59144`, gas token `ETH`.
- Blast, chain ID `81457`, gas token `ETH`.
- Berachain, chain ID `80094`, gas token `BERA`.
- Ethereum Mainnet, chain ID `1`, gas token `ETH`.
- Arbitrum One, chain ID `42161`, gas token `ETH`, ERC-20/NFT verified-row
  lane.
- Optimism / OP Mainnet, chain ID `10`, gas token `ETH`, ERC-20/NFT verified-row
  lane.
- HyperEVM, chain ID `999`, gas token `HYPE`, ERC-20/NFT verified-row lane.

For each chain, confirm diagnostics show:

- Expected chain ID and chain name.
- Connected wallet chain ID and active app chain ID match.
- Supported chain: `Yes`.
- Expected explorer/log source.
- RPC env status without printing URL secrets.
- Explorer API env status.
- Etherscan API V2 key presence as configured/missing, never the key value.
- BSC API chain ID `56` when testing BNB Smart Chain.
- Base API chain ID `8453` when testing Base.
- Polygon API chain ID `137` when testing Polygon.
- Sonic API chain ID `146` when testing Sonic Mainnet.
- Avalanche API chain ID `43114` when testing Avalanche C-Chain.
- Mantle API chain ID `5000` when testing Mantle.
- Linea API chain ID `59144` when testing Linea.
- Blast API chain ID `81457` when testing Blast.
- Berachain API chain ID `80094` when testing Berachain.
- Arbitrum API chain ID `42161` when testing Arbitrum One.
- Optimism API chain ID `10` when testing OP Mainnet.
- HyperEVM API chain ID `999` when testing HyperEVM.
- Fungible token and NFT scan status.
- Explorer request/window counts.
- Any truncation, explorer/API error, or RPC/live-read error.

## Permit2 And Hybrid Checks

- Confirm Permit2 candidates are discovered from historical Permit2 `Approval`
  or `Permit` events, then shown only after
  `allowance(owner, token, spender)` returns a nonzero, unexpired delegated
  allowance.
- Confirm expired or zero Permit2 delegated allowances do not appear as active
  approval rows.
- Confirm malformed, timed-out, or failed Permit2 live reads show incomplete or
  unverified diagnostics rather than a clear wallet state.
- Expand a Permit2 row and confirm the permission text says the spender can use
  the token through Permit2.
- Confirm Permit2 revoke review and wallet prompt target the Permit2 contract
  with `approve(token, spender, 0, 0)`, not the token contract.
- Confirm standard ERC-20 rows still use token-contract
  `approve(spender, 0)`.
- Confirm the Permit2 filter shows only Permit2 delegated allowance rows and
  does not alter discovery, verification, or revoke eligibility.
- Confirm hybrid rows are marked only when the same contract has fungible and
  NFT approval surfaces in the current scan results.
- Confirm the Hybrid filter shows only hybrid token rows and does not unlock a
  revoke action that was otherwise blocked by owner, chain, preflight, or live
  verification.
- Expand Permit2 and hybrid rows and confirm `Risk signals` list the concrete
  drivers, such as Permit2 delegated allowance, hybrid token contract, known or
  unknown spender, and unlimited or limited approval.

## BSC Discovery Checks

- `BSC_EXPLORER_API_URL` is either unset or points to a
  compatible Etherscan API V2 endpoint. The default is
  `https://api.etherscan.io/v2/api`.
- `BSC_EXPLORER_CHAIN_ID` is unset or set to `56`.
- `BSC_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY` is set server-side to an
  Etherscan API V2 key with BNB Smart Chain access.
- `NEXT_PUBLIC_BSC_EXPLORER_API_KEY` and `NEXT_PUBLIC_BSCSCAN_API_KEY` are
  unset in hosted web deployments; they are desktop/static-only fallbacks.
- BSC scans use Etherscan API V2 logs with `chainid=56` for historical approval
  discovery through `/api/discovery/approvals`.
- The app does not rely on public BSC RPC `eth_getLogs` for historical
  approval discovery.
- If the deprecated BscScan V1 endpoint `https://api.bscscan.com/api` is
  configured or returned, diagnostics show an actionable migration warning.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Base Discovery Checks

- `BASE_EXPLORER_API_URL` is either unset or points to a compatible
  Etherscan API V2 endpoint. The default is
  `https://api.etherscan.io/v2/api`.
- `BASE_EXPLORER_CHAIN_ID` is unset or set to `8453`.
- `BASE_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY` is set server-side to an
  Etherscan API V2 key with Base Mainnet access.
- `NEXT_PUBLIC_BASE_EXPLORER_API_KEY` is unset in hosted web deployments; it is
  a desktop/static-only fallback.
- Base scans use Etherscan API V2 logs with `chainid=8453` for historical
  approval discovery through `/api/discovery/approvals`.
- The app does not rely on public Base RPC `eth_getLogs` for historical
  approval discovery.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Polygon Discovery Checks

- `POLYGON_EXPLORER_API_URL` is either unset or points to a compatible
  Etherscan API V2 endpoint. The default is
  `https://api.etherscan.io/v2/api`.
- `POLYGON_EXPLORER_CHAIN_ID` is unset or set to `137`.
- `POLYGON_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY` is set server-side to an
  Etherscan API V2 key with Polygon Mainnet access.
- `NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY` is unset in hosted web deployments; it
  is a desktop/static-only fallback.
- Polygon scans use Etherscan API V2 logs with `chainid=137` for historical
  approval discovery through `/api/discovery/approvals`.
- The app does not rely on public Polygon RPC `eth_getLogs` for historical
  approval discovery.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Sonic Discovery Checks

- `SONIC_EXPLORER_API_URL` is either unset or points to a compatible Etherscan
  API V2 endpoint. The default is `https://api.etherscan.io/v2/api`.
- `SONIC_EXPLORER_CHAIN_ID` is unset or set to `146`.
- `SONIC_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY` is set server-side to an
  Etherscan API V2 key with Sonic Mainnet access.
- `NEXT_PUBLIC_SONIC_EXPLORER_API_KEY` is unset in hosted web deployments; it
  is a desktop/static-only fallback.
- Sonic scans use Etherscan API V2 logs with `chainid=146` for historical
  approval discovery through `/api/discovery/approvals`.
- The app does not rely on public Sonic RPC `eth_getLogs` for historical
  approval discovery.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Avalanche Discovery Checks

- `AVALANCHE_EXPLORER_API_URL` is either unset or points to a compatible
  Etherscan API V2 endpoint. The default is
  `https://api.etherscan.io/v2/api`.
- `AVALANCHE_EXPLORER_CHAIN_ID` is unset or set to `43114`.
- `AVALANCHE_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY` is set server-side to an
  Etherscan API V2 key with Avalanche C-Chain access.
- `NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY` is unset in hosted web deployments;
  it is a desktop/static-only fallback.
- Avalanche scans use Etherscan API V2 logs with `chainid=43114` for
  historical approval discovery through `/api/discovery/approvals`.
- The app does not rely on public Avalanche RPC `eth_getLogs` for historical
  approval discovery.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Mantle Discovery Checks

- `MANTLE_EXPLORER_API_URL` is either unset or points to a compatible
  Etherscan API V2 endpoint. The default is
  `https://api.etherscan.io/v2/api`.
- `MANTLE_EXPLORER_CHAIN_ID` is unset or set to `5000`.
- `MANTLE_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY` is set server-side to an
  Etherscan API V2 key with Mantle Mainnet access.
- `NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY` is unset in hosted web deployments; it
  is a desktop/static-only fallback.
- Mantle scans use Etherscan API V2 logs with `chainid=5000` for historical
  approval discovery through `/api/discovery/approvals`.
- The app does not rely on public Mantle RPC `eth_getLogs` for historical
  approval discovery.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Linea Discovery Checks

- `LINEA_EXPLORER_API_URL` is either unset or points to a compatible Etherscan
  API V2 endpoint. The default is `https://api.etherscan.io/v2/api`.
- `LINEA_EXPLORER_CHAIN_ID` is unset or set to `59144`.
- `LINEA_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY` is set server-side to an
  Etherscan API V2 key with Linea Mainnet access.
- No Linea explorer key is exposed through a `NEXT_PUBLIC_` variable.
- Linea scans use Etherscan API V2 logs with `chainid=59144` for historical
  approval discovery through `/api/discovery/approvals`.
- The app does not rely on public Linea RPC `eth_getLogs` for historical
  approval discovery.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Blast Discovery Checks

- `BLAST_EXPLORER_API_URL` is either unset or points to a compatible Etherscan
  API V2 endpoint. The default is `https://api.etherscan.io/v2/api`.
- `BLAST_EXPLORER_CHAIN_ID` is unset or set to `81457`.
- `BLAST_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY` is set server-side to an
  Etherscan API V2 key with Blast Mainnet access.
- No Blast explorer key is exposed through a `NEXT_PUBLIC_` variable.
- Blast scans use Etherscan API V2 logs with `chainid=81457` for historical
  approval discovery through `/api/discovery/approvals`.
- The app does not rely on public Blast RPC `eth_getLogs` for historical
  approval discovery.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Berachain Discovery Checks

- `BERACHAIN_EXPLORER_API_URL` is either unset or points to a compatible
  Etherscan API V2 endpoint. The default is `https://api.etherscan.io/v2/api`.
- `BERACHAIN_EXPLORER_CHAIN_ID` is unset or set to `80094`.
- `BERACHAIN_EXPLORER_API_KEY` or `ETHERSCAN_API_KEY` is set server-side to an
  Etherscan API V2 key with Berachain Mainnet access.
- No Berachain explorer key is exposed through a `NEXT_PUBLIC_` variable.
- Berachain scans use Etherscan API V2 logs with `chainid=80094` for
  historical approval discovery through `/api/discovery/approvals`.
- The app does not rely on public Berachain RPC `eth_getLogs` for historical
  approval discovery.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Arbitrum Verified-Row Checks

- `ARBITRUM_ONE_RPC_URL` or `ARBITRUM_RPC_URL` is set server-side for
  `/api/arbitrum/approvals`.
- `ARBISCAN_API_KEY` is set server-side. Do not expose it through a
  `NEXT_PUBLIC_` variable.
- `ARBITRUM_EXPLORER_CHAIN_ID` is unset or set to `42161`.
- Arbitrum scans use Etherscan-compatible logs with `chainid=42161`.
- Arbitrum ERC-20 and NFT row revoke appears only for live-verified rows when
  the connected wallet matches the scan target and is on chain `42161`.
- Arbitrum batch revoke and global revoke are not shown.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## Optimism Verified-Row Checks

- `OPTIMISM_RPC_URL`, `OPTIMISM_MAINNET_RPC_URL`, or `OP_MAINNET_RPC_URL` is
  set server-side for `/api/optimism/approvals`.
- `OPTIMISM_EXPLORER_API_KEY`, `OPTIMISTIC_ETHERSCAN_API_KEY`, or
  `ETHERSCAN_API_KEY` is set server-side. Do not expose Optimism keys through a
  `NEXT_PUBLIC_` variable.
- `OPTIMISM_EXPLORER_CHAIN_ID` is unset or set to `10`.
- Optimism scans use Etherscan API V2 logs with `chainid=10`.
- Optimism rows can render only after live verification.
- Optimism ERC-20 and NFT row revoke appears only for live-verified rows when
  the connected wallet matches the scan target and is on chain `10`.
- Optimism batch revoke and global revoke are not shown.
- Optimism ERC-20 receipts show `Confirmed cleared.` only after post-revoke
  live verification confirms the allowance is `0`.
- Optimism NFT receipts show `Confirmed cleared.` only after post-revoke live
  verification confirms the approval is gone.
- Rate limits, malformed responses, missing API keys, and capped responses are
  shown as incomplete/error states, not as "clear".

## HyperEVM Verified-Row Checks

- `HYPEREVM_RPC_URL`, `HYPEREVM_MAINNET_RPC_URL`, or
  `HYPERLIQUID_EVM_RPC_URL` is set server-side for
  `/api/hyperevm/approvals`.
- `HYPEREVM_EXPLORER_API_KEY`, `HYPEREVM_ETHERSCAN_API_KEY`,
  `ETHERSCAN_API_KEY`, or `BSC_EXPLORER_API_KEY` is set server-side.
  `BSC_EXPLORER_API_KEY` may be reused as the shared paid-plan Etherscan V2
  key. Do not expose HyperEVM keys through a `NEXT_PUBLIC_` variable.
- `HYPEREVM_EXPLORER_CHAIN_ID` is unset or set to `999`.
- HyperEVM scans use Etherscan API V2 logs with `chainid=999`.
- HyperEVM rows can render only after live verification.
- HyperEVM ERC-20 and NFT row revoke appears only for live-verified rows when
  the connected wallet matches the scan target and is on chain `999`.
- HyperEVM batch revoke and global revoke are not shown.
- HyperEVM revoke confirmation copy uses HYPE gas wording.
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
9. If the row is Permit2-based, confirm Permit2 live validation reads
   `allowance(owner, token, spender)` and the row explains delegated access.
10. If the row is hybrid, confirm the Hybrid filter finds it and the row still
    follows the normal ERC-20 verification and revoke gates.
11. On Arbitrum, confirm only the verified ERC-20 row can open the revoke review
   panel when the matching wallet is connected on Arbitrum One.
12. On Optimism, confirm only the verified ERC-20 row can open the revoke
    review panel when the matching wallet is connected on OP Mainnet.
13. On revoke-enabled chains, revoke the approval from the app.
14. Rescan after the transaction confirms.
15. Confirm the approval disappears or diagnostics show no nonzero allowance.
16. Verify directly on PulseScan, BscScan, BaseScan, PolygonScan, SonicScan,
    SnowScan, Mantle Explorer, LineaScan, Blastscan, Berascan, Etherscan,
    Arbiscan, or Optimistic Etherscan if results disagree.

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
7. On Base, confirm UI copy says `ERC-721` or `ERC-1155`.
8. On Arbitrum, confirm only the verified NFT row can open the revoke review
   panel when the matching wallet is connected on Arbitrum One.
9. On Optimism, confirm only the verified NFT row can open the revoke review
   panel when the matching wallet is connected on OP Mainnet.
10. On revoke-enabled chains, revoke with `setApprovalForAll(operator, false)`
   through the app.
11. Rescan after confirmation.
12. Confirm the NFT approval disappears or diagnostics show no active live NFT
   approval.

For per-token approvals:

1. Approve a second wallet for a single low-value BEP-721 or ERC-721-compatible
   token.
2. Scan with `/app?debug=1`.
3. Confirm the NFT pipeline discovers and validates the per-token approval.
4. Revoke and rescan.
5. Confirm the per-token approval is gone.

## Revoke and Batch Checks

- Single PulseChain revoke confirm panel says PulseChain and PLS.
- Single BSC revoke confirm panel says BSC or BNB Smart Chain and BNB.
- Single Base revoke confirm panel says Base and ETH.
- Single Polygon revoke confirm panel says Polygon and POL.
- Single Sonic revoke confirm panel says Sonic Mainnet and S.
- Single Avalanche revoke confirm panel says Avalanche and AVAX.
- Single Mantle revoke confirm panel says Mantle and MNT.
- Permit2 revoke confirm panel clearly identifies a Permit2 delegated allowance
  and clears it through the Permit2 contract.
- Arbitrum One shows a revoke confirm panel only for live-verified ERC-20 and
  NFT rows.
- Arbitrum One never shows batch revoke controls.
- Optimism shows revoke controls only for live-verified ERC-20 and NFT rows.
- Optimism never shows batch or global revoke controls.
- PulseChain transaction links open PulseScan.
- BSC transaction links open BscScan.
- Base transaction links open BaseScan.
- Polygon transaction links open PolygonScan.
- Sonic transaction links open SonicScan.
- Avalanche transaction links open SnowScan.
- Mantle transaction links open Mantle Explorer.
- Arbitrum address and token links open Arbiscan.
- Optimism address and token links open Optimistic Etherscan.
- Batch revoke submits one transaction at a time.
- Batch revoke uses the selected approvals' chain ID.
- Mixed-chain batch selection is blocked.
- User rejection is handled without submitting remaining batch items.

## Unsupported Network Checks

- Connect to an unsupported chain.
- Confirm the app lists PulseChain, BSC, Base, Polygon, Sonic Mainnet,
  Avalanche, Mantle, Linea, Blast, Berachain, Ethereum, Arbitrum, Optimism,
  and HyperEVM with the correct scan/revoke statuses.
- Confirm no scan starts.
- Confirm no revoke action is available.
- Confirm stale approvals from a previous chain are not shown as current.
- Confirm switch-network actions appear when the wallet supports switching.

## Empty and Incomplete States

- Wallet with no approval history shows a no-history state for the active
  chain.
- Wallet with historical approvals that validate to zero shows a clear state.
- Failed live reads show verification incomplete, not clear.
- Etherscan API V2 rate limits, the BscScan V1 deprecation error, or a missing
  BSC/Base/Polygon/Sonic/Avalanche/Mantle/Linea/Blast/Berachain API key show
  an actionable error.
