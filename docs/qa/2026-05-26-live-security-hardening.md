# Live Security Hardening - 2026-05-26

## Scope

- Production URL: `https://pulserevoke.com`
- Branch under review: `main`
- Starting commit: `886fdc7 Announce HyperEVM live support`
- Focus: hosted web API abuse controls, security headers, secret exposure,
  dependency advisories, and revoke-path trust boundaries after HyperEVM launch.

## Automated Checks

- `npm audit --omit=dev`: no vulnerabilities found.
- `npm audit`: no vulnerabilities found.
- Live header probe confirmed CSP, CSP report-only, HSTS, `X-Frame-Options:
  DENY`, `X-Content-Type-Options: nosniff`, referrer policy, and permissions
  policy on `/`, `/app`, and API routes.
- Live invalid-owner probes confirmed Ethereum and HyperEVM approval APIs return
  `400` with no-store cache headers.
- Live unsupported token-logo probe confirmed `/api/token-logos` rejects
  unsupported chains with `400` and no-store cache headers.
- Repository secret scan did not find the live HyperEVM key in committed files.

## Hardening Change

- Added best-effort per-client rate limiting for `/api/token-logos` before
  upstream Dex Screener calls.
- Preserved existing safeguards: supported-chain allowlist, address
  normalization, 30-address cap, upstream timeout, HTTPS-only logo URLs, and
  no-store headers for malformed, rate-limited, or upstream-failure responses.
- Added source invariant coverage so token-logo lookup remains bounded,
  rate-limited, and free of server-side signing/write paths.

## Residual Notes

- In-memory route rate limits are best-effort in serverless environments.
  Deterministic caps, timeouts, no-store responses, and Vercel-level protections
  remain the stronger controls.
- CSP still requires `'unsafe-inline'` in the enforced policy for the current
  Next.js runtime; stricter script policy is kept in report-only mode.
