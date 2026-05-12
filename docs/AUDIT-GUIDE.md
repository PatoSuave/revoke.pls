# Audit Guide

This guide gives reviewers a practical map for checking Pulse Revoke behavior.
It is not a substitute for an external security audit.

## Scope To Verify

Current active supported networks should be exactly:

- PulseChain, chain ID `369`
- BSC / BNB Smart Chain, chain ID `56`
- Base, chain ID `8453`
- Ethereum Mainnet, chain ID `1`
- Arbitrum One, chain ID `42161`, ERC-20/NFT verified-row revoke
- Optimism / OP Mainnet, chain ID `10`, ERC-20/NFT verified-row revoke

Ethereum Mainnet uses server-read-only discovery and wallet-side revoke. It is
wallet-enabled, but it must not introduce server-side signing, relayers, private
keys, or API route transaction submission.

Arbitrum One uses server-read-only discovery and wallet-side ERC-20/NFT row
revoke only after row-level live verification, matching owner, chain,
preflight, and post-revoke verification gates pass. Arbitrum batch revoke,
server-side signing, relayers, private keys, and API route transaction
submission must stay unavailable.

Optimism uses server-side discovery and wallet-side ERC-20/NFT row revoke only
after row-level live verification, matching owner, chain, preflight, and
post-revoke verification gates pass. Optimism batch revoke, global revoke,
server-side signing, relayers, private keys, and API route transaction
submission must stay unavailable.

## Key Files

| Area | Files |
| --- | --- |
| Active chains | `src/lib/chains.ts`, `src/lib/wagmi.ts` |
| Explorer links/API helpers | `src/lib/explorer.ts`, `src/lib/discovery.ts` |
| Fungible approval parsing/validation | `src/lib/discovery.ts`, `src/lib/approvals.ts`, `src/hooks/use-approval-discovery.ts` |
| NFT approval parsing/validation | `src/lib/discovery.ts`, `src/lib/nft-approvals.ts`, `src/hooks/use-nft-approval-discovery.ts` |
| Preflight and gas safety | `src/lib/preflight.ts` |
| Single fungible revoke | `src/hooks/use-revoke-approval.ts`, `src/lib/revoke.ts` |
| NFT revoke | `src/hooks/use-revoke-nft-approval.ts`, `src/lib/nft-approvals.ts` |
| Batch revoke | `src/hooks/use-batch-revoke.ts` |
| Registry enrichment | `src/lib/registry/` |
| Telemetry/privacy | `src/lib/telemetry.ts` |
| Diagnostics UI | `src/components/sections/scanner-diagnostics.tsx` |
| Ethereum API controls | `src/app/api/ethereum/approvals/route.ts`, `src/lib/ethereum-approval-api.ts`, `src/lib/ethereum-approval-api-controls.ts` |
| Arbitrum API controls | `src/app/api/arbitrum/approvals/route.ts`, `src/lib/arbitrum-approval-api.ts`, `src/lib/arbitrum-approval-api-controls.ts` |
| Optimism API controls | `src/app/api/optimism/approvals/route.ts`, `src/lib/optimism-approval-api.ts`, `src/lib/optimism-approval-api-controls.ts` |
| Address-only scan controls | `src/lib/address-only-scan.ts`, `src/components/sections/approval-scanner.tsx` |

## Chain Safety Questions

- Are active supported chains exactly PulseChain, BSC, Base, wallet-enabled
  Ethereum Mainnet, Arbitrum One's separate verified-row revoke lane, and
  Optimism's separate verified-row lane?
- Does `src/lib/wagmi.ts` register Ethereum, Arbitrum, and Optimism only for
  their separate lanes and keep chain lists scoped correctly?
- Is Ethereum Mainnet protected by owner, chain, preflight, gas, and row-level
  verification gates?
- Do approval records carry `chainId` through discovery, validation, display,
  revoke, and batch revoke?
- Is the connected wallet account `chainId` the active scanner source of truth?
- Does switching wallet chains clear prior scan results, selections, batch
  state, and diagnostics?
- Are unsupported networks blocked from scan/revoke flows?
- Are mixed-chain batch selections blocked or skipped safely?
- Does address-only scan default to one selected chain instead of firing every
  network scanner at once?
- If scan-all is used, does it require an explicit user action and run with
  concurrency `1`?

## Ethereum Discovery Questions

- Does `/api/ethereum/approvals` reject invalid owners with `400`?
- Does route-level rate limiting return `429` with non-clear JSON?
- Does the public API use server-side discovery caps, request timeout, live-read
  candidate caps, and RPC read concurrency limits?
- Do timeout, cap-hit, rate-limit, truncation, malformed rows, and live-read
  failures return non-clear states?
- Does a candidate cap preserve already verified rows while marking the global
  scan incomplete?
- Does row-level verified Ethereum ERC-20 revoke remain available when unrelated
  NFT verification fails?
- Is the Ethereum API free of `writeContract`, `sendTransaction`, signing,
  private key, seed phrase, mnemonic, or relayer logic?

## Arbitrum Discovery Questions

- Does `/api/arbitrum/approvals` reject invalid owners with `400`?
- Does route-level rate limiting return `429` with non-clear JSON?
- Does every Arbitrum historical log request use Etherscan API V2 with
  `chainid=42161`?
- Are Arbitrum explorer links built with `https://arbiscan.io`?
- Are Arbitrum RPC and Arbiscan API keys server-only values, with no
  browser-exposed Arbitrum variables?
- Do timeout, cap-hit, rate-limit, truncation, malformed rows, and live-read
  failures return non-clear states?
- Are Arbitrum ERC-20 and NFT row revoke actions available only for
  live-verified rows with matching wallet and chain `42161`?
