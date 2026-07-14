# Token Contract Report v2 Implementation Handoff

Date: 2026-07-10

The Token Contract Report is a read-only evidence scanner for supported live
EVM chains. It does not connect a wallet, sign or submit transactions, fund an
account, relay calls, take custody, or claim a token is safe.

## Runtime Surface

- Page: `/TokenContractReport`
- Progressive API: `POST /api/token-contract-report/stream`
- Compatibility JSON API: `POST /api/token-contract-report`
- Request: `{ "chainId": 369, "contractAddress": "0x...", "includeAi": true }`
- Response schema: `schemaVersion: 2`
- Streaming content type: `application/x-ndjson`
- Stream events: `base`, `module`, `final`, and `error`
- Global stream deadline: 50 seconds
- Deep-audit throttle: three starts per client per ten minutes and one in-flight
  audit per client
- Responses are `no-store`

The scanner is intentionally not linked from public navigation. Do not add it
to navigation or change revoke/wallet safety gates as part of scanner work.

## Core Files

- `src/lib/token-contract-report.ts` — schema v2 and shared response types
- `src/lib/token-contract-report-server.ts` — evidence orchestration, verdict,
  and DeepSeek boundary
- `src/lib/token-contract-source-analysis.ts` — bounded Solidity AST analysis
- `src/lib/token-contract-deep-evidence.ts` — ABI, selector, disassembly,
  EIP-1967, history, and safe simulation primitives
- `src/lib/token-contract-live-evidence.ts` — bounded explorer holders/history
  and DEX pair discovery
- `src/lib/token-contract-report-api-controls.ts` — rate and in-flight controls
- `src/app/api/token-contract-report/stream/` — NDJSON route
- `src/app/api/token-contract-report/` — compatibility JSON route
- `src/app/TokenContractReport/token-contract-report-client.tsx` — progressive
  report UI

## Deterministic Evidence

Verified source is retained only on the server and normalized from plain,
Etherscan standard-JSON, wrapped standard-JSON, Blockscout primary-source, and
Blockscout additional-source shapes. Parsing is capped at:

- 512 KiB
- 40 files
- 20,000 lines

The tolerant Solidity parser records file and line references. It detects
independent `msg.sender`/`tx.origin` controllers, controller-gated functions,
transfer-control mappings, sender/recipient blocks, privileged exemptions,
supply/balance writes, misleading burn paths, confiscation, mutable fees,
trading gates, proxy/upgrades, external calls, and embedded liquidity controls.
Names alone remain review clues.

Runtime and deployment evidence includes:

- canonical verified-ABI signatures and selectors;
- ABI-first, local-watchlist-second, bounded-4byte-third selector resolution;
- bounded bytecode disassembly, dispatcher slices, embedded addresses, and
  sensitive opcode categories;
- bounded runtime and creation-bytecode fingerprints, including full and
  Solidity-metadata-stripped hashes;
- EIP-1967 implementation, admin, and beacon storage reads;
- up to 50 recent contract transactions;
- bounded `Transfer` and `OwnershipTransferred` event evidence near creation;
- initial zero-address mint totals compared with current `totalSupply`;
- up to 10 explorer or Transfer-event holder candidates with live `balanceOf`
  reads, including deployer and sampled-supply concentration;
- up to 3 DEX pair candidates;
- up to 12 fixed-block `eth_call` simulations.

Simulation candidates include positive-balance holder/pair/wallet transfer
paths plus suspicious ABI-defined control functions from controller/deployer
and ordinary accounts.
Simulation never invokes `eth_sendTransaction`, a wallet client, signing,
funding, relaying, or a write RPC. Success proves only that one call path worked
at the captured block.

## Verdict Rules

The server owns severity, confidence, and evidence coverage:

- confirmed capabilities determine severity;
- evidence quality determines confidence;
- resolved questions determine weighted coverage;
- missing modules lower coverage but never add risk points;
- incomplete coverage never downgrades a confirmed high or critical finding;
- `low observed risk` requires at least 80% coverage, all required deterministic
  modules complete, and no medium-or-higher finding.

`owner() == address(0)` is reported as `zero_address`, not automatic
renunciation. `ownerZeroRemovesAllControl` is false only when independent or
post-owner-zero control evidence proves otherwise.

Warnings contain operational/actionable warnings. The permanent read-only,
not-formal-audit disclaimer lives in `reportBoundaries` and is not counted as
an open warning.

## DeepSeek Boundary

Server-only variables:

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=
DEEPSEEK_MODEL=
DEEPSEEK_THINKING=
```

Defaults are `https://api.deepseek.com`, `deepseek-v4-pro`, and thinking
disabled. Never expose the key as `NEXT_PUBLIC_*`.

DeepSeek is a cited secondary reviewer. It receives normalized deterministic
evidence and at most 20 relevant, numbered source excerpts bounded to 64 KiB
and 800 lines. Source comments are removed and long string bodies are redacted
before prompting. Source observations must cite validated file/line ranges and
deterministic evidence IDs. Invalid citations are discarded. DeepSeek cannot
set or lower the server verdict, score, confidence, or evidence state.

Provider responses are capped at 1 MiB. When a completed response fails strict
JSON, citation, or evidence-ID validation, the server may make one bounded,
deadline-aware repair request without echoing the invalid response back to the
model. The repaired output must pass the same deterministic grounding checks.

The report remains useful when DeepSeek is unconfigured or unavailable.

## UI Contract

The client prefers the NDJSON route and accepts progressive base/module/final
events. It uses the JSON endpoint only when streaming fails before any usable
report, and does not bypass a 400/429 stream rejection.

The result order is:

1. deterministic conclusion;
2. observed concerns and untested areas;
3. weighted evidence coverage and counts;
4. recommended checks;
5. optional AI explanation;
6. collapsed technical source/bytecode/holder/supply/history/simulation/liquidity evidence;
7. actionable warnings;
8. neutral report boundaries.

Supply is formatted in token units while raw base units remain in technical
details. Selectors are rendered structurally, and unresolved selectors include
the caveat that unknown does not mean malicious. The client includes bounded
stream parsing, `aria-live` progress, alerts, result focus, copy controls, and
visible keyboard focus.

## Regression Anchors

The POSVE fixture asserts that the scanner:

- resolves all six formerly unknown selectors from the verified ABI;
- separates a zero owner getter from effective control removal;
- detects the independent deployer controller;
- detects sender and recipient blocking;
- detects the controller exemption;
- detects the burn-named privileged supply increase;
- returns `critical observed risk` deterministically;
- refuses a DeepSeek downgrade and strips prompt-injection comments.

Additional tests cover normal Ownable ERC-20 behavior, names-only clues,
multi-file inheritance, verified proxies, malformed/oversized source,
unverified bytecode, ambiguous 4byte results, EIP-1967 decoding, provider
failures, history/pair/holder bounds, simulation reverts, streaming, throttles,
disclaimer separation, initial-mint and ownership-event decoding, holder
concentration, creation-bytecode fingerprints, oversized AI output, and the
single repair boundary.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run security:env
npm.cmd test
npm.cmd run build
```

For local browser verification:

```powershell
npm.cmd run dev -- --hostname 127.0.0.1 --port 3001
```

Test POSVE at `0xbbca9774331066948A6b2a68Bc7a51B0392aF9F1`, then an
unverified token and representative Ethereum, BSC, and Base contracts. A
provider failure must produce partial evidence, never an all-clear state.
