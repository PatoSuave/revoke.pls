# Manual QA Checklist

Use this checklist before production releases and when testing real wallet
states. Keep testing low-risk: use burner wallets, low-value assets, and small
allowances wherever possible. Never enter a seed phrase or private key into
Pulse Revoke or any linked page.

## Before Every Production Push

Run these commands from the repo root:

```powershell
npm.cmd run build
npx.cmd tsc --noEmit
npx.cmd vitest run
npm.cmd run lint
npm.cmd audit --omit=dev
git diff --check
git diff -- src/hooks src/app/api src/lib/wagmi.ts src/lib/preflight.ts src/lib/permit2.ts src/lib/risk.ts
```

Expected sensitive-path result: no diff output for `src/hooks`,
`src/app/api`, `src/lib/wagmi.ts`, `src/lib/preflight.ts`,
`src/lib/permit2.ts`, or `src/lib/risk.ts` unless the change explicitly
intends to modify execution behavior or scanner prioritization.

For Arbitrum verified-row revoke work, expected sensitive-path output may
include the Arbitrum scanner UI, hook/client, and existing controlled ERC-20/NFT
row revoke hook usage, but no batch revoke, server-signing, relayer, or
browser-exposed Arbitrum secret exposure.

For Optimism verified-row revoke work, expected sensitive-path output may
include the Optimism API route, hook/client, scanner UI, wagmi wallet-recognition
entry, and existing controlled ERC-20/NFT row revoke hook usage, but no
batch revoke, server-signing, relayer, or browser-exposed Optimism secret
exposure.

For HyperEVM verified-row revoke work, expected sensitive-path output may
include the HyperEVM API route, hook/client, scanner UI, wagmi
wallet-recognition entry, and existing controlled ERC-20/NFT row revoke hook
usage, but no batch revoke, server-signing, relayer, or browser-exposed
HyperEVM secret exposure.

## 1. Production Smoke

- [ ] `/` loads without a framework error overlay.
- [ ] `/app` loads without a framework error overlay.
- [ ] `/app?debug=1` loads without a framework error overlay.
- [ ] `/security` loads without a framework error overlay.
- [ ] Browser console shows no unexpected errors on each route.
- [ ] Mobile viewport around `390px` wide has no horizontal overflow.
- [ ] Header, footer, wallet button, and route navigation remain usable on
      desktop and mobile.
- [ ] App copy still identifies Pulse Revoke consistently and does
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

### 2A. Multi-Wallet Picker Compatibility

New extension wallets are treated as standard browser-injected EVM wallets for
this pass, not as custom connectors. ZKX Wallet's public site links to a Chrome
extension, and its Chrome Web Store listing describes support for Ethereum, BNB
Chain, and PulseChain. Internet Money's public site describes it as a
PulseChain-native multi-chain EVM wallet, and its Chrome Web Store listing
describes injected dApp connection plus WalletConnect fallback support. Verify
compatibility through the detected wallet picker before adding any
wallet-specific code.

- [ ] Record the browser version, wallet extension version, extension ID,
      tested route, tested chain, and test wallet type in the QA notes.
- [ ] Use a clean Chrome profile with one wallet enabled at a time, a burner
      wallet, and low-value PulseChain approvals only.
- [ ] Test MetaMask, Rabby, Internet Money Wallet, and ZKX Wallet individually.
- [ ] Load `/app` and confirm the connect menu shows a named wallet row when
      the wallet announces through EIP-6963, or the generic `Browser wallet`
      fallback when named discovery is unavailable.
- [ ] Connect with each wallet and confirm the connected wallet address appears.
- [ ] Confirm PulseChain is recognized as chain ID `369` and the header shows
      PulseChain rather than an unsupported-network state.
- [ ] If the wallet starts on another EVM chain, switch to PulseChain and confirm the
      app clears stale scan results, selections, and batch state.
- [ ] Confirm address-only scanning still works before connecting a wallet.
- [ ] Confirm revoke stays unavailable when no wallet is connected, the
      connected wallet does not match the scan target, the wallet is on the
      wrong chain, or the approval row is not live-verified active.
- [ ] Confirm one live-verified PulseChain row can reach the normal revoke
      review panel only after the connected wallet matches the scanned owner
      and chain.
- [ ] Reject one wallet prompt and confirm the UI reports rejection without
      treating the approval as submitted or cleared.
- [ ] If using a tiny burner approval, submit one revoke and verify
      post-revoke live confirmation before the UI shows cleared state.
- [ ] Use the page-level network selector while disconnected and confirm it
      changes the default address-only scan network without prompting a wallet.
- [ ] Connect a wallet, select another network from the page-level network
      selector, and confirm the wallet opens a network-switch prompt.