- Do Arbitrum batch revoke, server signing, arbitrary `writeContract`, and
  `sendTransaction` paths remain unavailable?

## Optimism Discovery Questions

- Does `/api/optimism/approvals` reject invalid owners with `400`?
- Does route-level rate limiting return `429` with non-clear JSON?
- Does every Optimism historical log request use Etherscan API V2 with
  `chainid=10`?
- Are Optimism explorer links built with `https://optimistic.etherscan.io`?
- Are Optimism RPC and Etherscan API V2 keys server-only values, with no
  browser-exposed Optimism variables?
- Do timeout, cap-hit, rate-limit, truncation, malformed rows, and live-read
  failures return non-clear states?
- Are Optimism ERC-20 and NFT row revoke actions available only for
  live-verified rows with matching wallet and chain `10`?
- Do Optimism batch, global, server signing, arbitrary `writeContract`, and
  `sendTransaction` paths remain unavailable?

## BSC Discovery Questions

- Do BSC historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every BSC log request include `chainid=56`?
- Are BSC explorer links still built with `https://bscscan.com`?
- Does BSC discovery use approval logs rather than token-transfer endpoints as
  the approval source of truth?
- Does the scanner report incomplete discovery if API caps, rate limits, or
  malformed responses prevent full discovery?
- Does public BSC RPC avoid historical `eth_getLogs` discovery?

## Base Discovery Questions

- Do Base historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every Base log request include `chainid=8453`?
- Are Base explorer links built with `https://basescan.org`?
- Does Base discovery use approval logs rather than token-transfer endpoints as
  the approval source of truth?
- Does public Base RPC avoid historical `eth_getLogs` discovery?

## Live Validation Questions

- Are discovered fungible token candidates rechecked with `allowance(owner,
  spender)` on the same chain?
- Are NFT operator approvals rechecked with `isApprovedForAll(owner, operator)`
  on the same chain?
- Are NFT per-token approvals rechecked with `getApproved(tokenId)` where the
  pipeline supports them?
- Does a validation failure produce an incomplete/unverified state rather than a
  false clear?

## Revoke Questions

- Do fungible token revokes use `approve(spender, 0)`?
- Do NFT operator revokes use `setApprovalForAll(operator, false)`?
- Do NFT per-token revokes use `approve(address(0), tokenId)`?
- Do transaction requests include the approval's `chainId`?
- Do BSC revokes use BNB wording and BscScan links?
- Do PulseChain revokes use PLS wording and PulseScan links?
- Do Base revokes use ETH wording and BaseScan links?
- Does Arbitrum show only ERC-20/NFT verified-row revoke while batch
  revoke remains unavailable?
- Does Optimism show only ERC-20/NFT verified-row revoke while batch and global
  revoke remain unavailable?

## BSC Gas Safety Questions

- Is the BSC hard transaction gas cap set to `16_777_216n`?
- Are BSC revoke estimates above `16_777_216` blocked before wallet
  submission?
- Is the BSC high-gas warning threshold set to `1_000_000n`?
- Do estimates above `1_000_000` and at or below `16_777_216` require an
  explicit in-app confirmation before the wallet opens?
- Is viem/wagmi transaction gas passed as `gas`, not `gasLimit`?
- Are high-gas BSC items skipped by default in batch revoke for individual
  review?

## Registry Questions

- Are registry lookups scoped by `chainId` and address?
- Do PulseChain labels avoid leaking onto BSC approvals?
- Do PulseChain or BSC labels avoid leaking onto Base approvals?
- Are BSC labels empty unless manually verified?
- Are Base labels empty unless manually verified?
- Are unknown BSC and Base spenders shown as unknown rather than guessed?
- Is registry data treated only as enrichment, not discovery truth?

## Telemetry Questions

- Is there any third-party analytics SDK dependency?
- Does telemetry avoid wallet addresses, token addresses, spender addresses,
  transaction hashes, balances, token amounts, and user-agent fingerprints?
- Are telemetry fields limited to product-health events, supported chain IDs,
  safe enums, and aggregate counts?

## CSP Follow-Up

- Track CSP tightening as a separate CSP report-only pass before enforcement.
- Do not blindly narrow `connect-src`, `frame-src`, or `script-src`; verify
  injected wallets, WalletConnect, RPC providers, explorer APIs, and the Tauri
  shell before enforcing stricter policy.

## Suggested Verification Commands

```powershell
npm.cmd run typecheck
npx.cmd vitest run
npm.cmd run lint
npm.cmd run build
```

## Manual Review Checklist

- Load `/` and confirm it lists PulseChain, BSC / BNB Smart Chain, and Base as
  live.
- Load `/app` on PulseChain and run a scan.
- Load `/app` on BSC and run a scan.
- Load `/app` on Base and run a scan.
- Paste an address in address-only mode and confirm only the selected network
  scans by default.
- Use address-only scan-all and confirm networks start one at a time.
- Load `/app` on Ethereum Mainnet and confirm Ethereum discovery is read-only
  until a matching wallet-side revoke is explicitly reviewed.
- Load `/app` on Arbitrum One and confirm only live-verified ERC-20 and NFT rows
  can open the revoke review panel; batch revoke remains unavailable.
- Load `/app` on Optimism / OP Mainnet and confirm only live-verified ERC-20
  and NFT rows can open the revoke review panel; batch and global revoke remain
  unavailable.
- Test a low-gas BSC revoke and confirm the wallet receives `gas` below the
  hard cap.
- Test or simulate a high-gas BSC revoke and confirm the in-app warning appears
  before the wallet opens.
- Connect to an unsupported network and confirm scan/revoke actions are blocked.
