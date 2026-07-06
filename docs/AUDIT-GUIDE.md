# Audit Guide

This guide gives reviewers a practical map for checking Pulse Revoke behavior.
It is not a substitute for an external security audit.

## Scope To Verify

Current active supported networks should be exactly:

- PulseChain, chain ID `369`
- BSC / BNB Smart Chain, chain ID `56`
- Base, chain ID `8453`
- Polygon, chain ID `137`
- Sonic Mainnet, chain ID `146`
- Avalanche C-Chain, chain ID `43114`
- Mantle, chain ID `5000`
- Linea, chain ID `59144`
- Blast, chain ID `81457`
- Berachain, chain ID `80094`
- Celo, chain ID `42220`
- Gnosis, chain ID `100`
- Unichain, chain ID `130`
- World Chain, chain ID `480`
- Robinhood Chain, chain ID `4663`
- Ethereum Mainnet, chain ID `1`
- Arbitrum One, chain ID `42161`, ERC-20/NFT verified-row revoke
- Optimism / OP Mainnet, chain ID `10`, ERC-20/NFT verified-row revoke
- HyperEVM, chain ID `999`, ERC-20/NFT verified-row revoke, gas paid in HYPE

Ethereum Mainnet uses server-read-only discovery and wallet-side revoke. It is
wallet-enabled, but it must not introduce server-side signing, relayers, private
keys, or API route transaction submission.

Arbitrum One uses server-read-only discovery and wallet-side ERC-20/NFT row
revoke only after row-level live verification, matching owner, chain,
preflight, and post-revoke verification gates pass. Arbitrum batch revoke,
server-side signing, relayers, private keys, and API route transaction
submission must stay unavailable.

Optimism uses server-side discovery and wallet-side ERC-20/NFT row revoke only
after row-level live verification, matching owner, chain, preflight, and
post-revoke verification gates pass. Optimism batch revoke, global revoke,
server-side signing, relayers, private keys, and API route transaction
submission must stay unavailable.

HyperEVM uses server-side discovery and wallet-side ERC-20/NFT row revoke only
after row-level live verification, matching owner, chain, preflight, and
post-revoke verification gates pass. HyperEVM batch revoke, global revoke,
server-side signing, relayers, private keys, and API route transaction
submission must stay unavailable.

## Key Files

| Area | Files |
| --- | --- |
| Active chains | `src/lib/chains.ts`, `src/lib/wagmi.ts` |
| Explorer links/API helpers | `src/lib/explorer.ts`, `src/lib/discovery.ts` |
| Fungible approval parsing/validation | `src/lib/discovery.ts`, `src/lib/approvals.ts`, `src/hooks/use-approval-discovery.ts` |
| Permit2 and hybrid approval handling | `src/lib/permit2.ts`, `src/lib/approvals.ts`, `src/lib/risk.ts`, `src/components/approvals/approval-filters.tsx` |
| NFT approval parsing/validation | `src/lib/discovery.ts`, `src/lib/nft-approvals.ts`, `src/hooks/use-nft-approval-discovery.ts` |
| Preflight and gas safety | `src/lib/preflight.ts` |
| Single fungible revoke | `src/hooks/use-revoke-approval.ts`, `src/lib/revoke.ts` |
| NFT revoke | `src/hooks/use-revoke-nft-approval.ts`, `src/lib/nft-approvals.ts` |
| Batch revoke | `src/hooks/use-batch-revoke.ts` |
| Registry enrichment | `src/lib/registry/` |
| Token logos | `src/app/api/token-logos/route.ts`, `src/lib/token-logos.ts`, `src/hooks/use-token-logos.ts` |
| Telemetry/privacy | `src/lib/telemetry.ts` |
| Diagnostics UI | `src/components/sections/scanner-diagnostics.tsx` |
| Ethereum API controls | `src/app/api/ethereum/approvals/route.ts`, `src/lib/ethereum-approval-api.ts`, `src/lib/ethereum-approval-api-controls.ts` |
| Arbitrum API controls | `src/app/api/arbitrum/approvals/route.ts`, `src/lib/arbitrum-approval-api.ts`, `src/lib/arbitrum-approval-api-controls.ts` |
| Optimism API controls | `src/app/api/optimism/approvals/route.ts`, `src/lib/optimism-approval-api.ts`, `src/lib/optimism-approval-api-controls.ts` |
| Address-only scan controls | `src/lib/address-only-scan.ts`, `src/components/sections/approval-scanner.tsx` |

## Chain Safety Questions

