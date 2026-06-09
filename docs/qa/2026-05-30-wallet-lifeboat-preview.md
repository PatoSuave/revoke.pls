# Wallet Lifeboat Preview QA - 2026-05-30

This record tracks the Lifeboat branch preview QA pass after the read-only
Wallet Lifeboat modules and Lifeboat-specific preview smoke command were added.

Update: Wallet Lifeboat is now frozen and unpublished on `main`. The
Lifeboat-specific smoke command in this historical record has been removed from
active scripts.

## Branch And Preview

- Branch: `Lifeboat`
- Code checkpoint under test: `7953eef Document Lifeboat preview QA`
- Preview alias:
  `https://revoke-pls-git-lifeboat-squikyus-8256s-projects.vercel.app`
- Unique Vercel preview URL:
  `https://revoke-dt3rzm8pe-squikyus-8256s-projects.vercel.app`
- Temporary share URL:
  `https://revoke-pls-git-lifeboat-squikyus-8256s-projects.vercel.app/app/wallet-lifeboat?_vercel_share=iFqC6cjiLQKZZiSZA0BjZO6dNPZJ8M6g`
- Share URL expiry: May 31, 2026, 10:40 PM Eastern.
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
# Historical Lifeboat preview smoke command removed while the feature is frozen.
npm.cmd run smoke:preview -- https://revoke-pls-git-lifeboat-squikyus-8256s-projects.vercel.app
# Historical Lifeboat preview smoke command removed while the feature is frozen.
```

The removed Lifeboat-specific smoke commands are historical evidence only.

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
- The same general and Wallet Lifeboat smoke checks passed again against the
  `Lifeboat` branch alias after the QA documentation checkpoint.
- `vercel inspect` showed the branch alias resolving to the ready preview
  deployment `revoke-dt3rzm8pe-squikyus-8256s-projects.vercel.app`.

## Authenticated Preview Fetch

The preview branch is protected by Vercel Authentication. A plain unauthenticated
fetch returns the Vercel authentication page, which is expected. A fresh
temporary share URL was generated and fetched successfully:

```powershell
vercel inspect https://revoke-pls-git-lifeboat-squikyus-8256s-projects.vercel.app
```

Authenticated fetch evidence for `/app/wallet-lifeboat`:

- HTTP status `200 OK`.
- Page title rendered as `Wallet Lifeboat | Pulse Revoke`.
- The preview HTML includes the read-only Wallet Lifeboat form, the network
  selector, the "Scan wallet" button, and the safety copy warning users never to
  enter a seed phrase or private key.
- Response security headers include a content security policy, `X-Frame-Options:
  DENY`, `X-Content-Type-Options: nosniff`, and `X-Robots-Tag: noindex`.

## Lifeboat Smoke Matrix

Default public owner used by the historical Lifeboat smoke command:
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
