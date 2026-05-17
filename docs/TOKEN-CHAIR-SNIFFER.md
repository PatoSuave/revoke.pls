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
- Conservative Chair Verdict mapping
- Market Chair Intel cards
- Quick Sniff placeholder checklist
- Contract Sniff placeholder cards
- Unit tests for address validation, parser behavior, API states, verdict copy, and unchecked rows

## Live Data Source

Phase 1 uses DEX Screener only:

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

## Placeholder Checks

The following sections are visually present but not live contract-analysis results in Phase 1:

- Quick Sniff tax, ownership, honeypot, proxy, mint, pause, cooldown, blacklist, and whitelist rows
- Contract Sniff source verification, owner, deployer, top-holder concentration, and LP concentration cards

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
- Quick Intel, DEXTools, TokenSniffer, or PulseScan/BlockScout integrations

Existing approval scanner and revoke behavior are intentionally unchanged.

## Verdict Rules

Allowed internal verdict states:

- `unable-to-fully-verify`
- `some-warnings`
- `high-risk`
- `low-visible-risk`

Phase 1 defaults complete-looking market results to `unable-to-fully-verify` because native contract, tax, ownership, source, and honeypot checks are not live yet.

The UI may show `some-warnings` or `high-risk` for visible market-only warnings such as very low liquidity, new pairs, missing price, missing liquidity, or no 24h transactions.

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

Possible scope:

- PulseScan/BlockScout source verification metadata
- contract ABI/source fetch
- deployer address
- owner/admin reads
- renounced ownership detection
- proxy detection
- suspicious function keyword detection
- holder concentration
- LP concentration

Later phases:

- Phase 3: optional Quick Intel integration if approved and an API key is available
- Phase 4: native liquidity/LP lock and burn checks
- Phase 5: honeypot/sell simulation with strict simulation-only boundaries

Do not jump directly to live honeypot execution.