- Are active supported chains exactly PulseChain, BSC, Base, Polygon, Sonic,
  Avalanche, Mantle, Linea, Blast, Berachain, Celo, Gnosis, Unichain, World
  Chain, Robinhood Chain, wallet-enabled Ethereum Mainnet, Arbitrum One's
  separate verified-row revoke lane, Optimism's separate verified-row lane, and
  HyperEVM's separate verified-row lane?
- Does `src/lib/wagmi.ts` register Ethereum, Arbitrum, Optimism, and HyperEVM
  only for their separate lanes and keep chain lists scoped correctly?
- Is Ethereum Mainnet protected by owner, chain, preflight, gas, and row-level
  verification gates?
- Do approval records carry `chainId` through discovery, validation, display,
  revoke, and batch revoke?
- Is the connected wallet account `chainId` the active scanner source of truth?
- Does switching wallet chains clear prior scan results, selections, batch
  state, and diagnostics?
- Are unsupported networks blocked from scan/revoke flows?
- Are mixed-chain batch selections blocked or skipped safely?
- Does address-only scan default to one selected chain instead of firing every
  network scanner at once?
- If scan-all is used, does it require an explicit user action and run with
  concurrency `1`?

## Ethereum Discovery Questions

- Does `/api/ethereum/approvals` reject invalid owners with `400`?
- Does route-level rate limiting return `429` with non-clear JSON?
- Does the public API use server-side discovery caps, request timeout, live-read
  candidate caps, and RPC read concurrency limits?
- Do timeout, cap-hit, rate-limit, truncation, malformed rows, and live-read
  failures return non-clear states?
- Does a candidate cap preserve already verified rows while marking the global
  scan incomplete?
- Does row-level verified Ethereum ERC-20 revoke remain available when unrelated
  NFT verification fails?
- Is the Ethereum API free of `writeContract`, `sendTransaction`, signing,
  private key, seed phrase, mnemonic, or relayer logic?

## Arbitrum Discovery Questions

- Does `/api/arbitrum/approvals` reject invalid owners with `400`?
- Does route-level rate limiting return `429` with non-clear JSON?
- Does every Arbitrum historical log request use Etherscan API V2 with
  `chainid=42161`?
- Are Arbitrum explorer links built with `https://arbiscan.io`?
- Are Arbitrum RPC and Arbiscan API keys server-only values, with no
  browser-exposed Arbitrum variables?
- Do timeout, cap-hit, rate-limit, truncation, malformed rows, and live-read
  failures return non-clear states?
- Are Arbitrum ERC-20 and NFT row revoke actions available only for
  live-verified rows with matching wallet and chain `42161`?
- Do Arbitrum batch revoke, server signing, arbitrary `writeContract`, and
  `sendTransaction` paths remain unavailable?

## Optimism Discovery Questions

- Does `/api/optimism/approvals` reject invalid owners with `400`?
- Does route-level rate limiting return `429` with non-clear JSON?
- Does every Optimism historical log request use Etherscan API V2 with
  `chainid=10`?
- Are Optimism explorer links built with `https://optimistic.etherscan.io`?
- Are Optimism RPC and Etherscan API V2 keys server-only values, with no
  browser-exposed Optimism variables?
- Do timeout, cap-hit, rate-limit, truncation, malformed rows, and live-read
  failures return non-clear states?
- Are Optimism ERC-20 and NFT row revoke actions available only for
  live-verified rows with matching wallet and chain `10`?
- Do Optimism batch, global, server signing, arbitrary `writeContract`, and
  `sendTransaction` paths remain unavailable?

## Permit2 And Hybrid Discovery Questions

- Does Permit2 discovery decode historical `Approval` and `Permit` events only
  as nested allowance candidates, not as proof of active delegated access?
- Are Permit2 candidates rechecked with
  `allowance(owner, token, spender)` on the Permit2 contract before they render
  as active rows?
- Does a Permit2 row require a nonzero amount and an expiration later than the
  current scan time?
- Do expired, zero, malformed, timed-out, or failed Permit2 live reads produce
  dropped, incomplete, or unverified states instead of a false clear?
- Do Permit2 rows explain that the spender can use the token through Permit2,
  rather than through a direct token-contract allowance?
- Does Permit2 revoke build `Permit2.approve(token, spender, 0, 0)` against the
  Permit2 contract while preserving owner, chain, preflight, gas, and
  post-revoke verification gates?
- Do standard ERC-20 revokes still build `approve(spender, 0)` against the
  token contract?
- Are hybrid token contracts marked only when the same contract has fungible
  and NFT approval surfaces in the current discovery context?
- Do hybrid rows retain the normal token or NFT verification and revoke
  semantics while adding risk/search/filter context?
