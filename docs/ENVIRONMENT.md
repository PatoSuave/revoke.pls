# Environment Variables

Pulse Revoke is primarily a wallet-side frontend app, with server-side BSC,
Base, Polygon, Ethereum, Arbitrum, Optimism, and HyperEVM API routes for
discovery plus a server-side gas tracker route. Variables prefixed with
`NEXT_PUBLIC_` are embedded into the browser bundle and are visible to users. Do
not store private secrets in these variables.

## Production Requirements

For the live PulseChain, BSC, Base, Polygon, Ethereum, Arbitrum, Optimism, and
HyperEVM product, configure:

| Variable | Production status | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Use `https://pulserevoke.com` for the public deployment. |
| `BSC_EXPLORER_API_URL` | Optional | Server-only BSC logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `BSC_EXPLORER_CHAIN_ID` | Optional | Must be `56` for BNB Smart Chain Etherscan API V2 logs. Defaults to `56`. |
| `BSC_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable BSC discovery | Server-only Etherscan API V2 key with BNB Smart Chain access. |
| `BSC_RPC_URL` / `BSC_MAINNET_RPC_URL` | Optional | Server-only BSC gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_BSC_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `BASE_EXPLORER_API_URL` | Optional | Server-only Base logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `BASE_EXPLORER_CHAIN_ID` | Optional | Must be `8453` for Base Etherscan API V2 logs. Defaults to `8453`. |
| `BASE_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Base discovery | Server-only Etherscan API V2 key with Base Mainnet access. |
| `BASE_RPC_URL` / `BASE_MAINNET_RPC_URL` | Optional | Server-only Base gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_BASE_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `POLYGON_EXPLORER_API_URL` | Optional | Server-only Polygon logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `POLYGON_EXPLORER_CHAIN_ID` | Optional | Must be `137` for Polygon Mainnet Etherscan API V2 logs. Defaults to `137`. |
| `POLYGON_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Polygon discovery | Server-only Etherscan API V2 key with Polygon Mainnet access. |
| `POLYGON_RPC_URL` / `POLYGON_MAINNET_RPC_URL` | Optional | Server-only Polygon gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_POLYGON_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `MAINNET_RPC_URL` / `ETHEREUM_RPC_URL` | Required for Ethereum scan | Server-only Ethereum RPC URL for `/api/ethereum/approvals` and `/api/gas`. |
| `ETHERSCAN_API_KEY` | Required for Ethereum scan | Server-only Etherscan API key. Do not use a `NEXT_PUBLIC_` key for Ethereum server discovery. |
| `ARBITRUM_ONE_RPC_URL` / `ARBITRUM_RPC_URL` | Required for Arbitrum scan | Server-only Arbitrum RPC URL for `/api/arbitrum/approvals` and `/api/gas`. |
| `ARBISCAN_API_KEY` | Required for Arbitrum scan | Server-only Arbiscan/Etherscan-compatible API key. Do not use a `NEXT_PUBLIC_` key for Arbitrum server discovery. |
| `OPTIMISM_RPC_URL` / `OPTIMISM_MAINNET_RPC_URL` / `OP_MAINNET_RPC_URL` | Required for Optimism scan | Server-only OP Mainnet RPC URL for `/api/optimism/approvals` and `/api/gas`. |
| `OPTIMISM_EXPLORER_API_KEY` / `OPTIMISTIC_ETHERSCAN_API_KEY` / `ETHERSCAN_API_KEY` | Required for Optimism scan | Server-only Etherscan API V2 key with OP Mainnet access. Do not use a `NEXT_PUBLIC_` key for Optimism server discovery. |
| `HYPEREVM_RPC_URL` / `HYPEREVM_MAINNET_RPC_URL` / `HYPERLIQUID_EVM_RPC_URL` | Required for HyperEVM scan | Server-only HyperEVM RPC URL for `/api/hyperevm/approvals` and `/api/gas`. |
| `HYPEREVM_EXPLORER_API_KEY` / `HYPEREVM_ETHERSCAN_API_KEY` / `ETHERSCAN_API_KEY` / `BSC_EXPLORER_API_KEY` | Required for HyperEVM scan | Server-only Etherscan API V2 key with HyperEVM access. `BSC_EXPLORER_API_KEY` is accepted as a shared paid-plan fallback. Do not use a `NEXT_PUBLIC_` key for HyperEVM server discovery. |

PulseChain has defaults for RPC and explorer API, but hosted production can
override them for reliability. The gas tracker prefers unprefixed server RPC
variables, then browser-safe `NEXT_PUBLIC_*` RPC values, then code defaults.
Keep private RPC URLs server-only.

PulseChain, BSC, and Polygon token logos use Dex Screener's public token lookup
endpoint through `/api/token-logos`. No API key is required. The app sends token
contract addresses only, caps each request at `30` addresses, caches successful
display metadata at the CDN, and falls back to symbol initials when no logo is
returned.

## Variables

### `NEXT_PUBLIC_PULSECHAIN_RPC_URL`

Optional. Overrides the PulseChain RPC used by wagmi/viem. If unset, the app
uses `https://rpc.pulsechain.com`.