- [ ] Reject one network-switch prompt and confirm the app keeps the previous
      wallet network and does not show stale approval rows for the rejected
      network.
- [ ] Accept one network-switch prompt and confirm scan results, row
      selections, batch state, and diagnostics reset for the newly selected
      wallet network.
- [ ] Confirm the page-level network selector does not bypass revoke gates:
      revoke remains blocked unless the connected wallet, scanned owner, row
      chain, and live-verified row state all match.
- [ ] Repeat a basic connect/disconnect check with MetaMask, Rabby, Internet
      Money Wallet, and ZKX Wallet installed together. Confirm the menu shows
      separate named rows for every wallet that announces through EIP-6963 and
      that selecting each row opens the intended wallet.
- [ ] Do not test or integrate shield, unshield, bridge, swap, private send,
      stealth address, privacy-pool, custody, rescue, gas-funding, relayer,
      wallet-native reward, or server-signing behavior.
- [ ] If a wallet fails through the injected connector, stop and document the
      observed provider shape, console errors, wallet prompt behavior, and
      whether an EIP-1193 or EIP-6963 provider is exposed before proposing
      custom support.

### 2B. Popular Wallet And Hardware Wallet Compatibility

Do not add direct hardware-device, USB, HID, seed phrase, custody, relay, or
server-signing code. Hardware wallets should work only through standard wallet
surfaces: a hardware-backed injected wallet such as MetaMask or Rabby, or
WalletConnect when the wallet vendor supports it.

