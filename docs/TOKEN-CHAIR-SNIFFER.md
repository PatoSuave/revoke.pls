# Token Chair Sniffer

## Concept

Token Chair Sniffer is a PulseChain-only, read-only token market-intel and risk-signal UI with the tagline:

**Sniff before you ape.**

It is intentionally playful, but its security language stays conservative. The feature highlights visible signals before a user buys, approves, or interacts with a token. It does not connect a wallet, request a signature, submit a transaction, or claim that any token is safe.

## Current Preview Scope

Implemented in the current Phase 2 preview:

- App route: `/app/token-chair-sniffer`
- Shareable token deep links: `/app/token-chair-sniffer?token=0x...`
- Internal API route: `/api/token-chair-sniffer/market?token=0x...`
- Lightweight CTA from `/app` to the sniffer route
- Sample-token presets for fast preview QA against PLSX, WPLS, INC, and HEX
- Interactive review workspace with per-token checklist state, decision state, notes, local browser persistence, and copyable review summary
- Rules-backed Must Review Before Touching queue that prioritizes visible control, liquidity, holder, source, market, and coverage gaps without making safe/scam claims
- Local Recent Reviews workbench saved in browser storage with token, verdict, decision, checklist progress, risk counts, notes, and last-reviewed timestamp
- Local Compare Reviews tray for comparing two to four saved review entries by decision, verdict, risk counts, checklist progress, timestamp, and notes
- Review export that includes top prioritized risk items, checklist state, decision, notes, report link, and timestamp
- EVM token-address validation and checksum normalization
- Query-string token normalization with `token` and `address` aliases
- Server-side DEX Screener token-pairs fetch for `pulsechain`
- DEX Screener response normalization and main-pair selection by highest visible USD liquidity
- Native PulseX V1/V2 factory pair discovery against common PulseChain quote tokens, with read-only raw reserves and LP supply for returned pairs
- Optional server-side DEXTools enrichment for external market/score context when `DEXTOOLS_API_KEY` is configured
- Read-only PulseChain RPC contract reads for basic token metadata, standard ownership, and common proxy signals
- Read-only pending owner/admin getter checks, common public admin/operator/fee-wallet getter checks, common AccessControl role-function checks, and public buy/sell tax getter checks
- Read-only public mechanics getter checks for pause state, trading state, trading limits, max transaction, and max wallet where common getter names are present
- PulseScan/Blockscout verified-source metadata for source status, ABI availability, deployer, and creation transaction
- Lightweight ABI/source keyword signals for mint, pause, cooldown, blacklist, whitelist, and suspicious-function rows
- Lightweight ABI/source keyword signals for hidden-owner and obfuscated-address rows
- PulseScan holder endpoint concentration reads for top token holder and LP holder data when available
- Bounded multi-page sampled holder-distribution buckets for top 1, top 5, top 10, selected pair balance, and zero/dead-address balances when PulseScan returns enough holder rows
- LP-token holder-control buckets for the selected pair when PulseScan indexes that pair contract as a token
- Conservative LP-control interpretation for dominant deployer, owner, wallet, unknown contract, known registry protocol contract, burn/dead, or non-dominant visible LP holders
- Metadata-only known-locker context for dominant LP holders that match a curated PulseChain locker label
- Bounded native PulseLaunch Pro locker reads for matched LP holders, including decoded `LockCreated` event discovery, selected-pair lock records, raw locked amount, lock owner address, active/unlockable status, and next unlock date when readable
- Vercel-oriented scan scheduling that starts holder and selected-pair reads as soon as market pair selection is available, while contract and explorer reads continue in parallel
- Native selected-pair contract reads for `token0()`, `token1()`, `getReserves()`, and LP `totalSupply()`
- Address context labels for zero/burn addresses, token contract, selected pair, owner, deployer, proxy admin, proxy implementation, public admin-getter addresses, known registry tokens/spenders, contracts, and wallets where visible metadata supports it
- PulseScan links on live contract/source/deployer/holder cards
- Compact Signal Details panel explaining the current verdict inputs
- Why This Verdict breakdown with the visible signals that drove the current verdict
- Signal Details source-status chips for market, explorer metadata, holder data, and read-only mode, including clearer rate-limit states
- Source Signal Details panel listing exact matched ABI/source terms when lightweight source rows are flagged
- Conservative Chair Verdict mapping
- Market Chair Intel cards
- Pair Candidates list showing the top returned DEX Screener pairs by visible liquidity
- Native PulseX Pairs list showing factory-discovered V1/V2 pairs against checked quote assets
- Quick Sniff checklist with live ownership/proxy rows and conservative placeholders for unchecked rows
- Contract Sniff cards with live owner, source, deployer, holder, LP, and metadata signals
- Holder Distribution panel explaining sampled token-holder buckets, top-holder rows, and LP-holder concentration address context
- Unit tests for address validation, parser behavior, API states, verdict copy, unchecked rows, risk-rule generation, degraded coverage states, and conservative risk-copy guardrails

