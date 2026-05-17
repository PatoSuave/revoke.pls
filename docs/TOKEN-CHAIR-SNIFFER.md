# Token Chair Sniffer

## Concept

Token Chair Sniffer is a PulseChain-only, read-only token market-intel and risk-signal UI with the tagline:

**Sniff before you ape.**

It is intentionally playful, but its security language stays conservative. The feature highlights visible signals before a user buys, approves, or interacts with a token. It does not connect a wallet, request a signature, submit a transaction, or claim that any token is safe.

## Phase 1 Scope

Implemented in this MVP:

- App route: `/app/token-chair-sniffer`
- Internal API route: `/api/token-chair-sniffer/market?token=0x...`
- Lightweight CTA from `/app` to the sniffer route
- EVM token-address validation and checksum normalization
- Server-side DEX Screener token-pairs fetch for `pulsechain`
- DEX Screener response normalization and main-pair selection by highest visible USD liquidity
- Read-only PulseChain RPC contract reads for basic token metadata, standard ownership, and common proxy signals
- PulseScan/Blockscout verified-source metadata for source status, ABI availability, deployer, and creation transaction
- Lightweight ABI/source keyword signals for mint, pause, cooldown, blacklist, whitelist, and suspicious-function rows
- PulseScan holder endpoint concentration reads for top token holder and LP holder data when available
- Address context labels for zero/burn addresses, token contract, selected pair, owner, deployer, contracts, and wallets where visible metadata supports it
- PulseScan links on live contract/source/deployer/holder cards
- Compact Signal Details panel explaining the current verdict inputs
- Conservative Chair Verdict mapping
- Market Chair Intel cards
- Quick Sniff checklist with live ownership/proxy rows and conservative placeholders for unchecked rows
- Contract Sniff cards with live owner, source, deployer, holder, LP, and metadata signals
- Unit tests for address validation, parser behavior, API states, verdict copy, and unchecked rows

## Market Data Source

Phase 1 market data uses DEX Screener only:

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

## Native Read-Only Contract Checks

The API also performs PulseChain RPC reads without connecting a wallet:

- `eth_getCode` to confirm bytecode exists at the pasted address
- ERC-20-style `name()`, `symbol()`, and `decimals()` view reads
- standard `owner()` with `getOwner()` fallback
- EIP-1967 implementation/admin/beacon storage-slot reads
- EIP-1167 minimal-proxy bytecode pattern detection

These checks are informational only. `owner()` returning the zero address is labeled `Appears renounced`, not as a guarantee. A missing common proxy signal is labeled `Common proxy signal not found`, not as proof that every proxy pattern is absent.

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
- suspicious functions

Rows with matches say `Source signal found`. Rows without matches say `Not flagged by source scan`, which means only that the lightweight keyword pass did not match obvious terms in returned ABI/source. It is not a full audit and does not prove the behavior is absent.

## PulseScan Holder Concentration

The API reads PulseScan/Blockscout token-holder data through:

```text
GET /api/v2/tokens/{address}/holders
```

The top-holder card reports the largest visible token holder as a percentage of the returned token total supply.

The LP concentration card attempts the same read for the selected DEX Screener pair address. Some PulseScan pair contracts are not indexed as token holder endpoints; in that case LP concentration stays `Unable to verify` instead of guessing.

These are visible holder signals only. They can be affected by explorer indexing, wrapped-token mechanics, staking contracts, bridges, protocol contracts, or holder data that changes after the scan.

Holder and LP cards classify the returned top address when possible:

- zero address
- common burn address
- token contract
- selected DEX pair
- standard owner
- deployer
- PulseScan contract
- wallet
- unknown address

These labels are context, not audit conclusions. They use already-returned read-only RPC, DEX Screener, and PulseScan metadata.

## Placeholder Checks

The following sections are visually present but not live contract-analysis results in Phase 1:

- Quick Sniff tax, hidden-owner, obfuscation, and honeypot rows

Unchecked rows must say `Not checked yet`. If an upstream or parser failure prevents even the placeholder context from being reliable, rows may say `Unable to verify`.

## Non-Goals

Phase 1 does not add:

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
- Quick Intel, DEXTools, or TokenSniffer integrations
- transaction or simulation-based honeypot checks

Existing approval scanner and revoke behavior are intentionally unchanged.

## Verdict Rules

Allowed internal verdict states:

- `unable-to-fully-verify`
- `some-warnings`
- `high-risk`
- `low-visible-risk`

Phase 1 defaults complete-looking market results to `unable-to-fully-verify` unless visible market, read-only contract, source-signal, or concentration warnings are present, because tax and honeypot checks are not live yet.

The UI may show `some-warnings` or `high-risk` for visible market-only warnings such as very low liquidity, new pairs, missing price, missing liquidity, no 24h transactions, a non-zero standard owner, common proxy signals, missing verified source, lightweight source-signal matches, high top-holder concentration, or high LP-holder concentration.

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

**Phase 2: Native PulseChain Contract Sniff**

Possible remaining scope:

- richer owner/admin analysis
- expanded proxy detection
- richer ABI/source analysis with severity tiers
- richer holder concentration with known-contract tagging
- richer LP concentration with lock/burn detection

Later phases:

- Phase 3: optional Quick Intel integration if approved and an API key is available
- Phase 4: native liquidity/LP lock and burn checks
- Phase 5: honeypot/sell simulation with strict simulation-only boundaries

Do not jump directly to live honeypot execution.
