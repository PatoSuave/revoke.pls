# Permit2 Hybrid Preview QA - 2026-05-20

This record tracks the feature-branch QA pass for Permit2 delegated allowances,
hybrid token risk signals, and the scanner filter hardening added before any
merge to `main`.

## Branch And Preview

- Branch: `feature/permit2-hybrid-scanner-hardening`
- Code checkpoint under test: `c1e1d9a Add scanner risk signal filters`
- Preview alias: `https://revoke-pls-squikyus-8256-squikyus-8256s-projects.vercel.app`
- Unique Vercel preview URL: record from the final session closeout after the
  docs checkpoint deploys.
- Production URL: not used for this branch QA pass.
- Main merge status: not merged.

## Automated Evidence Required

Run these commands from the repo root before treating the preview as ready for
manual wallet QA:

```powershell
npx.cmd vitest run
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd audit --omit=dev
git diff --check
npm.cmd run smoke:preview -- <vercel-preview-url>
```

Expected result:

- Vitest passes.
- TypeScript passes.
- Lint passes.
- Production build passes.
- Dependency audit has no production vulnerability requiring immediate action.
- `git diff --check` reports no whitespace errors.
- Preview smoke passes for `/app?debug=1`, address scan, all live chain cards,
  and Ethereum, Arbitrum, and Optimism approval APIs.

## Permit2 QA Gates

- [ ] Permit2 candidates are decoded from Permit2 `Approval` or `Permit` events.
- [ ] Permit2 rows render only after `allowance(owner, token, spender)` returns
      nonzero amount and unexpired delegated access.
- [ ] Expired or zero Permit2 allowances do not appear as active rows.
- [ ] Failed or malformed Permit2 live reads produce incomplete/unverified
      state, not a clear wallet state.
- [ ] Permit2 row copy says the spender can use the token through Permit2.
- [ ] Permit2 risk signals include `Permit2 delegated allowance`.
- [ ] Permit2 filter narrows visible rows without changing revoke eligibility.
- [ ] Permit2 revoke review targets the Permit2 contract with
      `approve(token, spender, 0, 0)`.
- [ ] Post-revoke verification re-reads the Permit2 nested allowance before
      reporting cleared.

## Hybrid QA Gates

- [ ] Hybrid rows are marked only when the same contract has fungible and NFT
      approval surfaces in the current scan.
- [ ] Hybrid risk signals include `Hybrid token contract`.
- [ ] Hybrid filter narrows visible rows without changing discovery,
      verification, or revoke eligibility.
- [ ] Hybrid ERC-20 rows still use normal ERC-20 live validation and revoke
      gates.
- [ ] Hybrid NFT rows still use normal NFT live validation and revoke gates.

## Wallet-Side Manual QA Still Required

These checks require a real burner wallet and are intentionally not covered by
the automated preview smoke:

- [ ] Matching wallet on the approval chain can open the revoke review only for
      live-verified rows.
- [ ] Connected wallet mismatch blocks revoke with wallet-mismatch copy.
- [ ] Wrong chain blocks revoke with chain-switch copy.
- [ ] Rejected wallet transaction does not show a cleared state.
- [ ] Submitted revoke shows pending/submitted state and explorer link.
- [ ] Post-revoke verification reports cleared only after a live read confirms
      the allowance or NFT approval is gone.
- [ ] Arbitrum and Optimism batch/global revoke remain unavailable.

## Known Gaps Before Main

- Manual wallet QA is still required after the Vercel preview is deployed.
- This file records branch QA only; it does not claim an external security
  audit.
- Do not merge or promote to production until the unchecked wallet-side items
  above are completed.
