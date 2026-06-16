# Hosted Hardening

This checklist covers hosted Pulse Revoke deployments such as
`https://pulserevoke.com` and Vercel preview URLs. It complements the source
audit guide; it is not a replacement for an external audit.

## Live Smoke Test

Run the live hardening smoke test after production deployments and on previews
that need security review:

```powershell
npm.cmd run security:live
npm.cmd run security:live -- https://your-preview.vercel.app
```

For deployment-protected Vercel previews, generate a temporary share URL in
Vercel and pass either the full URL or the `_vercel_share` token:

```powershell
npm.cmd run security:live -- "https://your-preview.vercel.app/?_vercel_share=..."
npm.cmd run security:live -- https://your-preview.vercel.app --vercel-share=...
```

The script checks:

- security headers on `/`, `/app`, and `/security`
- bad-input behavior on public approval, discovery, token-logo, gas, and CSP
  report APIs
- no-store cache headers on sensitive error/API paths
- response bodies for RPC URLs, API-key assignments, JWT-shaped values, and
  private-key-shaped strings
- live JS/CSS assets for key-bearing URLs and API-key-shaped literals

The script intentionally uses bad owner addresses and unsupported parameters.
It does not run revoke transactions and does not require a wallet.

## Hosted Environment Guard

Hosted web deployments should keep explorer API keys and private RPC URLs
server-side. Run:

```powershell
npm.cmd run security:env
```

To inspect a local env file before a hosted build:

```powershell
npm.cmd run security:env -- --env-file=.env.local
```

The guard fails when browser-visible key names such as
`NEXT_PUBLIC_BSC_EXPLORER_API_KEY`, `NEXT_PUBLIC_BSCSCAN_API_KEY`,
`NEXT_PUBLIC_ETHERSCAN_API_KEY`, or other `NEXT_PUBLIC_*API_KEY` values are
set. These values are embedded into browser bundles by Next.js and should stay
unset for hosted web deployments.

Desktop/static builds that intentionally need public explorer-key fallback
behavior can opt out explicitly:

```powershell
npm.cmd run security:env -- --allow-desktop-public-keys
```

## Vercel Firewall Review

Vercel's automatic DDoS protections are always on. For extra hosted protection,
review edge-level rate limits before enabling them in production. Start in log
or observe mode when possible, then enforce after normal traffic is understood.

Suggested first-pass targets:

| Route group | Suggested posture |
| --- | --- |
| `/api/ethereum/approvals`, `/api/arbitrum/approvals`, `/api/optimism/approvals`, `/api/hyperevm/approvals` | Strict per-client rate limit because each request can trigger explorer/RPC work. |
| `/api/discovery/approvals` | Strict per-client rate limit for shared BSC/Base/Polygon/Sonic/Avalanche/Mantle/Linea/Blast/Berachain discovery. |
| `/api/token-logos` | Moderate per-client rate limit; app code already caps addresses, times out upstream requests, and caches successful display metadata. |
| `/api/gas` | Looser rate limit because the UI updates frequently, but still protect against scripted bursts. |
| `/api/csp-report` | Strict rate limit because reports are telemetry-like and should never become a log spam path. |

Do not require an API key header for public app API routes unless the frontend
is changed at the same time. These routes are intentionally called by browser
clients.