## Phase 2 Preview Completion

Phase 2 is considered preview-complete when all of the following remain true on the feature branch and latest Vercel Preview:

- The feature stays read-only and does not connect a wallet, request signatures, or submit transactions.
- The Must Review Before Touching queue prioritizes critical, warning, and info items without claiming a token is safe, certified, guaranteed, or not a scam.
- The queue shows a readiness summary that distinguishes critical review, warning/gap review, scan-needed state, and manual-decision-ready state.
- Degraded PulseScan, DEXTools, holder, selected-pair, and source/ABI states are labeled as review gaps rather than token conclusions.
- Review Before Buying persists checklist state, notes, and manual decision locally per token.
- Recent Reviews and Compare Reviews persist locally in the browser and never require a backend account or wallet.
- Copy review exports top queue items, checklist state, decision, notes, report link, and timestamp.
- Vercel Preview QA passes for sample tokens, deep links, route smoke, API smoke, visual desktop/mobile layout, and local-review workflows.

## Market Data Source

Current preview market data uses DEX Screener as the primary market source:

```text
GET https://api.dexscreener.com/token-pairs/v1/pulsechain/{tokenAddress}
```

Normalized live fields include:

- token address
- token name and symbol
- pair address
- DEX id/name
- DEX Screener pair URL
- USD price
- USD liquidity
- 24h volume
- 24h buy/sell/total transactions
- FDV
- market cap
- pair creation time and pair age label
- quote token name and symbol

If DEX Screener returns multiple PulseChain pairs, the UI selects the pair with the highest `liquidity.usd`. If every valid pair is missing liquidity, the first valid pair is used and the response is marked with a weak-selection warning.

The Market Chair Intel panel also shows a compact Pair Candidates list from the already-normalized DEX Screener response. Candidate rows include pair rank, DEX, quote token, liquidity, volume, transaction count, age, and a DEX Screener link when returned. These rows are market context only; labels like `Selected pair`, `Low liquidity`, and `Visible market data` are not contract-risk conclusions.

When configured with a server-only `DEXTOOLS_API_KEY`, Token Chair also attempts optional DEXTools enrichment. Returned fields may include external price, liquidity, volume, DEXTScore, holder count, token profile links, and social links. DEXTools is an enrichment source only: DEX Screener remains the primary pair selector, and DEXTScore is not a Token Chair safety verdict, certification, or audit result. If the key is absent, Token Chair preserves the core scan and keeps DEXTools hidden in Signal Details. If a configured request is rate-limited or DEXTools does not return a field, Token Chair labels that configured source status conservatively.

After DEX Screener selects the primary pair, the API also performs read-only PulseChain RPC checks against that selected pair contract. It verifies whether the pair's `token0()` or `token1()` matches the scanned token address, reads raw `getReserves()` values, and reads raw LP `totalSupply()`. These values are displayed as raw contract integers because token decimals differ by asset. They are useful for confirming the selected pair address is internally consistent, but they are not a swap simulation, LP lock proof, or exhaustive liquidity analysis.

In parallel with DEX Screener, the API also performs a native PulseX discovery pass. It calls `getPair(token, quote)` on the PulseX V2 factory (`0x29eA7545DEf87022BAdc76323F373EA1e707C523`) and PulseX V1 factory (`0x1715a3E4A142d8b698131108995174F37aEBA10D`) for a small checked quote list: WPLS, PLSX, INC, HEX, DAI, USDC, and USDT. When a factory returns a pair, Token Chair reads `token0()`, `token1()`, `getReserves()`, and LP `totalSupply()` from that pair. Native PulseX rows are pair-existence and raw-contract context only; they do not include USD liquidity, price impact, swap simulation, or lock proof.

## Native Read-Only Contract Checks

The API also performs PulseChain RPC reads without connecting a wallet:

