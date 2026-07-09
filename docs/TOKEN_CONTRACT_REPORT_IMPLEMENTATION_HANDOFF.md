# Token Contract Report Implementation Handoff

Date: 2026-07-09

This document summarizes the Token Contract Report implementation from this
branch so it can be ported into another repo that is having trouble generating
reports.

The feature is a read-only contract report flow. It does not connect a wallet,
request signatures, submit transactions, revoke approvals, custody assets, or
claim a token is safe.

## Copy Guidance

For the other repo, treat this document as the map, not as a replacement for
the source files. To reproduce the behavior from this branch, copy the files in
the next section first, then adapt imports, chain registry wiring, explorer
helpers, styling, and route placement to the target repo.

The report generation and DeepSeek intelligence are not one isolated prompt.
They are spread across:

- `src/lib/token-contract-report-server.ts`
- `src/lib/token-contract-report.ts`
- `src/app/api/token-contract-report/handler.ts`
- `src/app/TokenContractReport/token-contract-report-client.tsx`
- Tests that lock the behavior

If the other repo only copies the prompt text, it will miss the deterministic
feature JSON, bytecode-derived evidence, creation/deployer metadata, JSON
response parsing, markdown renderer, fallback behavior, and safety language.

## What This Includes

This handoff covers all of the Token Contract Report work currently built on
this branch:

- Public page at `/TokenContractReport`.
- `POST /api/token-contract-report`.
- Live-chain allowlist sourced from the repo's current live chain data.
- Strict request validation and body-size limit.
- Per-client rate limiting.
- `no-store` API responses.
- Contract bytecode existence check.
- Source verification metadata lookup.
- Contract creation metadata lookup:
  - full contract address
  - full deployer wallet address
  - full creation transaction hash
  - creation tx/deployer explorer links
  - block number and timestamp when available
- ERC-20-like getter reads.
- ERC-721 and ERC-1155 ERC-165 checks.
- ERC-4626 vault signal reads.
- Limited ERC-6909 ABI-surface detection.
- Hybrid-standard warning.
- Runtime bytecode size/hash/metadata summary.
- Metadata-stripped runtime hash.
- PUSH4 selector extraction and local selector watchlist.
- PUSH20 hardcoded address extraction.
- Suspicious printable string extraction.
- Explicit critical-check checklist.
- DeepSeek JSON-mode request.
- DeepSeek feature JSON boundary:
  - no raw verified source code
  - no raw runtime bytecode
  - no raw creation bytecode
  - no private wallet data
- DeepSeek JSON response parsing.
- App-owned markdown rendering from DeepSeek JSON.
- AI-unavailable fallback that still returns deterministic evidence.
- UI rows for full contract/deployer/creation tx values.
- Evidence cards, standard pills, warnings, and AI narrative panel.
- Tests for route behavior, chain count, validation, DeepSeek request shape,
  creation metadata, no-bytecode handling, source/proxy parsing, token-standard
  detection, rate limiting, and AI fallback.

## Files To Port

Core shared types and helpers:

- `src/lib/token-contract-report.ts`
- `src/lib/token-contract-report-server.ts`
- `src/lib/token-contract-report-api-controls.ts`

API route:

- `src/app/api/token-contract-report/route.ts`
- `src/app/api/token-contract-report/handler.ts`

Public page and client UI:

- `src/app/TokenContractReport/page.tsx`
- `src/app/TokenContractReport/token-contract-report-client.tsx`

Site surface:

- `src/app/sitemap.ts`
- `src/app/sitemap.test.ts`

Tests:

- `src/lib/token-contract-report.test.ts`
- `src/lib/token-contract-report-server.test.ts`
- `src/app/api/token-contract-report/route.test.ts`

Environment placeholders:

- `.env.example`

## Environment Variables

Server-only DeepSeek settings:

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=
DEEPSEEK_MODEL=
```

Defaults in the server implementation:

- `DEEPSEEK_BASE_URL`: `https://api.deepseek.com`
- `DEEPSEEK_MODEL`: `deepseek-v4-pro`

