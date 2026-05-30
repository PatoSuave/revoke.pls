# Wallet Lifeboat Master Spec

This document is the durable source of truth for the long-term Wallet Lifeboat
roadmap. It is intentionally broader than the current product state. Each phase
must still be implemented in a small, reviewed change with its own tests.

## Purpose

Wallet Lifeboat is a compromised-wallet triage feature for Pulse Revoke. A user
can paste a wallet address and scan public or on-chain risk signals before
connecting the wallet or adding gas.

The feature should help users understand visible exposure, active approvals,
NFT permissions, gas-sweeper-like activity, pending transaction activity, HEX
stake status, Permit2 exposure, EIP-7702 delegation risk, suspicious timeline
activity, address poisoning, scam token or NFT bait, spender contract risk,
smart-wallet configuration risk, ERC-4337 account-abstraction risk, and future
ERC-6909 approval risk.

Core product rule:

> Automate intelligence, not rescue execution.

## Safety Boundaries

Wallet Lifeboat must follow `docs/lifeboat/SAFETY_BOUNDARIES.md`.

The short version:

- Never ask for seed phrases, private keys, recovery phrases, keystore JSON, or
  wallet passwords.
- No custody, server signing, relayers, rescue contracts, automatic gas
  funding, or automatic transfers.
- No automatic HEX End Stake, Emergency End Stake, or Good Accounting writes.
- No private bundle, Flashbots, or private mempool rescue execution in the MVP.
- No guaranteed recovery copy.
- No false "all clear" state when any module is incomplete.
- Existing Revoke.PLS revoke gates must remain unchanged unless explicitly
  approved.

## Product Shape

Wallet Lifeboat should be an address-first workflow:

1. User opens `/app/wallet-lifeboat`.
2. User reads strong safety copy.
3. User pastes an EVM address.
4. User selects one network or starts an explicit scan sequence.
5. The app runs read-only modules for that address and network.
6. The UI separates confirmed visible findings, possible signals,
   unsupported modules, and incomplete scans.
7. The user can export a report.
8. If the user chooses to revoke approvals, the app routes them to the existing
   scanner and preserves the normal wallet-match, chain-match, live-validation,
   preflight, and signing gates.

## Scanable vs Non-Scanable Risk

Scanable risks are signals this app can reasonably inspect from public data:

- Active ERC-20, BEP-20, ERC-721, ERC-1155, and compatible approval state.
- Permit2 delegated allowance state where the chain and data source support it.
- Recent native-token transfer patterns.
- Latest-vs-pending nonce differences reported by a configured RPC.
- Approval and drain timelines from explorer data.
- EIP-7702 delegation code where supported by RPC.
- Smart wallet owner, threshold, module, and guard configuration where ABI and
  chain support are reliable.
- ERC-4337 sender, paymaster, factory, bundler, or session-key signals where
  available.
- HEX stake state from read-only contract calls.
- Known-risk spender or recipient registry matches.

Non-scanable or only partially scanable risks include:

- Whether a seed phrase or private key is compromised.
- Whether malware is present on the user's device.
- Off-chain phishing, social-engineering, or remote-access compromise.
- Private relay, private mempool, unindexed, internal-only, or cross-chain
  activity not visible to configured data sources.
- Future transactions an attacker may submit.
- Whether every asset has been found.
- Whether every malicious approval, signature, session key, or delegation has
  been found.

The UI must explain these limits and avoid certainty when data is incomplete.

## Data Model

Each module should normalize results into a shared report-friendly shape.

```ts
type LifeboatModuleStatus =
  | "not_scanned"
  | "scanning"
  | "complete"
  | "partial"
  | "unsupported"
  | "config_missing"
  | "upstream_unavailable"
  | "error";

type LifeboatRiskLevel =
  | "not_checked"
  | "none_detected"
  | "informational"
  | "possible"
  | "elevated"
  | "high"
  | "critical"
  | "incomplete";

type LifeboatEvidence = {
  id: string;
  chainId: number;
  kind: string;
  title: string;
  description: string;
  address?: `0x${string}`;
  txHash?: `0x${string}`;
  blockNumber?: number;
  timestamp?: number;
  explorerUrl?: string;
};

type LifeboatModuleResult = {
  moduleId: string;
  status: LifeboatModuleStatus;
  riskLevel: LifeboatRiskLevel;
  summary: string;
  evidence: LifeboatEvidence[];
  warnings: string[];
  errors: string[];
};
```

