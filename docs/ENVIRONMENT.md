# Environment Variables

Pulse Revoke is primarily a wallet-side frontend app, with server-side
Ethereum, Arbitrum, and Optimism API routes for discovery. Variables prefixed with
`NEXT_PUBLIC_` are embedded into the browser bundle and are visible to users.
Do not store private secrets in these variables.

## Production Requirements

For the live PulseChain + BSC + Base + Ethereum + Arbitrum verified-row product
plus Optimism ERC-20/NFT verified-row revoke, configure:

| Variable | Production status | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Use `https://pulserevoke.com` for the public deployment. |
| `NEXT_PUBLIC_BSC_EXPLORER_API_URL` | Recommended | Defaults to `https://api.etherscan.io/v2/api`; set explicitly in hosted environments. |
| `NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID` | Recommended | Must be `56` for BNB Smart Chain Etherscan API V2 logs. Defaults to `56`. |
| `NEXT_PUBLIC_BSC_EXPLORER_API_KEY` | Required for reliable BSC discovery | Use an Etherscan API V2 key with BNB Smart Chain access. |
| `NEXT_PUBLIC_BSC_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC. |
| `NEXT_PUBLIC_BASE_EXPLORER_API_URL` | Recommended | Defaults to `https://api.etherscan.io/v2/api`; set explicitly in hosted environments. |
| `NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID` | Recommended | Must be `8453` for Base Etherscan API V2 logs. Defaults to `8453`. |
| `NEXT_PUBLIC_BASE_EXPLORER_API_KEY` | Required for reliable Base discovery | Use an Etherscan API V2 key with Base Mainnet access. |
| `NEXT_PUBLIC_BASE_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC. |
| `MAINNET_RPC_URL` / `ETHEREUM_RPC_URL` | Required for Ethereum scan | Server-only Ethereum RPC URL for `/api/ethereum/approvals`. |
| `ETHERSCAN_API_KEY` | Required for Ethereum scan | Server-only Etherscan API key. Do not use a `NEXT_PUBLIC_` key for Ethereum server discovery. |
| `ARBITRUM_ONE_RPC_URL` / `ARBITRUM_RPC_URL` | Required for Arbitrum scan | Server-only Arbitrum RPC URL for `/api/arbitrum/approvals`. |
| `ARBISCAN_API_KEY` | Required for Arbitrum scan | Server-only Arbiscan/Etherscan-compatible API key. Do not use a `NEXT_PUBLIC_` key for Arbitrum server discovery. |
| `OPTIMISM_RPC_URL` / `OPTIMISM_MAINNET_RPC_URL` / `OP_MAINNET_RPC_URL` | Required for Optimism scan | Server-only OP Mainnet RPC URL for `/api/optimism/approvals`. |
| `OPTIMISM_EXPLORER_API_KEY` / `OPTIMISTIC_ETHERSCAN_API_KEY` / `ETHERSCAN_API_KEY` | Required for Optimism scan | Server-only Etherscan API V2 key with OP Mainnet access. Do not use a `NEXT_PUBLIC_` key for Optimism server discovery. |

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

### `NEXT_PUBLIC_BASE_RPC_URL`

Recommended for production. Overrides the Base RPC used by wagmi/viem for live
validation and transaction submission. If unset, the app uses
`https://mainnet.base.org`.

Historical Base approval discovery does not rely on public Base RPC
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

### `NEXT_PUBLIC_BASE_EXPLORER_API_URL`

Recommended. Base historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

BaseScan remains the user-facing explorer for links, but historical Base log
reads use Etherscan API V2.

### `NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID`

Recommended. Etherscan API V2 chain ID parameter for Base Mainnet logs.
Default:

```text
8453
```

Every Base historical log request should include `chainid=8453`.

### `NEXT_PUBLIC_BASE_EXPLORER_API_KEY`

Required for reliable Base discovery. This should be an Etherscan API V2 key
with Base Mainnet access. Etherscan paid-chain access and plan limits can affect
whether Base logs are available and how quickly requests are served.

This is a public frontend variable. Treat it as a public API key, not a private
secret. Restrict and monitor it through the provider if possible.

### `MAINNET_RPC_URL` / `ETHEREUM_RPC_URL`

Required for Ethereum Mainnet approval discovery. These are server-only values
used by `/api/ethereum/approvals` for live RPC validation. Prefer
`MAINNET_RPC_URL`; `ETHEREUM_RPC_URL` is accepted as a fallback name.

### `ETHEREUM_EXPLORER_API_URL`

Optional server-only Etherscan API V2 endpoint override for Ethereum Mainnet.
If unset, the API route uses:

```text
https://api.etherscan.io/v2/api
```

### `ETHERSCAN_API_KEY`

Required for Ethereum Mainnet approval discovery. This must be a server-only
environment variable. Do not configure it as `NEXT_PUBLIC_ETHERSCAN_API_KEY`;
the frontend does not need this key.

### `ARBITRUM_ONE_RPC_URL` / `ARBITRUM_RPC_URL`

