# Environment Variables

Pulse Revoke is primarily a wallet-side frontend app, with server-side BSC,
Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast, Berachain, Celo, Gnosis,
Unichain, World Chain, Robinhood Chain, Ethereum, Arbitrum, Optimism, and
HyperEVM API routes for discovery plus a server-side gas tracker route.
Variables prefixed with `NEXT_PUBLIC_` are embedded into the browser bundle and
are visible to users. Do not store private secrets in these variables.

## Production Requirements

For the live PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea,
Blast, Berachain, Celo, Gnosis, Unichain, World Chain, Robinhood Chain,
Ethereum, Arbitrum, Optimism, and HyperEVM product, configure:

| Variable | Production status | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Use `https://pulserevoke.com` for the public deployment. |
| `PULSECHAIN_DISCOVERY_RPC_URL` | Recommended fallback | Server-only Dwellir/managed RPC fallback for hosted PulseChain approval discovery. |
| `PULSECHAIN_OTHERSCAN_RPC_URL` | Optional fallback | Server-only OtherScan transaction/RPC discovery fallback. Defaults to `https://rpc.pulsechain.box`. |
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
| `SONIC_EXPLORER_API_URL` | Optional | Server-only Sonic logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `SONIC_EXPLORER_CHAIN_ID` | Optional | Must be `146` for Sonic Mainnet Etherscan API V2 logs. Defaults to `146`. |
| `SONIC_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Sonic discovery | Server-only Etherscan API V2 key with Sonic Mainnet access. |
| `SONIC_RPC_URL` / `SONIC_MAINNET_RPC_URL` | Optional | Server-only Sonic gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_SONIC_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `AVALANCHE_EXPLORER_API_URL` | Optional | Server-only Avalanche C-Chain logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `AVALANCHE_EXPLORER_CHAIN_ID` | Optional | Must be `43114` for Avalanche C-Chain Etherscan API V2 logs. Defaults to `43114`. |
| `AVALANCHE_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Avalanche discovery | Server-only Etherscan API V2 key with Avalanche C-Chain access. Etherscan lists Avalanche C-Chain as paid-tier API access. |
| `AVALANCHE_RPC_URL` / `AVALANCHE_C_CHAIN_RPC_URL` / `AVALANCHE_MAINNET_RPC_URL` | Optional | Server-only Avalanche gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_AVALANCHE_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `MANTLE_EXPLORER_API_URL` | Optional | Server-only Mantle logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `MANTLE_EXPLORER_CHAIN_ID` | Optional | Must be `5000` for Mantle Etherscan API V2 logs. Defaults to `5000`. |
| `MANTLE_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Mantle discovery | Server-only Etherscan API V2 key with Mantle Mainnet access. |
| `MANTLE_RPC_URL` / `MANTLE_MAINNET_RPC_URL` | Optional | Server-only Mantle gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_MANTLE_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `LINEA_EXPLORER_API_URL` | Optional | Server-only Linea logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `LINEA_EXPLORER_CHAIN_ID` | Optional | Must be `59144` for Linea Etherscan API V2 logs. Defaults to `59144`. |
| `LINEA_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Linea discovery | Server-only Etherscan API V2 key with Linea Mainnet access. Do not use a `NEXT_PUBLIC_` key. |
| `LINEA_RPC_URL` / `LINEA_MAINNET_RPC_URL` | Optional | Server-only Linea gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_LINEA_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `BLAST_EXPLORER_API_URL` | Optional | Server-only Blast logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `BLAST_EXPLORER_CHAIN_ID` | Optional | Must be `81457` for Blast Etherscan API V2 logs. Defaults to `81457`. |
| `BLAST_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Blast discovery | Server-only Etherscan API V2 key with Blast Mainnet access. Do not use a `NEXT_PUBLIC_` key. |
| `BLAST_RPC_URL` / `BLAST_MAINNET_RPC_URL` | Optional | Server-only Blast gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_BLAST_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `BERACHAIN_EXPLORER_API_URL` | Optional | Server-only Berachain logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `BERACHAIN_EXPLORER_CHAIN_ID` | Optional | Must be `80094` for Berachain Etherscan API V2 logs. Defaults to `80094`. |
| `BERACHAIN_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Berachain discovery | Server-only Etherscan API V2 key with Berachain Mainnet access. Do not use a `NEXT_PUBLIC_` key. |
| `BERACHAIN_RPC_URL` / `BERACHAIN_MAINNET_RPC_URL` | Optional | Server-only Berachain gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_BERACHAIN_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `CELO_EXPLORER_API_URL` | Optional | Server-only Celo logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `CELO_EXPLORER_CHAIN_ID` | Optional | Must be `42220` for Celo Etherscan API V2 logs. Defaults to `42220`. |
| `CELO_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Celo discovery | Server-only Etherscan API V2 key with Celo Mainnet access. Do not use a `NEXT_PUBLIC_` key. |
| `CELO_RPC_URL` / `CELO_MAINNET_RPC_URL` | Optional | Server-only Celo gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_CELO_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `GNOSIS_EXPLORER_API_URL` | Optional | Server-only Gnosis logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `GNOSIS_EXPLORER_CHAIN_ID` | Optional | Must be `100` for Gnosis Etherscan API V2 logs. Defaults to `100`. |
| `GNOSIS_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Gnosis discovery | Server-only Etherscan API V2 key with Gnosis access. Do not use a `NEXT_PUBLIC_` key. |
| `GNOSIS_RPC_URL` / `GNOSIS_MAINNET_RPC_URL` | Optional | Server-only Gnosis gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_GNOSIS_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `UNICHAIN_EXPLORER_API_URL` | Optional | Server-only Unichain logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `UNICHAIN_EXPLORER_CHAIN_ID` | Optional | Must be `130` for Unichain Etherscan API V2 logs. Defaults to `130`. |
| `UNICHAIN_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable Unichain discovery | Server-only Etherscan API V2 key with Unichain Mainnet access. Do not use a `NEXT_PUBLIC_` key. |
| `UNICHAIN_RPC_URL` / `UNICHAIN_MAINNET_RPC_URL` | Optional | Server-only Unichain gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_UNICHAIN_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `WORLDCHAIN_EXPLORER_API_URL` | Optional | Server-only World Chain logs API. Defaults to `https://api.etherscan.io/v2/api`. |
| `WORLDCHAIN_EXPLORER_CHAIN_ID` | Optional | Must be `480` for World Chain Etherscan API V2 logs. Defaults to `480`. |
| `WORLDCHAIN_EXPLORER_API_KEY` / `ETHERSCAN_API_KEY` | Required for reliable World Chain discovery | Server-only Etherscan API V2 key with World Mainnet access. Do not use a `NEXT_PUBLIC_` key. |
| `WORLDCHAIN_RPC_URL` / `WORLDCHAIN_MAINNET_RPC_URL` | Optional | Server-only World Chain gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_WORLDCHAIN_RPC_URL` | Recommended | Public fallback is available, but production should prefer a reliable RPC for wallet reads and browser block watching. |
| `ROBINHOOD_EXPLORER_API_URL` | Optional | Server-only Robinhood Blockscout logs API. Defaults to `https://robinhoodchain.blockscout.com/api`. |
| `ROBINHOOD_RPC_URL` / `ROBINHOOD_MAINNET_RPC_URL` | Optional | Server-only Robinhood Chain gas tracker RPC override for `/api/gas`. |
| `NEXT_PUBLIC_ROBINHOOD_RPC_URL` | Recommended | The public default RPC is rate-limited; production should prefer a reliable browser-safe RPC for wallet reads and browser block watching. |
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