Do not expose these as `NEXT_PUBLIC_*`.

The API still returns deterministic evidence when `DEEPSEEK_API_KEY` is absent.
In that case `ai.status` is `unavailable`.

## Public Route

Page:

```text
/TokenContractReport
```

Canonical production URL:

```text
https://pulserevoke.com/TokenContractReport
```

API:

```text
POST /api/token-contract-report
```

Request body:

```json
{
  "chainId": 369,
  "contractAddress": "0x...",
  "includeAi": true
}
```

## Chain Source Of Truth

The page does not hard-code a remembered chain list.

`src/lib/token-contract-report.ts` builds the supported chain list from:

```ts
LIVE_SUPPORTED_CHAIN_ROWS
```

The current test asserts:

```ts
TOKEN_CONTRACT_REPORT_CHAIN_COUNT === 30
TOKEN_CONTRACT_REPORT_CHAIN_COUNT === LIVE_SUPPORTED_CHAIN_COUNT
```

When porting this to another repo, replace that source with the target repo's
actual live chain registry. Do not copy a stale list of chains.

## API Controls

`src/app/api/token-contract-report/handler.ts` provides:

- `POST` body size limit of `8192` bytes.
- Strict JSON parsing.
- Integer `chainId` validation.
- EVM contract address validation through `viem`.
- `no-store` response headers.
- Redacted errors.
- Best-effort per-client rate limit through
  `src/lib/token-contract-report-api-controls.ts`.
- `Retry-After` on rate-limit responses.

The route delegates report construction to:

```ts
buildTokenContractReport(options)
```

This makes route tests easy because the builder can be injected.

## Report Response Shape

The main response type is `TokenContractReportResponse`.

Important top-level fields:

```ts
{
  ok: boolean;
  status:
    | "complete"
    | "partial"
    | "unsupported-standard"
    | "bad-request"
    | "config-missing"
    | "upstream-failure";
  chain: {
    chainId: number;
    name: string;
    explorerName: string;
  } | null;
  contract: {
    address: Address;
    explorerUrl: string;
    hasBytecode: boolean;
    source: {
      verified: "verified" | "unverified" | "unknown";
      contractName: string | null;
      isProxy: boolean | null;
      implementationAddress: Address | null;
    };
    creation: {
      transactionHash: `0x${string}` | null;
      transactionUrl: string | null;
      deployerAddress: Address | null;
      deployerUrl: string | null;
      blockNumber: number | null;
      timestamp: string | null;
      lookupStatus: "found" | "unavailable";
    };
  } | null;
  standards: {
    erc20Like: boolean;
    erc721: boolean;
    erc1155: boolean;
    erc4626: boolean;
    erc6909: "detected" | "not_detected" | "limited";
    hybrid: boolean;
  };
  token: {
    name: string | null;
    symbol: string | null;
    decimals: number | null;
    totalSupply: string | null;
    vaultAssetAddress: Address | null;
    totalAssets: string | null;
  };
  signals: TokenContractReportSignal[];
  ai: {
    status: "generated" | "unavailable" | "skipped";
    model: string | null;
    markdown: string | null;
  };
  warnings: string[];
  errors: string[];
  missingConfig: string[];
}
```

The UI should show the full:

- Contract address.
- Deployer wallet address.
- Creation transaction hash.

In this branch those are displayed as full monospace rows with explorer links.

## Explorer Lookups

The server performs two explorer metadata lookups.

Source metadata:

```text
module=contract
action=getsourcecode
address=<contractAddress>
```

Creation metadata:

```text
module=contract
action=getcontractcreation
contractaddresses=<contractAddress>
```

For Etherscan V2 compatible APIs, include:

```text
chainid=<chainId>
apikey=<serverSideApiKey>
```

References:

- Etherscan `getcontractcreation`: https://docs.etherscan.io/api-reference/endpoint/getcontractcreation
- Blockscout `getcontractcreation`: https://docs.blockscout.com/devs/apis/rpc/contract

