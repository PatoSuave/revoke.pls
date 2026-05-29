# Wallet Lifeboat Phases

Each phase should be its own ticket, branch, review, and validation pass unless
the user explicitly approves combining phases. Documentation may describe
future capability before code exists, but product code should only implement
the active phase.

Recommended validation commands for code phases:

```powershell
git diff --check
npm run lint
npm run typecheck
npm run test
npm run build
```

For documentation-only phases, run `git diff --check` and `npm run lint` when
the repo lint command covers the touched files or is cheap enough to run.

## Phase 1: Wallet Lifeboat Shell And Existing Scanner Integration

Purpose: Create the Wallet Lifeboat entry point, safety copy, address input,
chain selector, existing approval scan reuse, NFT approval scan reuse, and
initial report summary.

Data sources: Existing address-only approval and NFT scanner paths, existing
chain registry, existing explorer links.

User-facing output: Read-only incident dashboard with visible approval risk,
NFT permission risk, report completeness, and safety limitations.

Safety constraints: No new write paths. Existing revoke gates remain unchanged.
All pasted-address scans are read-only.

What must not be implemented: Rescue automation, automatic transfer, gas
funding, server signing, relayers, rescue contracts, HEX writes, private bundle
execution.

Acceptance criteria: `/app/wallet-lifeboat` renders, pasted-address scans reuse
existing read-only behavior, incomplete modules are not shown as safe, report
export includes limitations, standard scanner remains the only revoke path.

Suggested tests: Address validation, chain selection, scanner reuse, report
export, no wallet-write imports in Lifeboat-only code.

Validation commands: `git diff --check`, `npm run lint`, `npm run typecheck`,
focused Lifeboat tests, `npm run build`, preview smoke.

## Phase 2: Gas-Sweeper Pattern Scanner

Purpose: Detect bounded native-gas movement patterns where inbound native gas is
quickly followed by outbound native transfer activity.

Data sources: Explorer account transaction lists, chain explorer links, bounded
server-side fetches.

User-facing output: Possible gas-sweeper-like activity, evidence rows, checked
transaction count, quick-drain count, and caveat that the heuristic cannot
confirm an attacker or rule out private/internal/unindexed activity.

Safety constraints: Read-only only. Do not submit transactions. Do not suggest
automatic gas funding.

What must not be implemented: Automatic gas top-ups, private bundles,
transaction replacement, relayers, or rescue execution.

Acceptance criteria: The module has bounded inputs, timeout, rate limiting,
no-store responses, tests for possible and strong patterns, and no false
"clear" when data is missing.

Suggested tests: Heuristic unit tests, API validation, caller-controlled range
rejection, config-missing handling, rate-limit headers.

Validation commands: `git diff --check`, `npm run lint`, `npm run typecheck`,
focused sweeper tests, `npm run test`, `npm run build`, preview smoke.

## Phase 2A: Pending Transaction / Nonce Scanner

Purpose: Compare the latest and pending nonce reported by a configured RPC for
the pasted address. A pending nonce gap can indicate that the wallet already
has one or more transactions waiting.

Data sources: RPC `eth_getTransactionCount` reads for `latest` and `pending`.

User-facing output: Latest nonce, pending nonce, pending gap, and a warning
that this cannot see every private, dropped, replaced, or unindexed
transaction.

Safety constraints: Read-only only. Do not submit, replace, cancel, speed up,
or bundle transactions.

What must not be implemented: Transaction replacement, private mempool
execution, relayers, automatic gas funding, rescue execution, or any wallet
write path.

Acceptance criteria: The module uses bounded RPC calls, timeout, rate limiting,
no-store responses, tests for possible and elevated pending gaps, and no false
"all clear" when RPC data is unavailable.

Suggested tests: Heuristic unit tests, API validation, caller-controlled block
tag rejection, upstream failure handling, rate-limit headers, report export.

Validation commands: `git diff --check`, `npm run lint`, `npm run typecheck`,
focused pending nonce tests, `npm run test`, `npm run build`, preview smoke.

## Phase 3: Approval-To-Drain Timeline

Purpose: Correlate approval events, transfer events, and native-gas movement so
users can understand visible incident order.

Data sources: Explorer log APIs, token transfer APIs where available, native
transaction lists, existing approval candidates.

User-facing output: Timeline grouped by chain with approval, transfer, gas, and
possible drain events marked as visible public signals.

Safety constraints: Timeline is informational. It must not accuse an address or
claim causation unless backed by reviewed evidence.

What must not be implemented: Automated recovery, automatic transfer, or
attacker attribution.

Acceptance criteria: Timeline has deterministic sorting, bounded data windows,
clear incomplete states, and explorer links for evidence.

Suggested tests: Sort order, dedupe, missing timestamps, partial upstream
responses, report export.

Validation commands: Full validation stack plus focused timeline tests.

