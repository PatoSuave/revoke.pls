# Registry review workflow

This folder is the canonical source of truth for every token and spender
that Pulse Revoke scans. It is intentionally small, deliberately curated,
and reviewed by hand. Do **not** auto-generate entries from web scraping,
explorer tag exports, or unverified token lists.

The scanner reads only what lives here, so a bad entry becomes a user-
facing mistake. Favor correctness over coverage.

## File layout

```
src/lib/registry/
  index.ts      # public re-exports
  tokens.ts     # TOKEN_REGISTRY + TokenEntry + TokenCategory
  spenders.ts   # SPENDER_REGISTRY + SpenderEntry + SpenderCategory
  validate.ts   # dev-time sanity checks (addresses, required fields, decimals)
  README.md     # this file
```

`validate.ts` runs at module load for both registries. In development and
test it **throws** on duplicates, malformed addresses, empty required
fields, or bogus decimals. In production it logs and continues — we want
loud failures at dev time and graceful failures at runtime.

## Adding a token

1. Cross-check the contract address on https://scan.pulsechain.com.
2. Confirm `symbol`, `name`, and `decimals` match the ERC-20's on-chain
   metadata. (These are fallbacks — the scanner still reads live metadata
   when possible.)
3. Pick a `category`:
   - `native-wrapped` — WPLS, the canonical wrapper for PLS
   - `ecosystem`      — a native PulseChain token
   - `stablecoin`     — native or bridged stablecoin
   - `bridged`        — an asset bridged from another chain
   - `governance`     — primarily a governance token
   - `unknown`        — no confident claim
4. Set `source` to the URL where the address is documented. Leave absent
   if you do not have a reliable source.
5. Set `lastReviewed` only if you have a real date; **do not fabricate**.

## Adding a spender

1. Cross-check the contract address on https://scan.pulsechain.com.
2. Confirm the contract is the *canonical* instance of the protocol
   component you are labeling. A proxy, a clone, or an older deployment
   is not the same entry.
3. Pick a `category`:
   - `router`  — DEX router / swap entry contract
   - `dex`     — pair, LBP, or order-book contract
   - `bridge`  — cross-chain bridge contract
   - `staking` — single-sided staking contract
   - `farm`    — LP staking / yield farm contract
   - `unknown` — no confident claim
4. Set `isTrusted: true` **only** if both of the following are true:
   - the address is confirmed canonical against the protocol's own docs
   - the labeled protocol is an established, actively maintained deployment
   `isTrusted` is a naming claim, not a safety claim. Users see a "Known"
   badge — that simply means "we recognize this address", not "this is
   safe".
5. Fill provenance fields factually:
   - `verificationMethod` — how you verified the address (e.g.
     "Manual PulseScan cross-check against pulsex.com documentation.")
   - `source` — URL the address was pulled from
   - `lastReviewed` — only if you have a real date
6. If you cannot verify the address confidently, set `isTrusted: false`
   and omit the provenance fields. The scanner will still pick it up, but
   the row renders as *Unverified* in the UI.

## Pull-request checklist

Before merging a registry change:

- [ ] Address checked on PulseScan
- [ ] Address sourced from an official doc / site / repo (linked in `source`)
- [ ] Category set accurately, or `unknown`
- [ ] `isTrusted` set conservatively
- [ ] `verificationMethod` sentence is factual and short
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` all pass

## What belongs here, what does not

**In scope**
- Tokens with live circulating supply on PulseChain
- Spenders that commonly hold user approvals (routers, farms, bridges)
- Entries we can verify from public documentation

**Out of scope**
- Speculative pre-launch contracts
- Honeypots / scam contracts (the registry is descriptive, not a block list)
- User-specific contracts (personal multisigs, wallet vaults)
- Rapidly changing addresses without a stable documentation source