Important behavior:

- Creation metadata is best effort.
- The report still generates if deployer or creation tx metadata is unavailable.
- If an explorer returns `creationBytecode`, do not send it to DeepSeek by
  default.
- Only normalized deployer addresses and 32-byte transaction hashes are accepted.

## Deterministic Reads

The server uses `viem` public clients to read:

- Contract bytecode.
- ERC-20-like getters:
  - `name()`
  - `symbol()`
  - `decimals()`
  - `totalSupply()`
- ERC-165 checks for:
  - ERC-721
  - ERC-1155
- ERC-4626 signals:
  - `asset()`
  - `totalAssets()`

ERC-6909 is limited v1 coverage. It is detected only from verified ABI names
when available.

No wallet connection is required.

## Bytecode Feature Extraction

The server builds a bounded feature report for DeepSeek.

It includes:

- Runtime bytecode size.
- Runtime bytecode hash.
- Metadata-stripped runtime bytecode hash.
- Solidity metadata detection.
- Compiler version when recoverable from metadata.
- PUSH4 selector extraction.
- Local selector watchlist classification:
  - `standard`
  - `admin`
  - `dangerous`
  - `unknown`
- PUSH20 hardcoded address extraction.
- Suspicious printable string extraction.
- Explicit critical-check checklist.

It does not send:

- Raw verified source code.
- Raw runtime bytecode.
- Raw creation bytecode.
- Private wallet data.

## DeepSeek Request Contract

Endpoint:

```text
<DEEPSEEK_BASE_URL>/chat/completions
```

Default:

```text
https://api.deepseek.com/chat/completions
```

Headers:

```http
accept: application/json
authorization: Bearer <DEEPSEEK_API_KEY>
content-type: application/json
```

Body settings:

```json
{
  "model": "deepseek-v4-pro",
  "max_tokens": 2200,
  "temperature": 0.1,
  "response_format": { "type": "json_object" },
  "thinking": { "type": "disabled" }
}
```

DeepSeek receives one structured feature JSON object generated by:

```ts
deepAuditFeatureReport(report, runtimeBytecode)
```

The prompt tells DeepSeek:

- Do not call the report a formal audit.
- Do not say the token is safe.
- Separate severity from confidence.
- Treat missing extraction, missing source, and missing simulation as unresolved
  risk.
- Return JSON only.

Expected JSON response shape:

```json
{
  "title": "Token Contract Report",
  "contractAddress": "0x...",
  "tokenName": "...",
  "tokenSymbol": "...",
  "overallVerdict": "unknown risk",
  "confidence": 0,
  "confidenceReason": "...",
  "mainRisks": [],
  "detailedFindings": [
    {
      "severity": "critical|high|medium|low|info",
      "heading": "...",
      "evidence": [],
      "description": "...",
      "practicalEffect": "..."
    }
  ],
  "whatNotSeen": [],
  "selectorWatchlist": [],
  "whatToCheckOnChain": [],
  "bottomLine": "..."
}
```

The app parses this JSON and renders markdown itself with:

```ts
parseDeepSeekAuditJson(content)
renderDeepSeekAuditMarkdown(parsed, report)
```

If parsing fails, the current fallback escapes the raw content and returns it as
markdown text.

## Critical Checks Sent To DeepSeek

The feature report asks these questions explicitly:

- Can anyone mint?
- Can owner mint?
- Can a fake burn mint?
- Can owner blacklist wallets?
- Can owner block the LP pair?
- Can normal users sell after buying?
- Can owner sell when users cannot?
- Can owner set fees very high?
- Can owner pause or freeze transfers?
- Does renounce actually remove dangerous control?
- Is the contract upgradeable?
- Is there hidden admin outside `owner()`?
- Is LP locked or removable?
- Does the contract have a `removeLiquidity` wrapper?
- Are there hardcoded fee-exempt or blocked wallets?
- Does source verification exist?
- Does bytecode match a known risky template?