### Gas tracker server RPC overrides

Optional. `/api/gas` uses these unprefixed RPC variables before browser-visible
fallbacks: `PULSECHAIN_RPC_URL`, `PULSECHAIN_MAINNET_RPC_URL`, `BSC_RPC_URL`,
`BSC_MAINNET_RPC_URL`, `BASE_RPC_URL`, `BASE_MAINNET_RPC_URL`,
`POLYGON_RPC_URL`, `POLYGON_MAINNET_RPC_URL`, `MAINNET_RPC_URL`,
`ETHEREUM_RPC_URL`, `ARBITRUM_ONE_RPC_URL`, `ARBITRUM_RPC_URL`,
`OPTIMISM_RPC_URL`, `OPTIMISM_MAINNET_RPC_URL`, `OP_MAINNET_RPC_URL`,
`HYPEREVM_RPC_URL`, `HYPEREVM_MAINNET_RPC_URL`, and
`HYPERLIQUID_EVM_RPC_URL`.

The gas tracker is informational only. It does not modify revoke transaction
gas settings, wallet estimation, preflight checks, or transaction submission.

### `NEXT_PUBLIC_BSC_RPC_URL`

Recommended for production. Overrides the BSC RPC used by wagmi/viem for live
validation and transaction submission. If unset, the app uses
`https://bsc-dataseed.bnbchain.org`.

Hosted web BSC approval discovery does not rely on public BSC RPC
`eth_getLogs`; it uses the server-side `/api/discovery/approvals` route with
Etherscan API V2 logs.

### `NEXT_PUBLIC_BASE_RPC_URL`

Recommended for production. Overrides the Base RPC used by wagmi/viem for live
validation and transaction submission. If unset, the app uses
`https://mainnet.base.org`.

Hosted web Base approval discovery does not rely on public Base RPC
`eth_getLogs`; it uses the server-side `/api/discovery/approvals` route with
Etherscan API V2 logs.

### `NEXT_PUBLIC_POLYGON_RPC_URL`

Recommended for production. Overrides the Polygon RPC used by wagmi/viem for
live validation and transaction submission. If unset, the app uses
`https://polygon.drpc.org`.

Hosted web Polygon approval discovery does not rely on public Polygon RPC
`eth_getLogs`; it uses the server-side `/api/discovery/approvals` route with
Etherscan API V2 logs.

### `NEXT_PUBLIC_MAINNET_RPC_URL` / `NEXT_PUBLIC_ETHEREUM_RPC_URL`

Optional browser-visible Ethereum wallet transport overrides. These are used by
wagmi for wallet-chain reads and should contain only public, browser-safe RPC
URLs. They are not a substitute for the server-only `MAINNET_RPC_URL` or
`ETHEREUM_RPC_URL` used by `/api/ethereum/approvals`.

### `NEXT_PUBLIC_ARBITRUM_RPC_URL` / `NEXT_PUBLIC_OPTIMISM_RPC_URL` / `NEXT_PUBLIC_HYPEREVM_RPC_URL`

Optional browser-visible gas watcher overrides for Arbitrum, Optimism, and
HyperEVM. Use only public, browser-safe RPC URLs. Server-side approval discovery
and `/api/gas` should use the unprefixed RPC variables above for private or
authenticated RPCs.

### `NEXT_PUBLIC_PULSECHAIN_EXPLORER_API`

Optional. Overrides the PulseChain explorer API used for historical approval log
discovery. If unset, the app uses `https://api.scan.pulsechain.com/api`.

### Token Logo Lookup

