# Token Chair Vercel Preview QA

Run this against the latest Vercel Preview deployment for `feature/token-chair-sniffer`. Do not use production for this checklist until the feature is approved for `main`.

## Preview Target

Set the preview host in PowerShell:

```powershell
$preview = "https://YOUR-VERCEL-PREVIEW.vercel.app"
```

If the preview is protected by Vercel Authentication, use `vercel curl` for smoke checks:

```powershell
npx.cmd vercel curl "$preview/app/token-chair-sniffer"
```

## Sample Tokens

These match the in-app sample presets:

| Token | Address | Expected path |
| --- | --- | --- |
| PLSX | `0x95B303987A60C71504D99Aa1b13B4DA07b0790ab` | High-liquidity ecosystem token with market, source, holder, LP, and PulseX pair context. |
| WPLS | `0xA1077a294dDE1B09bB078844df40758a5D0f9a27` | Wrapped native asset. Good route/deep-link sanity check. |
| INC | `0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d` | Ecosystem token with PulseX pair context. |
| HEX | `0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39` | Ecosystem token with different decimals and holder profile. |

## Route Smoke

```powershell
$html = npx.cmd vercel curl "$preview/app/token-chair-sniffer"
$html -match "Token Chair Sniffer"
$html -match "Scan Report"
$html -match "Evidence Checklist"
$html -match "Review Before Buying"
$html -match "Copy report link"
$html -match "Copy review"
```

All checks should return `True`.

## API Matrix

```powershell
$tokens = @{
  PLSX = "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab"
  WPLS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27"
  INC  = "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d"
  HEX  = "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39"
}

foreach ($item in $tokens.GetEnumerator()) {
  $json = npx.cmd vercel curl "$preview/api/token-chair-sniffer?token=$($item.Value)"
  [pscustomobject]@{
    Token = $item.Key
    Success = $json -match '"status":"success"'
    Verdict = $json -match '"verdict"'
    Market = $json -match '"market":\{'
    SourceSignals = $json -match '"sourceSignals"'
    HolderData = $json -match '"holders"'
    PulseXPairs = $json -match '"pulsexPairs"'
  }
}
```

At least PLSX should return `Success=True` with verdict, market, source-signal, holder, and PulseX pair data. Other tokens may expose useful degradation states if PulseScan or upstream APIs rate-limit.

## Deep Links

Open each sample through the page route:

```powershell
npx.cmd vercel curl "$preview/app/token-chair-sniffer?token=0x95B303987A60C71504D99Aa1b13B4DA07b0790ab"
npx.cmd vercel curl "$preview/app/token-chair-sniffer?address=0x95B303987A60C71504D99Aa1b13B4DA07b0790ab"
```

Expected:

- The page renders server-side with Token Chair content.
- The canonical report link uses `?token=`.
- No wallet connection, signature, or transaction flow appears.

## Negative Checks

```powershell
npx.cmd vercel curl "$preview/api/token-chair-sniffer/market?token=not-an-address"
npx.cmd vercel curl "$preview/api/token-chair-sniffer/market?chainId=ethereum&token=0x0000000000000000000000000000000000000000"
npx.cmd vercel curl "$preview/api/token-chair-sniffer/market?token=0x95B303987A60C71504D99Aa1b13B4DA07b0790ab&page=2"
```

Expected:

- Invalid token returns `bad-request`.
- Non-PulseChain `chainId` returns `bad-request`.
- Unsupported range parameters return `bad-request`.

## Visual Review

In an authenticated browser session, check:

- Sample-token preset buttons run scans and update the URL.
- Scan Report appears before raw detail panels.
- Top Review Items are readable and do not overlap on mobile.
- Evidence Checklist distinguishes returned, partial, unavailable, not-configured, and not-live rows.
- Review Before Buying supports manual checklist toggles, decision state, notes, and Copy review.
- Reloading the same token preserves the local review draft in the browser.
- Copy report link writes a preview-local deep link.

## Guardrails

- Do not merge this feature to `main` from QA alone.
- Do not promote a preview to production.
- Do not add language that says a token is safe, certified, guaranteed, or not a scam.
- Do not claim honeypot simulation or full bytecode review is live.
- Keep Token Chair read-only: no wallet connection, signatures, writes, relayers, or server wallets.
