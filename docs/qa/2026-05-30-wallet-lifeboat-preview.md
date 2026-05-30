# Wallet Lifeboat Preview QA - 2026-05-30

This record tracks the Lifeboat branch preview QA pass after the read-only
Wallet Lifeboat modules and Lifeboat-specific preview smoke command were added.

## Branch And Preview

- Branch: `Lifeboat`
- Code checkpoint under test: `87e34ae Add Lifeboat preview smoke check`
- Preview alias:
  `https://revoke-pls-git-lifeboat-squikyus-8256s-projects.vercel.app`
- Unique Vercel preview URL:
  `https://revoke-h7wcp2zv0-squikyus-8256s-projects.vercel.app`
- Production URL: not used for this branch QA pass.
- Main merge status: not merged.

## Automated Evidence

Commands run from the repo root:

```powershell
npx.cmd vitest run src/lib/lifeboat/erc4337.test.ts src/lib/lifeboat/erc6909.test.ts
npm.cmd run lint
npm.cmd run typecheck
git diff --check
npm.cmd run smoke:preview -- https://revoke-h7wcp2zv0-squikyus-8256s-projects.vercel.app
npm.cmd run smoke:lifeboat -- https://revoke-h7wcp2zv0-squikyus-8256s-projects.vercel.app
```

Results:

- Focused ERC-4337 / ERC-6909 tests passed.
- Lint passed.
- TypeScript passed.
- `git diff --check` passed.
- General preview smoke passed for `/app?debug=1`, address scan markers,
  supported chain markers, and Ethereum, Arbitrum, Optimism, and HyperEVM
  approval APIs.
- Wallet Lifeboat preview smoke passed for `/app/wallet-lifeboat` markers and
  the hosted Lifeboat diagnostic APIs.

## Lifeboat Smoke Matrix

Default public owner used by `smoke:lifeboat`:
`0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

Default public spender used for spender-risk context:
`0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`

Observed hosted API states:

| Diagnostic | Chain | Status | Risk |
| --- | --- | --- | --- |
| Sweeper | Ethereum Mainnet | `complete` | `none_detected` |
| Pending nonce | Ethereum Mainnet | `complete` | `none_detected` |
| Timeline | Ethereum Mainnet | `complete` | `none_detected` |
| Address poisoning | Ethereum Mainnet | `complete` | `none_detected` |
| Spender risk | Ethereum Mainnet | `complete` | `informational` |
| EIP-7702 | Ethereum Mainnet | `complete` | `elevated` |
| Smart wallet | Ethereum Mainnet | `complete` | `possible` |
| ERC-4337 | Ethereum Mainnet | `complete` | `possible` |
| ERC-6909 | Ethereum Mainnet | `unsupported` | `unsupported` |
| Dust trap | Ethereum Mainnet | `complete` | `elevated` |
| HEX stake | PulseChain | `complete` | `none_detected` |

The ERC-6909 result is expected for this preview RPC: the provider requires a
contract address filter for broad owner-topic log searches. The module reports
that limitation as unsupported/incomplete context rather than an all-clear.

## Safety Notes

- The smoke command uses `vercel curl` against the preview and app-owned API
  routes only.
- It does not connect a wallet.
- It does not request signatures.
- It does not submit transactions.
- It does not move assets, fund wallets, relay transactions, or prepare rescue
  execution.
- It treats unsupported, incomplete, config-missing, and upstream-failure states
  separately from complete checks.

## Remaining Before Main

- Manual browser QA on the preview with selected public addresses.
- User-facing review of copy density and module ordering.
- PR review / merge decision.
- Post-merge production smoke on `https://pulserevoke.com`.