- `eth_getCode` to confirm bytecode exists at the pasted address
- ERC-20-style `name()`, `symbol()`, and `decimals()` view reads
- standard `owner()` with `getOwner()` fallback
- common pending owner/admin getters: `pendingOwner()`, `pendingAdmin()`, and `newOwner()`
- common public control-address getters such as `admin()`, `governance()`, `operator()`, `feeManager()`, `taxWallet()`, `marketingWallet()`, `treasury()`, and router getters
- EIP-1967 implementation/admin/beacon storage-slot reads
- public implementation/admin proxy getter reads where exposed
- EIP-1167 minimal-proxy bytecode pattern detection
- common OpenZeppelin-style role getters: `DEFAULT_ADMIN_ROLE()` and `getRoleAdmin(bytes32)`
- common public buy/sell tax or fee getters such as `buyTax()`, `buyFee()`, `sellTax()`, and `sellFee()`
- common public mechanics getters such as `paused()`, `tradingEnabled()`, `limitsInEffect()`, `maxTxAmount()`, and `maxWalletAmount()`
- bounded recent event-window log reads for `OwnershipTransferred`, `RoleGranted`, `RoleRevoked`, `Paused`, and `Unpaused`
- selected-pair contract reads for `token0()`, `token1()`, `getReserves()`, and LP `totalSupply()` when a primary pair is available
- PulseX V1/V2 factory `getPair(token, quote)` reads for common quote assets, followed by raw pair reserve and LP supply reads for discovered pairs

These checks are informational only. `owner()` returning the zero address is labeled `Appears renounced`, not as a guarantee. A missing common proxy signal is labeled `Common proxy signal not found`, not as proof that every proxy pattern is absent.

Public tax getter reads are shown as raw getter values, for example `Getter returned 5`. Token Chair Sniffer does not interpret those values as percentages, does not simulate buys or sells, and does not claim the value reflects dynamic transfer behavior.

Public mechanics getter reads are also state/context signals only. `paused()` returning `false`, for example, does not prove a token cannot be paused later, and max transaction or max wallet getter values are not honeypot or sell-simulation results.

Recent event-history reads are limited to a bounded block window so the scanner stays lightweight on public PulseChain RPCs. The live route uses a smaller recent window than the earliest MVP pass so deployed scans leave more room for selected-pair, holder, and source reads. A match is shown as visible history context, for example recent ownership transfers, role changes, or pause/unpause events. An empty recent window does not prove those events never happened earlier, and failed log reads are labeled as unable to verify.

## PulseScan Source Checks

The API reads PulseScan/Blockscout metadata through public read-only endpoints:

- `/api/v2/addresses/{address}`
- `/api/v2/smart-contracts/{address}`

Normalized live fields include:

- source verification status
- ABI availability
- source-code availability
- contract name
- compiler version
- verification timestamp
- deployer address when PulseScan returns it
- creation transaction hash when PulseScan returns it
- PulseScan address, token, and transaction links

If verified ABI or source is available, Token Chair Sniffer runs a lightweight keyword pass for:

- mintable
- transfer pausable
- trading cooldown
- blacklist
- whitelist
- trading gates
- fee controls
- rescue functions
- ownership controls
- hidden-owner or alternate authorization terms
- obfuscated-address or low-level call/address-masking terms
- suspicious functions

Rows with matches are tiered. Lower-severity findings such as mint, pause, cooldown, or whitelist terms say `Source signal found`. Higher-severity findings such as blacklist/bot controls or suspicious admin/trading functions say `High source signal`. Rows without matches say `Not flagged by source scan`, which means only that the lightweight keyword pass did not match obvious terms in returned ABI/source. It is not a full audit and does not prove the behavior is absent.

The Source Signal Details panel expands these rows with the exact matched terms returned by the lightweight ABI/source pass. Hidden-owner and obfuscated-address rows are conservative source/ABI keyword checks only; a match means manual review is needed, and no match does not prove those behaviors are absent. If PulseScan does not return verified source or ABI data, those detail rows stay `Unable to verify`. The panel is explanatory only; it does not add bytecode analysis, tax simulation, or honeypot execution.

The Why This Verdict breakdown mirrors the current verdict notes as structured rows. Each row has a severity, label, and detail so a user can see whether the result came from market data, DEXTools cross-check context, pair-contract checks, owner/admin/proxy context, source/ABI signals, event history, holder concentration, or LP concentration. These are still visible-signal explanations, not audit findings.

## PulseScan Holder Concentration

The API reads PulseScan/Blockscout token-holder data through:

```text
GET /api/v2/tokens/{address}/holders
```

The top-holder card reports the largest visible token holder as a percentage of the returned token total supply.

The Holder Distribution panel also derives sampled buckets from the returned holder pages:

- top 1 holder percentage
- top 5 holder percentage
- top 10 holder percentage
- selected pair token balance percentage when that pair address appears in the sampled token-holder rows
- zero/dead-address balance percentage when those addresses appear in the sampled token-holder rows
- a compact top-holder table with PulseScan links and address classification where available

These buckets are sampled from visible PulseScan holder responses. The route can follow bounded pagination and preserves large PulseScan cursor values as strings when requesting the next page, but it still caps the deployed scan crawl so the public read-only API remains responsive. The buckets should not be presented as exhaustive distribution proof.

The LP concentration card attempts the same read for the selected DEX Screener pair address. Some PulseScan pair contracts are not indexed as token holder endpoints; in that case LP concentration stays `Unable to verify` instead of guessing.

When PulseScan does index the selected pair as a token, the Holder Distribution panel also shows LP-token control buckets:

- largest visible LP-token holder
- top 5 sampled LP-token holders
- top 10 sampled LP-token holders
- zero/dead-address LP-token balances
- sampled LP-token holder rows and page count

This is useful for spotting whether removable liquidity appears concentrated in one wallet, owner, deployer, contract, or burn/dead address. Burn/dead LP-token balances are still context only; they are not proof of a formal liquidity lock.

The LP Token Control panel also summarizes the largest visible LP holder, context source, sampled burn/dead LP percentage, locker status, next unlock date, and an LP evidence checklist. The checklist separates largest-holder concentration, holder classification, burn/dead sample context, and locker evidence so the UI can show what is visible without overstating what is proved. Dominant owner, deployer, wallet, unknown contract, token-contract, pair-contract, or unknown LP holders are warning context. Dominant known registry protocol contracts, such as routers, bridges, farms, or staking contracts, get distinct known-protocol wording so users can understand what type of contract appears to hold the LP tokens. They still remain warning context unless separate burn/dead or known-locker evidence exists. Dominant known locker contracts from the metadata registry are presented as visible locker context.

For the PulseLaunch Pro LP Locker, Token Chair runs bounded native reads against the verified locker contract when that locker is the visible LP holder. It reads `totalLocks()`, scans decoded `LockCreated` events for records whose token address matches the selected pair, and then reads those exact lock IDs through `getLockInfo(lockId)`. It also samples the most recent lock IDs as a fallback/context check. Returned fields include raw locked LP amount, lock owner, unlock time, withdrawn state, active lock state, locked percentage when LP total supply is available, and next unlock date. Event and lock reads are capped for response time; if the event scan fails or the recent-lock sample is capped, the UI says so rather than guessing. This is readable locker evidence only, not a certificate that liquidity cannot move through every possible mechanism.

Dominant zero/dead LP holders and major sampled burn/dead balances are presented as burn/dead context, not as a formal lock certificate.

These are visible holder signals only. They can be affected by explorer indexing, wrapped-token mechanics, staking contracts, bridges, protocol contracts, or holder data that changes after the scan.

Holder and LP cards classify the returned top address when possible:

- zero address
- common burn address
- token contract
- selected DEX pair
- standard owner
- deployer
- proxy admin
- proxy implementation
- public admin getter address
- known PulseChain registry token
- known protocol spender/router/bridge/farm/locker contract
- PulseScan contract
- wallet
- unknown address

These labels are context, not audit conclusions. They use already-returned read-only RPC, DEX Screener, PulseScan metadata, and the curated chain-scoped Pulse Revoke token/spender registries. Holder cards show the context source where available. A known registry label is not a risk rating.

The Holder Distribution panel expands this context with visible percentages, holder count, shortened holder addresses, PulseScan links when available, and classification details. High concentration at owner, deployer, wallet, contract, selected pair, or unknown addresses remains a warning. High concentration at the zero or common burn/dead address is described as burn/dead holder context, not as proof of a liquidity lock or a token-quality conclusion.

If PulseScan temporarily rate-limits metadata or holder reads, the UI should say that explorer or holder data is `Rate-limited` while preserving any DEX Screener market data and PulseChain RPC pair-contract data that did return. Rate-limited PulseScan reads are degraded source availability, not token-safety conclusions.

## Placeholder Checks

The following rows are visually present but are not live contract-analysis results in the current preview:

