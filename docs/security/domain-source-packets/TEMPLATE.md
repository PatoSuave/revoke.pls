# Source Label Source Packet

## Status

Candidate source context only.

This source packet does not make any listed hostname official, endorsed,
current, or free of risk. Matches from this source may appear in the phishing
link checker as source context beside the normal result status.

## Source

- Source label: `TODO`
- Repository: `TODO`
- Pinned snapshot: `TODO`
- Captured: `YYYY-MM-DD`
- Registry file: `src/lib/security/candidate-domain-registry.ts`

## Extraction Summary

- Unique URLs observed in the reviewed snapshot: `TODO`
- Unique hostnames imported into the candidate registry: `TODO`
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

- Confirm the source URL is pinned to an immutable commit, exported snapshot, or
  reviewed local artifact.
- Confirm the source packet records the captured date.
- Confirm the imported hostnames are lowercase and contain no protocol, path,
  search, fragment, whitespace, or credentials.
- Confirm the list is deduped and sorted.
- Confirm the candidate list does not overlap the official-domain registry.
- Confirm candidate entries are context only and not official-domain matches.