Module results must keep "not detected" separate from "not checked" and
"incomplete."

## Risk Modules

Wallet Lifeboat should grow through the phases in `docs/lifeboat/PHASES.md`.
The long-term module set is:

- Existing approval and NFT approval integration.
- Exportable rescue report.
- Gas-sweeper pattern scanner.
- Pending transaction / nonce scanner.
- Approval-to-drain timeline scanner.
- Address poisoning scanner.
- Spender contract risk scanner.
- Permit2 exposure scanner.
- EIP-7702 delegation scanner.
- Scam token and NFT dust trap scanner.
- HEX Lifeboat read-only stake diagnostics.
- Good Accounting Assist from a clean wallet only.
- Smart wallet and Safe configuration scanner.
- ERC-4337 account-abstraction diagnostics.
- ERC-6909 multi-token approval diagnostics.
- Known-risk recipient registry with careful, non-defamatory language.

## Active Safe Production Passes

The current Lifeboat branch implements these read-only modules:

- Wallet Lifeboat shell with address input, chain selection, safety copy,
  approval/NFT scan reuse, and report export.
- Gas-sweeper pattern diagnostic from bounded recent normal native-transfer
  history.
- Pending transaction / nonce diagnostic from latest-vs-pending RPC reads.
- Approval-to-drain timeline diagnostic from bounded recent explorer history.
- Address poisoning diagnostic from bounded recent explorer history and
  prefix/suffix lookalike heuristics.
- Spender contract risk diagnostic from active approval spender addresses,
  bytecode presence, explorer source-code metadata, proxy-like metadata, and
  reviewed registry context.
- Permit2 exposure diagnostic from active Permit2 delegated allowance rows that
  were already live-read by the existing approval scanner.
- EIP-7702 delegation diagnostic from latest account-code reads on explicitly
  supported networks.
- Token/NFT dust-trap diagnostic from bounded inbound token and NFT transfer
  history with sanitized metadata, URL-like text stripping, and no arbitrary
  token-provided website fetches.
- HEX stake diagnostic from PulseChain read-only contract calls for visible
  open stake rows, with mature/late/Good Accounting candidate context but no
  stake-ending or Good Accounting execution.
- Good Accounting Assist derived from the read-only HEX stake diagnostic, with
  clean-wallet-only manual review context and no calldata preparation,
  signature request, transaction submission, relay, simulation, or execution.

These modules do not add custody, server signing, relayers, rescue contracts,
automatic gas funding, automatic transfer, HEX write execution, private bundle
execution, or new wallet write paths.

## UX Requirements

- Keep the first screen usable as a triage tool, not a marketing page.
- Put the safety warning before results.
- Make read-only state visible.
- Require explicit user action before each scan or scan sequence.
- Show per-module status.
- Show incomplete and unsupported states clearly.
- Link addresses and transactions to the active chain explorer.
- Keep report export plain-language and safe to share.
- Never make the user connect a wallet just to inspect public data.
- Route revoke actions through existing scanner paths only.

## Do Not Build Yet

The following are out of scope until the user explicitly approves a later
architecture and safety review:

- Rescue automation.
- App-owned rescue wallets.
- Server-side transaction building for asset transfer.
- Server-side signing.
- Backend relayers.
- Rescue contracts.
- Automatic gas funding.
- Automatic token, NFT, native-token, or staking-position transfer.
- HEX End Stake, Emergency End Stake, or Good Accounting write execution.
- Flashbots, private bundles, or private mempool execution.
- Any new wallet write path outside the existing audited revoke gates.

## Validation Checklist

Every phase should include:

- Code review against `docs/lifeboat/SAFETY_BOUNDARIES.md`.
- Tests for new parsers, heuristics, API validation, and UI state.
- `git diff --check`.
- `npm run lint`.
- `npm run typecheck`.
- Focused tests for changed modules.
- `npm run test` when behavior changes are broad enough to justify it.
- `npm run build` before preview or production handoff.
- Preview smoke for hosted changes.
- A final diff scan for prohibited signing, relayer, private-key, rescue,
  automatic funding, automatic transfer, and new wallet-write behavior.