PulseChain, BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast,
Berachain, Celo, Gnosis, Unichain, World Chain, and Robinhood Chain token logos
use Dex Screener's public token lookup endpoint through `/api/token-logos`. No
API key is required. The app sends token contract addresses only, caps each
request at `30` addresses, caches successful display metadata at the CDN, and
falls back to symbol initials when no logo is returned.

Gas tracker USD estimates use CoinGecko's public `/simple/price` endpoint for
the selected chain's native token. No environment variable or API key is
required. USD prices are optional, cached briefly server-side, and do not affect
gas availability or revoke transaction execution.

## Variables

### `NEXT_PUBLIC_PULSECHAIN_RPC_URL`

Optional. Overrides the PulseChain RPC used by wagmi/viem. If unset, the app
uses `https://rpc.pulsechain.com`.

Do not put an authenticated Dwellir account URL here unless it is intentionally
public and quota-limited. `NEXT_PUBLIC_*` values are bundled into the browser.

### `PULSECHAIN_DISCOVERY_RPC_URL`

Optional server-only PulseChain discovery fallback. Hosted PulseChain approval
discovery tries PulseScan first. If PulseScan/indexer discovery fails or times
out, the server can fall back to bounded JSON-RPC `eth_getLogs` through this
URL. For Dwellir, use the dedicated Pulse Revoke account endpoint:
`https://api-pulse-mainnet.n.dwellir.com/<API_KEY>`.