- [ ] Confirm `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is configured for the
      tested build. WalletConnect will not appear without it.
- [ ] Confirm the connect menu keeps detected browser wallets compact. If more
      than five injected wallets are detected, the first five should show
      directly and the rest should be behind `More wallets`.
- [ ] Confirm WalletConnect remains a separate visible option when configured,
      not hidden inside `More wallets`.
- [ ] Test the browser-extension flow with MetaMask, Rabby, Brave Wallet,
      Coinbase Wallet extension, OKX Wallet, Internet Money Wallet, and ZKX
      Wallet where available.
- [ ] For every wallet, record browser version, extension version, extension
      ID, route, chain ID, and pass/fail notes.
- [ ] Test each wallet alone first, then repeat a basic connect/disconnect pass
      with multiple wallet extensions enabled together.
- [ ] For Ledger, test both a hardware-backed MetaMask or Rabby connection and
      a WalletConnect path when available to the tester.
- [ ] For Trezor, test a hardware-backed MetaMask or Rabby connection and a
      WalletConnect path when available to the tester.
- [ ] For Keystone, test a hardware-backed MetaMask connection and any
      WalletConnect path available to the tester.
- [ ] For hardware-wallet tests, use a burner account or low-value test setup.
      Never ask the tester for seed phrases, private keys, keystore files,
      wallet passwords, or remote desktop access.
- [ ] Evidence level 1: the wallet appears as an injected wallet or
      WalletConnect option and can open its connect prompt.
- [ ] Evidence level 2: the wallet connects and the expected address appears in
      Pulse Revoke.
- [ ] Evidence level 3: PulseChain is recognized as chain ID `369` or the wallet
      can switch to PulseChain without stale scan state carrying over.
- [ ] Evidence level 4: no-wallet, wallet-mismatch, wrong-chain, and
      unverified-row revoke gates still block revoke.
- [ ] Evidence level 5: a tiny burner approval can be revoked and post-revoke
      live verification confirms the approval is cleared before the UI shows a
      cleared state.

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
- [ ] Select Optimism in address-only mode and confirm the pasted scan target
      is preserved even when a different wallet is connected.
- [ ] Confirm no wallet is required to start an Optimism address-only scan.
- [ ] Confirm Optimism address-only rows keep revoke unavailable until the
      connected wallet exactly matches the pasted scan target and is on OP
      Mainnet.
- [ ] Select HyperEVM in address-only mode and confirm the pasted scan target
      is preserved even when a different wallet is connected.
- [ ] Confirm no wallet is required to start a HyperEVM address-only scan.
- [ ] Confirm HyperEVM address-only rows keep revoke unavailable until the
      connected wallet exactly matches the pasted scan target and is on
      HyperEVM.

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
- [ ] Confirm known PulseChain, BSC, and Polygon token rows can show a token logo when
      Dex Screener has one, while unknown or failed logo loads still show the
      token initials.
- [ ] Confirm token logos do not hide the token symbol, token explorer link,
      spender, risk, or revoke state.
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

## 5A. Permit2 And Hybrid Scanner Rows

- [ ] Discover or simulate a Permit2 delegated allowance row.
- [ ] Confirm the Permit2 row appears only after
      `allowance(owner, token, spender)` returns a nonzero, unexpired delegated
      allowance.
- [ ] Confirm expired, zero, malformed, timed-out, or failed Permit2 live reads
      do not produce a false clear wallet state.
- [ ] Confirm the row copy says the spender can use the token through Permit2.
- [ ] Confirm the Permit2 filter shows Permit2 rows and hides normal ERC-20
      rows.
- [ ] Confirm search terms such as `Permit2` and `delegated` find Permit2 rows.
- [ ] Open the revoke review for a live-verified Permit2 row and confirm the
      wallet prompt targets the Permit2 contract with
      `approve(token, spender, 0, 0)`.
- [ ] Confirm post-revoke verification reads the Permit2 nested allowance again
      and reports cleared only when the delegated allowance is zero or expired.
- [ ] Discover or simulate a hybrid token row where the same contract has
      fungible and NFT approval surfaces.
- [ ] Confirm the Hybrid filter shows hybrid rows and hides non-hybrid rows.
- [ ] Confirm hybrid rows keep their normal ERC-20 or NFT verification and
      revoke gates; the hybrid label must not make an unverified row revokable.
- [ ] Expand `What this approval means` and confirm `Risk signals` list
      concrete drivers such as Permit2 delegated allowance, hybrid token
      contract, known or unknown spender/operator, and unlimited or limited
      approval.

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

## 8. Arbitrum One Verified-Row Revoke

- [ ] Connect on Arbitrum One and confirm `/app` shows the Arbitrum verified-row
      lane, not the generic revoke scanner.
- [ ] Confirm `/api/arbitrum/approvals` discovery uses server-side settings
      and reports `chainId` / `chainid` `42161`.
- [ ] Confirm active Arbitrum ERC-20 rows appear only after `allowance(owner,
      spender)` live verification.
- [ ] Confirm a matching connected wallet on Arbitrum One can review only
      live-verified ERC-20 rows.
- [ ] Confirm the preflight blocks the wallet prompt when
      `allowance(owner, spender)` returns `0` or fails.
- [ ] Confirm post-revoke live verification reports `Confirmed cleared.` only
      when `allowance(owner, spender)` returns `0`.
- [ ] Confirm active Arbitrum NFT rows appear only after `getApproved(tokenId)`
      or `isApprovedForAll(owner, operator)` live verification.
- [ ] Confirm a matching connected wallet on Arbitrum One can review only
      live-verified Arbitrum NFT rows.
- [ ] Confirm NFT preflight blocks the wallet prompt when
      `getApproved(tokenId)` or `isApprovedForAll(owner, operator)` returns
      cleared state or fails.
- [ ] Confirm post-revoke live verification reports `Confirmed cleared.` only
      when `getApproved(tokenId)` returns the zero address or
      `isApprovedForAll(owner, operator)` returns `false`.
- [ ] Confirm failed reads, truncation, caps, rate limits, and upstream
      failures show verification-incomplete copy instead of a clear state.
- [ ] Confirm Arbitrum batch/global revoke is not visible or enabled.
- [ ] Confirm address-only Arbitrum scans keep revoke unavailable until the
      connected wallet exactly matches the pasted scan target and is on
      Arbitrum One.
- [ ] Confirm Arbitrum explorer links open Arbiscan.
- [ ] In `/app?debug=1`, confirm diagnostics show scan target, connected
      wallet, wallet chain ID, API status, config presence, incomplete
      reasons, ERC-20 row revoke status, NFT row revoke status, and batch
      revoke disabled.

## 9. Optimism Verified-Row Revoke

- [ ] Connect on Optimism / OP Mainnet and confirm `/app` shows the Optimism
      verified-row lane, not the generic revoke scanner.
- [ ] Confirm `/api/optimism/approvals` discovery uses server-side settings and
      reports `chainId` / `chainid` `10`.
- [ ] Confirm active Optimism ERC-20 rows appear only after
      `allowance(owner, spender)` live verification.
- [ ] Confirm active Optimism NFT rows appear only after `getApproved(tokenId)`
      or `isApprovedForAll(owner, operator)` live verification.
- [ ] Confirm Optimism ERC-20 row revoke appears only for live-verified ERC-20
      rows when the connected wallet matches the scan target and is on OP
      Mainnet.
- [ ] Confirm Optimism ERC-20 preflight blocks the wallet prompt when
      `allowance(owner, spender)` returns `0` or fails.
- [ ] Confirm Optimism ERC-20 post-revoke verification reports
      `Confirmed cleared.` only when `allowance(owner, spender)` returns `0`.
- [ ] Confirm Optimism NFT row revoke appears only for live-verified NFT rows
      when the connected wallet matches the scan target and is on OP Mainnet.
- [ ] Confirm Optimism batch revoke and global revoke are not visible or
      enabled.
- [ ] Reject one Optimism ERC-20 or NFT revoke transaction and confirm no
      `Confirmed cleared.` state appears.
- [ ] For one controlled Optimism ERC-20 approval, confirm revoke calls
      `approve(spender, 0)`, post-revoke verification runs, and
      `Confirmed cleared.` appears only after the live read confirms the
      allowance is `0`.
- [ ] Reject one Optimism NFT revoke transaction and confirm no `Confirmed
      cleared.` state appears.
- [ ] For one controlled Optimism NFT approval, confirm revoke calls
      `setApprovalForAll(operator, false)` or `approve(address(0), tokenId)`,
      post-revoke verification runs, and `Confirmed cleared.` appears only
      after the live read confirms the approval is gone.
- [ ] Confirm failed reads, truncation, caps, rate limits, and upstream
      failures show verification-incomplete copy instead of a clear state.
- [ ] Confirm Optimism explorer links open Optimistic Etherscan.
- [ ] In `/app?debug=1`, confirm diagnostics show scan target, connected
      wallet, wallet chain ID, API status, config presence, incomplete reasons,
      ERC-20 row revoke status, NFT row revoke status, and batch revoke
      disabled.

## 10. HyperEVM Verified-Row Revoke

- [ ] Connect on HyperEVM and confirm `/app` shows the HyperEVM verified-row
      lane, not the generic revoke scanner.
- [ ] Confirm `/api/hyperevm/approvals` discovery uses server-side settings
      and reports `chainId` / `chainid` `999`.
- [ ] Confirm active HyperEVM ERC-20 rows appear only after
      `allowance(owner, spender)` live verification.
- [ ] Confirm active HyperEVM NFT rows appear only after `getApproved(tokenId)`
      or `isApprovedForAll(owner, operator)` live verification.
- [ ] Confirm HyperEVM ERC-20 row revoke appears only for live-verified ERC-20
      rows when the connected wallet matches the scan target and is on
      HyperEVM.
- [ ] Confirm HyperEVM ERC-20 preflight blocks the wallet prompt when
      `allowance(owner, spender)` returns `0` or fails.
- [ ] Confirm HyperEVM ERC-20 post-revoke verification reports
      `Confirmed cleared.` only when `allowance(owner, spender)` returns `0`.
- [ ] Confirm HyperEVM NFT row revoke appears only for live-verified NFT rows
      when the connected wallet matches the scan target and is on HyperEVM.
- [ ] Confirm HyperEVM batch revoke and global revoke are not visible or
      enabled.
- [ ] Reject one HyperEVM ERC-20 or NFT revoke transaction and confirm no
      `Confirmed cleared.` state appears.
- [ ] Confirm failed reads, truncation, caps, rate limits, and upstream
      failures show verification-incomplete copy instead of a clear state.
- [ ] Confirm HyperEVM explorer links open Hyperevmscan.
- [ ] Confirm wallet prompts show HYPE gas.
- [ ] In `/app?debug=1`, confirm diagnostics show scan target, connected
      wallet, wallet chain ID, API status, config presence, incomplete reasons,
      ERC-20 row revoke status, NFT row revoke status, and batch revoke
      disabled.

## 11. Security And Trust

- [ ] Anti-phishing banner is visible on production pages.
- [ ] `/security` loads and remains readable on desktop and mobile.
- [ ] Supported-chain matrix lists Arbitrum One as `Yes` /
      `ERC-20/NFT verified rows only` / `Live` and does not claim batch revoke
      is live.
- [ ] Supported-chain matrix lists Optimism as `Yes` /
      `ERC-20/NFT verified rows only` / `Live` and does not claim Optimism
      batch revoke is live.
- [ ] Supported-chain matrix lists HyperEVM as `Yes` /
      `ERC-20/NFT verified rows only` / `Live` and does not claim HyperEVM
      batch revoke is live.
- [ ] The app never requests a seed phrase, private key, mnemonic, or raw
      signing secret.
- [ ] No spender or protocol is described as safe, unsafe, endorsed, or trusted
      as a safety guarantee.
- [ ] Registry labels are presented as known/source-grounded metadata, not as
      approval or safety endorsements.
- [ ] Wallet prompts show expected revoke functions, not transfers, swaps,
      bridges, or unrelated approvals.

## 12. Regression Guardrails

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
- [ ] No Optimism API route write, signing, relayer, private-key, or
      wallet-write behavior was introduced.
- [ ] No HyperEVM API route write, signing, relayer, private-key, or
      wallet-write behavior was introduced.
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
