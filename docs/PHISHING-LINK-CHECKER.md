# Phishing Link Checker

## Purpose

The Phishing Link Checker is a read-only URL/domain triage tool for crypto
links. It helps a user inspect a pasted link before visiting a site or
connecting a wallet.

The first MVP lives at `/security/check-link` and performs local static
analysis only.

## MVP Scope

The checker may:

- Accept a pasted URL or bare domain.
- Normalize a bare domain as `https://...`.
- Parse hostname, approximate registrable domain, protocol, path, and HTTPS
  state.
- Compare the hostname against the official-domain registry.
- Show candidate source-list context when a hostname appears in a reviewed
  community source snapshot.
- Flag local patterns such as non-HTTPS links, IP hostnames, punycode, long
  URLs, misleading `@` userinfo, deep subdomains, shorteners, suspicious
  path/subdomain keywords, and Pulse Revoke lookalikes.
- Show conservative user guidance and recommended next steps.

The checker must not:

- Fetch, crawl, preview, screenshot, or request arbitrary user-submitted URLs.
- Resolve DNS, call WHOIS, or call reputation APIs in the MVP.
- Add an API route for submitted links.
- Connect a wallet.
- Request a seed phrase, private key, mnemonic, keystore JSON, wallet password,
  or remote desktop access.
- Sign, relay, bundle, or submit transactions.
- Add `writeContract`, `sendTransaction`, custody, recovery, rescue, gas
  funding, or transfer flows.

## Classification

Results use one of these statuses:

- `official-match`: the hostname exactly matches a reviewed registry entry, or
  matches an explicitly allowed subdomain entry.
- `likely-lookalike`: the domain resembles a reviewed registry entry through a
  typo, hyphenation change, character substitution, or TLD swap.
- `suspicious-patterns`: local static signals were found.
- `unknown-domain`: no registry match and no local static warning signal.
- `invalid-input`: the input could not be parsed as a normal HTTP(S) URL or
  domain.

No result should imply a site is proven harmless. A clean-looking result only
means this local checker did not find one of its known static signals.

## Official-Domain Registry Policy

The initial registry contains only:

- `pulserevoke.com`

Subdomains are not considered official by default. A subdomain must be added as
an explicit reviewed entry or enabled through registry metadata.

Future PulseChain ecosystem entries require a source packet before inclusion.
Do not add third-party domains from memory, search snippets, social posts, or
user submissions alone.

## Candidate Source Registry

Candidate source entries are separate from official-domain entries. They give
users context that a hostname appeared in a reviewed source snapshot, but they
do not prove the hostname is official, current, endorsed, or free of risk.

The first candidate source is:

- `0xWhankFrite/plstart.eth.limo`
- Source snapshot:
  `https://raw.githubusercontent.com/0xWhankFrite/plstart.eth.limo/6417ee6c6b86ab9fa79417e9cc532f70edc19446/index.html`
- Captured on `2026-05-30`
- Imported as exact hostnames in
  `src/lib/security/candidate-domain-registry.ts`
- Source packet:
  `docs/security/domain-source-packets/plstart-eth-limo.md`

Candidate hostnames must not change the result to `official-match`. They may
appear as source context beside the normal result status. If a candidate
hostname also has suspicious static signals, the suspicious signals still take
priority in the result.

Candidate-source lookalikes may produce `likely-lookalike`, but the copy must
say the pasted hostname resembles a candidate source-list hostname. It must not
say or imply that the matched source-list hostname is official.

Candidate source data is modeled as reviewed source packets. Each packet must
declare its source metadata and exact hostname list. The app derives the unique
candidate hostname count and flattened registry entries from those packets, so
future reviewed lists can be added without changing matching behavior.

## Future Expansion Boundaries

Possible later phases may add curated registries, reviewed ecosystem source
packets, local denylist context, or optional client-side reputation labels. Any
future remote lookup must preserve the no-crawl/no-preview/no-wallet-write model
and must clearly distinguish heuristic context from proof.

Do not expand this feature into a rescue service, crawler, wallet connector, or
transaction sender.

## Validation

Before handoff:

- `npm run lint`
- `npm run typecheck`
- Targeted Vitest for `src/lib/security/*`
- `npm run test`
- `npm run build`
- `git diff --check`
- Search changed files for forbidden write/signing/network-fetch additions