- Do the Permit2 and Hybrid filters only narrow visible results and never
  change discovery coverage, live verification, or revoke eligibility?

## BSC Discovery Questions

- Do BSC historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every BSC log request include `chainid=56`?
- Are BSC explorer links still built with `https://bscscan.com`?
- Does BSC discovery use approval logs rather than token-transfer endpoints as
  the approval source of truth?
- Does the scanner report incomplete discovery if API caps, rate limits, or
  malformed responses prevent full discovery?
- Does public BSC RPC avoid historical `eth_getLogs` discovery?

## Base Discovery Questions

- Do Base historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every Base log request include `chainid=8453`?
- Are Base explorer links built with `https://basescan.org`?
- Does Base discovery use approval logs rather than token-transfer endpoints as
  the approval source of truth?
- Does public Base RPC avoid historical `eth_getLogs` discovery?

## Polygon Discovery Questions

- Do Polygon historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every Polygon log request include `chainid=137`?
- Are Polygon explorer links built with `https://polygonscan.com`?
- Does Polygon discovery use approval logs rather than token-transfer endpoints
  as the approval source of truth?
- Does public Polygon RPC avoid historical `eth_getLogs` discovery?

## Sonic Discovery Questions

- Do Sonic historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every Sonic log request include `chainid=146`?
- Are Sonic explorer links built with `https://sonicscan.org`?
- Does Sonic discovery use approval logs rather than token-transfer endpoints
  as the approval source of truth?
- Does public Sonic RPC avoid historical `eth_getLogs` discovery?

## Avalanche Discovery Questions

- Do Avalanche historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every Avalanche log request include `chainid=43114`?
- Are Avalanche explorer links built with `https://snowscan.xyz`?
- Does Avalanche discovery use approval logs rather than token-transfer
  endpoints as the approval source of truth?
- Does public Avalanche RPC avoid historical `eth_getLogs` discovery?

## Mantle Discovery Questions

- Do Mantle historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every Mantle log request include `chainid=5000`?
- Are Mantle explorer links built with the configured Mantle explorer base?
- Does Mantle discovery use approval logs rather than token-transfer endpoints
  as the approval source of truth?
- Does public Mantle RPC avoid historical `eth_getLogs` discovery?

## Linea Discovery Questions

- Do Linea historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every Linea log request include `chainid=59144`?
- Are Linea explorer links built with `https://lineascan.build`?
- Does Linea discovery use approval logs rather than token-transfer endpoints
  as the approval source of truth?
- Does public Linea RPC avoid historical `eth_getLogs` discovery?
- Are Linea explorer keys server-only, with no `NEXT_PUBLIC_*` key fallback?

## Blast Discovery Questions

- Do Blast historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every Blast log request include `chainid=81457`?
- Are Blast explorer links built with `https://blastscan.io`?
- Does Blast discovery use approval logs rather than token-transfer endpoints
  as the approval source of truth?
- Does public Blast RPC avoid historical `eth_getLogs` discovery?
- Are Blast explorer keys server-only, with no `NEXT_PUBLIC_*` key fallback?

## Berachain Discovery Questions

- Do Berachain historical log requests use Etherscan API V2 at
  `https://api.etherscan.io/v2/api`?
- Does every Berachain log request include `chainid=80094`?
- Are Berachain explorer links built with `https://berascan.com`?
- Does Berachain discovery use approval logs rather than token-transfer
  endpoints as the approval source of truth?
- Does public Berachain RPC avoid historical `eth_getLogs` discovery?
- Are Berachain explorer keys server-only, with no `NEXT_PUBLIC_*` key fallback?

## Celo, Gnosis, Unichain, And World Chain Discovery Questions

- Do Celo, Gnosis, Unichain, and World Chain historical log requests use
  Etherscan API V2 at `https://api.etherscan.io/v2/api`?
- Does every Celo log request include `chainid=42220`?
- Does every Gnosis log request include `chainid=100`?
- Does every Unichain log request include `chainid=130`?
- Does every World Chain log request include `chainid=480`?
- Are explorer links built with `https://celoscan.io`,
  `https://gnosisscan.io`, `https://uniscan.xyz`, and
  `https://worldscan.org`?
- Does discovery use approval logs rather than token-transfer endpoints as the
  approval source of truth?
- Does public RPC avoid historical `eth_getLogs` discovery?
- Are explorer keys server-only, with no `NEXT_PUBLIC_*` key fallback?
- Does the shared `ETHERSCAN_API_KEY` fallback work without committing or
  browser-exposing the key?

## Robinhood Chain Discovery Questions

