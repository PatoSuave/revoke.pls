# Wallet Lifeboat Safety Boundaries

Wallet Lifeboat exists for compromised-wallet triage. It should help a user
understand visible exposure before connecting a wallet, adding gas, or deciding
what to do next.

Core rule:

> Automate intelligence, not rescue execution.

## Allowed Behavior

- Read public chain data for a pasted address.
- Reuse existing address-only approval and NFT approval scans.
- Query bounded explorer and RPC endpoints from server-side APIs.
- Show risk context, warnings, limitations, and suggested manual next steps.
- Export a report that summarizes visible findings and incomplete modules.
- Link to chain explorers for user verification.
- Route users back to the existing revoke scanner when they are ready to revoke
  from the matching wallet on the matching chain.

## Prohibited Behavior

- No seed phrase input.
- No private key input.
- No mnemonic, recovery phrase, keystore JSON, or wallet password input.
- No remote desktop requests.
- No custody.
- No app-controlled rescue wallet.
- No server-side private keys.
- No server-side signing.
- No backend relayer.
- No rescue smart contract.
- No automatic gas funding to compromised wallets.
- No automatic token, NFT, native-token, or staking-position transfer.
- No automatic HEX End Stake.
- No automatic HEX Emergency End Stake.
- No automatic HEX Good Accounting write.
- No private bundle, Flashbots, private mempool, or MEV rescue execution in the
  MVP.
- No "guaranteed recovery" copy.
- No "recover your wallet" claim.
- No "remove the hacker" claim.
- No "all clear" state when any module is incomplete, unsupported, timed out,
  rate-limited, or missing configuration.

## Existing Revoke Gates To Preserve

- Address-only scans are read-only.
- Revoke actions require the connected wallet to match the scanned owner.
- Revoke actions require the connected chain to match the row chain.
- Revoke actions require live-verified active approval state.
- Preflight and gas safety checks remain active.
- Post-receipt verification remains separate from transaction submission.
- Unsupported, incomplete, or stale verification must disable revoke actions.

## Safe Copy Rules

Use:

- "possible gas-sweeper-like activity"
- "visible exposure"
- "public/on-chain signal"
- "review manually"
- "not detected in this bounded scan"
- "incomplete"
- "unsupported"

Avoid:

- "hacker wallet" unless describing a user-provided statement
- "confirmed attacker" unless sourced by a reviewed registry
- "safe"
- "clean"
- "all clear"
- "recovered"
- "rescued"
- "guaranteed"

## Validation Checklist

Before merging any Wallet Lifeboat change:

- Confirm the diff does not add prohibited write, signing, funding, custody, or
  relayer behavior.
- Confirm address-only scan paths remain read-only.
- Confirm existing revoke gates still require matching owner, matching chain,
  and live active state.
- Confirm incomplete modules render as incomplete, not safe.
- Confirm hosted APIs use bounded inputs, timeouts, no-store headers, and
  server-side secrets only.
- Confirm public copy does not promise recovery or certainty.
- Run the phase-specific tests and the repo validation commands.