Leave this unset until the dedicated Dwellir account/key is ready. If unset,
Pulse Revoke may fall back to `PULSECHAIN_RPC_URL` or
`PULSECHAIN_MAINNET_RPC_URL` for this server-side discovery path. If those are
unset or fail, hosted discovery uses OtherScan transaction receipts, then the
public PulseChain RPC default with a small bounded window, then OtherScan RPC.
Never commit a real RPC key.

### `PULSECHAIN_OTHERSCAN_RPC_URL`

Optional server-only PulseChain discovery fallback override. Hosted PulseChain
approval discovery uses OtherScan only after PulseScan fails, the preferred
Dwellir/server RPC fallback is unavailable or fails, or every earlier source is
truncated. If unset, the default is `https://rpc.pulsechain.box`, the backend RPC
host used by OtherScan. The hosted route first uses its Otterscan transaction
receipt index and only falls back to bounded `eth_getLogs` scans if needed.

Do not configure OtherScan as `NEXT_PUBLIC_PULSECHAIN_RPC_URL`. Browser wallet
reads and wallet-signed revoke transactions continue to use the existing wallet
RPC path.

### Gas tracker server RPC overrides

Optional. `/api/gas` uses these unprefixed RPC variables before browser-visible
fallbacks: `PULSECHAIN_RPC_URL`, `PULSECHAIN_MAINNET_RPC_URL`, `BSC_RPC_URL`,
`BSC_MAINNET_RPC_URL`, `BASE_RPC_URL`, `BASE_MAINNET_RPC_URL`,
`POLYGON_RPC_URL`, `POLYGON_MAINNET_RPC_URL`, `SONIC_RPC_URL`,
`SONIC_MAINNET_RPC_URL`, `AVALANCHE_RPC_URL`, `AVALANCHE_C_CHAIN_RPC_URL`,
`AVALANCHE_MAINNET_RPC_URL`, `MANTLE_RPC_URL`, `MANTLE_MAINNET_RPC_URL`,
`LINEA_RPC_URL`, `LINEA_MAINNET_RPC_URL`, `BLAST_RPC_URL`,
`BLAST_MAINNET_RPC_URL`, `BERACHAIN_RPC_URL`, `BERACHAIN_MAINNET_RPC_URL`,
`CELO_RPC_URL`, `CELO_MAINNET_RPC_URL`, `GNOSIS_RPC_URL`,
`GNOSIS_MAINNET_RPC_URL`, `UNICHAIN_RPC_URL`, `UNICHAIN_MAINNET_RPC_URL`,
`WORLDCHAIN_RPC_URL`, `WORLDCHAIN_MAINNET_RPC_URL`,
`ROBINHOOD_RPC_URL`, `ROBINHOOD_MAINNET_RPC_URL`,
`MAINNET_RPC_URL`, `ETHEREUM_RPC_URL`,
`ARBITRUM_ONE_RPC_URL`, `ARBITRUM_RPC_URL`,
`OPTIMISM_RPC_URL`, `OPTIMISM_MAINNET_RPC_URL`, `OP_MAINNET_RPC_URL`,
`HYPEREVM_RPC_URL`, `HYPEREVM_MAINNET_RPC_URL`, and
`HYPERLIQUID_EVM_RPC_URL`.

The gas tracker is informational only. It does not modify revoke transaction
gas settings, wallet estimation, preflight checks, or transaction submission.
Native-token estimates update from fresh block samples; approximate USD values
use briefly cached CoinGecko native-token prices when available.

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

### `NEXT_PUBLIC_SONIC_RPC_URL`

Recommended for production. Overrides the Sonic RPC used by wagmi/viem for
live validation and transaction submission. If unset, the app uses
`https://rpc.soniclabs.com`.

Hosted web Sonic approval discovery does not rely on public Sonic RPC
`eth_getLogs`; it uses the server-side `/api/discovery/approvals` route with
Etherscan API V2 logs.

### `NEXT_PUBLIC_AVALANCHE_RPC_URL`