Current safe production pass:

- Adds a read-only `/api/lifeboat/timeline` diagnostic.
- Uses bounded recent explorer history only; callers cannot choose page, offset,
  block range, module, action, or sort.
- Parses recent normal transactions for approval-like calls and native
  transfers.
- Parses recent token transfers for visible inbound/outbound token movement.
- Labels close approval-to-outbound-movement ordering as possible or elevated
  context, not proof of theft, attacker control, or causation.
- Keeps partial explorer data as incomplete and never treats missing timeline
  evidence as an all-clear state.
- Adds the diagnostic to the Wallet Lifeboat UI and exportable report without
  adding any wallet write path.

## Phase 4: Address Poisoning Scanner

Purpose: Identify recent lookalike inbound transfers or dust events that may be
intended to trick the user into copying a malicious address.

Data sources: Recent native and token transfers, address similarity heuristics,
explorer links.

User-facing output: Possible address-poisoning signals with compared prefix and
suffix, original address, lookalike address, and transaction evidence.

Safety constraints: Treat as possible phishing context, not proof of attacker
control.

What must not be implemented: Address blocking, wallet contacts mutation, or
automatic transaction preparation.

Acceptance criteria: Similarity thresholds are documented and tested, false
positives are described carefully, incomplete data stays incomplete.

Suggested tests: Prefix/suffix matching, checksum handling, ignored self
transfers, report export.

Validation commands: Full validation stack plus focused poisoning tests.

## Phase 5: Spender Contract Risk Scanner

Purpose: Score approval spenders using public contract signals and curated
context.

Data sources: Contract bytecode presence, proxy detection where available,
verified-source status, curated spender registry, explorer links.

User-facing output: Spender context such as unknown contract, proxy-like
contract, verified source unavailable, known protocol, or known-risk registry
match.

Safety constraints: Registry labels are context, not proof. Use
non-defamatory wording.

What must not be implemented: Blocking revokes based only on labels or making
definitive scam claims from weak evidence.

Acceptance criteria: Registry entries have source fields, risk language is
careful, unknown does not mean malicious, known does not mean safe.

Suggested tests: Registry normalization, source-required entries, proxy signal
display, unknown-contract handling.

Validation commands: Full validation stack plus registry tests.

## Phase 6: Permit2 Exposure Scanner

Purpose: Show Permit2 delegated allowance exposure for supported chains.

Data sources: Permit2 contract reads, Permit2 approval events, existing token
metadata and explorer links.

User-facing output: Active Permit2 token/spender allowances, expiration context,
and revoke routing through existing controlled Permit2 revoke behavior if
already supported for that chain.

Safety constraints: Preserve owner, chain, live-verification, preflight, and
post-receipt gates.

What must not be implemented: Signature requests for inspection, server-side
Permit2 writes, or Permit2 revoke on unsupported chains.

Acceptance criteria: Permit2 rows are live-read before display as active, chain
support is explicit, unsupported chains are not shown as clear.

Suggested tests: Allowance reads, expiration states, unsupported chain state,
wallet mismatch disablement.

Validation commands: Full validation stack plus Permit2 tests.

## Phase 7: EIP-7702 Delegation Scanner

Purpose: Detect whether an externally owned account has delegation code on
chains that expose the necessary RPC behavior.

Data sources: RPC `eth_getCode`, chain support metadata, explorer links.

User-facing output: Delegation status, target code address when available, and
limitations for unsupported chains.

Safety constraints: Read-only only. Do not offer automatic clearing or account
repair.

What must not be implemented: Delegation revocation writes, signer flows,
relayed repair transactions, or claims that no delegation means no compromise.

Acceptance criteria: Unsupported chains are explicit, RPC errors are incomplete,
and code presence is not overinterpreted.

Suggested tests: Empty code, delegated code, unsupported chain, RPC failure,
report export.

Validation commands: Full validation stack plus delegation tests.

## Phase 8: Scam Token And NFT Dust Trap Scanner

Purpose: Flag suspicious token or NFT dust that may be bait for phishing sites
or malicious approvals.

Data sources: Token transfer history, NFT transfer history, token metadata,
curated registries, explorer links.

User-facing output: Dust/bait warnings with careful language and a warning not
to visit token-provided URLs.

Safety constraints: Do not fetch arbitrary token website URLs from the client
or render untrusted HTML.

What must not be implemented: Automatic hiding, burning, transfer, or approval
of dust assets.

Acceptance criteria: Untrusted metadata is sanitized, external URLs are treated
as risky, and unknown assets are not called scams without evidence.

Suggested tests: Metadata sanitization, URL stripping/display, registry match,
unsupported chain state.

Validation commands: Full validation stack plus metadata safety tests.

## Phase 9: HEX Lifeboat Read-Only Stake Diagnostics

