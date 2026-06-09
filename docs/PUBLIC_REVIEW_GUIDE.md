# Public Review Guide

Pulse Revoke is intended to be reviewable from source. This guide points to the
files and checks that matter most for people who want to inspect the code before
using the app.

## Review The Trust Boundaries

- Address-only scans should remain read-only.
- Server routes should read public chain, explorer, and RPC data only.
- Revoke actions should stay wallet-side and require the user's wallet prompt.
- Revoke rows should require a matching wallet, matching chain, and live active
  approval state before execution.
- The app should not ask for recovery phrases, private keys, keystore files,
  wallet passwords, or remote access.
- The app should not take custody, create rescue wallets, sign on a server,
  relay transactions, or auto-transfer assets.

## Start With These Files

| Area | Files |
| --- | --- |
| Public safety policy | [../SECURITY.md](../SECURITY.md), [SECURITY.md](SECURITY.md), [TRANSPARENCY.md](TRANSPARENCY.md) |
| App architecture | [ARCHITECTURE.md](ARCHITECTURE.md), [../src/app](../src/app), [../src/components/sections](../src/components/sections) |
| Chain and wallet setup | [../src/lib/chains.ts](../src/lib/chains.ts), [../src/lib/wagmi.ts](../src/lib/wagmi.ts) |
| Revoke execution | [../src/hooks/use-revoke-approval.ts](../src/hooks/use-revoke-approval.ts), [../src/hooks/use-revoke-nft-approval.ts](../src/hooks/use-revoke-nft-approval.ts), [../src/hooks/use-batch-revoke.ts](../src/hooks/use-batch-revoke.ts) |
| Preflight checks | [../src/lib/preflight.ts](../src/lib/preflight.ts) |
| Read-only discovery | [../src/lib/ethereum-approval-api.ts](../src/lib/ethereum-approval-api.ts), [../src/lib/arbitrum-approval-api.ts](../src/lib/arbitrum-approval-api.ts), [../src/lib/optimism-approval-api.ts](../src/lib/optimism-approval-api.ts), [../src/lib/hyperevm-approval-api.ts](../src/lib/hyperevm-approval-api.ts) |
| Registry context | [../src/lib/registry](../src/lib/registry), [../src/lib/security](../src/lib/security) |
| Wallet Lifeboat freeze | [lifeboat/FREEZE.md](lifeboat/FREEZE.md), [lifeboat/SAFETY_BOUNDARIES.md](lifeboat/SAFETY_BOUNDARIES.md), [../src/middleware.ts](../src/middleware.ts) |

## Suggested Local Checks

PowerShell:

```powershell
npm.cmd install
npm.cmd run build
npx.cmd tsc --noEmit
npx.cmd vitest run
npm.cmd run lint
git diff --check
```

Generic npm:

```bash
npm install
npm run build
npx tsc --noEmit
npx vitest run
npm run lint
git diff --check
```

## Targeted Search Checks

These searches help reviewers confirm that sensitive behavior has not been
added unexpectedly:

```powershell
git grep -n "writeContract\\|sendTransaction\\|relayer\\|server signing\\|custody"
git grep -n "recovery phrase\\|private key\\|keystore\\|wallet password"
git grep -n "auto-transfer\\|automatic rescue\\|guaranteed recovery"
```

Any match should be reviewed in context. Some matches may be policy text that
describes behavior the app must avoid.

## What Reviewers Should Expect

- The public scanner can be incomplete when upstream providers fail or rate
  limit requests.
- Registry labels and logo metadata are context, not endorsements.
- A completed scan is not a guarantee that a wallet or spender is harmless.
- The wallet prompt is the final checkpoint before any revoke transaction is
  submitted.

