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