No environment variable is required for PulseChain, BSC, or Polygon token
logos. The server route `/api/token-logos?chainId=369&addresses=...`,
`/api/token-logos?chainId=56&addresses=...`, or
`/api/token-logos?chainId=137&addresses=...` calls Dex Screener for display
metadata and does not receive wallet owner, spender, or allowance data. Treat
logos as visual convenience only; explorer links and live chain reads remain
the source of verification.

### `BSC_EXPLORER_API_URL`

Optional server-only BSC historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

Do not configure the deprecated BscScan V1 logs endpoint
`https://api.bscscan.com/api` for this flow. If that endpoint is configured,
the app falls back to the Etherscan API V2 default and surfaces a diagnostic
warning.

### `BSC_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for BNB Smart Chain logs.
Default:

```text
56
```

Every BSC historical log request should include `chainid=56`.

### `BSC_EXPLORER_API_KEY`

Required for reliable hosted web BSC discovery unless `ETHERSCAN_API_KEY` is
used as the shared server-side Etherscan API V2 key. Etherscan plan limits can
affect whether BSC logs are available and how quickly requests are served.

Do not configure this value as `NEXT_PUBLIC_*`; the frontend does not need a
BSC explorer key in hosted web deployments.

### `NEXT_PUBLIC_BSC_EXPLORER_API_KEY` / `NEXT_PUBLIC_BSCSCAN_API_KEY`

Desktop/static-only fallback values for builds without API routes.
`NEXT_PUBLIC_BSCSCAN_API_KEY` is retained only for older compatibility. Hosted
web deployments should leave both unset.

### `BASE_EXPLORER_API_URL`

Optional server-only Base historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

BaseScan remains the user-facing explorer for links, but historical Base log
reads use Etherscan API V2.

### `BASE_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for Base Mainnet logs.
Default:

```text
8453
```

Every Base historical log request should include `chainid=8453`.

### `BASE_EXPLORER_API_KEY`

Required for reliable hosted web Base discovery unless `ETHERSCAN_API_KEY` is
used as the shared server-side Etherscan API V2 key. Etherscan paid-chain access
and plan limits can affect whether Base logs are available and how quickly
requests are served.

Do not configure this value as `NEXT_PUBLIC_*`; the frontend does not need a
Base explorer key in hosted web deployments.

### `NEXT_PUBLIC_BASE_EXPLORER_API_KEY`

Desktop/static-only fallback value for builds without API routes. Hosted web
deployments should leave it unset.

### `POLYGON_EXPLORER_API_URL`

Optional server-only Polygon historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

PolygonScan remains the user-facing explorer for links, but historical Polygon
log reads use Etherscan API V2. Do not configure the deprecated PolygonScan V1
logs endpoint `https://api.polygonscan.com/api` for this flow.

### `POLYGON_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for Polygon Mainnet
logs. Default:

```text
137
```

Every Polygon historical log request should include `chainid=137`.

### `POLYGON_EXPLORER_API_KEY`

Required for reliable hosted web Polygon discovery unless `ETHERSCAN_API_KEY`
is used as the shared server-side Etherscan API V2 key. Etherscan plan limits
can affect whether Polygon logs are available and how quickly requests are
served.

Do not configure this value as `NEXT_PUBLIC_*`; the frontend does not need a
Polygon explorer key in hosted web deployments.

### `NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY`

Desktop/static-only fallback value for builds without API routes. Hosted web
deployments should leave it unset.

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

### `HYPEREVM_RPC_URL` / `HYPEREVM_MAINNET_RPC_URL` / `HYPERLIQUID_EVM_RPC_URL`

Required for HyperEVM approval discovery. These are server-only values used by
`/api/hyperevm/approvals` for live RPC validation. Prefer
`HYPEREVM_RPC_URL`; `HYPEREVM_MAINNET_RPC_URL` and
`HYPERLIQUID_EVM_RPC_URL` are accepted as fallback names.

Do not configure managed or secret-key HyperEVM RPC URLs as `NEXT_PUBLIC_*`
variables. HyperEVM approval scanning uses the server route. HyperEVM revoke is
limited to verified ERC-20 and NFT rows; HyperEVM batch and global revoke are
not enabled. HyperEVM gas is paid in HYPE.

### `HYPEREVM_EXPLORER_API_URL`

Optional server-only Etherscan API V2 endpoint override for HyperEVM logs. If
unset, the API route uses:

```text
https://api.etherscan.io/v2/api
```

### `HYPEREVM_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for HyperEVM logs.
Default:

```text
999
```

If this is set to any other value, the app falls back to `999` and reports a
diagnostic warning.

### `HYPEREVM_EXPLORER_API_KEY` / `HYPEREVM_ETHERSCAN_API_KEY`

Required for HyperEVM approval discovery unless `ETHERSCAN_API_KEY` or
`BSC_EXPLORER_API_KEY` is used as the shared server-side Etherscan API V2 key.
Do not configure these values as `NEXT_PUBLIC_*`; the frontend does not need a
HyperEVM explorer key.

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
# Public browser variables. Do not put secrets or private RPC URLs here.
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_PULSECHAIN_RPC_URL=
NEXT_PUBLIC_BSC_RPC_URL=
NEXT_PUBLIC_BASE_RPC_URL=
NEXT_PUBLIC_POLYGON_RPC_URL=
NEXT_PUBLIC_MAINNET_RPC_URL=
NEXT_PUBLIC_ETHEREUM_RPC_URL=
NEXT_PUBLIC_PULSECHAIN_EXPLORER_API=
NEXT_PUBLIC_BSC_EXPLORER_API_URL=
NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID=56
NEXT_PUBLIC_BSC_EXPLORER_API_KEY=
NEXT_PUBLIC_BSCSCAN_API_KEY=
NEXT_PUBLIC_BASE_EXPLORER_API_URL=
NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID=8453
NEXT_PUBLIC_BASE_EXPLORER_API_KEY=
NEXT_PUBLIC_POLYGON_EXPLORER_API_URL=
NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID=137
NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_TELEMETRY_ENABLED=

# Server-only variables. Keep these out of NEXT_PUBLIC_*.
BSC_EXPLORER_API_URL=
BSC_EXPLORER_CHAIN_ID=56
BSC_EXPLORER_API_KEY=
BASE_EXPLORER_API_URL=
BASE_EXPLORER_CHAIN_ID=8453
BASE_EXPLORER_API_KEY=
POLYGON_EXPLORER_API_URL=
POLYGON_EXPLORER_CHAIN_ID=137
POLYGON_EXPLORER_API_KEY=
MAINNET_RPC_URL=
ETHEREUM_RPC_URL=
ETHEREUM_EXPLORER_API_URL=
ETHERSCAN_API_KEY=
ARBITRUM_ONE_RPC_URL=
ARBITRUM_RPC_URL=
ARBITRUM_EXPLORER_API_URL=
ARBITRUM_EXPLORER_CHAIN_ID=42161
ARBISCAN_API_KEY=
OPTIMISM_RPC_URL=
OPTIMISM_MAINNET_RPC_URL=
OP_MAINNET_RPC_URL=
OPTIMISM_EXPLORER_API_URL=
OPTIMISM_EXPLORER_CHAIN_ID=10
OPTIMISM_EXPLORER_API_KEY=
OPTIMISTIC_ETHERSCAN_API_KEY=
HYPEREVM_RPC_URL=
HYPEREVM_MAINNET_RPC_URL=
HYPERLIQUID_EVM_RPC_URL=
HYPEREVM_EXPLORER_API_URL=
HYPEREVM_EXPLORER_CHAIN_ID=999
HYPEREVM_EXPLORER_API_KEY=
HYPEREVM_ETHERSCAN_API_KEY=
```

## Provider Limitations

Explorer APIs and public RPC endpoints can rate-limit, cap responses, or fail.
The app should surface incomplete discovery or validation instead of displaying
a false "clear" state. For production BSC, Base, and Polygon discovery, use
Etherscan API V2 keys server-side and account plans that support BNB Smart
Chain, Base Mainnet, and Polygon Mainnet logs.
For Arbitrum, configure server-only managed RPC plus an Arbiscan or
Etherscan-compatible API key with Arbitrum One log access. For Optimism,
configure server-only managed RPC plus an Etherscan API V2 key with OP Mainnet
log access. Optimism scan failures should surface as incomplete/config/upstream
states, not as false clear results.
For HyperEVM, configure server-only RPC plus an Etherscan API V2 key with
HyperEVM Mainnet log access. HyperEVM scan failures should surface as
incomplete/config/upstream states, not as false clear results.