- Do Robinhood Chain historical log requests use Robinhood Blockscout at
  `https://robinhoodchain.blockscout.com/api`?
- Do Robinhood Chain log requests avoid Etherscan API V2 `chainid` parameters
  and explorer API keys?
- Are Robinhood Chain explorer links built with
  `https://robinhoodchain.blockscout.com`?
- Does Robinhood Chain discovery use approval logs rather than token-transfer
  endpoints as the approval source of truth?
- Does public Robinhood RPC avoid historical `eth_getLogs` discovery?
- Does the scanner report incomplete discovery if Blockscout caps, rate
  limits, malformed responses, or upstream failures prevent full discovery?

## Live Validation Questions

- Are discovered fungible token candidates rechecked with `allowance(owner,
  spender)` on the same chain?
- Are Permit2 delegated allowances rechecked with `allowance(owner, token,
  spender)` on the Permit2 contract for the same chain?
- Are NFT operator approvals rechecked with `isApprovedForAll(owner, operator)`
  on the same chain?
- Are NFT per-token approvals rechecked with `getApproved(tokenId)` where the
  pipeline supports them?
- Does a validation failure produce an incomplete/unverified state rather than a
  false clear?

## Revoke Questions

- Do fungible token revokes use `approve(spender, 0)`?
- Do Permit2 delegated allowance revokes use
  `Permit2.approve(token, spender, 0, 0)`?
- Do NFT operator revokes use `setApprovalForAll(operator, false)`?
- Do NFT per-token revokes use `approve(address(0), tokenId)`?
- Do transaction requests include the approval's `chainId`?
- Do BSC revokes use BNB wording and BscScan links?
- Do PulseChain revokes use PLS wording and PulseScan links?
- Do Base revokes use ETH wording and BaseScan links?
- Do Polygon revokes use POL wording and PolygonScan links?
- Do Sonic revokes use S wording and SonicScan links?
- Do Avalanche revokes use AVAX wording and SnowScan links?
- Do Mantle revokes use MNT wording and Mantle explorer links?
- Do Linea revokes use ETH wording and LineaScan links?
- Do Blast revokes use ETH wording and Blastscan links?
- Do Berachain revokes use BERA wording and Berascan links?
- Do Celo revokes use CELO wording and CeloScan links?
- Do Gnosis revokes use XDAI wording and Gnosisscan links?
- Do Unichain revokes use ETH wording and Uniscan links?
- Do World Chain revokes use ETH wording and Worldscan links?
- Do Robinhood Chain revokes use ETH wording and Robinhood Blockscout links?
- Does Arbitrum show only ERC-20/NFT verified-row revoke while batch
  revoke remains unavailable?
- Does Optimism show only ERC-20/NFT verified-row revoke while batch and global
  revoke remain unavailable?

## BSC Gas Safety Questions

- Is the BSC hard transaction gas cap set to `16_777_216n`?
- Are BSC revoke estimates above `16_777_216` blocked before wallet
  submission?
- Is the BSC high-gas warning threshold set to `1_000_000n`?
- Do estimates above `1_000_000` and at or below `16_777_216` require an
  explicit in-app confirmation before the wallet opens?
- Is viem/wagmi transaction gas passed as `gas`, not `gasLimit`?
- Are high-gas BSC items skipped by default in batch revoke for individual
  review?

## Registry Questions

- Are registry lookups scoped by `chainId` and address?
- Do PulseChain labels avoid leaking onto BSC approvals?
- Do PulseChain or BSC labels avoid leaking onto Base approvals?
- Do PulseChain, BSC, or Base labels avoid leaking onto Polygon approvals?
- Do existing registry labels avoid leaking onto Sonic, Avalanche, Mantle,
  Linea, Blast, Berachain, Celo, Gnosis, Unichain, World Chain, Robinhood
  Chain, Monad, Katana, Sei, Plasma, or Abstract approvals?
- Are BSC labels empty unless manually verified?
- Are Base labels empty unless manually verified?
- Are Polygon labels empty unless manually verified?
- Are Sonic labels empty unless manually verified?
- Are Avalanche labels empty unless manually verified?
- Are Mantle labels empty unless manually verified?
- Are Linea labels empty unless manually verified?
- Are Blast labels empty unless manually verified?
- Are Berachain labels empty unless manually verified?
- Are Celo labels empty unless manually verified?
- Are Gnosis labels empty unless manually verified?
- Are Unichain labels empty unless manually verified?
- Are World Chain labels empty unless manually verified?
- Are Robinhood Chain labels empty unless manually verified?
- Are Monad labels empty unless manually verified?
- Are Katana labels empty unless manually verified?
- Are Sei labels empty unless manually verified?
- Are Plasma labels empty unless manually verified?
- Are Abstract labels empty unless manually verified?
- Are unknown BSC, Base, Polygon, Sonic, Avalanche, Mantle, Linea, Blast, and
  Berachain, Celo, Gnosis, Unichain, World Chain, Robinhood Chain, Monad,
  Katana, Sei, Plasma, and Abstract spenders shown as unknown rather than
  guessed?
