# Token Contract Report Reorganization Follow-Up

## Delivered in the balanced release

- Versioned deterministic presentation model shared by HTML, PDF, and JSON.
- Architecture-aware AccessControl questions and explicit unresolved role holders.
- Capability, observed behavior, protective evidence, invalid tests, and missing evidence are presented separately.
- Raw simulation calldata retention with selector, ABI-length, and argument-decoding validation for newly generated control probes.
- Captured-block reads for verified role constants, role-admin relationships, and recognized maximum-supply getters.
- CTM regression fixture, unit coverage, desktop/mobile browser coverage, and PDF bookmarks/checksum coverage.

## Raw schema compatibility

The engine response remains `schemaVersion: 2`. All existing engine fields and raw findings remain present. New reports add an optional `presentation` object with `schemaVersion: 1` and `derivedFromEngineSchemaVersion: 2`. Readers of historical schema-v2 reports can deterministically derive the same presentation object when it is absent.

The JSON download materializes the presentation namespace without deleting or rewriting engine fields. The PDF attaches that exact JSON serialization and displays its SHA-256 checksum.

## Deferred evidence collectors

These items require separate scanner work. Until they are implemented, the report must continue to mark their answers partial, unresolved, or not tested.

1. Paginate `RoleGranted`, `RoleRevoked`, and `RoleAdminChanged` from creation through the captured block.
2. Reconstruct candidate role holders and confirm current holders with captured-block `hasRole` reads.
3. Paginate every zero-address `Transfer` event so interim mint and burn activity can be resolved.
4. Expand reviewed DEX factory and LP state collection across supported networks.
5. Run valid same-wallet router buy, approval, and sell simulations where safe prerequisites exist.

## Resume instruction

Ask:

> Resume the token contract report evidence collectors from `docs/token-contract-report/REPORT_REORGANIZATION_FOLLOW_UP.md`.

Implement each collector as a separately tested change. Do not change wallet signing, revoke execution, custody boundaries, or the existing revoke gates.