For v1, many of these are reported as `not_collected`. That is intentional.
DeepSeek should explain them as unresolved, not safe.

## UI Notes

The client component:

- Lets the user choose one supported chain.
- Accepts one contract address.
- Submits to `/api/token-contract-report`.
- Shows a loading state.
- Shows full contract/deployer/creation tx rows.
- Shows token identity.
- Shows token-standard pills.
- Shows deterministic evidence cards.
- Shows AI markdown when generated.
- Shows warning copy.

For long hashes and addresses, use:

```css
break-all
font-mono
text-xs
```

This avoids mobile overflow.

## Common Report Generation Failures

### `ai.status` is `unavailable`

Check:

- `DEEPSEEK_API_KEY` exists in the server runtime.
- The key is not named `NEXT_PUBLIC_DEEPSEEK_API_KEY`.
- The dev server was restarted after changing `.env.local`.
- `DEEPSEEK_BASE_URL` is valid if provided.
- The upstream response is JSON.
- The model name is available for the key.

### API returns `400 bad-request`

Check:

- `contractAddress` is exactly one valid EVM address.
- The address is 42 characters including `0x`.
- `chainId` is an integer.
- The chain is in the supported chain allowlist.

### Contract returns `unsupported-standard`

Check:

- The selected address has deployed bytecode on the selected chain.
- The address is a token/collection contract, not an EOA.
- Standard getter reads are not all reverting.
- ERC-165 is supported for NFT contracts.

### Source status is `unknown`

Check:

- Explorer API URL is configured.
- Explorer API key is configured for Etherscan V2 chains.
- The explorer supports `getsourcecode`.
- The explorer did not time out.

### Deployer or creation tx is missing

Check:

- Explorer supports `getcontractcreation`.
- The request uses `contractaddresses`, not `address`.
- Etherscan V2 requests include `chainid`.
- The response contains `contractCreator` and `txHash`.
- The transaction hash is a full 32-byte `0x` hash.

### DeepSeek returns prose instead of JSON

Check:

- Request body includes `response_format: { type: "json_object" }`.
- Prompt says `Return only JSON`.
- The model supports JSON response mode.
- `max_tokens` is high enough for the schema.

### The UI shows no AI text but evidence exists

This is acceptable when DeepSeek is not configured or the upstream call fails.
Do not block deterministic evidence on AI generation.

## Porting Order

1. Port `src/lib/token-contract-report.ts`.
2. Wire the target repo's actual live chain source into
   `TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS`.
3. Port `src/lib/token-contract-report-api-controls.ts`.
4. Port `src/lib/token-contract-report-server.ts`.
5. Update chain resolver imports and explorer helper imports for the target repo.
6. Port the API route and handler.
7. Port the page and client component.
8. Add env placeholders.
9. Add sitemap entry if the route should be public.
10. Port tests.
11. Run focused tests.
12. Run full typecheck, lint, env guard, tests, and build.

## Verification Commands

```powershell
npm.cmd test -- src/lib/token-contract-report-server.test.ts src/app/api/token-contract-report/route.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run security:env
npm.cmd run build
```

Optional local smoke after setting env:

```powershell
npm.cmd run dev -- --hostname 127.0.0.1 --port 3001
```

Then POST:

```json
{
  "chainId": 369,
  "contractAddress": "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
  "includeAi": true
}
```

Expected smoke shape:

```json
{
  "ok": true,
  "status": "complete",
  "ai": {
    "status": "generated",
    "model": "deepseek-v4-pro"
  }
}
```

## Safety Requirements

Keep these boundaries intact:

- No seed phrase requests.
- No private key requests.
- No server-side signing.
- No backend relayers.
- No custody flows.
- No rescue wallet flows.
- No automatic token/NFT/native transfer flows.
- No claim that a token is safe.
- No formal-audit language.
- No all-clear state when extraction is incomplete.

This tool is informational risk context only.