Recommended for production. Overrides the Avalanche C-Chain RPC used by
wagmi/viem for live validation and transaction submission. If unset, the app
uses `https://api.avax.network/ext/bc/C/rpc`.

Hosted web Avalanche approval discovery does not rely on public Avalanche RPC
`eth_getLogs`; it uses the server-side `/api/discovery/approvals` route with
Etherscan API V2 logs.

### `NEXT_PUBLIC_MANTLE_RPC_URL`

Recommended for production. Overrides the Mantle RPC used by wagmi/viem for
live validation and transaction submission. If unset, the app uses
`https://rpc.mantle.xyz`.

Hosted web Mantle approval discovery does not rely on public Mantle RPC
`eth_getLogs`; it uses the server-side `/api/discovery/approvals` route with
Etherscan API V2 logs.

### `NEXT_PUBLIC_LINEA_RPC_URL`

Recommended for production. Overrides the Linea RPC used by wagmi/viem for
live validation and transaction submission. If unset, the app uses
`https://rpc.linea.build`.

Hosted web Linea approval discovery does not rely on public Linea RPC
`eth_getLogs`; it uses the server-side `/api/discovery/approvals` route with
Etherscan API V2 logs.

### `NEXT_PUBLIC_BLAST_RPC_URL`

Recommended for production. Overrides the Blast RPC used by wagmi/viem for
live validation and transaction submission. If unset, the app uses
`https://rpc.blast.io`.

Hosted web Blast approval discovery does not rely on public Blast RPC
`eth_getLogs`; it uses the server-side `/api/discovery/approvals` route with
Etherscan API V2 logs.

### `NEXT_PUBLIC_BERACHAIN_RPC_URL`

Recommended for production. Overrides the Berachain RPC used by wagmi/viem for
live validation and transaction submission. If unset, the app uses
`https://rpc.berachain.com`.

Hosted web Berachain approval discovery does not rely on public Berachain RPC
`eth_getLogs`; it uses the server-side `/api/discovery/approvals` route with
Etherscan API V2 logs.

### `NEXT_PUBLIC_CELO_RPC_URL` / `NEXT_PUBLIC_GNOSIS_RPC_URL` / `NEXT_PUBLIC_UNICHAIN_RPC_URL` / `NEXT_PUBLIC_WORLDCHAIN_RPC_URL` / `NEXT_PUBLIC_ROBINHOOD_RPC_URL`

Recommended for production. These override the Celo, Gnosis, Unichain, World
Chain, and Robinhood Chain RPCs used by wagmi/viem for live validation and
transaction submission. If unset, the app uses public defaults. The Robinhood
Chain public default is rate-limited, so production should use a reliable
browser-safe endpoint.

Hosted web discovery for Celo, Gnosis, Unichain, and World Chain does not rely
on public RPC `eth_getLogs`; it uses the server-side
`/api/discovery/approvals` route with Etherscan API V2 logs. Robinhood Chain
uses the same hosted route with Robinhood Blockscout logs.

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
Hosted web scans use this PulseScan-compatible API as the primary source before
trying the server-only PulseChain discovery RPC fallback.

### Token Logo Lookup

No environment variable is required for PulseChain, BSC, Base, Polygon, Sonic,
Avalanche, Mantle, Linea, Blast, Berachain, Celo, Gnosis, Unichain, World
Chain, or Robinhood Chain token logos. The `/api/token-logos` server route
supports chain IDs `369`, `56`, `8453`, `137`, `146`, `43114`, `5000`, `59144`,
`81457`, `80094`, `42220`, `100`, `130`, `480`, and `4663`. It calls Dex
Screener for display metadata and does not receive wallet owner, spender, or
allowance data. Treat logos as visual convenience only; explorer links and live
chain reads remain the source of verification.

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

### `SONIC_EXPLORER_API_URL`

Optional server-only Sonic historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

SonicScan remains the user-facing explorer for links, but historical Sonic log
reads use Etherscan API V2.

### `SONIC_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for Sonic Mainnet
logs. Default:

```text
146
```

Every Sonic historical log request should include `chainid=146`.

### `SONIC_EXPLORER_API_KEY`

Required for reliable hosted web Sonic discovery unless `ETHERSCAN_API_KEY` is
used as the shared server-side Etherscan API V2 key. Etherscan plan limits can
affect whether Sonic logs are available and how quickly requests are served.