- Is registry data treated only as enrichment, not discovery truth?

## Token Logo Questions

- Is token-logo lookup scoped to PulseChain, BSC, Base, Polygon, Sonic,
  Avalanche, Mantle, Linea, Blast, Berachain, Celo, Gnosis, Unichain, World
  Chain, Robinhood Chain, Monad, Katana, Sei, Plasma, Abstract, and explicitly
  reviewed separate-lane chains?
- Does the logo resolver send only token contract addresses, not scanned owner
  addresses, spender addresses, allowances, or wallet connection state?
- Does the UI keep text symbol/address data visible when no logo exists or the
  image fails to load?
- Are third-party logos treated as display-only metadata, not as trust,
  verification, registry, or discovery evidence?
- Does `/api/token-logos` cap requests to `30` token addresses and avoid
  caching malformed or upstream-failure responses?
- Does `/api/token-logos` rate-limit upstream lookups so repeated logo requests
  cannot freely amplify traffic to Dex Screener?

## Hosted Hardening Questions

- Does `npm run security:env` pass for hosted web environments with explorer
  API keys kept in server-only variables?
- Does `npm run security:live` pass against the production origin after each
  `main` deployment?
- Do `/`, `/app`, and `/security` keep enforced CSP, report-only CSP, HSTS,
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, referrer policy,
  and permissions policy headers?
- Do public API bad-input probes keep returning bounded errors without RPC
  URLs, API keys, JWT-shaped values, or private-key-shaped strings?
- Do live `_next/static` JS/CSS assets stay free of key-bearing URLs and
  API-key-shaped literals?
- Are Vercel Firewall API rate limits reviewed separately from application code
  before enforcement?

## Telemetry Questions

- Is there any third-party analytics SDK dependency?
- Does telemetry avoid wallet addresses, token addresses, spender addresses,
  transaction hashes, balances, token amounts, and user-agent fingerprints?
- Are telemetry fields limited to product-health events, supported chain IDs,
  safe enums, and aggregate counts?

## CSP Follow-Up

- Track CSP tightening as a separate CSP report-only pass before enforcement.
- Do not blindly narrow `connect-src`, `frame-src`, or `script-src`; verify
  injected wallets, WalletConnect, RPC providers, explorer APIs, and the Tauri
  shell before enforcing stricter policy.

## Suggested Verification Commands

```powershell
npm.cmd run typecheck
npx.cmd vitest run
npm.cmd run lint
npm.cmd run build
npm.cmd run security:env
npm.cmd run security:live
```

## Manual Review Checklist

- Load `/` and confirm it lists PulseChain, BSC / BNB Smart Chain, Base, and
  Robinhood Chain as live.
- Load `/app` on PulseChain and run a scan.
- Load `/app` on BSC and run a scan.
- Load `/app` on Base and run a scan.
- Load `/app` on Robinhood Chain and run a scan.
- Paste an address in address-only mode and confirm only the selected network
  scans by default.
- Use address-only scan-all and confirm networks start one at a time.
- Load `/app` on Ethereum Mainnet and confirm Ethereum discovery is read-only
  until a matching wallet-side revoke is explicitly reviewed.
- Load `/app` on Arbitrum One and confirm only live-verified ERC-20 and NFT rows
  can open the revoke review panel; batch revoke remains unavailable.
- Load `/app` on Optimism / OP Mainnet and confirm only live-verified ERC-20
  and NFT rows can open the revoke review panel; batch and global revoke remain
  unavailable.
- Use the Permit2 filter and confirm it only narrows visible rows to delegated
  Permit2 allowances that survived live-read validation.
- Use the Hybrid filter and confirm it only narrows visible rows to contracts
  with both fungible and NFT approval surfaces.
- Expand Permit2 and hybrid rows and confirm risk signals explain concrete
  drivers without describing a spender or token as safe.
- Test a low-gas BSC revoke and confirm the wallet receives `gas` below the
  hard cap.
- Test or simulate a high-gas BSC revoke and confirm the in-app warning appears
  before the wallet opens.
- Connect to an unsupported network and confirm scan/revoke actions are blocked.