- Quick Sniff honeypot row
- buy/sell tax rows when no common public tax/fee getter responds

After a scan, absent public buy/sell tax getters must say `No public getter` and remain visible as review gaps in Quick Sniff, Evidence Checklist, Review Before Buying, and Must Review coverage. The honeypot row must say `Not live` after a scan and remain visible as coverage rather than disappearing behind higher-priority findings. Before a scan, these rows may still say `Not checked yet`. If an upstream or parser failure prevents even the placeholder context from being reliable, rows may say `Unable to verify`.

After a scan, source-driven Quick Sniff rows such as `Hidden owner`, `Obfuscated address`, `Mintable`, `Transfer pausable`, `Blacklist`, `Whitelist`, and `Ownership controls` must not remain at `Not checked yet`. If PulseScan source/ABI metadata is unavailable, rate-limited, or incomplete, those rows should say `Unable to verify` so the completed scan does not look idle.

## Share Links

The app route accepts a `token` query parameter and an `address` alias:

```text
/app/token-chair-sniffer?token=0x...
/app/token-chair-sniffer?address=0x...
```

Valid EVM-style query addresses are checksum-normalized, prefilled, and scanned automatically through the same read-only server route. Manual scans replace the current URL with the canonical `?token=` form so the result can be shared for review. Invalid query values are ignored instead of triggering a wallet action or transaction.

## Non-Goals

The current preview does not add:

- wallet writes
- wallet signing
- `writeContract`
- `sendTransaction`
- relayers
- server wallets
- private keys, mnemonics, or seed phrase handling
- honeypot execution
- buy/sell simulation
- swap execution
- scraping
- paid API keys
- mandatory DEXTools access
- Quick Intel or TokenSniffer integrations
- transaction or simulation-based honeypot checks

Existing approval scanner and revoke behavior are intentionally unchanged.

## Preview QA

Use `docs/TOKEN-CHAIR-VERCEL-QA.md` for the Vercel Preview QA matrix. It covers the sample-token presets, deep-link checks, API checks through `vercel curl`, expected degradation states, and the non-live honeypot/simulation guardrail.

## Verdict Rules

Allowed internal verdict states:

- `unable-to-fully-verify`
- `some-warnings`
- `high-risk`
- `low-visible-risk`

The preview defaults complete-looking market results to `unable-to-fully-verify` unless visible market, read-only contract, source-signal, event-history, or concentration warnings are present, because bytecode-level hidden-owner review and honeypot checks are not live yet.

The UI may show `some-warnings` or `high-risk` for visible warnings such as very low liquidity, new pairs, missing price, missing liquidity, no 24h transactions, a non-zero standard owner, common proxy signals, missing verified source, higher-severity lightweight source-signal matches, high top-holder concentration, or high LP-holder concentration.

Optional DEXTools enrichment can add warning context when DEXTools and DEX Screener return notably different price/liquidity values or when DEXTools returns a low DEXTScore. Missing or unconfigured DEXTools data does not downgrade the token by itself.

The positive word `safe` must not be used as a verdict or marketing claim. It may appear only in conservative disclaimer language, such as: "does not guarantee that a token is safe."

## Safety Language

Required disclaimer:

```text
Token Chair Sniffer highlights visible risk signals only. It does not guarantee that a token is safe. Scam contracts can hide behavior, change settings, or behave differently after launch.
```

The UI must not claim:

- safe
- guaranteed
- certified
- not a scam

## Brand And Legal Guardrail

Do not include real influencer faces, names, handles, logos, voices, endorsements, or likenesses in UI code or committed assets.

Do not include influencer-specific naming in this phase. The page should remain PulseChain-culture-inspired without implying endorsement.

## Future Phases

Recommended next phase:

**Phase 3: Shared Review And Deeper Simulation**

Possible remaining scope:

- optional account-backed saved reviews
- richer token comparison across live rescans, not only local saved review state
- deeper ABI/source analysis beyond lightweight keyword matching
- optional execution simulation or honeypot tooling if a safe, clearly separated provider is chosen
- richer known-contract tagging and locker integrations
- broader LP concentration with additional locker protocols, deeper unlock-state checks, and visible locker-record tables

Later phases:

- Phase 3: optional Quick Intel integration if approved and an API key is available
- Phase 4: native liquidity/LP lock and burn checks
- Phase 5: honeypot/sell simulation with strict simulation-only boundaries

Do not jump directly to live honeypot execution.