Required for Arbitrum One approval discovery. These are server-only
values used by `/api/arbitrum/approvals` for live RPC validation. Prefer
`ARBITRUM_ONE_RPC_URL`; `ARBITRUM_RPC_URL` is accepted as a fallback name.

Do not configure managed or secret-key Arbitrum RPC URLs as `NEXT_PUBLIC_*`
variables. Arbitrum approval scanning uses the server route; ERC-20 and NFT row
revoke use the user's wallet and the existing client-side approval-clearing
hooks. Arbitrum batch revoke is not enabled.

### `ARBITRUM_EXPLORER_API_URL`

Optional server-only Etherscan-compatible API V2 endpoint override for Arbitrum
One logs. If unset, the API route uses:

```text
https://api.etherscan.io/v2/api
```

### `ARBITRUM_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for Arbitrum One logs.
Default:

```text
42161
```

If this is set to any other value, the app falls back to `42161` and reports a
diagnostic warning.

### `ARBISCAN_API_KEY`

Required for Arbitrum One approval discovery. This must be a
server-only environment variable. Do not configure it as
`NEXT_PUBLIC_ARBISCAN_API_KEY`; the frontend does not need this key.

### `OPTIMISM_RPC_URL` / `OPTIMISM_MAINNET_RPC_URL` / `OP_MAINNET_RPC_URL`

Required for Optimism approval discovery. These are server-only values used by
`/api/optimism/approvals` for live RPC validation. Prefer
`OPTIMISM_RPC_URL`; `OPTIMISM_MAINNET_RPC_URL` and `OP_MAINNET_RPC_URL` are
accepted as fallback names.

Do not configure managed or secret-key Optimism RPC URLs as `NEXT_PUBLIC_*`
variables. Optimism approval scanning uses the server route. Optimism revoke is
limited to verified ERC-20 and NFT rows; Optimism batch and global revoke are
not enabled.

### `OPTIMISM_EXPLORER_API_URL`

Optional server-only Etherscan API V2 endpoint override for Optimism logs. If
unset, the API route uses:

```text
https://api.etherscan.io/v2/api
```

### `OPTIMISM_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for OP Mainnet logs.
Default:

```text
10
```

If this is set to any other value, the app falls back to `10` and reports a
diagnostic warning.

### `OPTIMISM_EXPLORER_API_KEY` / `OPTIMISTIC_ETHERSCAN_API_KEY`

Required for Optimism approval discovery unless `ETHERSCAN_API_KEY` is used as
the shared server-side Etherscan API V2 key. Do not configure these values as
`NEXT_PUBLIC_*`; the frontend does not need an Optimism explorer key.

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
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_PULSECHAIN_EXPLORER_API=
NEXT_PUBLIC_BSC_EXPLORER_API_URL=https://api.etherscan.io/v2/api
NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID=56
NEXT_PUBLIC_BSC_EXPLORER_API_KEY=replace_with_public_etherscan_v2_key
NEXT_PUBLIC_BSCSCAN_API_KEY=
NEXT_PUBLIC_BASE_EXPLORER_API_URL=https://api.etherscan.io/v2/api
NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID=8453
NEXT_PUBLIC_BASE_EXPLORER_API_KEY=replace_with_public_etherscan_v2_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_TELEMETRY_ENABLED=
MAINNET_RPC_URL=https://your-server-only-ethereum-rpc.example
ETHEREUM_RPC_URL=
ETHEREUM_EXPLORER_API_URL=https://api.etherscan.io/v2/api
ETHERSCAN_API_KEY=replace_with_server_only_etherscan_key
ARBITRUM_ONE_RPC_URL=https://your-server-only-arbitrum-rpc.example
ARBITRUM_RPC_URL=
ARBITRUM_EXPLORER_API_URL=https://api.etherscan.io/v2/api
ARBITRUM_EXPLORER_CHAIN_ID=42161
ARBISCAN_API_KEY=replace_with_server_only_arbiscan_or_etherscan_key
OPTIMISM_RPC_URL=https://your-server-only-optimism-rpc.example
OPTIMISM_MAINNET_RPC_URL=
OP_MAINNET_RPC_URL=
OPTIMISM_EXPLORER_API_URL=https://api.etherscan.io/v2/api
OPTIMISM_EXPLORER_CHAIN_ID=10
OPTIMISM_EXPLORER_API_KEY=replace_with_server_only_etherscan_v2_key
OPTIMISTIC_ETHERSCAN_API_KEY=

```

## Provider Limitations

Explorer APIs and public RPC endpoints can rate-limit, cap responses, or fail.
The app should surface incomplete discovery or validation instead of displaying
a false "clear" state. For production BSC and Base discovery, use Etherscan API
V2 keys and account plans that support BNB Smart Chain and Base Mainnet logs.
For Arbitrum, configure server-only managed RPC plus an Arbiscan or
Etherscan-compatible API key with Arbitrum One log access. For Optimism,
configure server-only managed RPC plus an Etherscan API V2 key with OP Mainnet
log access. Optimism scan failures should surface as incomplete/config/upstream
states, not as false clear results.
