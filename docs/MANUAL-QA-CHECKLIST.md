# Manual QA Checklist

Use this checklist before production releases and when testing real wallet
states. Keep testing low-risk: use burner wallets, low-value assets, and small
allowances wherever possible. Never enter a seed phrase or private key into
Revoke.PLS or any linked page.

## Before Every Production Push

Run these commands from the repo root:

```powershell
npm.cmd run build
npx.cmd tsc --noEmit
npx.cmd vitest run
npm.cmd run lint
npm.cmd audit --omit=dev
git diff --check
git diff -- src/hooks src/app/api src/lib/wagmi.ts src/lib/preflight.ts
```

Expected sensitive-path result: no diff output for `src/hooks`,
`src/app/api`, `src/lib/wagmi.ts`, or `src/lib/preflight.ts` unless the change
explicitly intends to modify execution behavior.

For Arbitrum read-only scanner work, expected sensitive-path output includes
the Arbitrum API route and read-only hook/client, but no new wallet-write,
server-signing, relayer, or browser-exposed Arbitrum secret exposure.

## 1. Production Smoke

- [ ] `/` loads without a framework error overlay.
- [ ] `/app` loads without a framework error overlay.
- [ ] `/app?debug=1` loads without a framework error overlay.
- [ ] `/security` loads without a framework error overlay.
- [ ] Browser console shows no unexpected errors on each route.
- [ ] Mobile viewport around `390px` wide has no horizontal overflow.
- [ ] Header, footer, wallet button, and route navigation remain usable on
      desktop and mobile.
- [ ] App copy still identifies Revoke.PLS / Pulse Revoke consistently and does
      not show stale deployment or build artifacts.

## 2. Wallet Connection

- [ ] Connect an injected wallet successfully.
- [ ] Disconnect the wallet and confirm connected-only scan/revoke actions are
      unavailable.
- [ ] Connect on an unsupported or wrong chain and confirm the app asks for a
      supported chain instead of scanning stale data.
- [ ] Connect on each supported chain and confirm the app recognizes the
      correct chain.
- [ ] Confirm wallet chain ID and app active chain match in debug diagnostics.
- [ ] Switch wallet chains and confirm old scan results, selections, and batch
      state do not bleed into the new chain.

## 3. Address-Only Scan

- [ ] Paste a valid EVM address and start a scan.
- [ ] Paste an invalid address and confirm a clear validation error appears.
- [ ] Scan a valid address without a wallet connected.
- [ ] Connect a wallet that does not match the scanned address and confirm the
      wallet mismatch copy appears.
- [ ] Connect the wallet that matches the scanned address and confirm the scan
      state updates.
- [ ] Confirm revoke buttons stay disabled until the connected wallet matches
      the scanned address and the required chain.
- [ ] In `/app?debug=1`, confirm address-only diagnostics show scan mode, scan
      target address, wallet match status, and revoke-disabled reason.
- [ ] Select Arbitrum One in address-only mode and confirm the pasted scan
      target is preserved even when a different wallet is connected.
- [ ] Confirm no wallet is required to start an Arbitrum address-only scan.

## 4. PulseChain Approval Scanning

- [ ] Discover an active PRC-20/ERC-20 approval.
- [ ] Confirm an unlimited approval is labeled as unlimited.
- [ ] Confirm a limited approval shows the limited amount.
- [ ] Confirm an unknown spender remains labeled as unknown.
- [ ] Confirm a known protocol spender shows source-grounded protocol metadata.
- [ ] Confirm a LibertySwap current contract shows the current-contract label
      and official-source metadata.
- [ ] Confirm a LibertySwap legacy contract shows the legacy-contract label and
      legacy note.
- [ ] Confirm the row still shows essential top-level data: token, spender,
      exposure/risk, and action or disabled state.
- [ ] Confirm `What this approval means` is collapsed by default.
- [ ] Expand `What this approval means` and confirm token, spender, permission,
      risk level, recommended action, protocol metadata, and verification copy
      remain available.
- [ ] Confirm `Why is this approval shown?` still expands inside the explanation
      content.
- [ ] Confirm debug diagnostics appear on `/app?debug=1`.

## 5. NFT Scanning

- [ ] Discover an NFT operator approval.
- [ ] Discover an NFT per-token approval.
- [ ] Confirm the row still shows essential top-level data: collection/token,
      operator, permission/risk, and action or disabled state.
- [ ] Confirm zero-address rows include a zero-address explanation and do not
      look like a normal unknown operator.
- [ ] Confirm verification-incomplete state appears when live reads fail or
      discovery cannot complete.
- [ ] Confirm per-token incomplete copy mentions `getApproved(tokenId)`.
- [ ] Confirm operator incomplete copy mentions
      `isApprovedForAll(owner, operator)`.