Do not configure this value as `NEXT_PUBLIC_*`; the frontend does not need a
Sonic explorer key in hosted web deployments.

### `NEXT_PUBLIC_SONIC_EXPLORER_API_KEY`

Desktop/static-only fallback value for builds without API routes. Hosted web
deployments should leave it unset.

### `AVALANCHE_EXPLORER_API_URL`

Optional server-only Avalanche C-Chain historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

SnowScan remains the user-facing explorer for links, but historical Avalanche
log reads use Etherscan API V2.

### `AVALANCHE_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for Avalanche C-Chain
logs. Default:

```text
43114
```

Every Avalanche historical log request should include `chainid=43114`.

### `AVALANCHE_EXPLORER_API_KEY`

Required for reliable hosted web Avalanche discovery unless `ETHERSCAN_API_KEY`
is used as the shared server-side Etherscan API V2 key. Etherscan lists
Avalanche C-Chain API access as paid-tier, and plan limits can affect whether
logs are available and how quickly requests are served.

Do not configure this value as `NEXT_PUBLIC_*`; the frontend does not need an
Avalanche explorer key in hosted web deployments.

### `NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY`

Desktop/static-only fallback value for builds without API routes. Hosted web
deployments should leave it unset.

### `MANTLE_EXPLORER_API_URL`

Optional server-only Mantle historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

Mantle explorer links remain user-facing, but historical Mantle log reads use
Etherscan API V2.

### `MANTLE_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for Mantle logs.
Default:

```text
5000
```

Every Mantle historical log request should include `chainid=5000`.

### `MANTLE_EXPLORER_API_KEY`

Required for reliable hosted web Mantle discovery unless `ETHERSCAN_API_KEY`
is used as the shared server-side Etherscan API V2 key. Etherscan plan limits
can affect whether Mantle logs are available and how quickly requests are
served.

Do not configure this value as `NEXT_PUBLIC_*`; the frontend does not need a
Mantle explorer key in hosted web deployments.

### `NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY`

Desktop/static-only fallback value for builds without API routes. Hosted web
deployments should leave it unset.

### `LINEA_EXPLORER_API_URL`

Optional server-only Linea historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

LineaScan remains the user-facing explorer for links, but historical Linea log
reads use Etherscan API V2.

### `LINEA_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for Linea logs.
Default:

```text
59144
```

Every Linea historical log request should include `chainid=59144`.

### `LINEA_EXPLORER_API_KEY`

Required for reliable hosted web Linea discovery unless `ETHERSCAN_API_KEY` is
used as the shared server-side Etherscan API V2 key. Do not configure this
value as `NEXT_PUBLIC_*`; the frontend does not need a Linea explorer key.

### `BLAST_EXPLORER_API_URL`

Optional server-only Blast historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

Blastscan remains the user-facing explorer for links, but historical Blast log
reads use Etherscan API V2.

### `BLAST_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for Blast logs.
Default:

```text
81457
```

Every Blast historical log request should include `chainid=81457`.

### `BLAST_EXPLORER_API_KEY`

Required for reliable hosted web Blast discovery unless `ETHERSCAN_API_KEY` is
used as the shared server-side Etherscan API V2 key. Do not configure this
value as `NEXT_PUBLIC_*`; the frontend does not need a Blast explorer key.

### `BERACHAIN_EXPLORER_API_URL`

Optional server-only Berachain historical logs API base URL. Default:

```text
https://api.etherscan.io/v2/api
```

Berascan remains the user-facing explorer for links, but historical Berachain
log reads use Etherscan API V2.

### `BERACHAIN_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameter for Berachain logs.
Default:

```text
80094
```

Every Berachain historical log request should include `chainid=80094`.

### `BERACHAIN_EXPLORER_API_KEY`

Required for reliable hosted web Berachain discovery unless
`ETHERSCAN_API_KEY` is used as the shared server-side Etherscan API V2 key. Do
not configure this value as `NEXT_PUBLIC_*`; the frontend does not need a
Berachain explorer key.

### `CELO_EXPLORER_API_URL` / `GNOSIS_EXPLORER_API_URL` / `UNICHAIN_EXPLORER_API_URL` / `WORLDCHAIN_EXPLORER_API_URL`

Optional server-only historical logs API base URLs for Celo, Gnosis, Unichain,
and World Chain. The default for all four is:

```text
https://api.etherscan.io/v2/api
```

The user-facing explorer links remain CeloScan, Gnosisscan, Uniscan, and
Worldscan; historical log reads use Etherscan API V2.

### `CELO_EXPLORER_CHAIN_ID` / `GNOSIS_EXPLORER_CHAIN_ID` / `UNICHAIN_EXPLORER_CHAIN_ID` / `WORLDCHAIN_EXPLORER_CHAIN_ID`

Optional server-only Etherscan API V2 chain ID parameters. Defaults:

```text
42220
100
130
480
```

Historical log requests should include `chainid=42220` for Celo, `chainid=100`
for Gnosis, `chainid=130` for Unichain, and `chainid=480` for World Chain.

### `CELO_EXPLORER_API_KEY` / `GNOSIS_EXPLORER_API_KEY` / `UNICHAIN_EXPLORER_API_KEY` / `WORLDCHAIN_EXPLORER_API_KEY`

Optional chain-specific server-only API keys. If unset, each chain uses
`ETHERSCAN_API_KEY` as the shared server-side Etherscan API V2 key. Do not
configure these values as `NEXT_PUBLIC_*`; the frontend does not need these
explorer keys.

### `ROBINHOOD_EXPLORER_API_URL` / `NEXT_PUBLIC_ROBINHOOD_EXPLORER_API_URL`

Optional Robinhood Chain historical logs API base URL. Hosted deployments use
the server-only `ROBINHOOD_EXPLORER_API_URL`; desktop/static builds without API
routes may use `NEXT_PUBLIC_ROBINHOOD_EXPLORER_API_URL`. If unset, the app
uses:

```text
https://robinhoodchain.blockscout.com/api
```

Robinhood Chain discovery uses Robinhood Blockscout logs, not Etherscan API V2,
so no Etherscan API key or `chainid` parameter is required. Explorer/API caps or
rate limits are still reported as incomplete discovery instead of a false clear
state.

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
NEXT_PUBLIC_SONIC_RPC_URL=
NEXT_PUBLIC_AVALANCHE_RPC_URL=
NEXT_PUBLIC_MANTLE_RPC_URL=
NEXT_PUBLIC_LINEA_RPC_URL=
NEXT_PUBLIC_BLAST_RPC_URL=
NEXT_PUBLIC_BERACHAIN_RPC_URL=
NEXT_PUBLIC_CELO_RPC_URL=
NEXT_PUBLIC_GNOSIS_RPC_URL=
NEXT_PUBLIC_UNICHAIN_RPC_URL=
NEXT_PUBLIC_WORLDCHAIN_RPC_URL=
NEXT_PUBLIC_ROBINHOOD_RPC_URL=
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
NEXT_PUBLIC_SONIC_EXPLORER_API_URL=
NEXT_PUBLIC_SONIC_EXPLORER_CHAIN_ID=146
NEXT_PUBLIC_SONIC_EXPLORER_API_KEY=

