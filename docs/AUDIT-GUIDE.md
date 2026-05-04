# Audit Guide

This guide gives reviewers a practical map for checking Pulse Revoke behavior.
It is not a substitute for an external security audit.

## Scope To Verify

Current active supported networks should be exactly:

- PulseChain, chain ID `369`
- BSC / BNB Smart Chain, chain ID `56`

Ethereum should remain inactive.

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

## Chain Safety Questions

- Are active supported chains exactly PulseChain and BSC?
- Does `src/lib/wagmi.ts` register only PulseChain and BSC?
- Is Ethereum absent from active supported-chain lists?
- Do approval records carry `chainId` through discovery, validation, display,
  revoke, and batch revoke?
- Are unsupported networks blocked from scan/revoke flows?
- Are mixed-chain batch selections blocked or skipped safely?

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
- Are BSC labels empty unless manually verified?
- Are unknown BSC spenders shown as unknown rather than guessed?
- Is registry data treated only as enrichment, not discovery truth?

## Telemetry Questions

- Is there any third-party analytics SDK dependency?
- Does telemetry avoid wallet addresses, token addresses, spender addresses,
  transaction hashes, balances, token amounts, and user-agent fingerprints?
- Are telemetry fields limited to product-health events, supported chain IDs,
  safe enums, and aggregate counts?

## Suggested Verification Commands

```powershell
npm.cmd run typecheck
npx.cmd vitest run
npm.cmd run lint
npm.cmd run build
```

## Manual Review Checklist

- Load `/` and confirm it lists PulseChain and BSC / BNB Smart Chain as live.
- Load `/app` on PulseChain and run a scan.
- Load `/app` on BSC and run a scan.
- Test a low-gas BSC revoke and confirm the wallet receives `gas` below the
  hard cap.
- Test or simulate a high-gas BSC revoke and confirm the in-app warning appears
  before the wallet opens.
- Connect to an unsupported network and confirm scan/revoke actions are blocked.