Purpose: Show read-only HEX stake status for the pasted address.

Data sources: HEX contract read calls, chain registry, explorer links, stake
calculation helpers.

User-facing output: Active, mature, late, and ended stake context with
limitations and no write actions.

Safety constraints: Read-only only. Do not run or prepare End Stake, Emergency
End Stake, or Good Accounting transactions.

What must not be implemented: Stake-ending automation, payout claims, or
profit/loss promises.

Acceptance criteria: Reads are bounded, stale or failed reads are incomplete,
and output explains that compromised seed risk remains.

Suggested tests: Stake parsing, mature/late status, unsupported chain, failed
read state, report export.

Validation commands: Full validation stack plus HEX read tests.

## Phase 10: Good Accounting Assist

Purpose: Explain when Good Accounting may be relevant and how a clean wallet
could manually execute it.

Data sources: HEX read-only stake diagnostics, public contract state,
documentation links approved by the project.

User-facing output: Candidate list and manual guidance that Good Accounting can
be done by a clean wallet where applicable.

Safety constraints: Assist only. No automatic Good Accounting write. No server
signing. No transaction submission from the Lifeboat module.

What must not be implemented: Automatic Good Accounting execution, private
bundle execution, rescue flows, or claims of guaranteed recovered value.

Acceptance criteria: The feature is clearly separate from execution and points
to manual review.

Suggested tests: Candidate derivation, copy safety, unsupported states, report
export.

Validation commands: Full validation stack plus Good Accounting assist tests.

## Phase 11: Smart Wallet / Safe Configuration Scanner

Purpose: Inspect known smart-wallet configuration risks such as Safe owners,
threshold, modules, guards, and fallback handlers.

Data sources: Safe-compatible contract reads, known deployment addresses,
explorer links.

User-facing output: Owners, threshold, enabled modules, guard state, and
configuration warnings.

Safety constraints: Read-only only. Do not propose automatic owner/module
changes.

What must not be implemented: Safe transaction creation, module disabling,
owner rotation, server signing, or relayed execution.

Acceptance criteria: Unknown smart wallets are unsupported, Safe reads are
bounded, and module risk copy is careful.

Suggested tests: Owner threshold parsing, module pagination bounds, unsupported
contract, report export.

Validation commands: Full validation stack plus smart-wallet tests.

## Phase 12: ERC-4337 / Session-Key Diagnostics

Purpose: Surface account-abstraction signals such as recent UserOperations,
paymasters, factories, and possible session-key configuration where supported.

Data sources: EntryPoint events, bundler/explorer data where available, account
contract reads where ABI support exists.

User-facing output: Account-abstraction activity, paymaster/factory context,
and unsupported or incomplete status.

Safety constraints: Do not request UserOperation signatures. Do not submit
UserOperations. Do not clear session keys automatically.

What must not be implemented: Bundler submission, paymaster usage, session-key
revocation writes, or recovery automation.

Acceptance criteria: Chain and EntryPoint support are explicit, unsupported
states are not clear states, and activity is linked to evidence.

Suggested tests: EntryPoint parsing, paymaster detection, unsupported chain,
partial data handling.

Validation commands: Full validation stack plus ERC-4337 tests.

## Phase 13: ERC-6909 Multi-Token Approval Scanner

Purpose: Prepare for ERC-6909-style multi-token approval exposure.

Data sources: ERC-6909 approval events and read calls where standards and chain
support are reliable.

User-facing output: Multi-token operator or allowance exposure with token ID
context and explorer links.

Safety constraints: Read-only in Lifeboat unless a future explicit revoke path
is designed, reviewed, and gated.

What must not be implemented: Generic multi-token revoke writes without a
separate approved design.

Acceptance criteria: Standards handling is documented, unsupported contracts
are incomplete or unsupported, and no generic unsafe write path is added.

Suggested tests: Event parsing, token ID grouping, unsupported contract, report
export.

Validation commands: Full validation stack plus ERC-6909 tests.

## Phase 14: Known-Risk Recipient Registry

Purpose: Add curated context for recipient, spender, or contract addresses that
have reviewed public evidence.

Data sources: Project-maintained registry entries with source URLs, dates,
chain IDs, confidence, and review notes.

User-facing output: Careful labels such as "reported risk" or "reviewed risk
signal" with sources and dates.

Safety constraints: Avoid defamatory language. Do not call an address a scammer
or attacker unless the project has a strong, reviewed source and legal wording
has been approved.

What must not be implemented: User-submitted public accusations, unsourced
labels, automatic blocking, or definitive attribution from weak evidence.

Acceptance criteria: Entries require sources, confidence, review date, reviewer,
and chain scope. The UI distinguishes registry context from proof.

Suggested tests: Schema validation, required source fields, stale-entry
warnings, display copy.

Validation commands: Full validation stack plus registry schema tests.