- [ ] Confirm unverified NFT rows keep revoke unavailable.
- [ ] Expand `What this approval means` and confirm NFT permission, risk,
      recommended action, current-state, zero-address, and metadata copy remain
      available.

## 6. Revoke Flow

- [ ] Preflight confirms an active ERC-20 allowance or NFT approval before the
      wallet opens.
- [ ] Gas estimate display appears with the expected chain and native gas token.
- [ ] Confirm revoke from the in-app review panel.
- [ ] Reject the wallet transaction and confirm the UI reports rejection without
      treating it as submitted.
- [ ] Simulate or encounter a transaction failure and confirm the failure state
      is visible and retryable.
- [ ] Submit a revoke transaction and confirm pending/submitted state appears.
- [ ] Confirm the transaction receipt or success state after confirmation.
- [ ] Confirm post-revoke live verification reports cleared when the live read
      confirms zero allowance, no approved token address, or disabled operator.
- [ ] Confirm the live-verification-incomplete fallback appears if the
      post-revoke read fails.
- [ ] Confirm explorer links open the correct chain explorer and transaction.
- [ ] Confirm revoke buttons and disabled states do not change except as a
      direct result of the revoke flow and rescan.

## 7. Ethereum

- [ ] Connect on Ethereum Mainnet.
- [ ] Confirm Ethereum discovery uses the read-only API and live RPC validation
      copy.
- [ ] Confirm Ethereum row-level verified revoke is available only for rows
      that were live-verified.
- [ ] Confirm incomplete verification disables revoke for unverified rows.
- [ ] Confirm global or batch revoke remains disabled when the Ethereum scan is
      incomplete.
- [ ] Confirm individually verified rows remain clear about why they can be
      revoked even if global scan status is incomplete.
- [ ] Confirm Ethereum read-only, current-state, verified-row, and
      verification-incomplete copy remains accurate.
- [ ] Confirm Ethereum explorer links open Etherscan.

## 8. Arbitrum One Read-Only Beta

- [ ] Connect on Arbitrum One and confirm `/app` shows the Arbitrum read-only
      beta scanner, not the generic revoke scanner.
- [ ] Confirm `/api/arbitrum/approvals` discovery uses server-side settings
      and reports `chainId` / `chainid` `42161`.
- [ ] Confirm active Arbitrum ERC-20 rows appear only after `allowance(owner,
      spender)` live verification.
- [ ] Confirm active Arbitrum NFT rows appear only after `getApproved(tokenId)`
      or `isApprovedForAll(owner, operator)` live verification.
- [ ] Confirm failed reads, truncation, caps, rate limits, and upstream
      failures show verification-incomplete copy instead of a clear state.
- [ ] Confirm every Arbitrum row says revoke is not enabled and exposes no
      revoke, batch revoke, or wallet-write action.
- [ ] Confirm Arbitrum explorer links open Arbiscan.
- [ ] In `/app?debug=1`, confirm diagnostics show scan target, connected
      wallet, wallet chain ID, API status, config presence, incomplete
      reasons, and `Revoke enabled: No`.

## 9. Security And Trust

- [ ] Anti-phishing banner is visible on production pages.
- [ ] `/security` loads and remains readable on desktop and mobile.
- [ ] Supported-chain matrix lists Arbitrum One as `Read-only beta` / `Not yet`
      and does not claim Arbitrum revoke is live.
- [ ] The app never requests a seed phrase, private key, mnemonic, or raw
      signing secret.
- [ ] No spender or protocol is described as safe, unsafe, endorsed, or trusted
      as a safety guarantee.
- [ ] Registry labels are presented as known/source-grounded metadata, not as
      approval or safety endorsements.
- [ ] Wallet prompts show expected revoke functions, not transfers, swaps,
      bridges, or unrelated approvals.

## 10. Regression Guardrails

- [ ] No server-side signing was introduced.
- [ ] No private key, seed phrase, or mnemonic handling was introduced.
- [ ] No relayer behavior was introduced.
- [ ] No new `sendTransaction` paths were introduced.
- [ ] No new `writeContract` paths were introduced outside the existing revoke
      hooks.
- [ ] No scanner target expansion was introduced unless explicitly intended and
      reviewed.
- [ ] No Ethereum API route behavior changed unless explicitly intended and
      reviewed.
- [ ] No Arbitrum API route write, signing, relayer, or private-key behavior
      was introduced.
- [ ] No address-only scan gating changed unless explicitly intended and
      reviewed.
- [ ] No LibertySwap registry labels changed unless explicitly intended and
      reviewed.

## Notes For QA Runs

- Record browser, wallet, chain, address type, and route for any failure.
- Include screenshots for visual regressions and console output for runtime
  errors.
- If a scan is incomplete, verify that the UI does not mark the wallet clear.
- If a revoke succeeds, rescan and verify the result against the relevant block
  explorer.
