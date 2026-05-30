# Domain Source Packets

Domain source packets document reviewed source snapshots for the phishing link
checker candidate registry.

Candidate sources are context only. They do not make a hostname official,
endorsed, current, or free of risk.

## Add a Reviewed Source

1. Save the reviewed snapshot locally. Prefer immutable raw files, exported
   OPML, or a pinned repository commit.
2. Run the local extractor:

   ```bash
   npm run security:extract-source -- path/to/reviewed-snapshot.html --json
   ```

3. Review the extracted hostnames manually. Remove non-project links,
   unsupported placeholders, tracking redirects, and anything not justified by
   the packet.
4. Add source metadata and the exact hostname list to
   `src/lib/security/candidate-domain-registry.ts`.
5. Add a source packet from `TEMPLATE.md`.
6. Run:

   ```bash
   npx vitest run src/lib/security/candidate-source-extractor.test.ts src/lib/security/candidate-domain-registry.test.ts src/lib/security/link-checker.test.ts src/lib/security/official-domain-registry.test.ts
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   git diff --check
   ```

## Safety Rules

- Do not fetch remote user-submitted URLs in the app.
- Do not crawl source pages from the app.
- Do not resolve DNS, call WHOIS, or call reputation APIs in the MVP.
- Do not promote candidate hostnames to official-domain entries.
- Do not label candidate sources as safe, trusted, verified, or guaranteed.
- Do not bypass browser challenges; use durable exported or mirrored snapshots.
