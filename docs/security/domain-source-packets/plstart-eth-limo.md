# plstart.me GitHub Mirror Source Packet

## Status

Candidate source context only.

This source packet does not make any listed hostname official, endorsed,
current, or free of risk. Matches from this source may appear in the phishing
link checker as source context beside the normal result status.

## Source

- Source label: `plstart.me GitHub mirror`
- Public page: `https://start.me/p/gGQ09M/plstart-me`
- Repository: `https://github.com/0xWhankFrite/plstart.eth.limo`
- Pinned snapshot:
  `https://raw.githubusercontent.com/0xWhankFrite/plstart.eth.limo/6417ee6c6b86ab9fa79417e9cc532f70edc19446/index.html`
- Captured: `2026-05-30`
- Registry file: `src/lib/security/candidate-domain-registry.ts`

The public start.me pages were protected by a browser challenge during review,
so this packet uses the public GitHub mirror instead of crawling or fetching the
start.me page itself.

## Extraction Summary

- Unique URLs observed in the pinned snapshot: `399`
- Unique hostnames imported into the candidate registry: `178`
- Import mode: exact hostname list
- Runtime matching: exact hostname, with `www.` and root forms treated as
  equivalent for candidate context only
- Subdomain expansion: none
- Official-domain promotion: none

## Safety Rules

- Candidate hostnames must not produce `official-match`.
- Candidate hostnames must not suppress suspicious static signals.
- Candidate hostnames must not be labeled as verified, trusted, or guaranteed.
- New candidate sources need their own source packet before inclusion.
- Third-party domains must not be added from memory, search snippets, social
  posts, or user submissions alone.

## Review Checklist

- Confirm the source URL is pinned to an immutable commit or reviewed snapshot.
- Confirm the source packet records the captured date.
- Confirm the imported hostnames are lowercase and contain no protocol, path,
  search, fragment, whitespace, or credentials.
- Confirm the list is deduped and sorted.
- Confirm the candidate list does not overlap the official-domain registry.
