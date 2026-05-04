# Environment Variables

Pulse Revoke is a frontend app. Variables prefixed with `NEXT_PUBLIC_` are
embedded into the browser bundle and are visible to users. Do not store private
secrets in these variables.

## Production Requirements

For the live PulseChain + BSC product, configure:

| Variable | Production status | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Use `https://pulserevoke.com` for the public deployment. |
| `NEXT_PUBLIC_BSC_EXPLORER_API_URL` | Recommended | Defaults to `https://api.etherscan.io/v2/api`; set explicitly in hosted environments. |
| `NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID` | Recommended | Must be `56` for BNB Smart Chain Etherscan API V2 logs. Defaults to `56`. |
| `NEXT_PUBLIC_BSC_EXPLORER_API_KEY` | Required for reliable BSC discovery | Use an Etherscan API V2 key with BNB Smart Chain access. |
| `NEXT_PUBLIC_BSC_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC. |

PulseChain has defaults for RPC and explorer API, but hosted production can
override them for reliability.

## Variables

### `NEXT_PUBLIC_PULSECHAIN_RPC_URL`

Optional. Overrides the PulseChain RPC used by wagmi/viem. If unset, the app
uses `https://rpc.pulsechain.com`.

### `NEXT_PUBLIC_BSC_RPC_URL`

Recommended for production. Overrides the BSC RPC used by wagmi/viem for live
validation and transaction submission. If unset, the app uses
`https://bsc-dataseed.bnbchain.org`.

Historical BSC approval discovery does not rely on public BSC RPC
`eth_getLogs`; it uses Etherscan API V2 logs.

### `NEXT_PUBLIC_PULSECHAIN_EXPLORER_API`

Optional. Overrides the PulseChain explorer API used for historical approval log
discovery. If unset, the app uses `https://api.scan.pulsechain.com/api`.

### `NEXT_PUBLIC_BSC_EXPLORER_API_URL`

Recommended. BSC historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

Do not configure the deprecated BscScan V1 logs endpoint
`https://api.bscscan.com/api` for this flow. If that endpoint is configured,
the app falls back to the Etherscan API V2 default and surfaces a diagnostic
warning.

### `NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID`

Recommended. Etherscan API V2 chain ID parameter for BNB Smart Chain logs.
Default:

```text
56
```

Every BSC historical log request should include `chainid=56`.

### `NEXT_PUBLIC_BSC_EXPLORER_API_KEY`

Required for reliable BSC discovery. This should be an Etherscan API V2 key with
BNB Smart Chain access. Etherscan plan limits can affect whether BSC logs are
available and how quickly requests are served.

This is a public frontend variable. Treat it as a public API key, not a private
secret. Restrict and monitor it through the provider if possible.

### `NEXT_PUBLIC_BSCSCAN_API_KEY`

Deprecated fallback for older deploys. Prefer
`NEXT_PUBLIC_BSC_EXPLORER_API_KEY`.

### `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

Optional. Enables WalletConnect QR pairing through Reown / WalletConnect. If
unset, injected wallet connectors can still work and WalletConnect UI is
disabled.

### `NEXT_PUBLIC_SITE_URL`

Optional. Canonical public URL used by metadata and generated social images.
Production should use:

```text
https://pulserevoke.com
```

### `NEXT_PUBLIC_TELEMETRY_ENABLED`

Optional. When set to `true` in production, enables the current telemetry sink.
The default telemetry implementation is in `src/lib/telemetry.ts`; it is
intended for product-health events and aggregate fields only.

## Example `.env.local`

```env
NEXT_PUBLIC_SITE_URL=https://pulserevoke.com
NEXT_PUBLIC_PULSECHAIN_RPC_URL=
NEXT_PUBLIC_BSC_RPC_URL=https://bsc-dataseed.bnbchain.org
NEXT_PUBLIC_PULSECHAIN_EXPLORER_API=
NEXT_PUBLIC_BSC_EXPLORER_API_URL=https://api.etherscan.io/v2/api
NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID=56
NEXT_PUBLIC_BSC_EXPLORER_API_KEY=replace_with_public_etherscan_v2_key
NEXT_PUBLIC_BSCSCAN_API_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_TELEMETRY_ENABLED=
```

## Provider Limitations

Explorer APIs and public RPC endpoints can rate-limit, cap responses, or fail.
The app should surface incomplete discovery or validation instead of displaying
a false "clear" state. For production BSC discovery, use an Etherscan API V2 key
and account plan that supports BNB Smart Chain logs.
