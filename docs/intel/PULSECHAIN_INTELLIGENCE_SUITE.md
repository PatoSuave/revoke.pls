# PulseChain Intelligence Suite

This document defines the first pass for the PulseChain Intelligence Suite.
The goal is to add a PulseChain-native research surface without changing the
existing scanner or revoke execution model.

## First Pass Scope

Routes:

- `/intel`
- `/intel/wallet`
- `/intel/visualizer`

The first pass is a polished local demo. It ships:

- A premium intelligence hub with seven roadmap cards.
- A wallet intelligence demo with address validation.
- A labeled demo portfolio summary.
- A labeled demo decoded activity feed.
- A one-hop constellation graph shell built with React, SVG, and CSS.
- A node detail panel and graph filters.
- A full-screen visualizer workbench with local graph data, transaction edge
  details, filter controls, a timeline strip, and investigator-style panels.
- A homepage and footer entry point.
- Sitemap entries for the intelligence routes.

The demo does not fetch live wallet data. It does not add an API route, RPC
reader, explorer reader, graph dependency, subscription, or transaction path.

## Product Boundary

The suite automates organization and interpretation of public research context.
It does not execute wallet actions.

The first pass must remain:

- Read-only.
- Demo-data only.
- Clearly labeled as demo mode.
- Separate from revoke execution.
- Separate from wallet prompts.
- Free of live RPC, explorer, or reputation calls.
- Free of secret collection or asset-control flows.

Labels, scores, and risk language are research context. They are not proof and
must not promise an outcome.

## Seven Feature Surfaces

### Wallet Intelligence

Purpose: inspect a wallet-centered report with portfolio context, decoded
activity, and one-hop relationships.

First pass: local demo route at `/intel/wallet`.

Current status:

- Address validation runs locally.
- The typed address changes the center wallet in the demo report.
- Portfolio, activity, labels, and relationships remain static sample records.
- A link opens the dedicated visualizer demo for deeper graph review.

Future data sources, if explicitly approved:

- Capped PulseChain RPC reads.
- Capped explorer reads.
- Curated local registries.
- Existing approval scanner outputs.

### Constellation Network Maps

Purpose: visualize wallet, contract, token, staking, and liquidity
relationships.

First pass: local graph shell inside the wallet demo plus a dedicated
workbench route at `/intel/visualizer`.

Current status:

- The visualizer uses a local demo dataset with wallet, protocol, token,
  liquidity, router, unknown-contract, and spender-style nodes.
- Edges include demo inflow, outflow, internal, approval, and warning
  categories.
- The workbench includes a top search bar, left investigator console, filter
  panel, right detail drawer, floating graph controls, and bottom timeline.
- Node and edge selection changes visible context without fetching or
  executing anything.

Future work:

- Multi-hop expansion controls.
- Entity grouping.
- Edge type filtering.
- Exportable graph snapshots.
- Higher-fidelity pan, zoom, and graph layout behavior.
- Optional canvas or WebGL renderer only if local performance requires it.

### Research Assistant

Purpose: help turn visible context into structured research notes, questions,
and investigation checklists.

First pass: roadmap card only.

Future work:

- Source-cited research summaries.
- User-controlled note generation.
- No action execution from generated notes.

### Token Deep Analytics

Purpose: summarize token concentration, holder movement, liquidity context, and
contract signals.

First pass: roadmap card only.

Future work:

- Holder concentration summaries.
- Liquidity and pool context.
- Contract metadata review.
- Time-bounded movement windows.

### Research Workspaces

Purpose: organize saved addresses, watchlists, notes, and exports.

First pass: roadmap card only.

Future work:

- Local-first workspace drafts.
- Exportable research packets.
- Review checklists.

### Real-Time Network Pulse

Purpose: show network-level PulseChain activity and conditions.

First pass: roadmap card only.

Future work:

- Gas and block context.
- Notable contract activity.
- Rate-limited network summaries.

### Risk & Exposure Awareness

Purpose: highlight visible approvals, unusual relationships, incomplete
coverage, and review priorities.

First pass: roadmap card only.

Future work:

- Conservative exposure labels.
- Missing-data warnings.
- Curated registry context.
- Clear incomplete-check states.

## Acceptance Criteria For This Pass

- `/intel` renders a hub with all seven cards.
- `/intel/wallet` renders address input, demo status, portfolio, activity, graph,
  filters, and node details.
- `/intel/visualizer` renders the full workbench, top search, graph canvas,
  investigator console, filters, detail drawer, graph controls, and timeline.
- The searched valid address becomes the graph center node.
- Demo labels are visible.
- No wallet prompt appears on intel routes.
- No API route is created for intel.
- No new dependency is added.
- Existing scanner, revoke hooks, chain config, and preflight logic remain
  unchanged.
- Mobile at 390px keeps the visualizer usable without horizontal page overflow.

## Preview QA Workflow

The Intelligence Suite has a dedicated hosted smoke command:

```bash
npm run smoke:intel -- <preview-or-local-url>
```

The command checks:

- `/intel` hub markers, feature cards, and shared surface links.
- `/intel/wallet` address entry, report status, demo labels, and suite links.
- `/intel/visualizer` graph workbench markers, timeline marker, graph marker,
  and route-specific canonical metadata.

The command accepts a plain local URL, a Vercel preview URL, or a protected
preview URL that includes `_vercel_share`. When a protected Vercel preview is
used, the smoke command preserves the temporary preview cookie across redirects
so all three Intelligence Suite routes can be checked in one run.

Manual QA should include:

- Desktop review of `/intel`, `/intel/wallet`, and `/intel/visualizer`.
- Mobile review around 390px width for the visualizer top controls and graph
  canvas.
- Confirmation that all intelligence routes still show demo/local-read labels.
- Confirmation that the visualizer remains usable without horizontal page
  overflow.

## Validation

Before merging this pass:

- Run `npm run lint`.
- Run `npm run typecheck`.
- Run `npm run test`.
- Run `npm run build`.
- Run `npm run smoke:intel -- <preview-or-local-url>`.
- Run `git diff --check`.
- Review changed files for transaction-write imports, wallet prompt imports,
  secret-input handling, middle-service transaction submission, automated asset
  movement, and recovery promises.