# Server-only PulseChain discovery fallback. Do not expose this as NEXT_PUBLIC_*.
PULSECHAIN_DISCOVERY_RPC_URL=
PULSECHAIN_OTHERSCAN_RPC_URL=
NEXT_PUBLIC_AVALANCHE_EXPLORER_API_URL=
NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID=43114
NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY=
NEXT_PUBLIC_MANTLE_EXPLORER_API_URL=
NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID=5000
NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY=
NEXT_PUBLIC_LINEA_EXPLORER_API_URL=
NEXT_PUBLIC_LINEA_EXPLORER_CHAIN_ID=59144
NEXT_PUBLIC_BLAST_EXPLORER_API_URL=
NEXT_PUBLIC_BLAST_EXPLORER_CHAIN_ID=81457
NEXT_PUBLIC_BERACHAIN_EXPLORER_API_URL=
NEXT_PUBLIC_BERACHAIN_EXPLORER_CHAIN_ID=80094
NEXT_PUBLIC_CELO_EXPLORER_API_URL=
NEXT_PUBLIC_CELO_EXPLORER_CHAIN_ID=42220
NEXT_PUBLIC_GNOSIS_EXPLORER_API_URL=
NEXT_PUBLIC_GNOSIS_EXPLORER_CHAIN_ID=100
NEXT_PUBLIC_UNICHAIN_EXPLORER_API_URL=
NEXT_PUBLIC_UNICHAIN_EXPLORER_CHAIN_ID=130
NEXT_PUBLIC_WORLDCHAIN_EXPLORER_API_URL=
NEXT_PUBLIC_WORLDCHAIN_EXPLORER_CHAIN_ID=480
NEXT_PUBLIC_ROBINHOOD_EXPLORER_API_URL=
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
SONIC_RPC_URL=
SONIC_MAINNET_RPC_URL=
SONIC_EXPLORER_API_URL=
SONIC_EXPLORER_CHAIN_ID=146
SONIC_EXPLORER_API_KEY=
AVALANCHE_RPC_URL=
AVALANCHE_C_CHAIN_RPC_URL=
AVALANCHE_MAINNET_RPC_URL=
AVALANCHE_EXPLORER_API_URL=
AVALANCHE_EXPLORER_CHAIN_ID=43114
AVALANCHE_EXPLORER_API_KEY=
MANTLE_RPC_URL=
MANTLE_MAINNET_RPC_URL=
MANTLE_EXPLORER_API_URL=
MANTLE_EXPLORER_CHAIN_ID=5000
MANTLE_EXPLORER_API_KEY=
LINEA_RPC_URL=
LINEA_MAINNET_RPC_URL=
LINEA_EXPLORER_API_URL=
LINEA_EXPLORER_CHAIN_ID=59144
LINEA_EXPLORER_API_KEY=
BLAST_RPC_URL=
BLAST_MAINNET_RPC_URL=
BLAST_EXPLORER_API_URL=
BLAST_EXPLORER_CHAIN_ID=81457
BLAST_EXPLORER_API_KEY=
BERACHAIN_RPC_URL=
BERACHAIN_MAINNET_RPC_URL=
BERACHAIN_EXPLORER_API_URL=
BERACHAIN_EXPLORER_CHAIN_ID=80094
BERACHAIN_EXPLORER_API_KEY=
CELO_RPC_URL=
CELO_MAINNET_RPC_URL=
CELO_EXPLORER_API_URL=
CELO_EXPLORER_CHAIN_ID=42220
CELO_EXPLORER_API_KEY=
GNOSIS_RPC_URL=
GNOSIS_MAINNET_RPC_URL=
GNOSIS_EXPLORER_API_URL=
GNOSIS_EXPLORER_CHAIN_ID=100
GNOSIS_EXPLORER_API_KEY=
UNICHAIN_RPC_URL=
UNICHAIN_MAINNET_RPC_URL=
UNICHAIN_EXPLORER_API_URL=
UNICHAIN_EXPLORER_CHAIN_ID=130
UNICHAIN_EXPLORER_API_KEY=
WORLDCHAIN_RPC_URL=
WORLDCHAIN_MAINNET_RPC_URL=
WORLDCHAIN_EXPLORER_API_URL=
WORLDCHAIN_EXPLORER_CHAIN_ID=480
WORLDCHAIN_EXPLORER_API_KEY=
ROBINHOOD_RPC_URL=
ROBINHOOD_MAINNET_RPC_URL=
ROBINHOOD_EXPLORER_API_URL=
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
a false "clear" state. For production BSC, Base, Polygon, Sonic, Avalanche,
Mantle, Linea, Blast, Berachain, Celo, Gnosis, Unichain, and World Chain
discovery, use Etherscan API V2 keys server-side and account plans that support
BNB Smart Chain, Base Mainnet, Polygon Mainnet, Sonic Mainnet, Avalanche
C-Chain, Mantle Mainnet, Linea Mainnet, Blast Mainnet, Berachain Mainnet, Celo,
Gnosis, Unichain Mainnet, and World Mainnet logs.
For Robinhood Chain, configure a reliable browser-safe RPC when possible and
optionally override the Robinhood Blockscout API URL server-side. Robinhood
Chain scan failures should surface as incomplete/config/upstream states, not as
false clear results.
For Arbitrum, configure server-only managed RPC plus an Arbiscan or
Etherscan-compatible API key with Arbitrum One log access. For Optimism,
configure server-only managed RPC plus an Etherscan API V2 key with OP Mainnet
log access. Optimism scan failures should surface as incomplete/config/upstream
states, not as false clear results.
For HyperEVM, configure server-only RPC plus an Etherscan API V2 key with
HyperEVM Mainnet log access. HyperEVM scan failures should surface as
incomplete/config/upstream states, not as false clear results.
